//! Lyrics from several providers, merged by the user's priority order.
//!
//! Every provider is queried at once (each capped at `PROVIDER_TIMEOUT`).
//! The first provider in priority order with synced lyrics wins; if none
//! has synced lyrics, the first one with plain text does. The answer is
//! cached per song on disk, and the current song's lyrics are kept in
//! `LyricsState` and broadcast to every window as `lyrics-changed`
//! (`schemas/lyrics_v1.json`).

pub mod cache;
pub mod commands;
pub mod genius;
pub mod local;
pub mod lrc;
pub mod lrclib;
pub mod lrcred;
pub mod matching;
pub mod musixmatch;
pub mod netease;
pub mod offsets;
pub mod translate;
pub mod ttml;
pub mod unison;

use futures_util::future::BoxFuture;
use futures_util::stream::{FuturesUnordered, StreamExt};
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::atomic::AtomicU64;
use std::sync::Arc;
use std::time::Duration;

pub const PROVIDER_TIMEOUT: Duration = Duration::from_secs(6);

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct Word {
    /// Seconds from the start of the song.
    pub t: f64,
    pub text: String,
    /// When the word stops being sung, when the provider says.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub end: Option<f64>,
}

/// Background vocals sung under a line ("(ooh, ooh)").
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct Background {
    pub text: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub words: Option<Vec<Word>>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct Line {
    /// Seconds from the start of the song.
    pub t: f64,
    pub text: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub words: Option<Vec<Word>>,
    /// When the line stops being sung, when the provider says.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub end: Option<f64>,
    /// Sung by the song's second voice (a duet): shown on the other side.
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub alt: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bg: Option<Background>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProviderId {
    Local,
    Lrcred,
    Lrclib,
    Unison,
    Musixmatch,
    Netease,
    Ytm,
    Genius,
}

impl ProviderId {
    /// Default priority order.
    pub const ALL: [ProviderId; 8] = [
        ProviderId::Local,
        ProviderId::Lrcred,
        ProviderId::Lrclib,
        ProviderId::Unison,
        ProviderId::Musixmatch,
        ProviderId::Netease,
        ProviderId::Ytm,
        ProviderId::Genius,
    ];

    pub fn as_str(self) -> &'static str {
        match self {
            ProviderId::Local => "local",
            ProviderId::Lrcred => "lrcred",
            ProviderId::Lrclib => "lrclib",
            ProviderId::Unison => "unison",
            ProviderId::Musixmatch => "musixmatch",
            ProviderId::Netease => "netease",
            ProviderId::Ytm => "ytm",
            ProviderId::Genius => "genius",
        }
    }

    pub fn parse(s: &str) -> Option<Self> {
        Self::ALL.into_iter().find(|p| p.as_str() == s)
    }

    /// Musixmatch and NetEase go through unofficial APIs that may break or
    /// be against those services' terms, and Unison is Better Lyrics' own
    /// community service with no stated permission for other apps, so the
    /// user has to turn them on.
    pub fn unofficial(self) -> bool {
        matches!(self, ProviderId::Musixmatch | ProviderId::Netease | ProviderId::Unison)
    }
}

/// One entry of `AppConfig::lyrics_providers`. The id stays a string so an
/// unknown id in a hand-edited config is dropped by the sanitizer instead
/// of failing the whole config load.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ProviderSetting {
    pub id: String,
    pub enabled: bool,
}

pub fn default_provider_settings() -> Vec<ProviderSetting> {
    ProviderId::ALL
        .into_iter()
        .map(|p| ProviderSetting {
            id: p.as_str().to_string(),
            enabled: !p.unofficial(),
        })
        .collect()
}

/// Known ids only, each once, in the user's order. A provider missing from
/// the list (one added in a newer version) goes where the default order
/// has it: right after the nearest provider before it that the list has,
/// else first. Appended at the end, a new word-by-word source would sit
/// behind every source the user already had and never be picked.
pub fn sanitize_provider_settings(settings: Vec<ProviderSetting>) -> Vec<ProviderSetting> {
    let mut out: Vec<ProviderSetting> = Vec::new();
    for s in settings {
        if ProviderId::parse(&s.id).is_some() && !out.iter().any(|o| o.id == s.id) {
            out.push(s);
        }
    }
    let defaults = default_provider_settings();
    for (i, d) in defaults.iter().enumerate() {
        if out.iter().any(|o| o.id == d.id) {
            continue;
        }
        let at = defaults[..i]
            .iter()
            .rev()
            .find_map(|before| out.iter().position(|o| o.id == before.id))
            .map_or(0, |pos| pos + 1);
        out.insert(at, d.clone());
    }
    out
}

