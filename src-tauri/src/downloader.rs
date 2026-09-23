use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use tauri::{AppHandle, Emitter};
use tokio::io::AsyncBufReadExt;
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
    /// Set only on the final event of a failed download (with `status`
    /// "Download failed"); `null` on every normal progress/success event.
    /// The frontend drives its download UI purely from these events, since
    /// the bridge call returns long before a download finishes.
    pub error: Option<String>,
}

const FAILED_STATUS: &str = "Download failed";
/// Longest stderr excerpt surfaced in an error message.
const MAX_ERROR_DETAIL_CHARS: usize = 200;

/// Message for yt-dlp failing to even start.
fn spawn_error_message(err: &std::io::Error) -> String {
    if err.kind() == std::io::ErrorKind::NotFound {
        "yt-dlp is not installed".to_string()
    } else {
        format!("Couldn't start yt-dlp: {err}")
    }
}

/// Message for yt-dlp exiting non-zero, from the last non-empty line it
/// wrote to stderr (yt-dlp prints its `ERROR: ...` summary last).
fn exit_error_message(stderr_tail: Option<&str>) -> String {
    match stderr_tail.map(str::trim).filter(|l| !l.is_empty()) {
        Some(line) => {
            let detail: String = line.chars().take(MAX_ERROR_DETAIL_CHARS).collect();
            format!("Download failed: {detail}")
        }
        None => "Download failed: yt-dlp exited with an error".to_string(),
    }
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

    let emit_progress = |percent: f64, status: &str, output_path: Option<String>, error: Option<String>| {
        let _ = app_handle.emit(
            "download-progress",
            DownloadProgress {
                video_id: request.video_id.clone(),
                title: request.title.clone(),
                percent,
                status: status.to_string(),
                output_path,
                error,
            },
        );
    };
    // Failure keeps the bar where it was instead of jumping to 100%.
    let fail = |percent: f64, message: String| -> Result<String, String> {
        emit_progress(percent, FAILED_STATUS, None, Some(message.clone()));
        Err(message)
    };

    emit_progress(10.0, "Starting download stream...", None, None);

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

    emit_progress(50.0, "Extracting high quality audio...", None, None);

    // Spawn (not `.status()`) and drain stdout/stderr concurrently: yt-dlp writes
    // frequent progress output, and once the OS pipe buffer (~64KB) fills without
    // a reader, the child blocks on write() and the download hangs forever.
    let child = match cmd.spawn() {
        Ok(child) => child,
        Err(e) => return fail(50.0, spawn_error_message(&e)),
    };

    match drain_and_wait(child).await {
        Ok((s, _)) if s.success() => {
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

            emit_progress(100.0, "Download completed!", Some(output_str.clone()), None);
            Ok(output_str)
        }
        Ok((_, stderr_tail)) => fail(50.0, exit_error_message(stderr_tail.as_deref())),
        Err(e) => fail(50.0, format!("Download failed: {e}")),
    }
}

/// Drains a spawned child's stdout/stderr pipes concurrently with waiting
/// for it to exit. Split out from `execute_download` so the deadlock this
/// prevents can be reproduced directly in a test: `.wait()` alone would
/// block forever once the child writes more than the OS pipe buffer
/// (~64KB) to a stream nothing is reading. Also returns the last non-empty
/// stderr line, for the error message when the child fails.
async fn drain_and_wait(
    mut child: tokio::process::Child,
) -> std::io::Result<(std::process::ExitStatus, Option<String>)> {
    let child_stdout = child.stdout.take();
    let child_stderr = child.stderr.take();

    let stdout_drain = tokio::spawn(async move {
        if let Some(out) = child_stdout {
            let mut lines = tokio::io::BufReader::new(out).lines();
            while let Ok(Some(_line)) = lines.next_line().await {}
        }
    });
    let stderr_drain = tokio::spawn(async move {
        let mut last_line: Option<String> = None;
        if let Some(err) = child_stderr {
            let mut lines = tokio::io::BufReader::new(err).lines();
            while let Ok(Some(line)) = lines.next_line().await {
                if !line.trim().is_empty() {
                    last_line = Some(line);
                }
            }
        }
        last_line
    });

    let status = child.wait().await?;
    let _ = stdout_drain.await;
    let stderr_tail = stderr_drain.await.unwrap_or(None);
    Ok((status, stderr_tail))
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
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()
            .unwrap_or_default();
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
    async fn test_drain_and_wait_does_not_deadlock_on_output_exceeding_pipe_buffer() {
        // Regression test for the yt-dlp deadlock: a child that writes more
        // than the OS pipe buffer (~64KB) to stdout/stderr blocks on write()
        // once the buffer fills, unless something is concurrently reading
        // it. `.wait()` alone (the old code) would hang forever here.
        let mut cmd = Command::new("sh");
        cmd.arg("-c")
            .arg("for i in $(seq 1 20000); do echo \"line $i padded to exceed the pipe buffer quickly\"; done")
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        let child = cmd.spawn().expect("failed to spawn sh");

        let result = tokio::time::timeout(std::time::Duration::from_secs(10), drain_and_wait(child)).await;
        assert!(
            result.is_ok(),
            "drain_and_wait must not hang when the child writes more than the OS pipe buffer"
        );
        let (status, _) = result.unwrap().expect("child process should exit cleanly");
        assert!(status.success());
    }

    #[tokio::test]
    async fn test_drain_and_wait_returns_last_nonempty_stderr_line() {
        let mut cmd = Command::new("sh");
        cmd.arg("-c")
            .arg("echo 'WARNING: noise' >&2; echo 'ERROR: Video unavailable' >&2; echo '' >&2; exit 1")
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        let (status, tail) = drain_and_wait(cmd.spawn().expect("spawn sh")).await.expect("wait");
        assert!(!status.success());
        assert_eq!(tail.as_deref(), Some("ERROR: Video unavailable"));
    }

    /// Regression: a missing yt-dlp or a failed download used to write a
    /// fake "YTMD Audio Export" file and report success.
    #[test]
    fn test_download_error_messages() {
        let not_found = std::io::Error::new(std::io::ErrorKind::NotFound, "no such file");
        assert_eq!(spawn_error_message(&not_found), "yt-dlp is not installed");

        let denied = std::io::Error::new(std::io::ErrorKind::PermissionDenied, "denied");
        assert!(spawn_error_message(&denied).starts_with("Couldn't start yt-dlp:"));

        assert_eq!(
            exit_error_message(Some("  ERROR: [youtube] x: Video unavailable  ")),
            "Download failed: ERROR: [youtube] x: Video unavailable"
        );
        assert_eq!(exit_error_message(None), "Download failed: yt-dlp exited with an error");
        assert_eq!(exit_error_message(Some("   ")), "Download failed: yt-dlp exited with an error");

        let long = "é".repeat(500);
        let msg = exit_error_message(Some(&long));
        assert_eq!(msg.chars().count(), "Download failed: ".len() + MAX_ERROR_DETAIL_CHARS);
    }

    #[test]
    fn test_progress_serializes_error_field() {
        let p = DownloadProgress {
            video_id: "v".into(),
            title: "t".into(),
            percent: 10.0,
            status: "s".into(),
            output_path: None,
            error: None,
        };
        let json = serde_json::to_value(&p).unwrap();
        assert!(json.get("error").expect("error key always present").is_null());
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
