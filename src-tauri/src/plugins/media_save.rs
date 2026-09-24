//! The `media:save` permission: saving a song to the user's folder with
//! yt-dlp (docs/PLUGIN_API.md). Built for the downloader add-on, but nothing
//! here trusts the plugin beyond two values: an 11-character video id and a
//! format from `FORMATS`. yt-dlp comes from the system or from
//! `media_tools` (installed only when the user agrees); it runs with a fixed argument list, `--ignore-config` (so no
//! config file can add `--exec`), into the folder the user picked in
//! Settings, and never through a shell.

use parking_lot::Mutex;
use serde::Serialize;
use std::collections::HashMap;
use std::ffi::OsString;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::Arc;
use tokio::io::AsyncBufReadExt;
use tokio::sync::{oneshot, Semaphore};

pub const PERMISSION: &str = "media:save";
pub const FORMATS: &[&str] = &["mp3", "m4a", "opus", "flac"];
/// Songs saved at the same time; the rest wait.
const MAX_PARALLEL: usize = 2;
/// Songs waiting or saving, across all plugins.
const MAX_JOBS: usize = 20;
/// Longest yt-dlp error line passed on.
const MAX_ERROR_CHARS: usize = 200;
/// The download part of the progress bar; converting fills the rest.
const DOWNLOAD_SHARE: f64 = 90.0;

#[derive(Debug, Clone, Copy, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum JobState {
    Queued,
    Downloading,
    Converting,
    Done,
    Failed,
    Cancelled,
}

/// Sent to the page as `plugin-media-progress`. `file` is the saved file's
/// name only: the page never learns the folder.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Progress {
    pub plugin: String,
    pub job: String,
    pub video_id: String,
    pub state: JobState,
    pub percent: f64,
    pub file: Option<String>,
    pub error: Option<String>,
}

pub type Emit = Arc<dyn Fn(Progress) + Send + Sync>;

struct Job {
    plugin: String,
    cancel: Option<oneshot::Sender<()>>,
}

pub struct MediaJobs {
    /// Tests run a stand-in instead of the real yt-dlp.
    program: Option<OsString>,
    slots: Arc<Semaphore>,
    jobs: Mutex<HashMap<String, Job>>,
}

impl Default for MediaJobs {
    fn default() -> Self {
        Self { program: None, slots: Arc::new(Semaphore::new(MAX_PARALLEL)), jobs: Mutex::new(HashMap::new()) }
    }
}

pub fn valid_video_id(id: &str) -> bool {
    id.len() == 11 && id.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
}

/// The complete yt-dlp command line. Only `video_id` and `format` come from
/// the plugin, both checked by the caller; `dir` is the user's choice and
/// `ffmpeg_dir` our own ffmpeg, if installed.
pub fn ytdlp_args(dir: &Path, video_id: &str, format: &str, ffmpeg_dir: Option<&Path>) -> Vec<OsString> {
    let mut args: Vec<OsString> = [
        "--ignore-config",
        "--no-playlist",
        "--quiet",
        "--progress",
        "--newline",
        "--no-overwrites",
        "--windows-filenames",
        "--progress-template",
        "download:ytmd-progress:%(progress.downloaded_bytes)s/%(progress.total_bytes,progress.total_bytes_estimate)s",
        "--print",
        "after_move:ytmd-file:%(filepath)s",
        "-x",
        "--audio-format",
        format,
        "--audio-quality",
        "0",
        "--embed-metadata",
    ]
    .iter()
    .map(OsString::from)
    .collect();
    if let Some(ffmpeg) = ffmpeg_dir {
        args.push("--ffmpeg-location".into());
        args.push(ffmpeg.as_os_str().to_owned());
    }
    if format == "mp3" {
        // ffmpeg alone can embed covers in MP3; the other formats need
        // extra tools and would fail the whole save without them.
        args.push("--embed-thumbnail".into());
    }
    args.push("-P".into());
    args.push(dir.as_os_str().to_owned());
    args.push("-o".into());
    args.push("%(artist,creator,uploader|Unknown)s - %(track,title|Unknown)s.%(ext)s".into());
    args.push("--".into());
    args.push(format!("https://music.youtube.com/watch?v={video_id}").into());
    args
}

/// One line of yt-dlp's stdout, as far as we care.
#[derive(Debug, PartialEq)]
enum Line {
    /// Downloaded fraction, 0..=1.
    Progress(f64),
    File(String),
    Other,
}