/// Enabled providers in priority order.
pub fn enabled_providers(settings: &[ProviderSetting]) -> Vec<ProviderId> {
    sanitize_provider_settings(settings.to_vec())
        .into_iter()
        .filter(|s| s.enabled)
        .filter_map(|s| ProviderId::parse(&s.id))
        .collect()
}

/// One provider's lyrics for one song.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Lyrics {
    pub provider: ProviderId,
    /// The provider's own id for this result (for "Wrong lyrics?").
    pub id: String,
    /// The song the provider matched, shown in the picker.
    pub title: String,
    pub artist: String,
    pub synced: Vec<Line>,
    pub plain: Option<String>,
    pub source_url: Option<String>,
}

impl Lyrics {
    pub fn is_synced(&self) -> bool {
        !self.synced.is_empty()
    }

    pub fn has_text(&self) -> bool {
        self.is_synced() || self.plain.as_deref().is_some_and(|p| !p.trim().is_empty())
    }

    /// Keeps the words, drops the timing: for synced lyrics of another
    /// version of the song, which are right as text but wrong as timing.
    pub fn demote_to_plain(&mut self) {
        if self.synced.is_empty() {
            return;
        }
        if self.plain.as_deref().is_none_or(|p| p.trim().is_empty()) {
            self.plain = Some(self.synced.iter().map(|l| l.text.as_str()).collect::<Vec<_>>().join("\n"));
        }
        self.synced.clear();
    }
}

/// Synced lyrics whose last line comes after the song has ended were timed
/// for a longer version; they keep their words but lose their timing.
/// Margin for a closing line sung over the fade-out.
const LAST_LINE_MARGIN_SECS: f64 = 5.0;

pub fn vet(mut lyrics: Lyrics, q: &Query) -> Lyrics {
    let last = lyrics.synced.last().map(|l| l.t);
    if let (Some(last), Some(duration)) = (last, q.duration) {
        if last > duration + LAST_LINE_MARGIN_SECS {
            log::info!(
                "[Oscilla Lyrics] {} \"{}\": last line at {last:.0} s, song is {duration:.0} s: using it as plain text",
                lyrics.provider.as_str(),
                lyrics.title
            );
            lyrics.demote_to_plain();
        }
    }
    lyrics
}

/// What is known about the song being looked up.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct Query {
    pub video_id: Option<String>,
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub duration: Option<f64>,
    /// Plain lyrics YouTube Music itself shows in its Lyrics tab, read by
    /// the page (Rust never scrapes YTM).
    pub ytm_plain: Option<String>,
    /// Other names for the artist (the song's tags on YouTube), for matching.
    pub artist_aliases: Vec<String>,
}

impl Query {
    /// Legacy offset key the page used (`"title - artist"`).
    pub fn song_key(&self) -> String {
        format!("{} - {}", self.title, self.artist)
    }
}

pub trait LyricsProvider: Send + Sync {
    fn id(&self) -> ProviderId;
    /// Matching results, best first; empty when the song isn't there.
    fn search<'a>(&'a self, q: &'a Query) -> BoxFuture<'a, Result<Vec<Lyrics>, String>>;
}

/// Outcome of the priority merge over results so far (`None` = provider
/// still running), in priority order.
#[derive(Debug, PartialEq)]
pub enum Decision {
    /// Provider index, result index.
    Pick(usize, usize),
    /// A higher-priority provider may still return synced lyrics.
    Wait,
    NotFound,
}

pub fn decide(results: &[Option<Vec<Lyrics>>]) -> Decision {
    for (i, r) in results.iter().enumerate() {
        match r {
            None => return Decision::Wait,
            Some(list) => {
                if let Some(j) = list.iter().position(Lyrics::is_synced) {
                    return Decision::Pick(i, j);
                }
            }
        }
    }
    for (i, r) in results.iter().enumerate() {
        if let Some(j) = r.as_ref().and_then(|l| l.iter().position(Lyrics::has_text)) {
            return Decision::Pick(i, j);
        }
    }
    Decision::NotFound
}

