//! Overlapping crossfade (experimental, off by default): the address of the
//! next song's audio stream, so the page can start it in a second player
//! while the current song fades out. YouTube Music's own player holds one
//! stream at a time and cannot.
//!
//! The address comes from yt-dlp (`media_tools.rs` installs it), asked for
//! one song at a time. The page gets back a `https://…googlevideo.com/` URL
//! and nothing else; what it may ask for is a checked 11-character song id,
//! and only while the setting is on, so a script in the page can't start
//! yt-dlp for a user who never asked for this.

use crate::plugins::media_save::valid_video_id;
use parking_lot::Mutex;
use std::ffi::OsString;
use std::process::Stdio;
use std::time::{Duration, Instant};

/// yt-dlp normally answers in 2-4 seconds; a hung one must not block the next.
pub const RESOLVE_TIMEOUT: Duration = Duration::from_secs(20);
/// Stream addresses expire after hours; reuse one for a few minutes only
/// (the same song asked for again: a seek back, a retry).
pub const CACHE_FOR: Duration = Duration::from_secs(10 * 60);

/// The complete yt-dlp command line: print the best audio-only stream's
/// address, download nothing. Opus first (what YTM itself plays), then
/// anything audio-only.
pub fn stream_args(video_id: &str) -> Vec<OsString> {
    [
        "--ignore-config",
        "--no-playlist",
        "--quiet",
        "--no-warnings",
        "--skip-download",
        "-f",
        "bestaudio[acodec^=opus]/bestaudio[ext=m4a]/bestaudio",
        "--print",
        "urls",
        "--",
    ]
    .iter()
    .map(OsString::from)
    .chain(std::iter::once(format!("https://music.youtube.com/watch?v={video_id}").into()))
    .collect()
}

/// Whether `url` is a stream on YouTube's media servers, over https. The
/// page plays whatever comes back, so nothing else may.
pub fn is_stream_url(url: &str) -> bool {
    let Ok(parsed) = url::Url::parse(url) else {
        return false;
    };
    parsed.scheme() == "https"
        && parsed.username().is_empty()
        && parsed.password().is_none()
        && parsed.port().is_none()
        && parsed.host_str().is_some_and(|host| host.ends_with(".googlevideo.com"))
}

/// The stream address out of yt-dlp's output: the first line that is one.
pub fn parse_stream_output(stdout: &str) -> Option<String> {
    stdout.lines().map(str::trim).find(|line| is_stream_url(line)).map(str::to_string)
}

#[derive(Default)]
pub struct NextAudio {
    /// Tests run a stand-in instead of the real yt-dlp.
    program: Option<OsString>,
    cache: Mutex<Option<(String, String, Instant)>>,
    /// One yt-dlp at a time.
    running: tokio::sync::Mutex<()>,
}

impl NextAudio {
    #[cfg(test)]
    pub fn with_program(program: impl Into<OsString>) -> Self {
        Self { program: Some(program.into()), ..Self::default() }
    }

    fn cached(&self, video_id: &str) -> Option<String> {
        self.cache
            .lock()
            .as_ref()
            .filter(|(id, _, at)| id == video_id && at.elapsed() < CACHE_FOR)
            .map(|(_, url, _)| url.clone())
    }

