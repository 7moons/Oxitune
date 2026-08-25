use serde::{Deserialize, Serialize};
use std::path::Path;
use walkdir::WalkDir;
use id3::TagLike;

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

pub fn scan_directory(dir_path: &Path) -> Vec<LocalTrack> {
    let mut tracks = Vec::new();

    if !dir_path.exists() || !dir_path.is_dir() {
        return tracks;
    }

    for entry in WalkDir::new(dir_path)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if path.is_file() && is_audio_file(path) {
            let file_path_str = path.to_string_lossy().to_string();
            let ext = path
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("unknown")
                .to_lowercase();
            let size = entry.metadata().map(|m| m.len()).unwrap_or(0);

            // Extract ID3 tags if available, otherwise fallback to filename
            let mut title = path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("Unknown Track")
                .to_string();
            let mut artist = "Unknown Artist".to_string();
            let mut album = None;
            let mut duration_secs = 0;

            if ext == "mp3" {
                if let Ok(tag) = id3::Tag::read_from_path(path) {
                    if let Some(t) = tag.title() {
                        title = t.to_string();
                    }
                    if let Some(a) = tag.artist() {
                        artist = a.to_string();
                    }
                    if let Some(al) = tag.album() {
                        album = Some(al.to_string());
                    }
                    if let Some(dur) = tag.duration() {
                        duration_secs = (dur / 1000) as u64;
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

            tracks.push(LocalTrack {
                id: format!("{:x}", md5_hash(&file_path_str)),
                title,
                artist,
                album,
                duration_secs,
                file_path: file_path_str,
                file_format: ext,
                file_size_bytes: size,
            });
        }
    }

    // Sort by artist, then title
    tracks.sort_by(|a, b| {
        a.artist
            .to_lowercase()
            .cmp(&b.artist.to_lowercase())
            .then_with(|| a.title.to_lowercase().cmp(&b.title.to_lowercase()))
    });

    tracks
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
    use std::fs::File;
    use tempfile::tempdir;

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
}
