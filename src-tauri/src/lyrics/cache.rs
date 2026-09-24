//! Per-song lyrics cache: `~/.oscilla/lyrics_cache/<video_id>.json`.
//!
//! Found lyrics are kept 30 days, "not found" 1 day (a provider may add
//! them), a user's pick until evicted. The folder is held under 50 MB by
//! deleting the oldest files first.

use super::Lyrics;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

pub const MAX_AGE: Duration = Duration::from_secs(30 * 24 * 3600);
pub const NOT_FOUND_AGE: Duration = Duration::from_secs(24 * 3600);
pub const MAX_BYTES: u64 = 50 * 1024 * 1024;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Entry {
    saved_at: u64,
    #[serde(default)]
    picked: bool,
    lyrics: Option<Lyrics>,
}

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
    let age = if entry.lyrics.is_some() { MAX_AGE } else { NOT_FOUND_AGE };
    now.saturating_sub(entry.saved_at) < age.as_secs()
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
        let Some(path) = self.path(video_id) else { return };
        let entry = Entry {
            saved_at: now,
            picked,
            lyrics: lyrics.cloned(),
        };
        let Ok(json) = serde_json::to_vec(&entry) else { return };
        if std::fs::create_dir_all(&self.dir).is_err() {
            return;
        }
        let tmp = path.with_extension("json.tmp");
        if std::fs::write(&tmp, json).is_ok() && std::fs::rename(&tmp, &path).is_ok() {
            self.enforce_cap(&path);
        }
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
