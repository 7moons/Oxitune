use lofty::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use std::time::UNIX_EPOCH;
use walkdir::WalkDir;

/// What a previous scan learned about each file, so a rescan reads tags
/// only for files that are new or changed (size or modification time).
/// Kept in `~/.ytmd/library_cache.json`.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct LibraryCache {
    #[serde(default)]
    entries: HashMap<String, CachedTrack>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CachedTrack {
    size: u64,
    mtime_ns: u128,
    track: LocalTrack,
}

/// Cache files bigger than this are ignored (a library of ~100k tracks).
const MAX_CACHE_BYTES: u64 = 64 * 1024 * 1024;

impl LibraryCache {
    pub fn load(path: &Path) -> Self {
        let too_big = std::fs::metadata(path).map(|m| m.len() > MAX_CACHE_BYTES).unwrap_or(true);
        if too_big {
            return Self::default();
        }
        std::fs::read(path)
            .ok()
            .and_then(|raw| serde_json::from_slice(&raw).ok())
            .unwrap_or_default()
    }

    pub fn save(&self, path: &Path) {
        if let Ok(json) = serde_json::to_vec(self) {
            if let Err(e) = crate::secure_fs::write_private(path, &json) {
                log::warn!("[YTMD] couldn't save the library cache: {e}");
            }
        }
    }

    pub fn len(&self) -> usize {
        self.entries.len()
    }

    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }
}

fn mtime_ns(meta: &std::fs::Metadata) -> u128 {
    meta.modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map_or(0, |d| d.as_nanos())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalTrack {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub duration_secs: u64,
    pub file_path: String,
    pub file_format: String,
    pub file_size_bytes: u64,
}

/// True only if `candidate` resolves (after following symlinks) to `root`
/// itself or a descendant of it. scan_local_music is reachable from any
/// window's JS, including the untrusted music.youtube.com origin (see
/// remote_server.rs's architecture notes), so an attacker-supplied
/// `directory` override must never be trusted verbatim — without this check
/// a call like `scan_local_music({ directory: "/home/user/Documents" })`
/// would happily walk and return the contents of any readable directory on
/// disk, not just the configured music library.
pub fn is_within_root(root: &Path, candidate: &Path) -> bool {
    let root_canon = match root.canonicalize() {
        Ok(p) => p,
        Err(_) => return false,
    };
    let candidate_canon = match candidate.canonicalize() {
        Ok(p) => p,
        Err(_) => return false,
    };
    candidate_canon.starts_with(&root_canon)
}

pub fn is_audio_file(path: &Path) -> bool {
    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
        matches!(
            ext.to_lowercase().as_str(),
            "mp3" | "flac" | "m4a" | "ogg" | "opus" | "wav" | "aac"
        )
    } else {
        false
    }
}

/// How many filesystem entries `scan_directory_with_progress` visits between
/// progress callbacks. Small enough that a UI watching progress on a large
/// library gets frequent updates; large enough that the callback (which for
/// `scan_local_music` means a Tauri IPC event) isn't fired on every single
/// file.
const PROGRESS_BATCH_SIZE: usize = 200;

pub fn scan_directory(dir_path: &Path) -> Vec<LocalTrack> {
    scan_directory_with_progress(dir_path, |_scanned, _found| {})
}

/// Same walk as `scan_directory`, but calls `on_progress(files_scanned,
/// tracks_found)` every `PROGRESS_BATCH_SIZE` entries (and once more at the
/// end). A 10k+ file library previously scanned silently with no feedback
/// until the whole tree had been walked and every file's tags read; this
/// lets a caller (`commands::scan_local_music`) surface incremental
/// progress instead.
pub fn scan_directory_with_progress(
    dir_path: &Path,
    on_progress: impl FnMut(usize, usize),
) -> Vec<LocalTrack> {
    scan_directory_cached(dir_path, &LibraryCache::default(), on_progress).0
}