fn parse_line(line: &str) -> Line {
    let line = line.trim();
    if let Some(rest) = line.strip_prefix("ytmd-progress:") {
        let mut parts = rest.split('/');
        let done = parts.next().and_then(|s| s.trim().parse::<f64>().ok());
        let total = parts.next().and_then(|s| s.trim().parse::<f64>().ok());
        return match (done, total) {
            (Some(d), Some(t)) if t > 0.0 => Line::Progress((d / t).clamp(0.0, 1.0)),
            _ => Line::Other,
        };
    }
    if let Some(path) = line.strip_prefix("ytmd-file:") {
        let name = Path::new(path.trim()).file_name().map(|n| n.to_string_lossy().into_owned());
        return name.map(Line::File).unwrap_or(Line::Other);
    }
    Line::Other
}

fn failure_message(stderr_tail: Option<&str>) -> String {
    // "ERROR: Postprocessing: ffprobe and ffmpeg not found. Please install…"
    if stderr_tail.is_some_and(|l| {
        let l = l.to_ascii_lowercase();
        l.contains("ffmpeg not found") || l.contains("ffprobe not found")
    }) {
        return "plugins.error.ffmpegMissing".into();
    }
    match stderr_tail.map(str::trim).filter(|l| !l.is_empty()) {
        Some(line) => format!("plugins.error.mediaFailed:{}", line.chars().take(MAX_ERROR_CHARS).collect::<String>()),
        None => "plugins.error.mediaFailed".into(),
    }
}

impl MediaJobs {
    #[cfg(test)]
    pub fn with_program(program: impl Into<OsString>) -> Self {
        Self { program: Some(program.into()), ..Self::default() }
    }

    /// Queues a save and returns its job id at once; progress, the result
    /// and failures arrive through `emit`.
    pub fn start(
        self: &Arc<Self>,
        plugin: &str,
        video_id: &str,
        format: &str,
        dir: PathBuf,
        tools: super::media_tools::ToolPaths,
        emit: Emit,
    ) -> Result<String, String> {
        if !valid_video_id(video_id) {
            return Err("plugins.error.badVideoId".into());
        }
        if !FORMATS.contains(&format) {
            return Err("plugins.error.badFormat".into());
        }
        let (cancel_tx, cancel_rx) = oneshot::channel();
        let job = {
            use rand::Rng;
            format!("{:016x}", rand::rng().random::<u64>())
        };
        {
            let mut jobs = self.jobs.lock();
            if jobs.len() >= MAX_JOBS {
                return Err("plugins.error.busy".into());
            }
            jobs.insert(job.clone(), Job { plugin: plugin.to_string(), cancel: Some(cancel_tx) });
        }
        let base = Progress {
            plugin: plugin.to_string(),
            job: job.clone(),
            video_id: video_id.to_string(),
            state: JobState::Queued,
            percent: 0.0,
            file: None,
            error: None,
        };
        let this = Arc::clone(self);
        let format = format.to_string();
        tauri::async_runtime::spawn(async move {
            let last = this.run(base.clone(), dir, &format, tools, cancel_rx, &emit).await;
            this.jobs.lock().remove(&base.job);
            emit(last);
        });
        Ok(job)
    }

    /// Cancels one of `plugin`'s jobs (another plugin's job id is refused).
    pub fn cancel(&self, plugin: &str, job: &str) -> Result<(), String> {
        let mut jobs = self.jobs.lock();
        let entry = jobs.get_mut(job).filter(|j| j.plugin == plugin).ok_or("plugins.error.noSuchJob")?;
        if let Some(tx) = entry.cancel.take() {
            let _ = tx.send(());
        }
        Ok(())
    }

    /// Cancels everything a plugin started (it was switched off or removed).
    pub fn cancel_all(&self, plugin: &str) {
        for job in self.jobs.lock().values_mut().filter(|j| j.plugin == plugin) {
            if let Some(tx) = job.cancel.take() {
                let _ = tx.send(());
            }
        }
    }