/// A provider's results, or `None` when it failed or timed out.
async fn run_one(p: &dyn LyricsProvider, q: &Query, timeout: Duration) -> Option<Vec<Lyrics>> {
    match tokio::time::timeout(timeout, p.search(q)).await {
        Ok(Ok(found)) => Some(found.into_iter().map(|l| vet(l, q)).collect()),
        Ok(Err(e)) => {
            log::debug!("[Oscilla Lyrics] {} failed: {e}", p.id().as_str());
            None
        }
        Err(_) => {
            log::debug!("[Oscilla Lyrics] {} timed out", p.id().as_str());
            None
        }
    }
}

/// Queries every provider at once and returns as soon as the priority
/// rule can decide, without waiting for slower lower-priority providers.
/// The flag says whether every provider that mattered answered, so a miss
/// caused by a failure isn't mistaken for "no lyrics exist".
pub async fn find_best(providers: &[Arc<dyn LyricsProvider>], q: &Query, timeout: Duration) -> (Option<Lyrics>, bool) {
    let mut results: Vec<Option<Vec<Lyrics>>> = vec![None; providers.len()];
    let mut complete = true;
    let mut pending: FuturesUnordered<_> = providers
        .iter()
        .enumerate()
        .map(|(i, p)| async move { (i, run_one(p.as_ref(), q, timeout).await) })
        .collect();

    loop {
        match decide(&results) {
            Decision::Pick(i, j) => return (results[i].as_mut().map(|l| l.swap_remove(j)), complete),
            Decision::NotFound => return (None, complete),
            Decision::Wait => {}
        }
        let Some((i, found)) = pending.next().await else {
            return (None, complete);
        };
        complete &= found.is_some();
        results[i] = Some(found.unwrap_or_default());
    }
}

/// Every provider's results, in priority order (for the picker).
pub async fn search_all(providers: &[Arc<dyn LyricsProvider>], q: &Query, timeout: Duration) -> Vec<Lyrics> {
    let all = futures_util::future::join_all(providers.iter().map(|p| run_one(p.as_ref(), q, timeout))).await;
    all.into_iter().flatten().flatten().filter(Lyrics::has_text).collect()
}

/// The contract payload of `lyrics-changed` / `get_current_lyrics`.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct CurrentLyrics {
    pub video_id: Option<String>,
    pub provider: Option<String>,
    pub synced: Vec<Line>,
    pub plain: Option<String>,
    /// Positive = lyrics run ahead: a line is active once
    /// `position + offset_secs >= line.t`.
    pub offset_secs: f64,
    pub source_url: Option<String>,
}

impl CurrentLyrics {
    pub fn from_lyrics(video_id: Option<String>, lyrics: Option<&Lyrics>, offset_secs: f64) -> Self {
        match lyrics {
            Some(l) => CurrentLyrics {
                video_id,
                provider: Some(l.provider.as_str().to_string()),
                synced: l.synced.clone(),
                plain: l.plain.clone().filter(|p| !p.trim().is_empty()),
                offset_secs,
                source_url: l.source_url.clone(),
            },
            None => CurrentLyrics {
                video_id,
                offset_secs,
                ..Default::default()
            },
        }
    }
}

/// Backend lyrics state shared by the bridge and Tauri commands.
pub struct LyricsState {
    pub http: reqwest::Client,
    pub cache: cache::LyricsCache,
    pub offsets: offsets::OffsetStore,
    pub musixmatch: Arc<musixmatch::TokenCache>,
    pub local_index: Arc<local::LocalIndex>,
    pub current: Mutex<CurrentLyrics>,
    /// The query and lyrics behind `current`, for the picker and offsets.
    pub current_query: Mutex<Option<Query>>,
    pub current_lyrics: Mutex<Option<Lyrics>>,
    /// Results of the last "Wrong lyrics?" listing, for `pick_lyrics`.
    pub candidates: Mutex<Vec<Lyrics>>,
    /// Bumped per lookup so a slow answer for a skipped song is dropped.
    pub generation: AtomicU64,
    /// Translations and romanizations of recent songs.
    pub translations: translate::TranslationCache,
}

