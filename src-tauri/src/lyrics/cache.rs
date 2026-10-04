//! Per-song lyrics cache: `~/.oscilla/lyrics_cache/<video_id>.json`.
//!
//! Found lyrics are kept 30 days, "not found" 1 day (a provider may add
//! them), a user's pick until evicted. The folder is held under 50 MB by
//! deleting the oldest files first. An answer found under older matching
//! rules (`RULES_VERSION`) is looked up again once.

use super::Lyrics;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

pub const MAX_AGE: Duration = Duration::from_secs(30 * 24 * 3600);
pub const NOT_FOUND_AGE: Duration = Duration::from_secs(24 * 3600);
pub const MAX_BYTES: u64 = 50 * 1024 * 1024;

/// Bump whenever the matching rules or the providers change in a way that
/// would find other lyrics: every answer cached under an older version is
/// looked up again the next time its song plays, instead of being served
/// for up to 30 days (or its "not found" for a day). A user's pick is kept.
/// 1: results must be by the song's artist; synced lyrics of another length
///    are plain; the song's tags are other names for its artist.
/// 2: synced lyrics of a longer recording stay timed when their last line
///    is sung within the song (an album outro the video doesn't have).
pub const RULES_VERSION: u32 = 2;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Entry {
    saved_at: u64,
    #[serde(default)]
    picked: bool,
    lyrics: Option<Lyrics>,
    /// `RULES_VERSION` when it was saved; missing (0) before there was one.
    #[serde(default)]
    rules: u32,
    /// The song it was looked up for (the lyrics' own title can differ,
    /// and a "not found" has none), for Settings > Saved lyrics.
    #[serde(default)]
    song: Option<SongRef>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SongRef {
    pub title: String,
    pub artist: String,
}

/// One cached answer as Settings > Saved lyrics lists it.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct EntryInfo {
    pub video_id: String,
    /// The song it was looked up for; unknown for entries saved before
    /// that was recorded.
    pub song: Option<SongRef>,
    pub saved_at: u64,
    pub picked: bool,
    /// False once it would be looked up again (expired, or found under
    /// older matching rules).
    pub fresh: bool,
    /// What was found; `None` for a remembered "not found".
    pub found: Option<FoundInfo>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct FoundInfo {
    pub provider: String,
    pub title: String,
    pub artist: String,
    pub synced: bool,
    pub lines: usize,
    /// The first line with words, to tell versions apart.
    pub preview: String,
}

/// Longest list Settings is sent (newest first).
pub const MAX_LISTED: usize = 2000;

/// A cached answer: `Found`, or a remembered "no provider had it".
#[derive(Debug, Clone, PartialEq)]
pub enum Cached {
    Found { lyrics: Lyrics, picked: bool },
    NotFound,
}

pub struct LyricsCache {
    dir: PathBuf,
    max_bytes: u64,
}

pub fn now_secs() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0)
}

/// Cache file name for a YouTube video id; `None` for anything that isn't
/// a plain id, so a crafted id can never point outside the folder.
pub fn file_name(video_id: &str) -> Option<String> {
    let ok = !video_id.is_empty()
        && video_id.len() <= 64
        && video_id.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_');
    ok.then(|| format!("{video_id}.json"))
}

/// Whether an entry saved at `saved_at` is still usable at `now`.
fn fresh(entry: &Entry, now: u64) -> bool {
    if entry.picked {
        return true;
    }
    if entry.rules < RULES_VERSION {
        return false;
    }
    let age = if entry.lyrics.is_some() { MAX_AGE } else { NOT_FOUND_AGE };
    now.saturating_sub(entry.saved_at) < age.as_secs()
}

/// The first line with words (not a "♪"), at most 120 chars.
fn preview(l: &Lyrics) -> String {
    let lines: Vec<&str> = if l.is_synced() {
        l.synced.iter().map(|x| x.text.as_str()).collect()
    } else {
        l.plain.as_deref().map(|p| p.lines().collect()).unwrap_or_default()
    };
    lines
        .into_iter()
        .map(str::trim)
        .find(|x| x.chars().any(char::is_alphanumeric))
        .map(|x| x.chars().take(120).collect())
        .unwrap_or_default()
}

