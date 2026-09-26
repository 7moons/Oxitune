//! Lyrics already on disk: for the song's file in the local library, a
//! `.lrc` next to it or lyrics in its tags.

use super::lrc::parse_lrc;
use super::matching::{clean_track_name, score_match, token_similarity, Candidate, MIN_MATCH_SCORE};
use super::{Lyrics, LyricsProvider, ProviderId, Query};
use crate::local_files::LocalTrack;
use futures_util::future::BoxFuture;
use lofty::prelude::*;
use parking_lot::Mutex;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::{Duration, Instant};

/// How long a library scan is reused before the folders are walked again.
const INDEX_TTL: Duration = Duration::from_secs(10 * 60);

/// Scanned tracks of the configured folders, shared across lookups. A scan
/// runs on a blocking thread and fills this in even if the lookup that
/// started it already timed out.
/// Which folders were scanned, when, and what they held.
type Snapshot = (Vec<PathBuf>, Instant, Arc<Vec<LocalTrack>>);

#[derive(Default)]
pub struct LocalIndex {
    inner: Mutex<Option<Snapshot>>,
    scanning: Mutex<bool>,
}

impl LocalIndex {
    async fn tracks(self: &Arc<Self>, roots: &[PathBuf]) -> Arc<Vec<LocalTrack>> {
        if let Some((r, at, tracks)) = self.inner.lock().as_ref() {
            if r == roots && at.elapsed() < INDEX_TTL {
                return tracks.clone();
            }
        }
        {
            let mut scanning = self.scanning.lock();
            if *scanning {
                return Arc::new(Vec::new());
            }
            *scanning = true;
        }
        let me = self.clone();
        let roots = roots.to_vec();
        let scanned = tokio::task::spawn_blocking(move || {
            let tracks: Vec<LocalTrack> = roots
                .iter()
                .filter(|r| r.is_dir())
                .flat_map(|r| crate::local_files::scan_directory(r))
                .collect();
            let tracks = Arc::new(tracks);
            *me.inner.lock() = Some((roots, Instant::now(), tracks.clone()));
            *me.scanning.lock() = false;
            tracks
        })
        .await;
        scanned.unwrap_or_else(|_| {
            *self.scanning.lock() = false;
            Arc::new(Vec::new())
        })
    }
}

pub struct LocalProvider {
    index: Arc<LocalIndex>,
    roots: Vec<PathBuf>,
}

impl LocalProvider {
    pub fn new(index: Arc<LocalIndex>, roots: Vec<PathBuf>) -> Self {
        let mut unique: Vec<PathBuf> = Vec::new();
        for r in roots {
            if !r.as_os_str().is_empty() && !unique.contains(&r) {
                unique.push(r);
            }
        }
        Self { index, roots: unique }
    }
}

/// Library files that are this song, best first. The title must really
/// match: a local file is trusted over every online provider.
pub fn matching_tracks<'a>(tracks: &'a [LocalTrack], q: &Query) -> Vec<&'a LocalTrack> {
    let title = clean_track_name(&q.title);
    let mut scored: Vec<(f64, &LocalTrack)> = tracks
        .iter()
        .filter(|t| token_similarity(&t.title, &title) >= 0.85)
        .map(|t| {
            let cand = Candidate {
                title: &t.title,
                artist: &t.artist,
                duration: (t.duration_secs > 0).then_some(t.duration_secs as f64),
                has_synced: false,
            };
            (score_match(&cand, &title, &q.artist, &q.artist_aliases, q.duration), t)
        })
        .filter(|(s, _)| *s > MIN_MATCH_SCORE)
        .collect();
    scored.sort_by(|a, b| b.0.total_cmp(&a.0));
    scored.into_iter().map(|(_, t)| t).collect()
}

/// Lyrics text as synced lines if it is LRC, else as plain text.
fn lyrics_from_text(text: &str, track: &LocalTrack, source: &Path) -> Option<Lyrics> {
    let synced = parse_lrc(text);
    let plain = if synced.is_empty() {
        Some(text.trim().to_string()).filter(|t| !t.is_empty())
    } else {
        Some(synced.iter().map(|l| l.text.as_str()).collect::<Vec<_>>().join("\n"))
    };
    let lyrics = Lyrics {
        provider: ProviderId::Local,
        id: source.to_string_lossy().into_owned(),
        title: track.title.clone(),
        artist: track.artist.clone(),
        synced,
        plain,
        source_url: None,
    };
    lyrics.has_text().then_some(lyrics)
}