impl LyricsState {
    /// `data_dir` is `~/.oscilla`.
    pub fn new(data_dir: PathBuf) -> Self {
        let http = reqwest::Client::builder()
            .user_agent(concat!("Oscilla/", env!("CARGO_PKG_VERSION"), " (https://github.com/KayZedd/Oscilla)"))
            .timeout(Duration::from_secs(10))
            .build()
            .unwrap_or_default();
        Self {
            http,
            cache: cache::LyricsCache::new(data_dir.join("lyrics_cache")),
            offsets: offsets::OffsetStore::new(data_dir.join("lyrics_offsets.json")),
            musixmatch: Arc::new(musixmatch::TokenCache::default()),
            local_index: Arc::new(local::LocalIndex::default()),
            current: Mutex::new(CurrentLyrics::default()),
            current_query: Mutex::new(None),
            current_lyrics: Mutex::new(None),
            candidates: Mutex::new(Vec::new()),
            generation: AtomicU64::new(0),
            translations: translate::TranslationCache::default(),
        }
    }

    /// Provider objects for `ids`, in the same order.
    pub fn providers(&self, ids: &[ProviderId], local_roots: Vec<PathBuf>) -> Vec<Arc<dyn LyricsProvider>> {
        ids.iter()
            .map(|id| -> Arc<dyn LyricsProvider> {
                match id {
                    ProviderId::Local => Arc::new(local::LocalProvider::new(self.local_index.clone(), local_roots.clone())),
                    ProviderId::Lrcred => Arc::new(lrcred::LrcRed::new(self.http.clone())),
                    ProviderId::Lrclib => Arc::new(lrclib::Lrclib::new(self.http.clone())),
                    ProviderId::Unison => Arc::new(unison::Unison::new(self.http.clone())),
                    ProviderId::Musixmatch => Arc::new(musixmatch::Musixmatch::new(self.musixmatch.clone())),
                    ProviderId::Netease => Arc::new(netease::Netease::new()),
                    ProviderId::Ytm => Arc::new(YtmProvider),
                    ProviderId::Genius => Arc::new(genius::Genius::new()),
                }
            })
            .collect()
    }
}

/// YouTube Music's own (plain) lyrics, handed over by the page.
pub struct YtmProvider;

impl LyricsProvider for YtmProvider {
    fn id(&self) -> ProviderId {
        ProviderId::Ytm
    }

    fn search<'a>(&'a self, q: &'a Query) -> BoxFuture<'a, Result<Vec<Lyrics>, String>> {
        Box::pin(async move { Ok(ytm_lyrics(q).into_iter().collect()) })
    }
}

pub fn ytm_lyrics(q: &Query) -> Option<Lyrics> {
    let text = q.ytm_plain.as_deref().map(str::trim).filter(|t| !t.is_empty())?;
    Some(Lyrics {
        provider: ProviderId::Ytm,
        id: "ytm".into(),
        title: q.title.clone(),
        artist: q.artist.clone(),
        synced: Vec::new(),
        plain: Some(text.to_string()),
        source_url: q.video_id.as_ref().map(|v| format!("https://music.youtube.com/watch?v={v}")),
    })
}

/// HTML entity decoding for the handful of forms lyrics pages use.
pub fn decode_entities(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut rest = s;
    while let Some(i) = rest.find('&') {
        out.push_str(&rest[..i]);
        rest = &rest[i..];
        // Looked for by byte: slicing the first 12 bytes as a `str` panicked
        // when they ended inside a letter like "ć" ("&quot;\nWróć"). `;` is
        // ASCII, so where it's found is always a char boundary.
        let Some(end) = rest.bytes().take(12).position(|b| b == b';') else {
            out.push('&');
            rest = &rest[1..];
            continue;
        };
        let entity = &rest[1..end];
        let decoded = match entity {
            "amp" => Some('&'),
            "lt" => Some('<'),
            "gt" => Some('>'),
            "quot" => Some('"'),
            "apos" => Some('\''),
            "nbsp" => Some(' '),
            _ => entity
                .strip_prefix("#x")
                .or_else(|| entity.strip_prefix("#X"))
                .and_then(|h| u32::from_str_radix(h, 16).ok())
                .or_else(|| entity.strip_prefix('#').and_then(|d| d.parse().ok()))
                .and_then(char::from_u32),
        };
        match decoded {
            Some(c) => {
                out.push(c);
                rest = &rest[end + 1..];
            }
            None => {
                out.push('&');
                rest = &rest[1..];
            }
        }
    }
    out.push_str(rest);
    out
}

#[cfg(test)]
pub(crate) mod test_util {
    use super::*;

