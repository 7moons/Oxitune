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
    /// The song's tags on YouTube, as other names for the artist.
    #[serde(default)]
    pub artist_aliases: Vec<String>,
}

impl From<FetchArgs> for Query {
    fn from(a: FetchArgs) -> Self {
        // Comes from the music.youtube.com page: capped before it reaches
        // providers, the cache or the other windows.
        const MAX_FIELD_CHARS: usize = 512;
        const MAX_YTM_PLAIN_BYTES: usize = 64 * 1024;
        const MAX_ALIASES: usize = 20;
        const MAX_ALIAS_CHARS: usize = 100;
        let cap = |s: String| -> String { s.chars().take(MAX_FIELD_CHARS).collect() };
        let title = cap(a.title);
        Query {
            video_id: a.video_id.filter(|v| crate::sync_room::is_video_id(v.trim())),
            artist_aliases: artist_aliases(a.artist_aliases, &title, MAX_ALIASES, MAX_ALIAS_CHARS),
            title,
            artist: cap(a.artist),
            album: a.album_name.filter(|a| !a.trim().is_empty()).map(cap),
            duration: a.duration.filter(|d| d.is_finite() && *d > 0.0 && *d < 86_400.0),
            ytm_plain: a.ytm_plain.filter(|p| p.len() <= MAX_YTM_PLAIN_BYTES),
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

/// Whether lyrics cached under this song's id are about this song. The
/// page once sent a song's id with the previous song's title (the two
/// switch at different moments); the lyrics found for that title were
/// cached under the new id, and kept for 30 days. Results with no title
/// (local files, YTM's own text) can't be checked and are kept.
fn cached_fits(lyrics: &Lyrics, q: &Query) -> bool {
    use super::matching::{artist_matches, clean_track_name, token_similarity};
    // By another artist: cached before results had to match the artist.
    if !artist_matches(&lyrics.artist, &q.artist, &q.artist_aliases) {
        return false;
    }
    let (cached, wanted) = (lyrics.title.trim(), clean_track_name(&q.title));
    if cached.is_empty() || wanted.trim().is_empty() {
        return true;
    }
    let (c, w) = (cached.to_lowercase(), wanted.to_lowercase());
    token_similarity(cached, &wanted) >= 0.25 || c.contains(&w) || w.contains(&c)
}

/// The song's tags as other names for its artist, without the ones about
/// the song itself: its title is among its tags, and as an "artist" it let
/// "Harbor City Lights" by Harbor City Lights pass for "City Lights" by
/// Mira Vale, Young Oskar i Tidewave.
fn artist_aliases(tags: Vec<String>, title: &str, max: usize, max_chars: usize) -> Vec<String> {
    use super::matching::{clean_track_name, token_similarity};
    let title = clean_track_name(title);
    tags.into_iter()
        .map(|s| s.trim().chars().take(max_chars).collect::<String>())
        .filter(|s| !s.is_empty() && token_similarity(s, &title) < 0.5)
        .take(max)
        .collect()
}

/// Same id and the same title: a corrected title for the same id (it can
/// arrive after a stale one) is a new lookup, not the current lyrics.
fn same_song(a: &Query, b: &Query) -> bool {
    match (&a.video_id, &b.video_id) {
        (Some(x), Some(y)) => x == y && a.title.trim().eq_ignore_ascii_case(b.title.trim()),
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

/// The cached answer for `q`, unless it's about another song.
fn usable_cache(ls: &LyricsState, q: &Query) -> Option<Cached> {
    match q.video_id.as_deref().and_then(|v| ls.cache.get(v, now_secs())) {
        Some(Cached::Found { lyrics, picked: false }) if !cached_fits(&lyrics, q) => {
            log::warn!(
                "[Oxitune Lyrics] cached lyrics for {:?} are \"{}\" by {}, not \"{}\": looking again",
                q.video_id,
                lyrics.title,
                lyrics.artist,
                q.title
            );
            None
        }
        other => other,
    }
}

/// Asks the providers, logs what was chosen and why, and caches it.
async fn look_up_and_cache(ls: &LyricsState, providers: &[Arc<dyn LyricsProvider>], q: &Query) -> Option<Lyrics> {
    let (found, complete) = find_best(providers, q, PROVIDER_TIMEOUT).await;
    match &found {
        Some(l) => log::info!(
            "[Oxitune Lyrics] {:?} \"{}\" by {} ({}): {} \"{}\" by {}, {}",
            q.video_id,
            q.title,
            q.artist,
            q.duration.map_or("?".into(), |d| format!("{d:.0} s")),
            l.provider.as_str(),
            l.title,
            l.artist,
            if l.is_synced() { "synced" } else { "plain" }
        ),
        None => log::info!(
            "[Oxitune Lyrics] {:?} \"{}\" by {}: nothing found{}",
            q.video_id,
            q.title,
            q.artist,
            if complete { "" } else { " (a provider failed, not remembered)" }
        ),
    }
    if let Some(v) = q.video_id.as_deref() {
        // A miss is only remembered when every provider answered;
        // a timeout or a network error must not hide lyrics for a day.
        if found.is_some() || complete {
            ls.cache.put_song(v, Some(song_ref(q)), found.as_ref(), false, now_secs());
        }
    }
    found
}

/// The next song's lyrics, looked up ahead into the cache so they show the
/// moment it starts. Never touches what's showing now.
pub async fn prefetch_with(ls: &LyricsState, providers: &[Arc<dyn LyricsProvider>], q: Query) {
    if q.video_id.is_none() || usable_cache(ls, &q).is_some() {
        return;
    }
    look_up_and_cache(ls, providers, &q).await;
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
    let lyrics = match usable_cache(ls, &q) {
        Some(Cached::Found { lyrics, .. }) => Some(lyrics),
        Some(Cached::NotFound) => ytm(),
        None => look_up_and_cache(ls, providers, &q).await,
    };

    if ls.generation.load(Ordering::SeqCst) != generation {
        return CurrentLyrics::from_lyrics(q.video_id.clone(), lyrics.as_ref(), offset_for(ls, &q));
    }
    set_current(ls, &q, lyrics, sink)
}

/// "Search again": forgets what is cached for the playing song (a pick too)
/// and looks it up anew, for lyrics that are the right song but still wrong.
pub async fn refresh_with(
    ls: &LyricsState,
    providers: &[Arc<dyn LyricsProvider>],
    ytm_enabled: bool,
    sink: &dyn LyricsSink,
) -> Result<CurrentLyrics, String> {
    let q = ls.current_query.lock().clone().ok_or("No song is playing")?;
    if let Some(v) = q.video_id.as_deref() {
        ls.cache.remove(v);
    }
    log::info!("[Oxitune Lyrics] {:?} \"{}\": searching again", q.video_id, q.title);
    // Not "the song already showing" any more, so fetch_with looks it up.
    ls.current_query.lock().take();
    Ok(fetch_with(ls, providers, ytm_enabled, q, sink).await)
}

pub async fn refresh(app: &AppHandle, state: &AppState) -> Result<CurrentLyrics, String> {
    let (providers, ytm_enabled) = configured_providers(state);
    refresh_with(&state.lyrics, &providers, ytm_enabled, app).await
}

fn song_ref(q: &Query) -> super::cache::SongRef {
    super::cache::SongRef { title: q.title.clone(), artist: q.artist.clone() }
}

/// Settings > Saved lyrics: every cached answer, newest first.
#[tauri::command]
pub fn list_lyrics_cache(state: State<'_, Arc<AppState>>) -> Vec<super::cache::EntryInfo> {
    state.lyrics.cache.list(now_secs())
}

/// Settings > Saved lyrics: forgets one song's cached answer.
#[tauri::command]
pub fn remove_lyrics_cache_entry(state: State<'_, Arc<AppState>>, video_id: String) {
    state.lyrics.cache.remove(&video_id);
}

/// Settings: forgets every cached answer; returns how many there were.
#[tauri::command]
pub fn clear_lyrics_cache(state: State<'_, Arc<AppState>>) -> usize {
    let removed = state.lyrics.cache.clear();
    log::info!("[Oxitune Lyrics] cache cleared ({removed} songs)");
    removed
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
        ls.cache.put_song(v, Some(song_ref(&q)), Some(&chosen), true, now_secs());
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
    let roots = vec![PathBuf::from(&config.local_music_dir)];
    let ytm_enabled = ids.contains(&ProviderId::Ytm);
    (state.lyrics.providers(&ids, roots), ytm_enabled)
}

pub async fn fetch(app: &AppHandle, state: &AppState, args: FetchArgs) -> CurrentLyrics {
    let (providers, ytm_enabled) = configured_providers(state);
    fetch_with(&state.lyrics, &providers, ytm_enabled, args.into(), app).await
}

pub async fn prefetch(state: &AppState, args: FetchArgs) {
    let (providers, _) = configured_providers(state);
    prefetch_with(&state.lyrics, &providers, args.into()).await
}

pub async fn candidates(state: &AppState) -> Result<Vec<CandidateSummary>, String> {
    let (providers, _) = configured_providers(state);
    list_candidates(&state.lyrics, &providers).await
}

#[tauri::command]
pub fn get_current_lyrics(state: State<'_, Arc<AppState>>) -> CurrentLyrics {
    state.lyrics.current.lock().clone()
}

/// One text per line of the lyrics showing now (a translation or a
/// romanization); `null` where a line has none.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct LineTexts {
    /// The song these belong to, so a reply for a skipped song is dropped.
    pub video_id: Option<String>,
    pub lines: Vec<Option<String>>,
}

/// More than this is not a song's lyrics.
const MAX_TRANSLATED_LINES: usize = 600;
const MAX_TRANSLATED_CHARS: usize = 30_000;

/// The lines every lyrics view shows, in its order: the timed lines, else
/// the plain text line by line.
pub fn shown_lines(lyrics: &Lyrics) -> Vec<String> {
    if lyrics.is_synced() {
        lyrics.synced.iter().map(|l| l.text.clone()).collect()
    } else {
        lyrics.plain.as_deref().unwrap_or("").split('\n').map(str::to_string).collect()
    }
}

/// The current lyrics' lines with the key their translations are cached under.
fn current_texts(ls: &LyricsState) -> Result<(String, Option<String>, Vec<String>), String> {
    let lyrics = ls.current_lyrics.lock().clone().ok_or("No lyrics to work on")?;
    let video_id = ls.current.lock().video_id.clone();
    let lines = shown_lines(&lyrics);
    if lines.len() > MAX_TRANSLATED_LINES || lines.iter().map(|l| l.chars().count()).sum::<usize>() > MAX_TRANSLATED_CHARS {
        return Err("These lyrics are too long".into());
    }
    let key = format!("{}|{}|{}|{}", video_id.as_deref().unwrap_or(""), lyrics.provider.as_str(), lyrics.id, lines.len());
    Ok((key, video_id, lines))
}

/// The playing song's lyrics in `lang`, line by line.
pub async fn translate_current(ls: &LyricsState, lang: &str) -> Result<LineTexts, String> {
    if !super::translate::is_lang(lang) {
        return Err("Invalid language".into());
    }
    let (key, video_id, lines) = current_texts(ls)?;
    let key = format!("t|{lang}|{key}");
    let translated = match ls.translations.get(&key) {
        Some(hit) => hit,
        None => {
            let fresh = super::translate::translate(&ls.http, &lines, lang).await?;
            ls.translations.put(key, fresh.clone());
            fresh
        }
    };
    Ok(LineTexts { video_id, lines: translated })
}

/// The playing song's lyrics in Latin letters, for lines in another script.
pub async fn romanize_current(ls: &LyricsState) -> Result<LineTexts, String> {
    let (key, video_id, lines) = current_texts(ls)?;
    let key = format!("r|{key}");
    let romanized = match ls.translations.get(&key) {
        Some(hit) => hit,
        None if !lines.iter().any(|l| super::translate::needs_romanization(l)) => vec![None; lines.len()],
        None => {
            let fresh = super::translate::romanize(&ls.http, &lines).await?;
            ls.translations.put(key, fresh.clone());
            fresh
        }
    };
    Ok(LineTexts { video_id, lines: romanized })
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
            title: "Neon Runner".into(),
            artist: "Night Drive".into(),
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

    // Regression: a song's id went out with the previous song's title, and
    // that song's lyrics were cached under the new id for 30 days.
    #[tokio::test]
    async fn test_cached_lyrics_of_another_song_are_looked_up_again() {
        let (_d, ls) = state();
        let sink = Recorder::default();
        let mut wrong = lyrics(ProviderId::Lrclib, true, false);
        wrong.title = "Grow A Vine".into();
        wrong.artist = "Kasia".into();
        ls.cache.put("vid1", Some(&wrong), false, now_secs());

        let (p, calls) = provider(Ok(vec![lyrics(ProviderId::Lrclib, true, false)]), 0);
        let got = fetch_with(&ls, std::slice::from_ref(&p), true, query("vid1"), &sink).await;
        assert_eq!(calls.load(Ordering::SeqCst), 1, "looked up again");
        assert_eq!(ls.current_lyrics.lock().as_ref().map(|l| l.title.clone()).as_deref(), Some("Neon Runner"));
        assert!(got.provider.is_some());
        match ls.cache.get("vid1", now_secs()) {
            Some(Cached::Found { lyrics, .. }) => assert_eq!(lyrics.title, "Neon Runner", "cache fixed"),
            other => panic!("{other:?}"),
        }

        // The user's own pick is kept, whatever its title.
        ls.cache.put("vid2", Some(&wrong), true, now_secs());
        fetch_with(&ls, std::slice::from_ref(&p), true, query("vid2"), &sink).await;
        assert_eq!(calls.load(Ordering::SeqCst), 1);
    }

    // The page reported a song's id with the previous song's title, then
    // the right title: the second report must replace the wrong lyrics.
    #[tokio::test]
    async fn test_corrected_title_for_the_same_id_looks_again() {
        let (_d, ls) = state();
        let sink = Recorder::default();
        let mut wrong = lyrics(ProviderId::Lrclib, true, false);
        wrong.title = "I Don't Wanna Be Me".into();
        let (stale_p, _) = provider(Ok(vec![wrong]), 0);
        let mut stale_q = query("vid1");
        stale_q.title = "I Don't Wanna Be Me".into();
        fetch_with(&ls, std::slice::from_ref(&stale_p), true, stale_q, &sink).await;

        let (p, calls) = provider(Ok(vec![lyrics(ProviderId::Lrclib, true, false)]), 0);
        fetch_with(&ls, std::slice::from_ref(&p), true, query("vid1"), &sink).await;
        assert_eq!(calls.load(Ordering::SeqCst), 1);
        assert_eq!(ls.current_lyrics.lock().as_ref().map(|l| l.title.clone()).as_deref(), Some("Neon Runner"));
    }

    // Right song, wrong lyrics: "Search again" forgets the cached answer
    // (even a pick) and looks the playing song up anew.
    #[tokio::test]
    async fn test_refresh_looks_the_playing_song_up_again() {
        let (_d, ls) = state();
        let sink = Recorder::default();
        let (p, calls) = provider(Ok(vec![lyrics(ProviderId::Lrclib, true, false)]), 0);
        assert!(refresh_with(&ls, std::slice::from_ref(&p), true, &sink).await.is_err(), "nothing playing yet");

        fetch_with(&ls, std::slice::from_ref(&p), true, query("vid1"), &sink).await;
        ls.cache.put("vid1", Some(&lyrics(ProviderId::Genius, false, true)), true, now_secs());
        let again = refresh_with(&ls, std::slice::from_ref(&p), true, &sink).await.unwrap();
        assert_eq!(calls.load(Ordering::SeqCst), 2, "looked up anew, not served from the cache");
        assert_eq!(again.provider.as_deref(), Some("lrclib"));
        assert_eq!(ls.current.lock().video_id.as_deref(), Some("vid1"));
        assert!(matches!(ls.cache.get("vid1", now_secs()), Some(Cached::Found { picked: false, .. })));
    }

    #[tokio::test]
    async fn test_prefetch_fills_the_cache_without_touching_the_current_song() {
        let (_d, ls) = state();
        let sink = Recorder::default();
        let (p, calls) = provider(Ok(vec![lyrics(ProviderId::Lrclib, true, false)]), 0);
        fetch_with(&ls, std::slice::from_ref(&p), true, query("now"), &sink).await;
        let events = sink.0.lock().len();

        prefetch_with(&ls, std::slice::from_ref(&p), query("next")).await;
        assert_eq!(sink.0.lock().len(), events, "nothing broadcast");
        assert_eq!(ls.current.lock().video_id.as_deref(), Some("now"));
        assert!(matches!(ls.cache.get("next", now_secs()), Some(Cached::Found { .. })));

        // Already cached: no second lookup, and the song then comes from the cache.
        prefetch_with(&ls, std::slice::from_ref(&p), query("next")).await;
        fetch_with(&ls, std::slice::from_ref(&p), true, query("next"), &sink).await;
        assert_eq!(calls.load(Ordering::SeqCst), 2);
    }

    // Regression: the title "City Lights" was among the song's tags, and as
    // an artist alias it matched "Harbor City Lights" (German lyrics).
    #[test]
    fn test_tags_about_the_song_itself_are_not_artist_names() {
        let tags = ["Mira Vale", "Young Oskar", "Tidewave", "City Lights", "city lights (official audio)"];
        let aliases = artist_aliases(tags.iter().map(|t| t.to_string()).collect(), "City Lights", 20, 100);
        assert_eq!(aliases, ["Mira Vale", "Young Oskar", "Tidewave"]);

        use super::super::matching::{score_match, Candidate};
        let berlin = Candidate { title: "Harbor City Lights", artist: "Harbor City Lights", duration: None, has_synced: false };
        assert_eq!(score_match(&berlin, "City Lights", "Mira Vale, Young Oskar i Tidewave", &aliases, None), 0.0);
    }

    #[test]
    fn test_fetch_args_cap_the_aliases() {
        let args: FetchArgs = serde_json::from_value(serde_json::json!({
            "artist": "A", "title": "T",
            "artistAliases": (0..50).map(|i| format!("{i}{}", "x".repeat(300))).chain(["  ".to_string()]).collect::<Vec<_>>()
        }))
        .unwrap();
        let q: Query = args.into();
        assert_eq!(q.artist_aliases.len(), 20);
        assert!(q.artist_aliases.iter().all(|a| a.chars().count() <= 100));
    }

    #[test]
    fn test_cached_fits_tolerates_video_style_titles() {
        let q = |title: &str| Query { title: title.into(), ..Default::default() };
        let l = lyrics(ProviderId::Lrclib, true, false); // "Neon Runner"
        assert!(cached_fits(&l, &q("Night Drive - Neon Runner (Official Video)")));
        assert!(cached_fits(&l, &q("neon runner")));
        assert!(!cached_fits(&l, &q("Wake Me Up Inside")));
        // Cached before results had to match the artist: a similar title
        // by someone else is looked up again.
        let by = |artist: &str| Query { title: "Neon Runner".into(), artist: artist.into(), ..Default::default() };
        assert!(cached_fits(&l, &by("Night Drive")));
        assert!(!cached_fits(&l, &by("fawn i francis")));
        let mut untitled = l.clone();
        untitled.title.clear();
        assert!(cached_fits(&untitled, &q("Wake Me Up Inside")));
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
        let added = import_offsets(&ls, vec![("Neon Runner - Night Drive".into(), 0.5)], &sink);
        assert_eq!(added, 1);
        assert_eq!(ls.current.lock().offset_secs, 0.5);
        assert_eq!(import_offsets(&ls, vec![("Neon Runner - Night Drive".into(), 9.0)], &sink), 0);
    }

    #[tokio::test]
    async fn test_translation_is_for_the_lines_showing_and_cached() {
        let (_d, ls) = state();
        let sink = Recorder::default();
        assert!(translate_current(&ls, "pl").await.is_err(), "no lyrics yet");
        assert!(romanize_current(&ls).await.is_err());

        let (p, _) = provider(Ok(vec![lyrics(ProviderId::Lrclib, true, true)]), 0);
        fetch_with(&ls, std::slice::from_ref(&p), true, query("vid1"), &sink).await;
        assert_eq!(translate_current(&ls, "en&tl=x").await.unwrap_err(), "Invalid language");

        // Latin text has nothing to romanize: answered without the network.
        let roman = romanize_current(&ls).await.unwrap();
        assert_eq!(roman, LineTexts { video_id: Some("vid1".into()), lines: vec![None] });

        // A cached translation is served as is (no request is made).
        ls.translations.put("t|pl|vid1|lrclib|lrclib-1|1".into(), vec![Some("la po polsku".into())]);
        let got = translate_current(&ls, "pl").await.unwrap();
        assert_eq!(got.lines, [Some("la po polsku".to_string())]);
        assert_eq!(got.video_id.as_deref(), Some("vid1"));
    }

    #[test]
    fn test_shown_lines_follow_what_the_views_render() {
        assert_eq!(shown_lines(&lyrics(ProviderId::Lrclib, true, true)), ["la"], "timed lines win");
        let mut plain = lyrics(ProviderId::Genius, false, true);
        plain.plain = Some("one\n\ntwo".into());
        assert_eq!(shown_lines(&plain), ["one", "", "two"], "empty lines keep their place");
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