/// Files to delete (oldest first) so the rest fits in `cap` bytes.
pub fn plan_eviction(mut files: Vec<(PathBuf, u64, SystemTime)>, cap: u64) -> Vec<PathBuf> {
    let mut total: u64 = files.iter().map(|f| f.1).sum();
    files.sort_by_key(|f| f.2);
    let mut out = Vec::new();
    for (path, size, _) in files {
        if total <= cap {
            break;
        }
        total = total.saturating_sub(size);
        out.push(path);
    }
    out
}

impl LyricsCache {
    pub fn new(dir: PathBuf) -> Self {
        Self { dir, max_bytes: MAX_BYTES }
    }

    #[cfg(test)]
    fn with_cap(dir: PathBuf, max_bytes: u64) -> Self {
        Self { dir, max_bytes }
    }

    fn path(&self, video_id: &str) -> Option<PathBuf> {
        file_name(video_id).map(|f| self.dir.join(f))
    }

    pub fn get(&self, video_id: &str, now: u64) -> Option<Cached> {
        let raw = std::fs::read_to_string(self.path(video_id)?).ok()?;
        let entry: Entry = serde_json::from_str(&raw).ok()?;
        if !fresh(&entry, now) {
            return None;
        }
        Some(match entry.lyrics {
            Some(lyrics) => Cached::Found { lyrics, picked: entry.picked },
            None => Cached::NotFound,
        })
    }

    pub fn put(&self, video_id: &str, lyrics: Option<&Lyrics>, picked: bool, now: u64) {
        self.put_song(video_id, None, lyrics, picked, now);
    }

    /// Like `put`, also recording which song it was looked up for.
    pub fn put_song(&self, video_id: &str, song: Option<SongRef>, lyrics: Option<&Lyrics>, picked: bool, now: u64) {
        let Some(path) = self.path(video_id) else { return };
        let entry = Entry {
            saved_at: now,
            picked,
            lyrics: lyrics.cloned(),
            rules: RULES_VERSION,
            song,
        };
        let Ok(json) = serde_json::to_vec(&entry) else { return };
        if std::fs::create_dir_all(&self.dir).is_err() {
            return;
        }
        // Its own temp file per write: a look-ahead for the next song and
        // that song starting can write the same entry at once.
        if crate::secure_fs::write_private(&path, &json).is_ok() {
            self.enforce_cap(&path);
        }
    }

    /// Forgets one song's answer, the user's pick included ("Search again").
    pub fn remove(&self, video_id: &str) {
        if let Some(path) = self.path(video_id) {
            let _ = std::fs::remove_file(path);
        }
    }

    /// Every cached answer, newest first (at most `MAX_LISTED`).
    pub fn list(&self, now: u64) -> Vec<EntryInfo> {
        let Ok(dir) = std::fs::read_dir(&self.dir) else { return Vec::new() };
        let mut out: Vec<EntryInfo> = dir
            .flatten()
            .filter_map(|e| {
                let path = e.path();
                if path.extension().is_none_or(|x| x != "json") {
                    return None;
                }
                let video_id = path.file_stem()?.to_str()?.to_string();
                file_name(&video_id)?; // only entries a video id could have written
                let entry: Entry = serde_json::from_str(&std::fs::read_to_string(&path).ok()?).ok()?;
                Some(EntryInfo {
                    fresh: fresh(&entry, now),
                    found: entry.lyrics.as_ref().map(|l| FoundInfo {
                        provider: l.provider.as_str().to_string(),
                        title: l.title.clone(),
                        artist: l.artist.clone(),
                        synced: l.is_synced(),
                        lines: if l.is_synced() {
                            l.synced.len()
                        } else {
                            l.plain.as_deref().map_or(0, |p| p.lines().filter(|x| !x.trim().is_empty()).count())
                        },
                        preview: preview(l),
                    }),
                    video_id,
                    song: entry.song,
                    saved_at: entry.saved_at,
                    picked: entry.picked,
                })
            })
            .collect();
        out.sort_by_key(|a| std::cmp::Reverse(a.saved_at));
        out.truncate(MAX_LISTED);
        out
    }