    /// Runs one job to its end and returns the final progress event.
    async fn run(
        &self,
        base: Progress,
        dir: PathBuf,
        format: &str,
        tools: super::media_tools::ToolPaths,
        mut cancel: oneshot::Receiver<()>,
        emit: &Emit,
    ) -> Progress {
        let with = |state: JobState, percent: f64| Progress { state, percent, ..base.clone() };
        let failed = |error: String| Progress { error: Some(error), ..with(JobState::Failed, 0.0) };
        emit(with(JobState::Queued, 0.0));

        let _permit = tokio::select! {
            permit = Arc::clone(&self.slots).acquire_owned() => match permit {
                Ok(p) => p,
                Err(_) => return failed("plugins.error.mediaFailed".into()),
            },
            _ = &mut cancel => return with(JobState::Cancelled, 0.0),
        };
        if let Err(e) = std::fs::create_dir_all(&dir) {
            return failed(format!("plugins.error.mediaFolder:{e}"));
        }

        let program = self.program.clone().unwrap_or(tools.ytdlp);
        let mut cmd = tokio::process::Command::new(program);
        cmd.args(ytdlp_args(&dir, &base.video_id, format, tools.ffmpeg_dir.as_deref()))
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true);
        #[cfg(windows)]
        cmd.creation_flags(0x0800_0000); // CREATE_NO_WINDOW: no console flashing up
        let mut child = match cmd.spawn() {
            Ok(c) => c,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => return failed("plugins.error.ytdlpMissing".into()),
            Err(e) => return failed(format!("plugins.error.mediaFailed:{e}")),
        };
        emit(with(JobState::Downloading, 0.0));

        // Both pipes are drained while waiting: yt-dlp blocks once a full
        // pipe buffer goes unread.
        let stdout = child.stdout.take();
        let stderr = child.stderr.take();
        let progress_emit = Arc::clone(emit);
        let progress_base = base.clone();
        let stdout_task = tokio::spawn(async move {
            let mut file = None;
            let mut shown = -1.0_f64;
            let Some(out) = stdout else { return file };
            let mut lines = tokio::io::BufReader::new(out).lines();
            while let Ok(Some(line)) = lines.next_line().await {
                match parse_line(&line) {
                    Line::Progress(fraction) => {
                        let (state, percent) = if fraction >= 1.0 {
                            (JobState::Converting, DOWNLOAD_SHARE)
                        } else {
                            (JobState::Downloading, (fraction * DOWNLOAD_SHARE).floor())
                        };
                        if percent > shown {
                            shown = percent;
                            progress_emit(Progress { state, percent, ..progress_base.clone() });
                        }
                    }
                    Line::File(name) => file = Some(name),
                    Line::Other => {}
                }
            }
            file
        });
        let stderr_task = tokio::spawn(async move {
            let mut last = None;
            let Some(err) = stderr else { return last };
            let mut lines = tokio::io::BufReader::new(err).lines();
            while let Ok(Some(line)) = lines.next_line().await {
                if !line.trim().is_empty() {
                    last = Some(line);
                }
            }
            last
        });

