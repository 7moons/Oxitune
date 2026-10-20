//! Per-song lyrics timing corrections: `~/.oxitune/lyrics_offsets.json`, a
//! JSON array of `[key, seconds]` pairs, oldest first. Keys are video ids;
//! entries imported from the page's old localStorage store use its
//! `"title - artist"` keys and are still found through that fallback.

use parking_lot::Mutex;
use std::path::PathBuf;

/// Oldest entries are dropped past this, so the file can't grow forever.
pub const MAX_OFFSETS: usize = 500;
/// Larger corrections are certainly a bad value, not a timing fix.
pub const MAX_OFFSET_SECS: f64 = 60.0;

pub struct OffsetStore {
    path: PathBuf,
    entries: Mutex<Option<Vec<(String, f64)>>>,
}

fn valid(secs: f64) -> bool {
    secs.is_finite() && secs.abs() <= MAX_OFFSET_SECS
}

/// Sets `key` (moved to the newest end); a zero offset is the default, so
/// it removes the entry instead.
pub fn set_entry(entries: &mut Vec<(String, f64)>, key: &str, secs: f64) {
    entries.retain(|(k, _)| k != key);
    if secs != 0.0 {
        entries.push((key.to_string(), secs));
    }
    if entries.len() > MAX_OFFSETS {
        let excess = entries.len() - MAX_OFFSETS;
        entries.drain(..excess);
    }
}

/// Adds imported entries without overwriting any key already set here.
/// Returns how many were added.
pub fn import_entries(entries: &mut Vec<(String, f64)>, imported: &[(String, f64)]) -> usize {
    let mut added = 0;
    for (key, secs) in imported {
        if key.is_empty() || !valid(*secs) || *secs == 0.0 || entries.iter().any(|(k, _)| k == key) {
            continue;
        }
        // Imported entries are older than anything set in the app.
        entries.insert(added, (key.clone(), *secs));
        added += 1;
    }
    if entries.len() > MAX_OFFSETS {
        let excess = entries.len() - MAX_OFFSETS;
        entries.drain(..excess);
    }
    added
}

impl OffsetStore {
    pub fn new(path: PathBuf) -> Self {
        Self {
            path,
            entries: Mutex::new(None),
        }
    }

    fn with_entries<R>(&self, f: impl FnOnce(&mut Vec<(String, f64)>) -> R) -> R {
        let mut guard = self.entries.lock();
        let entries = guard.get_or_insert_with(|| {
            std::fs::read_to_string(&self.path)
                .ok()
                .and_then(|raw| serde_json::from_str::<Vec<(String, f64)>>(&raw).ok())
                .unwrap_or_default()
                .into_iter()
                .filter(|(_, s)| valid(*s))
                .collect()
        });
        f(entries)
    }

    fn persist(&self, entries: &[(String, f64)]) {
        let Ok(json) = serde_json::to_vec(entries) else { return };
        if let Some(dir) = self.path.parent() {
            let _ = std::fs::create_dir_all(dir);
        }
        let tmp = self.path.with_extension("json.tmp");
        if std::fs::write(&tmp, json).is_ok() {
            let _ = std::fs::rename(&tmp, &self.path);
        }
    }

    /// Offset for the first of `keys` that has one, else 0.
    pub fn get(&self, keys: &[&str]) -> f64 {
        self.with_entries(|entries| {
            keys.iter()
                .find_map(|k| entries.iter().find(|(e, _)| e == k).map(|(_, s)| *s))
                .unwrap_or(0.0)
        })
    }

    /// Stores `secs` under `key`, dropping `legacy_key` so the old entry
    /// can't shadow a later reset. Rejects non-finite or absurd values.
    pub fn set(&self, key: &str, legacy_key: Option<&str>, secs: f64) -> Result<f64, String> {
        if !valid(secs) {
            return Err(format!("Offset must be within ±{MAX_OFFSET_SECS} s"));
        }
        let secs = (secs * 1000.0).round() / 1000.0;
        self.with_entries(|entries| {
            if let Some(legacy) = legacy_key.filter(|l| *l != key) {
                entries.retain(|(k, _)| k != legacy);
            }
            set_entry(entries, key, secs);
            self.persist(entries);
        });
        Ok(secs)
    }

    pub fn import(&self, imported: &[(String, f64)]) -> usize {
        self.with_entries(|entries| {
            let added = import_entries(entries, imported);
            if added > 0 {
                self.persist(entries);
            }
            added
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn pairs(v: &[(&str, f64)]) -> Vec<(String, f64)> {
        v.iter().map(|(k, s)| (k.to_string(), *s)).collect()
    }

    #[test]
    fn test_set_moves_to_newest_and_zero_removes() {
        let mut e = pairs(&[("a", 1.0), ("b", 2.0)]);
        set_entry(&mut e, "a", 3.0);
        assert_eq!(e, pairs(&[("b", 2.0), ("a", 3.0)]));
        set_entry(&mut e, "b", 0.0);
        assert_eq!(e, pairs(&[("a", 3.0)]));
    }

    #[test]
    fn test_cap_drops_oldest() {
        let mut e = Vec::new();
        for i in 0..MAX_OFFSETS + 5 {
            set_entry(&mut e, &format!("s{i}"), 0.5);
        }
        assert_eq!(e.len(), MAX_OFFSETS);
        assert_eq!(e[0].0, "s5");
    }

    #[test]
    fn test_import_never_overwrites_and_skips_junk() {
        let mut e = pairs(&[("Song - Artist", 1.0)]);
        let added = import_entries(
            &mut e,
            &pairs(&[("Song - Artist", 9.0), ("Other - X", -0.5), ("", 1.0), ("Zero - X", 0.0), ("Huge - X", 999.0), ("Nan - X", f64::NAN)]),
        );
        assert_eq!(added, 1);
        assert_eq!(e, pairs(&[("Other - X", -0.5), ("Song - Artist", 1.0)]));
    }

    #[test]
    fn test_store_persists_and_falls_back_to_the_legacy_key() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("lyrics_offsets.json");
        let store = OffsetStore::new(path.clone());
        assert_eq!(store.import(&pairs(&[("Neon Runner - Night Drive", 1.5)])), 1);
        assert_eq!(store.get(&["vid", "Neon Runner - Night Drive"]), 1.5, "found through the imported title key");

        store.set("vid", Some("Neon Runner - Night Drive"), -0.5).unwrap();
        let reloaded = OffsetStore::new(path);
        assert_eq!(reloaded.get(&["vid", "Neon Runner - Night Drive"]), -0.5);
        reloaded.set("vid", Some("Neon Runner - Night Drive"), 0.0).unwrap();
        assert_eq!(reloaded.get(&["vid", "Neon Runner - Night Drive"]), 0.0, "reset isn't shadowed by the old key");
        assert!(reloaded.set("vid", None, f64::INFINITY).is_err());
        assert!(reloaded.set("vid", None, 61.0).is_err());
    }

    #[test]
    fn test_corrupt_file_starts_empty() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("o.json");
        std::fs::write(&path, "{nope").unwrap();
        assert_eq!(OffsetStore::new(path).get(&["x"]), 0.0);
    }
}