    /// Forgets every cached answer; returns how many there were.
    pub fn clear(&self) -> usize {
        let Ok(dir) = std::fs::read_dir(&self.dir) else { return 0 };
        dir.flatten()
            .filter(|e| e.path().extension().is_some_and(|x| x == "json"))
            .filter(|e| std::fs::remove_file(e.path()).is_ok())
            .count()
    }

    /// Evicts oldest-first; `just_written` always counts as the newest, since
    /// quick successive writes can share a modification time and a tie
    /// could otherwise evict the entry that was just saved.
    fn enforce_cap(&self, just_written: &Path) {
        let Ok(dir) = std::fs::read_dir(&self.dir) else { return };
        let files: Vec<_> = dir
            .flatten()
            .filter(|e| e.path().extension().is_some_and(|x| x == "json"))
            .filter_map(|e| {
                let meta = e.metadata().ok()?;
                let path = e.path();
                let modified = if path == just_written {
                    SystemTime::now() + std::time::Duration::from_secs(24 * 3600)
                } else {
                    meta.modified().unwrap_or(UNIX_EPOCH)
                };
                Some((path, meta.len(), modified))
            })
            .collect();
        for path in plan_eviction(files, self.max_bytes) {
            let _ = std::fs::remove_file(path);
        }
    }

    pub fn dir(&self) -> &Path {
        &self.dir
    }
}

#[cfg(test)]
mod tests {
    use super::super::test_util::lyrics;
    use super::super::ProviderId;
    use super::*;

    #[test]
    fn test_file_name_rejects_path_tricks() {
        assert_eq!(file_name("dQw4w9WgXcQ").as_deref(), Some("dQw4w9WgXcQ.json"));
        for bad in ["", "../x", "a/b", "a.b", "a b", &"x".repeat(65)] {
            assert!(file_name(bad).is_none(), "{bad}");
        }
    }

    #[test]
    fn test_round_trip_and_expiry() {
        let dir = tempfile::tempdir().unwrap();
        let cache = LyricsCache::new(dir.path().join("c"));
        let l = lyrics(ProviderId::Lrclib, true, false);
        let t0 = 1_000_000;

        cache.put("found", Some(&l), false, t0);
        cache.put("missing", None, false, t0);
        cache.put("picked", Some(&l), true, t0);
        assert_eq!(cache.get("found", t0 + 10), Some(Cached::Found { lyrics: l.clone(), picked: false }));
        assert_eq!(cache.get("missing", t0 + 10), Some(Cached::NotFound));

        let day = 24 * 3600;
        assert_eq!(cache.get("missing", t0 + day + 1), None, "not-found expires after a day");
        assert!(cache.get("found", t0 + 29 * day).is_some());
        assert_eq!(cache.get("found", t0 + 30 * day + 1), None, "found expires after 30 days");
        assert!(cache.get("picked", t0 + 400 * day).is_some(), "a user's pick doesn't age out");
        assert_eq!(cache.get("never-saved", t0), None);
    }

    #[test]
    fn test_answers_from_older_rules_are_looked_up_again_but_picks_stay() {
        let dir = tempfile::tempdir().unwrap();
        let cache = LyricsCache::new(dir.path().to_path_buf());
        let l = serde_json::to_value(lyrics(ProviderId::Lrclib, true, false)).unwrap();
        let write = |name: &str, entry: serde_json::Value| std::fs::write(dir.path().join(name), entry.to_string()).unwrap();
        // Saved before entries had a rules version.
        write("old.json", serde_json::json!({ "saved_at": 1, "picked": false, "lyrics": l }));
        write("oldmiss.json", serde_json::json!({ "saved_at": 1, "lyrics": null }));
        write("oldpick.json", serde_json::json!({ "saved_at": 1, "picked": true, "lyrics": l }));
        assert_eq!(cache.get("old", 2), None);
        assert_eq!(cache.get("oldmiss", 2), None);
        assert!(cache.get("oldpick", 2).is_some(), "the user's own pick is kept");

        cache.put("old", Some(&lyrics(ProviderId::Lrclib, true, false)), false, 2);
        assert!(cache.get("old", 3).is_some(), "saved again under the current rules");
    }

