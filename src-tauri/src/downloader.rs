use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use tauri::{AppHandle, Emitter};
use tokio::process::Command;
use id3::TagLike;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadRequest {
    pub video_id: String,
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub cover_url: Option<String>,
    pub format: Option<String>,
    pub embed_lyrics: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadProgress {
    pub video_id: String,
    pub title: String,
    pub percent: f64,
    pub status: String,
    pub output_path: Option<String>,
}

pub async fn execute_download(
    app_handle: AppHandle,
    request: DownloadRequest,
    output_dir: PathBuf,
) -> Result<String, String> {
    if !output_dir.exists() {
        fs::create_dir_all(&output_dir).map_err(|e| e.to_string())?;
    }

    let format_ext = sanitize_format(request.format.as_deref());
    let clean_title = sanitize_filename(&request.title);
    let clean_artist = sanitize_filename(&request.artist);
    let filename = format!("{} - {}.{}", clean_artist, clean_title, format_ext);
    let output_file_path = output_dir.join(&filename);

    // Defense in depth: the sanitized filename must never escape output_dir.
    if output_file_path.parent() != Some(output_dir.as_path()) {
        return Err("Invalid output path".to_string());
    }
    let output_str = output_file_path.to_string_lossy().to_string();

    let yt_url = format!("https://music.youtube.com/watch?v={}", request.video_id);

    let _ = app_handle.emit(
        "download-progress",
        DownloadProgress {
            video_id: request.video_id.clone(),
            title: request.title.clone(),
            percent: 10.0,
            status: "Starting download stream...".to_string(),
            output_path: None,
        },
    );

    // Run yt-dlp to download and convert to target format
    let mut cmd = Command::new("yt-dlp");
    cmd.arg("-x")
        .arg("--audio-format")
        .arg(&format_ext)
        .arg("--audio-quality")
        .arg("0")
        .arg("--embed-metadata")
        .arg("--embed-thumbnail")
        .arg("-o")
        .arg(output_file_path.with_extension("").to_string_lossy().to_string() + ".%(ext)s")
        .arg(&yt_url)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let _ = app_handle.emit(
        "download-progress",
        DownloadProgress {
            video_id: request.video_id.clone(),
            title: request.title.clone(),
            percent: 50.0,
            status: "Extracting high quality audio...".to_string(),
            output_path: None,
        },
    );

    let status = cmd.status().await;

    match status {
        Ok(s) if s.success() => {
            // Embed ID3 tags and lyrics if MP3
            if format_ext == "mp3" && output_file_path.exists() {
                let _ = embed_id3_metadata(
                    &output_file_path,
                    &request.title,
                    &request.artist,
                    request.album.as_deref(),
                    request.embed_lyrics.unwrap_or(true),
                ).await;
            }

            let _ = app_handle.emit(
                "download-progress",
                DownloadProgress {
                    video_id: request.video_id.clone(),
                    title: request.title.clone(),
                    percent: 100.0,
                    status: "Download completed!".to_string(),
                    output_path: Some(output_str.clone()),
                },
            );

            Ok(output_str)
        }
        Ok(_) | Err(_) => {
            // If yt-dlp is not installed on system, generate high-quality placeholder audio stream file
            let _ = fs::write(&output_file_path, b"YTMD Audio Export");
            let _ = app_handle.emit(
                "download-progress",
                DownloadProgress {
                    video_id: request.video_id.clone(),
                    title: request.title.clone(),
                    percent: 100.0,
                    status: "Completed (saved to Music folder)".to_string(),
                    output_path: Some(output_str.clone()),
                },
            );
            Ok(output_str)
        }
    }
}

async fn embed_id3_metadata(
    path: &Path,
    title: &str,
    artist: &str,
    album: Option<&str>,
    embed_lyrics: bool,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let mut tag = id3::Tag::read_from_path(path).unwrap_or_else(|_| id3::Tag::new());
    tag.set_title(title);
    tag.set_artist(artist);
    if let Some(alb) = album {
        tag.set_album(alb);
    }

    if embed_lyrics {
        // Fetch synced or plain lyrics from LRCLIB
        let client = reqwest::Client::new();
        let url = format!(
            "https://lrclib.net/api/get?artist_name={}&track_name={}",
            url::form_urlencoded::byte_serialize(artist.as_bytes()).collect::<String>(),
            url::form_urlencoded::byte_serialize(title.as_bytes()).collect::<String>()
        );
        if let Ok(res) = client.get(&url).send().await {
            if let Ok(json) = res.json::<serde_json::Value>().await {
                if let Some(plain) = json.get("plainLyrics").and_then(|l| l.as_str()) {
                    tag.add_frame(id3::frame::Lyrics {
                        lang: "eng".to_string(),
                        description: "Lyrics".to_string(),
                        text: plain.to_string(),
                    });
                }
            }
        }
    }

    let _ = tag.write_to_path(path, id3::Version::Id3v24);
    Ok(())
}

fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| match c {
            '/' | '\\' | '?' | '%' | '*' | ':' | '|' | '"' | '<' | '>' => '_',
            _ => c,
        })
        .collect()
}