/// A `.lrc` beside the audio file wins over lyrics in its tags.
pub fn lyrics_for_track(track: &LocalTrack) -> Option<Lyrics> {
    let audio = Path::new(&track.file_path);
    let sidecar = audio.with_extension("lrc");
    if let Ok(text) = std::fs::read_to_string(&sidecar) {
        if let Some(l) = lyrics_from_text(&text, track, &sidecar) {
            return Some(l);
        }
    }
    let tagged = lofty::read_from_path(audio).ok()?;
    let tag = tagged.primary_tag().or_else(|| tagged.first_tag())?;
    let text = tag.get_string(ItemKey::Lyrics)?;
    lyrics_from_text(text, track, audio)
}

impl LyricsProvider for LocalProvider {
    fn id(&self) -> ProviderId {
        ProviderId::Local
    }

    fn search<'a>(&'a self, q: &'a Query) -> BoxFuture<'a, Result<Vec<Lyrics>, String>> {
        Box::pin(async move {
            if self.roots.is_empty() {
                return Ok(Vec::new());
            }
            let tracks = self.index.tracks(&self.roots).await;
            let found: Vec<LocalTrack> = matching_tracks(&tracks, q).into_iter().take(3).cloned().collect();
            let lyrics = tokio::task::spawn_blocking(move || found.iter().filter_map(lyrics_for_track).collect())
                .await
                .unwrap_or_default();
            Ok(lyrics)
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn track(title: &str, artist: &str, path: &str) -> LocalTrack {
        LocalTrack {
            id: path.into(),
            title: title.into(),
            artist: artist.into(),
            album: None,
            duration_secs: 300,
            file_path: path.into(),
            file_format: "mp3".into(),
            file_size_bytes: 1,
        }
    }

    #[test]
    fn test_matching_tracks_needs_a_real_title_match() {
        let tracks = vec![
            track("Maniac", "Carpenter Brut", "/a.mp3"),
            track("Maniac (Remix)", "Someone Else", "/b.mp3"),
            track("Turbo Killer", "Carpenter Brut", "/c.mp3"),
        ];
        let q = Query { title: "Maniac".into(), artist: "Carpenter Brut".into(), duration: Some(300.0), ..Default::default() };
        let found: Vec<_> = matching_tracks(&tracks, &q).iter().map(|t| t.file_path.as_str()).collect();
        assert_eq!(found[0], "/a.mp3");
        assert!(!found.contains(&"/c.mp3"));
    }

    #[test]
    fn test_sidecar_lrc_is_read_as_synced() {
        let dir = tempfile::tempdir().unwrap();
        let audio = dir.path().join("Maniac.mp3");
        std::fs::write(dir.path().join("Maniac.lrc"), "[00:01.00]One\n[00:02.00]Two").unwrap();
        let t = track("Maniac", "Carpenter Brut", audio.to_str().unwrap());
        let l = lyrics_for_track(&t).unwrap();
        assert_eq!(l.provider, ProviderId::Local);
        assert_eq!(l.synced.len(), 2);
        assert_eq!(l.plain.as_deref(), Some("One\nTwo"));
    }

    #[test]
    fn test_plain_text_sidecar_and_missing_file() {
        let dir = tempfile::tempdir().unwrap();
        let audio = dir.path().join("Song.mp3");
        std::fs::write(dir.path().join("Song.lrc"), "Just words\nNo timing").unwrap();
        let l = lyrics_for_track(&track("Song", "X", audio.to_str().unwrap())).unwrap();
        assert!(l.synced.is_empty());
        assert_eq!(l.plain.as_deref(), Some("Just words\nNo timing"));
        assert!(lyrics_for_track(&track("Gone", "X", dir.path().join("Gone.mp3").to_str().unwrap())).is_none());
    }

    #[tokio::test]
    async fn test_provider_without_folders_finds_nothing() {
        let p = LocalProvider::new(Arc::new(LocalIndex::default()), vec![PathBuf::new()]);
        assert!(p.search(&Query::default()).await.unwrap().is_empty());
    }
}