    #[test]
    fn test_list_describes_each_entry_newest_first() {
        let dir = tempfile::tempdir().unwrap();
        let cache = LyricsCache::new(dir.path().to_path_buf());
        let song = |t: &str| Some(SongRef { title: t.into(), artist: "bambi".into() });
        let mut synced = lyrics(ProviderId::Lrclib, true, false);
        synced.synced.insert(0, super::super::Line { t: 0.0, text: "♪".into(), ..Default::default() });
        cache.put_song("aaaaaaaaaaa", song("GORSET"), Some(&synced), false, 100);
        cache.put_song("bbbbbbbbbbb", song("BIG BIG GIRL"), None, false, 300);
        cache.put_song("ccccccccccc", song("LET IT B"), Some(&lyrics(ProviderId::Genius, false, true)), true, 200);
        std::fs::write(dir.path().join("not-an-entry.txt"), "x").unwrap();

        let list = cache.list(400);
        assert_eq!(list.iter().map(|e| e.video_id.as_str()).collect::<Vec<_>>(), ["bbbbbbbbbbb", "ccccccccccc", "aaaaaaaaaaa"]);
        assert!(list[0].found.is_none(), "a remembered not-found");
        assert_eq!(list[0].song.as_ref().unwrap().title, "BIG BIG GIRL");
        assert!(list[1].picked);
        let found = list[2].found.as_ref().unwrap();
        assert_eq!((found.provider.as_str(), found.synced, found.lines), ("lrclib", true, 2));
        assert_eq!(found.preview, "la", "skips the ♪ line");
        assert!(list[2].fresh);
        assert!(!cache.list(100 + 31 * 24 * 3600)[2].fresh, "expired: will be looked up again");
    }

    #[test]
    fn test_remove_and_clear() {
        let dir = tempfile::tempdir().unwrap();
        let cache = LyricsCache::new(dir.path().to_path_buf());
        let l = lyrics(ProviderId::Lrclib, true, false);
        cache.put("a", Some(&l), true, 1);
        cache.put("b", Some(&l), false, 1);
        cache.put("c", None, false, 1);
        cache.remove("a");
        assert_eq!(cache.get("a", 2), None, "a pick is removed too");
        cache.remove("../escape"); // never outside the folder, never panics
        assert_eq!(cache.clear(), 2);
        assert_eq!(cache.get("b", 2), None);
        assert_eq!(std::fs::read_dir(dir.path()).unwrap().count(), 0);
    }

    #[test]
    fn test_corrupt_file_is_a_miss() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("x.json"), "{not json").unwrap();
        assert_eq!(LyricsCache::new(dir.path().to_path_buf()).get("x", 0), None);
    }

    #[test]
    fn test_plan_eviction_removes_oldest_until_under_cap() {
        let t = |s| UNIX_EPOCH + Duration::from_secs(s);
        let files = vec![
            (PathBuf::from("new"), 40, t(30)),
            (PathBuf::from("old"), 40, t(10)),
            (PathBuf::from("mid"), 40, t(20)),
        ];
        assert_eq!(plan_eviction(files.clone(), 100), [PathBuf::from("old")]);
        assert_eq!(plan_eviction(files.clone(), 40), [PathBuf::from("old"), PathBuf::from("mid")]);
        assert!(plan_eviction(files, 1000).is_empty());
    }

    #[test]
    fn test_put_enforces_the_size_cap() {
        let dir = tempfile::tempdir().unwrap();
        let cache = LyricsCache::with_cap(dir.path().to_path_buf(), 600);
        let l = lyrics(ProviderId::Lrclib, true, true);
        for i in 0..20 {
            cache.put(&format!("v{i}"), Some(&l), false, 1);
        }
        let total: u64 = std::fs::read_dir(dir.path()).unwrap().flatten().map(|e| e.metadata().unwrap().len()).sum();
        assert!(total <= 600, "{total}");
        assert!(cache.get("v19", 2).is_some(), "the newest entry survives");
    }
}
