//! Lyrics commands, reachable from the page (bridge) and from companion
//! windows (Tauri IPC). Every change to the current song's lyrics is
//! broadcast as `lyrics-changed` with a `CurrentLyrics` payload.

use super::cache::{now_secs, Cached};
use super::{
    enabled_providers, find_best, search_all, ytm_lyrics, CurrentLyrics, Lyrics, LyricsProvider, LyricsState, ProviderId,
    Query, PROVIDER_TIMEOUT,
};
use crate::AppState;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::atomic::Ordering;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};

pub const LYRICS_CHANGED_EVENT: &str = "lyrics-changed";

/// Where `lyrics-changed` goes: every window in the app, a recorder in tests.
pub trait LyricsSink: Send + Sync {
    fn lyrics_changed(&self, payload: &CurrentLyrics);
}

impl LyricsSink for AppHandle {
    fn lyrics_changed(&self, payload: &CurrentLyrics) {
        let _ = self.emit(LYRICS_CHANGED_EVENT, payload);
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FetchArgs {
    #[serde(default)]
    pub video_id: Option<String>,
    pub artist: String,
    pub title: String,
    #[serde(default)]
    pub album_name: Option<String>,
    #[serde(default)]
    pub duration: Option<f64>,
    /// Plain lyrics from YTM's own Lyrics tab, when the page has them.
    #[serde(default)]
    pub ytm_plain: Option<String>,
}

impl From<FetchArgs> for Query {
    fn from(a: FetchArgs) -> Self {
        Query {
            video_id: a.video_id.filter(|v| !v.trim().is_empty()),
            title: a.title,
            artist: a.artist,
            album: a.album_name.filter(|a| !a.trim().is_empty()),
            duration: a.duration.filter(|d| d.is_finite() && *d > 0.0),
            ytm_plain: a.ytm_plain,
        }
    }
}

/// A "Wrong lyrics?" choice.
#[derive(Debug, Clone, Serialize)]
pub struct CandidateSummary {
    pub provider: String,
    pub id: String,
    pub title: String,
    pub artist: String,
    pub synced: bool,
    /// The first couple of lines, to tell versions apart.
    pub preview: String,
    pub selected: bool,
}

fn same_song(a: &Query, b: &Query) -> bool {
    match (&a.video_id, &b.video_id) {
        (Some(x), Some(y)) => x == y,
        _ => a.song_key() == b.song_key(),
    }
}

fn offset_keys(q: &Query) -> (Option<String>, String) {
    (q.video_id.clone(), q.song_key())
}

fn offset_for(ls: &LyricsState, q: &Query) -> f64 {
    let (vid, legacy) = offset_keys(q);
    match vid.as_deref() {
        Some(v) => ls.offsets.get(&[v, &legacy]),
        None => ls.offsets.get(&[&legacy]),
    }
}

fn set_current(ls: &LyricsState, q: &Query, lyrics: Option<Lyrics>, sink: &dyn LyricsSink) -> CurrentLyrics {
    let payload = CurrentLyrics::from_lyrics(q.video_id.clone(), lyrics.as_ref(), offset_for(ls, q));
    *ls.current_query.lock() = Some(q.clone());
    *ls.current_lyrics.lock() = lyrics;
    *ls.current.lock() = payload.clone();
    sink.lyrics_changed(&payload);
    payload
}

/// Lyrics for `q`: from the cache, or from `providers` (priority order).
/// A lookup overtaken by a newer one (the song changed meanwhile) returns
/// its result to the caller but never replaces the current lyrics.
pub async fn fetch_with(
    ls: &LyricsState,
    providers: &[Arc<dyn LyricsProvider>],
    ytm_enabled: bool,
    q: Query,
    sink: &dyn LyricsSink,
) -> CurrentLyrics {
    let generation = ls.generation.fetch_add(1, Ordering::SeqCst) + 1;

    let already_current = ls.current_query.lock().as_ref().is_some_and(|c| same_song(c, &q));
    if already_current {
        let current = ls.current.lock().clone();
        if !current.synced.is_empty() || current.plain.is_some() {
            return current;
        }
    } else {
        // Clear the previous song's lyrics everywhere while this one loads.
        set_current(ls, &q, None, sink);
    }

    let ytm = || if ytm_enabled { ytm_lyrics(&q) } else { None };
    let lyrics = match q.video_id.as_deref().and_then(|v| ls.cache.get(v, now_secs())) {
        Some(Cached::Found { lyrics, .. }) => Some(lyrics),
        Some(Cached::NotFound) => ytm(),
        None => {
            let (found, complete) = find_best(providers, &q, PROVIDER_TIMEOUT).await;
            if let Some(v) = q.video_id.as_deref() {
                // A miss is only remembered when every provider answered;
                // a timeout or a network error must not hide lyrics for a day.
                if found.is_some() || complete {
                    ls.cache.put(v, found.as_ref(), false, now_secs());
                }
            }
            found
        }
    };

    if ls.generation.load(Ordering::SeqCst) != generation {
        return CurrentLyrics::from_lyrics(q.video_id.clone(), lyrics.as_ref(), offset_for(ls, &q));
    }
    set_current(ls, &q, lyrics, sink)
}

pub fn set_offset(ls: &LyricsState, offset_secs: f64, sink: &dyn LyricsSink) -> Result<CurrentLyrics, String> {
    let q = ls.current_query.lock().clone().ok_or("No song is playing")?;
    let (vid, legacy) = offset_keys(&q);
    let key = vid.as_deref().unwrap_or(&legacy);
    let stored = ls.offsets.set(key, Some(&legacy), offset_secs)?;
    let payload = {
        let mut current = ls.current.lock();
        current.offset_secs = stored;
        current.clone()
    };
    sink.lyrics_changed(&payload);
    Ok(payload)
}

pub async fn list_candidates(ls: &LyricsState, providers: &[Arc<dyn LyricsProvider>]) -> Result<Vec<CandidateSummary>, String> {
    let q = ls.current_query.lock().clone().ok_or("No song is playing")?;
    let found = search_all(providers, &q, PROVIDER_TIMEOUT).await;
    let selected = ls.current_lyrics.lock().as_ref().map(|l| (l.provider, l.id.clone()));
    let summaries = found
        .iter()
        .map(|l| {
            let preview_src: Vec<&str> = if l.is_synced() {
                l.synced.iter().map(|x| x.text.as_str()).take(2).collect()
            } else {
                l.plain.as_deref().unwrap_or("").lines().filter(|x| !x.trim().is_empty()).take(2).collect()
            };
            CandidateSummary {
                provider: l.provider.as_str().to_string(),
                id: l.id.clone(),
                title: l.title.clone(),
                artist: l.artist.clone(),
                synced: l.is_synced(),
                preview: preview_src.join(" / "),
                selected: selected.as_ref() == Some(&(l.provider, l.id.clone())),
            }
        })
        .collect();
    *ls.candidates.lock() = found;
    Ok(summaries)
}

/// Makes a listed candidate the song's lyrics, remembered in the cache.
pub fn pick(ls: &LyricsState, provider: &str, id: &str, sink: &dyn LyricsSink) -> Result<CurrentLyrics, String> {
    let provider = ProviderId::parse(provider).ok_or("Unknown lyrics provider")?;
    let chosen = ls
        .candidates
        .lock()
        .iter()
        .find(|l| l.provider == provider && l.id == id)
        .cloned()
        .ok_or("That lyrics version is no longer listed")?;
    let q = ls.current_query.lock().clone().ok_or("No song is playing")?;
    if let Some(v) = q.video_id.as_deref() {
        ls.cache.put(v, Some(&chosen), true, now_secs());
    }
    Ok(set_current(ls, &q, Some(chosen), sink))
}

/// One-time move of the page's old localStorage offsets.
pub fn import_offsets(ls: &LyricsState, entries: Vec<(String, f64)>, sink: &dyn LyricsSink) -> usize {
    let added = ls.offsets.import(&entries);
    if added > 0 {
        let q = ls.current_query.lock().clone();
        if let Some(q) = q {
            let payload = {
                let mut current = ls.current.lock();
                current.offset_secs = offset_for(ls, &q);
                current.clone()
            };
            sink.lyrics_changed(&payload);
        }
    }
    added
}

/// Enabled providers from the config, plus whether YTM's own text counts.
pub fn configured_providers(state: &AppState) -> (Vec<Arc<dyn LyricsProvider>>, bool) {
    let config = state.config_manager.load();
    let ids = enabled_providers(&config.lyrics_providers);
    let roots = vec![PathBuf::from(&config.local_music_dir), PathBuf::from(&config.download_dir)];
    let ytm_enabled = ids.contains(&ProviderId::Ytm);
    (state.lyrics.providers(&ids, roots), ytm_enabled)
}

pub async fn fetch(app: &AppHandle, state: &AppState, args: FetchArgs) -> CurrentLyrics {
    let (providers, ytm_enabled) = configured_providers(state);
    fetch_with(&state.lyrics, &providers, ytm_enabled, args.into(), app).await
}

pub async fn candidates(state: &AppState) -> Result<Vec<CandidateSummary>, String> {
    let (providers, _) = configured_providers(state);
    list_candidates(&state.lyrics, &providers).await
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn fetch_lyrics(
    app_handle: AppHandle,
    state: State<'_, Arc<AppState>>,
    video_id: Option<String>,
    artist: String,
    title: String,
    album_name: Option<String>,
    duration: Option<f64>,
    ytm_plain: Option<String>,
) -> Result<CurrentLyrics, String> {
    let args = FetchArgs { video_id, artist, title, album_name, duration, ytm_plain };
    Ok(fetch(&app_handle, &state, args).await)
}

#[tauri::command]
pub fn get_current_lyrics(state: State<'_, Arc<AppState>>) -> CurrentLyrics {
    state.lyrics.current.lock().clone()
}

#[tauri::command]
pub fn set_lyrics_offset(app_handle: AppHandle, state: State<'_, Arc<AppState>>, offset_secs: f64) -> Result<CurrentLyrics, String> {
    set_offset(&state.lyrics, offset_secs, &app_handle)
}

#[tauri::command]
pub async fn list_lyrics_candidates(state: State<'_, Arc<AppState>>) -> Result<Vec<CandidateSummary>, String> {
    candidates(&state).await
}

#[tauri::command]
pub fn pick_lyrics(app_handle: AppHandle, state: State<'_, Arc<AppState>>, provider: String, id: String) -> Result<CurrentLyrics, String> {
    pick(&state.lyrics, &provider, &id, &app_handle)
}

#[tauri::command]
pub fn import_lyrics_offsets(app_handle: AppHandle, state: State<'_, Arc<AppState>>, entries: Vec<(String, f64)>) -> usize {
    import_offsets(&state.lyrics, entries, &app_handle)
}

#[cfg(test)]
mod tests {
    use super::super::test_util::lyrics;
    use super::*;
    use futures_util::future::BoxFuture;
    use parking_lot::Mutex;
    use std::sync::atomic::AtomicUsize;
    use std::time::Duration;

    #[derive(Default)]
    struct Recorder(Mutex<Vec<CurrentLyrics>>);
    impl LyricsSink for Recorder {
        fn lyrics_changed(&self, payload: &CurrentLyrics) {
            self.0.lock().push(payload.clone());
        }
    }

    struct Counting {
        calls: Arc<AtomicUsize>,
        delay_ms: u64,
        result: Result<Vec<Lyrics>, String>,
    }
    impl LyricsProvider for Counting {
        fn id(&self) -> ProviderId {
            ProviderId::Lrclib
        }
        fn search<'a>(&'a self, _q: &'a Query) -> BoxFuture<'a, Result<Vec<Lyrics>, String>> {
            self.calls.fetch_add(1, Ordering::SeqCst);
            Box::pin(async move {
                tokio::time::sleep(Duration::from_millis(self.delay_ms)).await;
                self.result.clone()
            })
        }
    }

    fn provider(result: Result<Vec<Lyrics>, String>, delay_ms: u64) -> (Arc<dyn LyricsProvider>, Arc<AtomicUsize>) {
        let calls = Arc::new(AtomicUsize::new(0));
        (Arc::new(Counting { calls: calls.clone(), delay_ms, result }), calls)
    }

    fn query(video: &str) -> Query {
        Query {
            video_id: Some(video.into()),
            title: "Maniac".into(),
            artist: "Carpenter Brut".into(),
            ..Default::default()
        }
    }

    fn state() -> (tempfile::TempDir, LyricsState) {
        let dir = tempfile::tempdir().unwrap();
        let ls = LyricsState::new(dir.path().to_path_buf());
        (dir, ls)
    }

    #[tokio::test]
    async fn test_fetch_caches_and_broadcasts() {
        let (_d, ls) = state();
        let sink = Recorder::default();
        let (p, calls) = provider(Ok(vec![lyrics(ProviderId::Lrclib, true, false)]), 0);

        let first = fetch_with(&ls, std::slice::from_ref(&p), true, query("vid1"), &sink).await;
        assert_eq!(first.provider.as_deref(), Some("lrclib"));
        assert_eq!(first.video_id.as_deref(), Some("vid1"));
        let events = sink.0.lock().clone();
        assert_eq!(events.len(), 2, "cleared on the new song, then the lyrics");
        assert!(events[0].synced.is_empty() && events[0].video_id.as_deref() == Some("vid1"));

        // Same song asked again (e.g. with YTM's text): no new lookup.
        fetch_with(&ls, std::slice::from_ref(&p), true, query("vid1"), &sink).await;
        // Another song, then back: served from the disk cache.
        fetch_with(&ls, std::slice::from_ref(&p), true, query("vid2"), &sink).await;
        fetch_with(&ls, std::slice::from_ref(&p), true, query("vid1"), &sink).await;
        assert_eq!(calls.load(Ordering::SeqCst), 2);
    }

    #[tokio::test]
    async fn test_failed_lookup_is_not_cached_as_missing() {
        let (_d, ls) = state();
        let sink = Recorder::default();
        let (failing, _) = provider(Err("offline".into()), 0);
        let none = fetch_with(&ls, &[failing], true, query("vid1"), &sink).await;
        assert!(none.provider.is_none());
        assert!(ls.cache.get("vid1", now_secs()).is_none());

        let (empty, _) = provider(Ok(vec![]), 0);
        fetch_with(&ls, &[empty], true, query("vid2"), &sink).await;
        assert_eq!(ls.cache.get("vid2", now_secs()), Some(Cached::NotFound));
    }

    #[tokio::test]
    async fn test_known_missing_song_still_takes_ytm_text() {
        let (_d, ls) = state();
        let sink = Recorder::default();
        ls.cache.put("vid1", None, false, now_secs());
        let (p, calls) = provider(Ok(vec![]), 0);
        let mut q = query("vid1");
        q.ytm_plain = Some("From YTM".into());
        let got = fetch_with(&ls, &[p], true, q, &sink).await;
        assert_eq!((got.provider.as_deref(), got.plain.as_deref()), (Some("ytm"), Some("From YTM")));
        assert_eq!(calls.load(Ordering::SeqCst), 0);
    }

    #[tokio::test]
    async fn test_stale_lookup_never_replaces_the_newer_song() {
        let (_d, ls) = state();
        let ls = Arc::new(ls);
        let sink = Arc::new(Recorder::default());
        let (slow, _) = provider(Ok(vec![lyrics(ProviderId::Lrclib, true, false)]), 200);
        let (fast, _) = provider(Ok(vec![lyrics(ProviderId::Genius, false, true)]), 0);

        let (ls1, sink1) = (ls.clone(), sink.clone());
        let old = tokio::spawn(async move { fetch_with(&ls1, &[slow], true, query("old"), sink1.as_ref()).await });
        tokio::time::sleep(Duration::from_millis(20)).await;
        fetch_with(&ls, &[fast], true, query("new"), sink.as_ref()).await;
        old.await.unwrap();

        assert_eq!(ls.current.lock().video_id.as_deref(), Some("new"));
        assert_eq!(sink.0.lock().last().unwrap().video_id.as_deref(), Some("new"));
    }

    #[tokio::test]
    async fn test_offset_and_pick_update_current_and_persist() {
        let (_d, ls) = state();
        let sink = Recorder::default();
        let a = lyrics(ProviderId::Lrclib, true, false);
        let mut b = lyrics(ProviderId::Genius, false, true);
        b.id = "g-2".into();
        let (p, _) = provider(Ok(vec![a, b]), 0);
        fetch_with(&ls, std::slice::from_ref(&p), true, query("vid1"), &sink).await;

        let shifted = set_offset(&ls, 1.25, &sink).unwrap();
        assert_eq!(shifted.offset_secs, 1.25);
        assert_eq!(sink.0.lock().last().unwrap().offset_secs, 1.25);

        let listed = list_candidates(&ls, &[p]).await.unwrap();
        assert_eq!(listed.len(), 2);
        assert!(listed[0].selected && !listed[1].selected);
        let picked = pick(&ls, "genius", "g-2", &sink).unwrap();
        assert_eq!(picked.provider.as_deref(), Some("genius"));
        assert_eq!(picked.offset_secs, 1.25, "the song's offset survives a pick");
        assert!(matches!(ls.cache.get("vid1", now_secs()), Some(Cached::Found { picked: true, .. })));
        assert!(pick(&ls, "genius", "nope", &sink).is_err());
        assert!(pick(&ls, "bogus", "g-2", &sink).is_err());
    }

    #[test]
    fn test_import_offsets_applies_to_the_current_song() {
        let (_d, ls) = state();
        let sink = Recorder::default();
        set_current(&ls, &query("vid1"), None, &sink);
        let added = import_offsets(&ls, vec![("Maniac - Carpenter Brut".into(), 0.5)], &sink);
        assert_eq!(added, 1);
        assert_eq!(ls.current.lock().offset_secs, 0.5);
        assert_eq!(import_offsets(&ls, vec![("Maniac - Carpenter Brut".into(), 9.0)], &sink), 0);
    }

    #[test]
    fn test_fetch_args_from_page() {
        let args: FetchArgs = serde_json::from_value(serde_json::json!({
            "videoId": "", "artist": "A", "title": "T", "albumName": " ", "duration": 0, "ytmPlain": null
        }))
        .unwrap();
        let q: Query = args.into();
        assert_eq!((q.video_id, q.album, q.duration), (None, None, None));
    }
}