        let status = tokio::select! {
            status = child.wait() => status,
            _ = &mut cancel => {
                let _ = child.kill().await;
                return with(JobState::Cancelled, 0.0);
            }
        };
        let file = stdout_task.await.unwrap_or(None);
        let stderr_tail = stderr_task.await.unwrap_or(None);
        match status {
            Ok(s) if s.success() => Progress { file, ..with(JobState::Done, 100.0) },
            Ok(_) => failed(failure_message(stderr_tail.as_deref())),
            Err(e) => failed(format!("plugins.error.mediaFailed:{e}")),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn no_tools() -> super::super::media_tools::ToolPaths {
        super::super::media_tools::ToolPaths { ytdlp: "yt-dlp".into(), ffmpeg_dir: None }
    }

    #[test]
    fn test_video_ids_and_formats_are_checked() {
        assert!(valid_video_id("dQw4w9WgXcQ"));
        assert!(valid_video_id("a-_Z09abcde"));
        for bad in ["", "short", "dQw4w9WgXcQx", "../../etc/p", "dQw4w9WgXc ", "--exec=rm-r", "dQw4w9WgXc;"] {
            assert!(!valid_video_id(bad), "{bad}");
        }
        let jobs = Arc::new(MediaJobs::default());
        let emit: Emit = Arc::new(|_| {});
        let dir = PathBuf::from("/tmp/x");
        assert_eq!(jobs.start("p", "--exec=touch", "mp3", dir.clone(), no_tools(), emit.clone()).unwrap_err(), "plugins.error.badVideoId");
        assert_eq!(jobs.start("p", "dQw4w9WgXcQ", "exe", dir, no_tools(), emit).unwrap_err(), "plugins.error.badFormat");
    }

    #[test]
    fn test_the_command_line_is_fixed() {
        let args = ytdlp_args(Path::new("/music/YTMD"), "dQw4w9WgXcQ", "opus", None);
        let args: Vec<String> = args.iter().map(|a| a.to_string_lossy().into_owned()).collect();
        assert_eq!(args[0], "--ignore-config", "no config file can add --exec or change paths");
        assert!(!args.iter().any(|a| a.starts_with("--exec") || a == "--batch-file" || a == "--config-location"));
        let n = args.len();
        assert_eq!(&args[n - 2..], ["--", "https://music.youtube.com/watch?v=dQw4w9WgXcQ"]);
        let p = args.iter().position(|a| a == "-P").unwrap();
        assert_eq!(args[p + 1], "/music/YTMD");
        assert!(!args.contains(&"--embed-thumbnail".to_string()), "only for mp3");
        let mp3: Vec<String> = ytdlp_args(Path::new("/m"), "dQw4w9WgXcQ", "mp3", Some(Path::new("/tools"))).iter().map(|a| a.to_string_lossy().into_owned()).collect();
        assert!(mp3.contains(&"--embed-thumbnail".to_string()));
        let f = mp3.iter().position(|a| a == "--ffmpeg-location").unwrap();
        assert_eq!(mp3[f + 1], "/tools", "our own ffmpeg, when installed");
    }

    #[test]
    fn test_parse_lines() {
        assert_eq!(parse_line("ytmd-progress:50/200"), Line::Progress(0.25));
        assert_eq!(parse_line("ytmd-progress:NA/NA"), Line::Other);
        assert_eq!(parse_line("ytmd-progress:10/0"), Line::Other);
        assert_eq!(parse_line("ytmd-progress:300/200"), Line::Progress(1.0));
        assert_eq!(parse_line("ytmd-file:/music/YTMD/Artist - Song.mp3"), Line::File("Artist - Song.mp3".into()));
        assert_eq!(parse_line("[download] something"), Line::Other);
    }

    #[test]
    fn test_failure_message() {
        assert_eq!(failure_message(Some("  ERROR: Video unavailable ")), "plugins.error.mediaFailed:ERROR: Video unavailable");
        assert_eq!(failure_message(None), "plugins.error.mediaFailed");
        assert_eq!(
            failure_message(Some("ERROR: Postprocessing: ffprobe and ffmpeg not found. Please install or provide the path")),
            "plugins.error.ffmpegMissing"
        );
        assert_eq!(failure_message(Some(&"é".repeat(500))).chars().count(), "plugins.error.mediaFailed:".len() + MAX_ERROR_CHARS);
    }

    fn collect() -> (Emit, Arc<Mutex<Vec<Progress>>>) {
        let seen = Arc::new(Mutex::new(Vec::new()));
        let sink = Arc::clone(&seen);
        (Arc::new(move |p| sink.lock().push(p)), seen)
    }

    async fn wait_final(seen: &Arc<Mutex<Vec<Progress>>>) -> Progress {
        for _ in 0..200 {
            if let Some(last) = seen.lock().last().filter(|p| {
                matches!(p.state, JobState::Done | JobState::Failed | JobState::Cancelled)
            }) {
                return last.clone();
            }
            tokio::time::sleep(std::time::Duration::from_millis(25)).await;
        }
        panic!("job never finished: {:?}", seen.lock());
    }

    #[tokio::test]
    async fn test_missing_ytdlp_is_reported() {
        let jobs = Arc::new(MediaJobs::with_program("ytmd-test-no-such-program"));
        let dir = tempfile::tempdir().unwrap();
        let (emit, seen) = collect();
        jobs.start("p", "dQw4w9WgXcQ", "mp3", dir.path().to_path_buf(), no_tools(), emit).unwrap();
        let last = wait_final(&seen).await;
        assert_eq!(last.state, JobState::Failed);
        assert_eq!(last.error.as_deref(), Some("plugins.error.ytdlpMissing"));
        assert!(jobs.jobs.lock().is_empty());
    }

    /// A stand-in yt-dlp that prints what the real one would with our
    /// templates.
    #[cfg(unix)]
    fn fake_ytdlp(dir: &Path, body: &str) -> PathBuf {
        use std::os::unix::fs::PermissionsExt;
        let path = dir.join("fake-yt-dlp");
        std::fs::write(&path, format!("#!/bin/sh\n{body}\n")).unwrap();
        std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o755)).unwrap();
        path
    }

    #[cfg(unix)]
    #[tokio::test]
    async fn test_progress_and_the_saved_file_name() {
        let tmp = tempfile::tempdir().unwrap();
        let program = fake_ytdlp(
            tmp.path(),
            "echo ytmd-progress:25/100; echo ytmd-progress:100/100; echo \"ytmd-file:$(pwd)/Artist - Song.mp3\"",
        );
        let jobs = Arc::new(MediaJobs::with_program(program));
        let (emit, seen) = collect();
        let job = jobs.start("p", "dQw4w9WgXcQ", "mp3", tmp.path().join("out"), no_tools(), emit).unwrap();
        let last = wait_final(&seen).await;
        assert_eq!(last.state, JobState::Done);
        assert_eq!(last.job, job);
        assert_eq!(last.file.as_deref(), Some("Artist - Song.mp3"), "the name only, never the folder");
        let states: Vec<JobState> = seen.lock().iter().map(|p| p.state).collect();
        assert!(states.contains(&JobState::Downloading) && states.contains(&JobState::Converting), "{states:?}");
        assert!(tmp.path().join("out").is_dir(), "the folder is created");
    }

    #[cfg(unix)]
    #[tokio::test]
    async fn test_failure_carries_the_last_error_line() {
        let tmp = tempfile::tempdir().unwrap();
        let program = fake_ytdlp(tmp.path(), "echo 'WARNING: x' >&2; echo 'ERROR: Video unavailable' >&2; exit 1");
        let jobs = Arc::new(MediaJobs::with_program(program));
        let (emit, seen) = collect();
        jobs.start("p", "dQw4w9WgXcQ", "mp3", tmp.path().to_path_buf(), no_tools(), emit).unwrap();
        let last = wait_final(&seen).await;
        assert_eq!(last.error.as_deref(), Some("plugins.error.mediaFailed:ERROR: Video unavailable"));
    }

    /// Our exact command line through a real yt-dlp (and ffmpeg), with the
    /// URL swapped for a local file since tests can't reach YouTube:
    /// `YTMD_E2E_YTDLP=/path/to/yt-dlp YTMD_E2E_URL=http://127.0.0.1:8000/song.mp3
    ///  cargo test real_ytdlp -- --ignored`
    #[tokio::test]
    #[ignore]
    async fn test_real_ytdlp_accepts_our_command_line() {
        let program = std::env::var("YTMD_E2E_YTDLP").expect("YTMD_E2E_YTDLP");
        let url = std::env::var("YTMD_E2E_URL").expect("YTMD_E2E_URL");
        for format in FORMATS {
            let dir = tempfile::tempdir().unwrap();
            let mut args = ytdlp_args(dir.path(), "dQw4w9WgXcQ", format, None);
            *args.last_mut().unwrap() = url.clone().into();
            let out = tokio::process::Command::new(&program).args(&args).output().await.unwrap();
            let stdout = String::from_utf8_lossy(&out.stdout);
            assert!(out.status.success(), "{format}: {}", String::from_utf8_lossy(&out.stderr));
            let lines: Vec<Line> = stdout.lines().map(parse_line).collect();
            assert!(lines.iter().any(|l| matches!(l, Line::Progress(f) if *f >= 1.0)), "{format}: {stdout}");
            let file = lines.iter().find_map(|l| if let Line::File(f) = l { Some(f.clone()) } else { None }).expect("file line");
            assert!(file.ends_with(&format!(".{format}")), "{file}");
            assert!(dir.path().join(&file).is_file(), "{file} is in the chosen folder");
        }
    }

    #[cfg(unix)]
    #[tokio::test]
    async fn test_cancel_stops_the_process_and_only_for_its_plugin() {
        let tmp = tempfile::tempdir().unwrap();
        let program = fake_ytdlp(tmp.path(), "echo ytmd-progress:1/100; sleep 30");
        let jobs = Arc::new(MediaJobs::with_program(program));
        let (emit, seen) = collect();
        let job = jobs.start("p", "dQw4w9WgXcQ", "mp3", tmp.path().to_path_buf(), no_tools(), emit).unwrap();
        tokio::time::sleep(std::time::Duration::from_millis(200)).await;
        assert_eq!(jobs.cancel("other", &job).unwrap_err(), "plugins.error.noSuchJob");
        jobs.cancel("p", &job).unwrap();
        let started = std::time::Instant::now();
        assert_eq!(wait_final(&seen).await.state, JobState::Cancelled);
        assert!(started.elapsed() < std::time::Duration::from_secs(5));
    }
}