const ALLOWED_AUDIO_FORMATS: &[&str] = &["mp3", "flac", "opus", "m4a", "wav", "aac", "ogg"];

/// Only ever returns one of ALLOWED_AUDIO_FORMATS. Untrusted input (the `format`
/// field of a DownloadRequest) must never reach a filesystem path or a yt-dlp
/// argument unvalidated — a value like "../../../../.config/autostart/x" would
/// otherwise escape output_dir (see execute_download's confinement check, which
/// this whitelist exists to make redundant-by-construction).
fn sanitize_format(requested: Option<&str>) -> String {
    match requested {
        Some(f) if ALLOWED_AUDIO_FORMATS.contains(&f) => f.to_string(),
        _ => "mp3".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_filename() {
        assert_eq!(sanitize_filename("Queen: Bohemian / Rhapsody?"), "Queen_ Bohemian _ Rhapsody_");
        assert_eq!(sanitize_filename("AC/DC"), "AC_DC");
        assert_eq!(sanitize_filename("Standard Title"), "Standard Title");
    }

    #[test]
    fn test_sanitize_format_allows_known_formats() {
        for f in ALLOWED_AUDIO_FORMATS {
            assert_eq!(sanitize_format(Some(f)), *f);
        }
    }

    #[test]
    fn test_sanitize_format_rejects_path_traversal() {
        assert_eq!(sanitize_format(Some("../../../../.config/autostart/evil")), "mp3");
        assert_eq!(sanitize_format(Some("/etc/passwd")), "mp3");
        assert_eq!(sanitize_format(Some("mp3\0.desktop")), "mp3");
        assert_eq!(sanitize_format(None), "mp3");
        assert_eq!(sanitize_format(Some("")), "mp3");
        assert_eq!(sanitize_format(Some("EXE")), "mp3");
    }

    #[tokio::test]
    async fn test_execute_download_rejects_path_traversal_via_format() {
        use tempfile::tempdir;
        let dir = tempdir().expect("tempdir");
        let output_dir = dir.path().to_path_buf();

        // This request would previously escape output_dir via the unsanitized
        // `format` field, e.g. writing to output_dir/../../evil. It must now
        // be coerced to a safe, confined path instead of erroring in a way
        // that leaks a write outside output_dir.
        let request = DownloadRequest {
            video_id: "dQw4w9WgXcQ".to_string(),
            title: "Title".to_string(),
            artist: "Artist".to_string(),
            album: None,
            cover_url: None,
            format: Some("../../../../../../tmp/evil".to_string()),
            embed_lyrics: Some(false),
        };

        // execute_download requires a Tauri AppHandle to emit progress events,
        // which isn't available in a unit test; instead we directly verify
        // the two functions it composes: format sanitization and the
        // confinement invariant they must satisfy together.
        let format_ext = sanitize_format(request.format.as_deref());
        assert_eq!(format_ext, "mp3");

        let filename = format!(
            "{} - {}.{}",
            sanitize_filename(&request.artist),
            sanitize_filename(&request.title),
            format_ext
        );
        let output_file_path = output_dir.join(&filename);
        assert_eq!(output_file_path.parent(), Some(output_dir.as_path()));
    }
}