/// The scan, reusing `cache` for files whose size and modification time
/// haven't changed. Returns the tracks and the cache for the next scan
/// (files that are gone drop out of it).
pub fn scan_directory_cached(
    dir_path: &Path,
    cache: &LibraryCache,
    mut on_progress: impl FnMut(usize, usize),
) -> (Vec<LocalTrack>, LibraryCache) {
    let mut tracks = Vec::new();
    let mut next_cache = LibraryCache::default();
    let mut scanned: usize = 0;

    if !dir_path.exists() || !dir_path.is_dir() {
        return (tracks, next_cache);
    }

    // Canonicalized once so every walked entry below can be checked against
    // it. `WalkDir::follow_links(true)` does NOT itself sandbox the walk to
    // `dir_path` — a symlink anywhere inside the tree (planted by malware, a
    // synced cloud folder, an extracted archive) that points outside of it
    // is followed like any other entry, and its target's contents/metadata
    // would otherwise be scanned and returned to the caller, which per
    // commands.rs's `scan_local_music` can be the untrusted
    // music.youtube.com origin.
    let root_canon = match dir_path.canonicalize() {
        Ok(p) => p,
        Err(_) => return (tracks, next_cache),
    };

    for entry in WalkDir::new(dir_path)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();

        // Reject anything (typically reached via a symlink hop) whose
        // resolved location has escaped the scan root. Entries that can't
        // be canonicalized (broken symlinks, permission errors) are
        // skipped rather than trusted.
        match path.canonicalize() {
            Ok(resolved) if resolved.starts_with(&root_canon) => {}
            _ => continue,
        }

        scanned += 1;
        if scanned.is_multiple_of(PROGRESS_BATCH_SIZE) {
            on_progress(scanned, tracks.len());
        }

        if path.is_file() && is_audio_file(path) {
            let file_path_str = path.to_string_lossy().to_string();
            let ext = path
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("unknown")
                .to_lowercase();
            let meta = entry.metadata().ok();
            let size = meta.as_ref().map_or(0, |m| m.len());
            let modified = meta.as_ref().map_or(0, mtime_ns);
            if let Some(hit) = cache.entries.get(&file_path_str).filter(|c| c.size == size && c.mtime_ns == modified) {
                tracks.push(hit.track.clone());
                next_cache.entries.insert(file_path_str, hit.clone());
                continue;
            }

            // Extract ID3 tags if available, otherwise fallback to filename
            let mut title = path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("Unknown Track")
                .to_string();
            let mut artist = "Unknown Artist".to_string();
            let mut album = None;
            let mut duration_secs = 0;

            // lofty reads ID3v2/v1, Vorbis Comments, MP4 atoms and RIFF INFO
            // through one API, so every format in ALLOWED_AUDIO_FORMATS gets
            // real tag/duration data here — not just .mp3 (the old id3-crate
            // path only understood ID3, so FLAC/OGG/OPUS/M4A/WAV/AAC fell
            // back to filename guessing below with duration stuck at 0).
            if let Ok(tagged_file) = lofty::read_from_path(path) {
                duration_secs = tagged_file.properties().duration().as_secs();
                if let Some(tag) = tagged_file.primary_tag().or_else(|| tagged_file.first_tag()) {
                    if let Some(t) = tag.title() {
                        title = t.to_string();
                    }
                    if let Some(a) = tag.artist() {
                        artist = a.to_string();
                    }
                    if let Some(al) = tag.album() {
                        album = Some(al.to_string());
                    }
                }
            }

            // Clean up "Artist - Title" filename if title still contains dash
            if artist == "Unknown Artist" && title.contains(" - ") {
                let parts: Vec<&str> = title.splitn(2, " - ").collect();
                if parts.len() == 2 {
                    artist = parts[0].trim().to_string();
                    title = parts[1].trim().to_string();
                }
            }

            let track = LocalTrack {
                id: format!("{:x}", md5_hash(&file_path_str)),
                title,
                artist,
                album,
                duration_secs,
                file_path: file_path_str.clone(),
                file_format: ext,
                file_size_bytes: size,
            };
            next_cache.entries.insert(file_path_str, CachedTrack { size, mtime_ns: modified, track: track.clone() });
            tracks.push(track);
        }
    }

    on_progress(scanned, tracks.len());

    // Sort by artist, then title
    tracks.sort_by(|a, b| {
        a.artist
            .to_lowercase()
            .cmp(&b.artist.to_lowercase())
            .then_with(|| a.title.to_lowercase().cmp(&b.title.to_lowercase()))
    });

    (tracks, next_cache)
}