    /// The audio stream's address for `video_id`. Errors are i18n-free
    /// short codes; the page falls back to its ordinary fade on any of them.
    pub async fn resolve(&self, ytdlp: OsString, video_id: &str) -> Result<String, String> {
        if !valid_video_id(video_id) {
            return Err("bad-video-id".into());
        }
        if let Some(url) = self.cached(video_id) {
            return Ok(url);
        }
        let _one = self.running.lock().await;
        // Another call for the same song may have finished while waiting.
        if let Some(url) = self.cached(video_id) {
            return Ok(url);
        }

        let mut cmd = tokio::process::Command::new(self.program.clone().unwrap_or(ytdlp));
        cmd.args(stream_args(video_id))
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .kill_on_drop(true);
        #[cfg(windows)]
        cmd.creation_flags(0x0800_0000); // CREATE_NO_WINDOW: no console flashing up
        let child = cmd.spawn().map_err(|e| {
            if e.kind() == std::io::ErrorKind::NotFound { "ytdlp-missing".to_string() } else { "ytdlp-failed".to_string() }
        })?;
        let output = tokio::time::timeout(RESOLVE_TIMEOUT, child.wait_with_output())
            .await
            .map_err(|_| "ytdlp-timeout".to_string())?
            .map_err(|_| "ytdlp-failed".to_string())?;
        if !output.status.success() {
            return Err("ytdlp-failed".into());
        }
        let url = parse_stream_output(&String::from_utf8_lossy(&output.stdout)).ok_or("no-stream")?;
        *self.cache.lock() = Some((video_id.to_string(), url.clone(), Instant::now()));
        Ok(url)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_only_googlevideo_https_is_a_stream() {
        assert!(is_stream_url("https://rr2---sn-abc.googlevideo.com/videoplayback?expire=1&itag=251"));
        for bad in [
            "http://rr2---sn-abc.googlevideo.com/videoplayback",
            "https://googlevideo.com.evil.example/videoplayback",
            "https://evilgooglevideo.com/videoplayback",
            "https://user:pw@rr2.googlevideo.com/x",
            "https://rr2.googlevideo.com:8443/x",
            "file:///etc/passwd",
            "javascript:alert(1)",
            "",
        ] {
            assert!(!is_stream_url(bad), "{bad}");
        }
    }

    #[test]
    fn test_the_address_is_the_first_stream_line() {
        let out = "WARNING: something\nhttps://example.com/not-it\n  https://rr1.googlevideo.com/videoplayback?a=1  \nhttps://rr2.googlevideo.com/videoplayback?b=2\n";
        assert_eq!(parse_stream_output(out).as_deref(), Some("https://rr1.googlevideo.com/videoplayback?a=1"));
        assert_eq!(parse_stream_output("ERROR: nope\n"), None);
    }

    #[test]
    fn test_the_command_line_is_fixed() {
        let args = stream_args("dQw4w9WgXcQ");
        assert_eq!(args.last().unwrap(), "https://music.youtube.com/watch?v=dQw4w9WgXcQ");
        assert_eq!(args[args.len() - 2], "--", "the address can never be read as an option");
        assert!(args.iter().any(|a| a == "--skip-download"));
        assert!(args.iter().any(|a| a == "--ignore-config"));
    }

    #[tokio::test]
    async fn test_bad_ids_never_reach_ytdlp() {
        let next = NextAudio::with_program("oxitune-no-such-program");
        for bad in ["", "short", "--exec=calc", "dQw4w9WgXc$", "dQw4w9WgXcQQ"] {
            assert_eq!(next.resolve("x".into(), bad).await.unwrap_err(), "bad-video-id");
        }
    }

    #[tokio::test]
    async fn test_missing_ytdlp_is_reported() {
        let next = NextAudio::with_program("oxitune-no-such-program");
        assert_eq!(next.resolve("x".into(), "dQw4w9WgXcQ").await.unwrap_err(), "ytdlp-missing");
    }

    #[tokio::test]
    async fn test_a_cached_address_needs_no_ytdlp() {
        let next = NextAudio::with_program("oxitune-no-such-program");
        *next.cache.lock() = Some(("dQw4w9WgXcQ".into(), "https://rr1.googlevideo.com/v".into(), Instant::now()));
        assert_eq!(next.resolve("x".into(), "dQw4w9WgXcQ").await.unwrap(), "https://rr1.googlevideo.com/v");
        assert_eq!(next.resolve("x".into(), "AAAAAAAAAAA").await.unwrap_err(), "ytdlp-missing", "another song is not served from it");
    }

    /// `OXITUNE_E2E_YTDLP=/path/to/yt-dlp cargo test real_ytdlp_gives -- --ignored`
    #[tokio::test]
    #[ignore = "needs yt-dlp and the network"]
    async fn test_real_ytdlp_gives_a_stream_address() {
        let Some(program) = std::env::var_os("OXITUNE_E2E_YTDLP") else {
            return;
        };
        let url = NextAudio::default().resolve(program, "dQw4w9WgXcQ").await.unwrap();
        assert!(is_stream_url(&url));
    }
}