    pub fn lyrics(provider: ProviderId, synced: bool, plain: bool) -> Lyrics {
        Lyrics {
            provider,
            id: format!("{}-1", provider.as_str()),
            title: "Maniac".into(),
            artist: "Carpenter Brut".into(),
            synced: if synced {
                vec![Line { t: 1.0, text: "la".into(), ..Default::default() }]
            } else {
                Vec::new()
            },
            plain: plain.then(|| "la".to_string()),
            source_url: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::test_util::lyrics;
    use super::*;

    fn timed(times: &[f64]) -> Lyrics {
        let mut l = lyrics(ProviderId::Lrclib, false, false);
        l.synced = times.iter().map(|&t| Line { t, text: format!("at {t}"), ..Default::default() }).collect();
        l
    }

    #[test]
    fn test_demote_keeps_the_words_and_drops_the_timing() {
        let mut l = timed(&[1.0, 2.0]);
        l.demote_to_plain();
        assert!(l.synced.is_empty());
        assert_eq!(l.plain.as_deref(), Some("at 1\nat 2"));

        let mut with_plain = lyrics(ProviderId::Lrclib, true, true);
        with_plain.demote_to_plain();
        assert_eq!(with_plain.plain.as_deref(), Some("la"), "its own plain text wins");
    }

    // Synced lyrics that run past the song's end were timed for a longer
    // version: shown as text, never highlighted at the wrong moments.
    #[test]
    fn test_vet_demotes_lyrics_that_outlast_the_song() {
        let q = |d: Option<f64>| Query { duration: d, ..Default::default() };
        assert!(vet(timed(&[10.0, 250.0]), &q(Some(237.0))).synced.is_empty());
        assert_eq!(vet(timed(&[10.0, 240.0]), &q(Some(237.0))).synced.len(), 2, "within the fade-out margin");
        assert_eq!(vet(timed(&[10.0, 250.0]), &q(None)).synced.len(), 2, "unknown length: kept");
    }

    struct Fake {
        id: ProviderId,
        delay_ms: u64,
        result: Vec<Lyrics>,
    }

    impl LyricsProvider for Fake {
        fn id(&self) -> ProviderId {
            self.id
        }
        fn search<'a>(&'a self, _q: &'a Query) -> BoxFuture<'a, Result<Vec<Lyrics>, String>> {
            Box::pin(async move {
                tokio::time::sleep(Duration::from_millis(self.delay_ms)).await;
                Ok(self.result.clone())
            })
        }
    }

    fn fake(id: ProviderId, delay_ms: u64, result: Vec<Lyrics>) -> Arc<dyn LyricsProvider> {
        Arc::new(Fake { id, delay_ms, result })
    }

    #[test]
    fn test_decide_prefers_synced_by_priority_over_plain() {
        use ProviderId::*;
        let plain_first = [Some(vec![lyrics(Lrclib, false, true)]), Some(vec![lyrics(Netease, true, false)])];
        assert_eq!(decide(&plain_first), Decision::Pick(1, 0), "synced from a lower provider beats plain");
        let both_synced = [Some(vec![lyrics(Lrclib, true, false)]), Some(vec![lyrics(Netease, true, false)])];
        assert_eq!(decide(&both_synced), Decision::Pick(0, 0));
        let only_plain = [Some(vec![]), Some(vec![lyrics(Genius, false, true)])];
        assert_eq!(decide(&only_plain), Decision::Pick(1, 0));
        assert_eq!(decide(&[Some(vec![]), Some(vec![])]), Decision::NotFound);
    }

    #[test]
    fn test_decide_waits_for_higher_priority_providers() {
        use ProviderId::*;
        assert_eq!(decide(&[None, Some(vec![lyrics(Netease, true, false)])]), Decision::Wait);
        assert_eq!(decide(&[Some(vec![lyrics(Lrclib, true, false)]), None]), Decision::Pick(0, 0));
        assert_eq!(decide(&[Some(vec![lyrics(Lrclib, false, true)]), None]), Decision::Wait, "a later synced result may still win");
    }

    #[tokio::test]
    async fn test_find_best_returns_without_waiting_for_slow_lower_priority() {
        use ProviderId::*;
        let providers = [fake(Lrclib, 0, vec![lyrics(Lrclib, true, false)]), fake(Genius, 5_000, vec![])];
        let started = std::time::Instant::now();
        let (best, _) = find_best(&providers, &Query::default(), PROVIDER_TIMEOUT).await;
        assert_eq!(best.unwrap().provider, Lrclib);
        assert!(started.elapsed() < Duration::from_secs(1));
    }

    #[tokio::test]
    async fn test_find_best_times_out_a_hung_provider() {
        use ProviderId::*;
        let providers = [fake(Lrclib, 5_000, vec![lyrics(Lrclib, true, false)]), fake(Genius, 0, vec![lyrics(Genius, false, true)])];
        let (best, complete) = find_best(&providers, &Query::default(), Duration::from_millis(100)).await;
        assert_eq!(best.unwrap().provider, Genius);
        assert!(!complete, "the timed-out provider makes the answer incomplete");
    }

    #[tokio::test]
    async fn test_search_all_keeps_priority_order() {
        use ProviderId::*;
        let providers = [fake(Lrclib, 50, vec![lyrics(Lrclib, true, false)]), fake(Genius, 0, vec![lyrics(Genius, false, true)])];
        let all = search_all(&providers, &Query::default(), PROVIDER_TIMEOUT).await;
        assert_eq!(all.iter().map(|l| l.provider).collect::<Vec<_>>(), [Lrclib, Genius]);
    }

    #[test]
    fn test_provider_settings_sanitize_and_defaults() {
        let defaults = default_provider_settings();
        assert_eq!(defaults.len(), ProviderId::ALL.len());
        assert!(!defaults.iter().find(|s| s.id == "musixmatch").unwrap().enabled);
        assert!(!defaults.iter().find(|s| s.id == "netease").unwrap().enabled);
        assert!(defaults.iter().find(|s| s.id == "lrclib").unwrap().enabled);

        let user = vec![
            ProviderSetting { id: "genius".into(), enabled: true },
            ProviderSetting { id: "bogus".into(), enabled: true },
            ProviderSetting { id: "genius".into(), enabled: false },
            ProviderSetting { id: "lrclib".into(), enabled: false },
        ];
        let clean = sanitize_provider_settings(user.clone());
        let ids = |list: &[ProviderSetting]| list.iter().map(|s| s.id.clone()).collect::<Vec<_>>();
        // The user's two, in their order; the rest where the default order has them.
        assert_eq!(ids(&clean), ["local", "lrcred", "genius", "lrclib", "unison", "musixmatch", "netease", "ytm"]);
        assert!(clean.iter().find(|s| s.id == "genius").unwrap().enabled);
        assert!(!clean.iter().find(|s| s.id == "lrclib").unwrap().enabled);
        assert!(!clean.iter().find(|s| s.id == "unison").unwrap().enabled, "unofficial: off until turned on");
        assert_eq!(enabled_providers(&user), [ProviderId::Local, ProviderId::Lrcred, ProviderId::Genius, ProviderId::Ytm]);
    }

    // A config saved before lrc.red existed: the new word-by-word source
    // goes ahead of LRCLIB as in the default order, not behind everything.
    #[test]
    fn test_new_providers_join_an_older_list_at_their_default_place() {
        let list = |ids: [&str; 6]| ids.map(|id| ProviderSetting { id: id.into(), enabled: true }).to_vec();
        let ids = |l: Vec<ProviderSetting>| l.into_iter().map(|s| s.id).collect::<Vec<_>>();
        let old = list(["local", "lrclib", "musixmatch", "netease", "ytm", "genius"]);
        assert_eq!(ids(sanitize_provider_settings(old)), ProviderId::ALL.map(|p| p.as_str().to_string()));

        let reordered = list(["genius", "lrclib", "local", "musixmatch", "netease", "ytm"]);
        assert_eq!(
            ids(sanitize_provider_settings(reordered)),
            ["genius", "lrclib", "unison", "local", "lrcred", "musixmatch", "netease", "ytm"]
        );
    }

    #[test]
    fn test_ytm_lyrics_only_with_text() {
        let mut q = Query { title: "Maniac".into(), ..Default::default() };
        assert!(ytm_lyrics(&q).is_none());
        q.ytm_plain = Some("  \n ".into());
        assert!(ytm_lyrics(&q).is_none());
        q.ytm_plain = Some("Line one\nLine two".into());
        assert_eq!(ytm_lyrics(&q).unwrap().plain.as_deref(), Some("Line one\nLine two"));
    }

    #[test]
    fn test_current_lyrics_payload_matches_contract() {
        let mut l = lyrics(ProviderId::Lrclib, true, true);
        l.synced[0].words = Some(vec![Word { t: 1.0, text: "la".into(), end: None }]);
        let payload = CurrentLyrics::from_lyrics(Some("vid".into()), Some(&l), 0.5);
        let v = serde_json::to_value(&payload).unwrap();
        let keys: std::collections::BTreeSet<_> = v.as_object().unwrap().keys().cloned().collect();
        assert_eq!(
            keys,
            ["offset_secs", "plain", "provider", "source_url", "synced", "video_id"].map(String::from).into()
        );
        assert_eq!(v["provider"], "lrclib");
        assert_eq!(v["synced"][0]["words"][0]["t"], 1.0);
        let none = serde_json::to_value(CurrentLyrics::from_lyrics(None, None, 0.0)).unwrap();
        assert!(none["synced"].as_array().unwrap().is_empty() && none["provider"].is_null());
        assert!(serde_json::to_value(&payload).unwrap()["synced"][0].get("words").is_some());
        let no_words = CurrentLyrics::from_lyrics(None, Some(&lyrics(ProviderId::Lrclib, true, false)), 0.0);
        assert!(serde_json::to_value(no_words).unwrap()["synced"][0].get("words").is_none());
    }

    #[test]
    fn test_payload_matches_the_published_schema() {
        let schema: serde_json::Value = serde_json::from_str(include_str!("../../../schemas/lyrics_v1.json")).unwrap();
        let mut required: Vec<String> = serde_json::from_value(schema["required"].clone()).unwrap();
        required.sort();
        let payload = serde_json::to_value(CurrentLyrics::default()).unwrap();
        let mut keys: Vec<String> = payload.as_object().unwrap().keys().cloned().collect();
        keys.sort();
        assert_eq!(keys, required);

        let providers: Vec<Option<String>> = serde_json::from_value(schema["properties"]["provider"]["enum"].clone()).unwrap();
        let mut expected: Vec<Option<String>> = ProviderId::ALL.iter().map(|p| Some(p.as_str().to_string())).collect();
        expected.push(None);
        assert_eq!(providers, expected);
        assert!(ProviderId::ALL.iter().all(|p| serde_json::to_value(p).unwrap() == p.as_str()));

        // The optional parts of a line are the ones the schema lists.
        let line = Line {
            t: 1.0,
            text: "la".into(),
            words: Some(vec![Word { t: 1.0, text: "la".into(), end: Some(2.0) }]),
            end: Some(2.0),
            alt: true,
            bg: Some(Background { text: "(ooh)".into(), words: Some(vec![Word::default()]) }),
        };
        let keys = |v: &serde_json::Value| v.as_object().unwrap().keys().cloned().collect::<std::collections::BTreeSet<_>>();
        let props = |v: &serde_json::Value| keys(&v["properties"]);
        let line_schema = &schema["properties"]["synced"]["items"];
        let json = serde_json::to_value(&line).unwrap();
        assert_eq!(keys(&json), props(line_schema));
        assert_eq!(keys(&json["bg"]), props(&line_schema["properties"]["bg"]));
        assert_eq!(keys(&json["words"][0]), props(&schema["$defs"]["Word"]));
        // What a plain timed line sends is unchanged: only its time and text.
        let bare = serde_json::to_value(Line { t: 1.0, text: "la".into(), ..Default::default() }).unwrap();
        assert_eq!(keys(&bare), ["t", "text"].map(String::from).into());
    }

    #[test]
    fn test_decode_entities() {
        assert_eq!(decode_entities("Rock &amp; Roll &#x27;n&#39; &quot;x&quot; &lt;3 &unknown; & done"), "Rock & Roll 'n' \"x\" <3 &unknown; & done");
    }

    // Regression: Genius lyrics of a Polish song crashed the lookup (a
    // panic), the first 12 bytes after `&` ending inside "ć".
    #[test]
    fn test_decode_entities_with_polish_letters_after_an_ampersand() {
        assert_eq!(decode_entities("&quot;\nWróć"), "\"\nWróć");
        assert_eq!(decode_entities("A & żółć ćma"), "A & żółć ćma");
        assert_eq!(decode_entities("&ąęśćźżółń;"), "&ąęśćźżółń;");
        for s in ["&ć", "&źźźźźźźźźź", "x&\u{1F3B5}\u{1F3B5}\u{1F3B5};"] {
            decode_entities(s); // never panics, whatever follows the `&`
        }
    }
}