fn md5_hash(s: &str) -> u64 {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut hasher = DefaultHasher::new();
    s.hash(&mut hasher);
    hasher.finish()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rescan_reuses_unchanged_files_and_rereads_changed_ones() {
        let dir = tempfile::tempdir().unwrap();
        let a = dir.path().join("Artist - One.wav");
        let b = dir.path().join("Artist - Two.wav");
        std::fs::write(&a, build_wav_with_info_tag("One", "Tagged", 1)).unwrap();
        std::fs::write(&b, build_wav_with_info_tag("Two", "Tagged", 1)).unwrap();
        let (first, cache) = scan_directory_cached(dir.path(), &LibraryCache::default(), |_, _| {});
        assert_eq!(first.len(), 2);
        assert_eq!(cache.len(), 2);

        std::fs::write(&b, build_wav_with_info_tag("Two v2", "Tagged", 2)).unwrap();
        let (second, next) = scan_directory_cached(dir.path(), &cache, |_, _| {});
        assert!(second.iter().any(|t| t.title == "Two v2"), "a changed file is read again");
        assert_eq!(next.len(), 2);

        std::fs::remove_file(&b).unwrap();
        let (third, after_delete) = scan_directory_cached(dir.path(), &next, |_, _| {});
        assert_eq!(third.len(), 1);
        assert_eq!(after_delete.len(), 1, "deleted files leave the cache");
    }

    #[test]
    fn test_unchanged_file_comes_from_the_cache() {
        let dir = tempfile::tempdir().unwrap();
        let a = dir.path().join("x.wav");
        std::fs::write(&a, build_wav_with_info_tag("Real", "Tagged", 1)).unwrap();
        let (_, mut cache) = scan_directory_cached(dir.path(), &LibraryCache::default(), |_, _| {});
        cache.entries.get_mut(a.to_str().unwrap()).unwrap().track.title = "from cache".into();
        let (tracks, _) = scan_directory_cached(dir.path(), &cache, |_, _| {});
        assert_eq!(tracks[0].title, "from cache");
    }

    /// `cargo test --release bench_library_scan -- --ignored --nocapture`
    #[test]
    #[ignore = "benchmark"]
    fn bench_library_scan() {
        let dir = tempfile::tempdir().unwrap();
        for i in 0..3000 {
            std::fs::write(dir.path().join(format!("Artist {} - Song {i}.wav", i % 50)), build_wav_with_info_tag(&format!("Song {i}"), "Bench", 1)).unwrap();
        }
        let t = std::time::Instant::now();
        let (tracks, cache) = scan_directory_cached(dir.path(), &LibraryCache::default(), |_, _| {});
        let cold = t.elapsed();
        let t = std::time::Instant::now();
        let (again, _) = scan_directory_cached(dir.path(), &cache, |_, _| {});
        let warm = t.elapsed();
        assert_eq!(tracks.len(), again.len());
        println!("library scan of {} files: cold {:?}, cached {:?}", tracks.len(), cold, warm);
    }
    use std::fs::File;
    use tempfile::tempdir;

    // Hand-built, byte-accurate minimal WAV (RIFF/WAVE) container with a
    // LIST/INFO tag (INAM=title, IART=artist) and a PCM `data` chunk sized
    // for an exact, predictable duration — used to prove lofty actually
    // extracts real tags/duration for a non-mp3 format, not just the
    // filename-fallback heuristic. 8-bit mono @ 8kHz keeps the byte math
    // trivial: 1 byte == 1 sample == 1/8000 second.
    fn build_wav_with_info_tag(title: &str, artist: &str, duration_secs: u32) -> Vec<u8> {
        fn chunk(fourcc: &[u8; 4], data: &[u8]) -> Vec<u8> {
            let mut out = Vec::new();
            out.extend_from_slice(fourcc);
            out.extend_from_slice(&(data.len() as u32).to_le_bytes());
            out.extend_from_slice(data);
            if data.len() % 2 == 1 {
                out.push(0); // RIFF pads every chunk to an even boundary
            }
            out
        }

        const SAMPLE_RATE: u32 = 8000;

        let mut fmt_data = Vec::new();
        fmt_data.extend_from_slice(&1u16.to_le_bytes()); // format_tag: PCM
        fmt_data.extend_from_slice(&1u16.to_le_bytes()); // channels
        fmt_data.extend_from_slice(&SAMPLE_RATE.to_le_bytes()); // sample_rate
        fmt_data.extend_from_slice(&SAMPLE_RATE.to_le_bytes()); // byte_rate (rate * channels * bytes/sample)
        fmt_data.extend_from_slice(&1u16.to_le_bytes()); // block_align (channels * bytes/sample)
        fmt_data.extend_from_slice(&8u16.to_le_bytes()); // bits_per_sample
        let fmt_chunk = chunk(b"fmt ", &fmt_data);

        let mut inam = title.as_bytes().to_vec();
        inam.push(0);
        let mut iart = artist.as_bytes().to_vec();
        iart.push(0);
        let mut list_data = b"INFO".to_vec();
        list_data.extend_from_slice(&chunk(b"INAM", &inam));
        list_data.extend_from_slice(&chunk(b"IART", &iart));
        let list_chunk = chunk(b"LIST", &list_data);

        let pcm = vec![0x80u8; (SAMPLE_RATE * duration_secs) as usize];
        let data_chunk = chunk(b"data", &pcm);

        let mut body = Vec::new();
        body.extend_from_slice(&fmt_chunk);
        body.extend_from_slice(&list_chunk);
        body.extend_from_slice(&data_chunk);

        let mut wav = Vec::new();
        wav.extend_from_slice(b"RIFF");
        wav.extend_from_slice(&((4 + body.len()) as u32).to_le_bytes());
        wav.extend_from_slice(b"WAVE");
        wav.extend_from_slice(&body);
        wav
    }

    #[test]
    fn test_scan_directory_reads_real_tags_and_duration_for_non_mp3_formats() {
        // Regression guard: before switching to lofty, only .mp3 went
        // through a tag reader at all — every other allowed format (this
        // covers the same code path as flac/ogg/opus/m4a/aac) fell back to
        // filename guessing with duration stuck at 0, even when the file
        // actually shipped a real tag.
        let dir = tempdir().expect("tempdir");
        let wav_path = dir.path().join("track.wav");
        std::fs::write(&wav_path, build_wav_with_info_tag("Real Tag Title", "Real Tag Artist", 2))
            .expect("write wav");

        let scanned = scan_directory(dir.path());
        assert_eq!(scanned.len(), 1);
        assert_eq!(scanned[0].title, "Real Tag Title");
        assert_eq!(scanned[0].artist, "Real Tag Artist");
        assert_eq!(scanned[0].duration_secs, 2);
    }

    #[test]
    fn test_is_within_root_allows_root_and_descendants() {
        let dir = tempdir().expect("tempdir");
        let root = dir.path();
        let subdir = root.join("Artist");
        std::fs::create_dir_all(&subdir).unwrap();

        assert!(is_within_root(root, root));
        assert!(is_within_root(root, &subdir));
    }

    #[test]
    fn test_is_within_root_rejects_paths_outside_root() {
        let dir = tempdir().expect("tempdir");
        let root_dir = tempdir().expect("tempdir");
        let root = root_dir.path();
        let outside = dir.path();

        assert!(!is_within_root(root, outside));
        // A directory that doesn't exist can't be canonicalized — must
        // fail closed (reject), never fail open.
        assert!(!is_within_root(root, Path::new("/definitely/does/not/exist")));
    }

    #[test]
    fn test_is_audio_file() {
        assert!(is_audio_file(Path::new("song.mp3")));
        assert!(is_audio_file(Path::new("song.flac")));
        assert!(is_audio_file(Path::new("song.opus")));
        assert!(is_audio_file(Path::new("song.wav")));
        assert!(!is_audio_file(Path::new("photo.png")));
        assert!(!is_audio_file(Path::new("document.pdf")));
    }

    #[test]
    fn test_scan_directory() {
        let dir = tempdir().expect("Failed to create tempdir");
        let dir_path = dir.path();

        let track1_path = dir_path.join("Daft Punk - One More Time.mp3");
        let track2_path = dir_path.join("Queen - Bohemian Rhapsody.flac");
        let non_audio_path = dir_path.join("lyrics.txt");

        let _ = File::create(&track1_path);
        let _ = File::create(&track2_path);
        let _ = File::create(&non_audio_path);

        let scanned = scan_directory(dir_path);
        assert_eq!(scanned.len(), 2);
        assert_eq!(scanned[0].artist, "Daft Punk");
        assert_eq!(scanned[0].title, "One More Time");
        assert_eq!(scanned[1].artist, "Queen");
        assert_eq!(scanned[1].title, "Bohemian Rhapsody");
    }

    #[test]
    #[cfg(unix)] // creating symlinks on Windows needs admin/developer mode
    fn test_scan_directory_does_not_follow_symlink_escaping_the_root() {
        use std::os::unix::fs::symlink;

        let root_dir = tempdir().expect("tempdir");
        let outside_dir = tempdir().expect("tempdir");

        let inside_track = root_dir.path().join("Inside Artist - Inside Track.mp3");
        File::create(&inside_track).unwrap();

        let outside_track = outside_dir.path().join("Secret Artist - Secret Track.mp3");
        File::create(&outside_track).unwrap();

        // Plant a symlink inside the scanned root that resolves to a file
        // outside it — e.g. from a synced folder, a crafted archive, or
        // malware. `follow_links(true)` would otherwise happily walk right
        // through it.
        let escape_link = root_dir.path().join("escape.mp3");
        symlink(&outside_track, &escape_link).expect("create symlink");

        let scanned = scan_directory(root_dir.path());

        assert_eq!(scanned.len(), 1);
        assert_eq!(scanned[0].artist, "Inside Artist");
        assert_eq!(scanned[0].title, "Inside Track");
        assert!(scanned.iter().all(|t| !t.file_path.contains("Secret")));
    }

    #[test]
    fn test_scan_directory_with_progress_reports_final_totals() {
        let dir = tempdir().expect("tempdir");
        for i in 0..3 {
            File::create(dir.path().join(format!("Artist - Track {i}.mp3"))).unwrap();
        }
        File::create(dir.path().join("notes.txt")).unwrap();

        let mut calls: Vec<(usize, usize)> = Vec::new();
        let scanned = scan_directory_with_progress(dir.path(), |files_scanned, tracks_found| {
            calls.push((files_scanned, tracks_found));
        });

        assert_eq!(scanned.len(), 3);
        // Below PROGRESS_BATCH_SIZE, the only callback is the guaranteed
        // final one, and it must reflect the true totals — this is what a
        // UI uses to know the scan is complete. WalkDir yields the root
        // directory itself as an entry too, so the count is 5 (root + 3
        // tracks + 1 non-audio file), not just the file count.
        assert_eq!(calls.last(), Some(&(5, 3)));
    }

    #[test]
    fn test_scan_directory_with_progress_batches_during_large_scan() {
        let dir = tempdir().expect("tempdir");
        // More than PROGRESS_BATCH_SIZE (200) plain (non-audio) files so the
        // walk crosses at least one batch boundary before the final call.
        for i in 0..450 {
            File::create(dir.path().join(format!("file-{i}.txt"))).unwrap();
        }

        let mut calls: Vec<(usize, usize)> = Vec::new();
        scan_directory_with_progress(dir.path(), |files_scanned, tracks_found| {
            calls.push((files_scanned, tracks_found));
        });

        // At least the two 200/400 batch boundaries, plus the final flush.
        assert!(calls.len() >= 3, "expected multiple progress callbacks, got {:?}", calls);
        assert!(calls.iter().any(|&(scanned, _)| scanned == 200));
        assert!(calls.iter().any(|&(scanned, _)| scanned == 400));
        // +1 for the root directory entry itself, which WalkDir yields
        // before any of the 450 files inside it.
        assert_eq!(calls.last().unwrap().0, 451);
    }

    #[test]
    fn test_scan_directory_handles_corrupt_id3_tags_without_panicking() {
        let dir = tempdir().expect("tempdir");
        let corrupt_path = dir.path().join("Not Real - Fake Song.mp3");
        // Garbage bytes with an .mp3 extension but no valid ID3/MPEG frame
        // structure at all — must not panic id3's parser.
        std::fs::write(&corrupt_path, b"\x00\x01\x02not an mp3 or id3 tag, just garbage bytes")
            .expect("write corrupt file");

        let scanned = scan_directory(dir.path());

        assert_eq!(scanned.len(), 1);
        // id3::Tag::read_from_path fails gracefully on this input, so
        // title/artist fall back to the "Artist - Title" filename heuristic
        // instead of panicking or propagating the parse error.
        assert_eq!(scanned[0].artist, "Not Real");
        assert_eq!(scanned[0].title, "Fake Song");
        assert_eq!(scanned[0].duration_secs, 0);
    }
}
