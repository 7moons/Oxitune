//! yt-dlp and ffmpeg for `media:save`, installed on request into
//! `~/.oxitune/tools/`.
//!
//! Only when the user agrees (a dialog Oxitune shows itself, or the button in
//! Settings), only from the projects' own GitHub releases (yt-dlp's latest
//! release, and yt-dlp's FFmpeg-Builds), over https to GitHub hosts only,
//! and only if the file matches the SHA-256 in the checksum file published
//! with that release. From an archive we copy just `ffmpeg` and `ffprobe`
//! under fixed names: no path from the archive is ever used to write. A
//! yt-dlp or ffmpeg already on the system is used as is; ours is preferred
//! once installed, and yt-dlp (which has to keep up with YouTube) is
//! refreshed when it is more than a week old.

use serde::{Deserialize, Serialize};
use std::ffi::OsString;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

const YTDLP_LATEST: &str = "https://github.com/yt-dlp/yt-dlp/releases/latest";
const YTDLP_DOWNLOAD: &str = "https://github.com/yt-dlp/yt-dlp/releases/download";
const YTDLP_SUMS: &str = "SHA2-256SUMS";
const FFMPEG_DOWNLOAD: &str = "https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest";
const FFMPEG_SUMS: &str = "checksums.sha256";
const MAX_YTDLP_BYTES: u64 = 150 * 1024 * 1024;
const MAX_FFMPEG_ARCHIVE_BYTES: u64 = 500 * 1024 * 1024;
const MAX_TOOL_BYTES: u64 = 400 * 1024 * 1024;
const MAX_SUMS_BYTES: usize = 64 * 1024;
/// yt-dlp older than this is replaced (YouTube changes often).
pub const YTDLP_MAX_AGE_SECS: u64 = 7 * 24 * 3600;

const EXE: &str = if cfg!(windows) { ".exe" } else { "" };

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ArchiveKind {
    Zip,
    TarXz,
}

/// yt-dlp's release asset for this machine.
pub fn ytdlp_asset() -> Option<&'static str> {
    match (std::env::consts::OS, std::env::consts::ARCH) {
        ("linux", "x86_64") => Some("yt-dlp_linux"),
        ("linux", "aarch64") => Some("yt-dlp_linux_aarch64"),
        ("windows", "x86_64") => Some("yt-dlp.exe"),
        ("windows", "aarch64") => Some("yt-dlp_arm64.exe"),
        ("macos", _) => Some("yt-dlp_macos"),
        _ => None,
    }
}

/// FFmpeg-Builds' archive for this machine (no macOS builds there).
pub fn ffmpeg_asset() -> Option<(&'static str, ArchiveKind)> {
    match (std::env::consts::OS, std::env::consts::ARCH) {
        ("linux", "x86_64") => Some(("ffmpeg-master-latest-linux64-gpl.tar.xz", ArchiveKind::TarXz)),
        ("linux", "aarch64") => Some(("ffmpeg-master-latest-linuxarm64-gpl.tar.xz", ArchiveKind::TarXz)),
        ("windows", "x86_64") => Some(("ffmpeg-master-latest-win64-gpl.zip", ArchiveKind::Zip)),
        ("windows", "aarch64") => Some(("ffmpeg-master-latest-winarm64-gpl.zip", ArchiveKind::Zip)),
        _ => None,
    }
}

/// The SHA-256 for `name` in a `sha256sum`-style file (`<hex>  <name>`,
/// optionally `*<name>` or `./<name>`).
pub fn sha256_for(sums: &str, name: &str) -> Option<String> {
    sums.lines().find_map(|line| {
        let mut parts = line.split_whitespace();
        let hash = parts.next()?;
        let file = parts.next()?.trim_start_matches('*').trim_start_matches("./");
        (file == name && hash.len() == 64 && hash.bytes().all(|b| b.is_ascii_hexdigit()))
            .then(|| hash.to_ascii_lowercase())
    })
}

/// The release tag from GitHub's `/releases/latest` redirect target.
pub fn tag_from_location(location: &str) -> Option<String> {
    let tag = location.trim_end_matches('/').rsplit_once("/releases/tag/")?.1;
    (!tag.is_empty() && tag.len() <= 64 && tag.bytes().all(|b| b.is_ascii_alphanumeric() || b"._-".contains(&b)))
        .then(|| tag.to_string())
}

/// Only https, only GitHub's own hosts (release files redirect to
/// `*.githubusercontent.com`).
pub fn allowed_url(url: &url::Url) -> bool {
    let host = url.host_str().unwrap_or_default();
    url.scheme() == "https"
        && (host == "github.com"
            || host == "objects.githubusercontent.com"
            || host == "release-assets.githubusercontent.com"
            || host.ends_with(".githubusercontent.com"))
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
struct Installed {
    #[serde(default)]
    ytdlp_version: Option<String>,
    #[serde(default)]
    ytdlp_installed_at: Option<u64>,
    #[serde(default)]
    ffmpeg_installed_at: Option<u64>,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Found {
    /// Installed by Oxitune.
    Managed,
    /// Found on the system's PATH.
    System,
    Missing,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolStatus {
    pub ytdlp: Found,
    pub ytdlp_version: Option<String>,
    pub ffmpeg: Found,
    /// This machine has builds we can install.
    pub installable: bool,
    pub installing: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum InstallState {
    Downloading,
    Installing,
    Done,
    Failed,
    Declined,
}

/// Sent as `plugin-media-tools`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallProgress {
    pub state: InstallState,
    /// `yt-dlp` or `ffmpeg` while downloading.
    pub tool: Option<&'static str>,
    pub percent: f64,
    pub error: Option<String>,
}

pub type EmitInstall = Arc<dyn Fn(InstallProgress) + Send + Sync>;

/// What `media:save` runs.
#[derive(Debug, Clone, PartialEq)]
pub struct ToolPaths {
    pub ytdlp: OsString,
    /// Folder with our ffmpeg/ffprobe, for `--ffmpeg-location`.
    pub ffmpeg_dir: Option<PathBuf>,
}

pub struct Tools {
    dir: PathBuf,
    installing: AtomicBool,
}

fn now_secs() -> u64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0)
}

/// Looks `name` up on PATH like the OS would (with `.exe` on Windows).
fn find_in_path(name: &str) -> Option<PathBuf> {
    let file = format!("{name}{EXE}");
    std::env::var_os("PATH")
        .map(|p| std::env::split_paths(&p).map(|d| d.join(&file)).find(|p| p.is_file()))
        .unwrap_or(None)
}

impl Tools {
    /// `dir` is `~/.oxitune/tools`.
    pub fn new(dir: PathBuf) -> Self {
        Self { dir, installing: AtomicBool::new(false) }
    }

    fn ytdlp_path(&self) -> PathBuf {
        self.dir.join(format!("yt-dlp{EXE}"))
    }

    fn ffmpeg_paths(&self) -> [PathBuf; 2] {
        [self.dir.join(format!("ffmpeg{EXE}")), self.dir.join(format!("ffprobe{EXE}"))]
    }

    fn read_installed(&self) -> Installed {
        std::fs::read(self.dir.join("tools.json"))
            .ok()
            .and_then(|raw| serde_json::from_slice(&raw).ok())
            .unwrap_or_default()
    }

    fn write_installed(&self, installed: &Installed) -> Result<(), String> {
        let json = serde_json::to_vec_pretty(installed).map_err(|e| e.to_string())?;
        crate::secure_fs::write_private(&self.dir.join("tools.json"), &json).map_err(|e| e.to_string())
    }

    fn managed_ffmpeg(&self) -> bool {
        self.ffmpeg_paths().iter().all(|p| p.is_file())
    }

    pub fn paths(&self) -> ToolPaths {
        let ytdlp = self.ytdlp_path();
        ToolPaths {
            ytdlp: if ytdlp.is_file() { ytdlp.into_os_string() } else { OsString::from("yt-dlp") },
            ffmpeg_dir: self.managed_ffmpeg().then(|| self.dir.clone()),
        }
    }

    pub fn status(&self) -> ToolStatus {
        let installed = self.read_installed();
        let ytdlp = if self.ytdlp_path().is_file() {
            Found::Managed
        } else if find_in_path("yt-dlp").is_some() {
            Found::System
        } else {
            Found::Missing
        };
        let ffmpeg = if self.managed_ffmpeg() {
            Found::Managed
        } else if find_in_path("ffmpeg").is_some() && find_in_path("ffprobe").is_some() {
            Found::System
        } else {
            Found::Missing
        };
        ToolStatus {
            ytdlp,
            ytdlp_version: (ytdlp == Found::Managed).then_some(installed.ytdlp_version).flatten(),
            ffmpeg,
            installable: ytdlp_asset().is_some() && ffmpeg_asset().is_some(),
            installing: self.installing.load(Ordering::SeqCst),
        }
    }

    /// Our yt-dlp exists and is older than a week.
    pub fn ytdlp_stale(&self) -> bool {
        self.ytdlp_path().is_file()
            && self.read_installed().ytdlp_installed_at.is_none_or(|t| now_secs().saturating_sub(t) > YTDLP_MAX_AGE_SECS)
    }

    /// Installs yt-dlp (always, when `refresh_ytdlp`; else only if it's
    /// missing) and ffmpeg (if missing). One install at a time.
    pub async fn install(&self, refresh_ytdlp: bool, emit: EmitInstall) -> Result<(), String> {
        if self.installing.swap(true, Ordering::SeqCst) {
            return Err("plugins.error.toolsBusy".into());
        }
        let result = self.install_inner(refresh_ytdlp, &emit).await;
        self.installing.store(false, Ordering::SeqCst);
        match &result {
            Ok(()) => emit(InstallProgress { state: InstallState::Done, tool: None, percent: 100.0, error: None }),
            Err(e) => {
                log::warn!("[Oxitune Plugins] installing media tools failed: {e}");
                emit(InstallProgress { state: InstallState::Failed, tool: None, percent: 0.0, error: Some(e.clone()) })
            }
        }
        result
    }

    async fn install_inner(&self, refresh_ytdlp: bool, emit: &EmitInstall) -> Result<(), String> {
        let status = self.status();
        let want_ytdlp = refresh_ytdlp || status.ytdlp == Found::Missing;
        let want_ffmpeg = status.ffmpeg == Found::Missing;
        if !want_ytdlp && !want_ffmpeg {
            return Ok(());
        }
        let ytdlp_asset = ytdlp_asset().ok_or("plugins.error.toolsUnsupported")?;
        let ffmpeg_asset = ffmpeg_asset();
        if want_ffmpeg && ffmpeg_asset.is_none() {
            return Err("plugins.error.toolsUnsupported".into());
        }
        crate::secure_fs::ensure_private_dir(&self.dir).map_err(|e| e.to_string())?;
        let staging = super::Staging::new(&self.dir)?;
        let client = client()?;
        // Progress: yt-dlp is ~15% of the bytes when both are needed.
        let (ytdlp_share, ffmpeg_share) = match (want_ytdlp, want_ffmpeg) {
            (true, true) => (15.0, 85.0),
            (true, false) => (100.0, 0.0),
            _ => (0.0, 100.0),
        };
        let mut installed = self.read_installed();

        if want_ytdlp {
            let tag = latest_ytdlp_tag().await?;
            let base = format!("{YTDLP_DOWNLOAD}/{tag}");
            let sums = fetch_text(&client, &format!("{base}/{YTDLP_SUMS}")).await?;
            let hash = sha256_for(&sums, ytdlp_asset).ok_or("plugins.error.toolsChecksum")?;
            let target = staging.0.join(format!("yt-dlp{EXE}"));
            let emit_dl = Arc::clone(emit);
            download(&client, &format!("{base}/{ytdlp_asset}"), &target, &hash, MAX_YTDLP_BYTES, move |f| {
                emit_dl(InstallProgress { state: InstallState::Downloading, tool: Some("yt-dlp"), percent: (f * ytdlp_share).floor(), error: None })
            })
            .await?;
            make_executable(&target)?;
            installed.ytdlp_version = Some(tag);
        }
        if want_ffmpeg {
            let (name, kind) = ffmpeg_asset.expect("checked above");
            let sums = fetch_text(&client, &format!("{FFMPEG_DOWNLOAD}/{FFMPEG_SUMS}")).await?;
            let hash = sha256_for(&sums, name).ok_or("plugins.error.toolsChecksum")?;
            let archive = staging.0.join(name);
            let emit_dl = Arc::clone(emit);
            download(&client, &format!("{FFMPEG_DOWNLOAD}/{name}"), &archive, &hash, MAX_FFMPEG_ARCHIVE_BYTES, move |f| {
                emit_dl(InstallProgress {
                    state: InstallState::Downloading,
                    tool: Some("ffmpeg"),
                    percent: (ytdlp_share + f * ffmpeg_share).floor().min(99.0),
                    error: None,
                })
            })
            .await?;
            emit(InstallProgress { state: InstallState::Installing, tool: Some("ffmpeg"), percent: 99.0, error: None });
            let out = staging.0.clone();
            tauri::async_runtime::spawn_blocking(move || extract_ffmpeg(&archive, kind, &out))
                .await
                .map_err(|e| e.to_string())??;
        }

        // Everything is downloaded and checked: move it into place.
        if want_ytdlp {
            replace(&staging.0.join(format!("yt-dlp{EXE}")), &self.ytdlp_path())?;
            installed.ytdlp_installed_at = Some(now_secs());
        }
        if want_ffmpeg {
            for target in self.ffmpeg_paths() {
                let name = target.file_name().expect("fixed name").to_owned();
                replace(&staging.0.join(name), &target)?;
            }
            installed.ffmpeg_installed_at = Some(now_secs());
        }
        self.write_installed(&installed)
    }
}

fn client() -> Result<reqwest::Client, String> {
    let policy = reqwest::redirect::Policy::custom(|attempt| {
        if attempt.previous().len() < 10 && allowed_url(attempt.url()) {
            attempt.follow()
        } else {
            attempt.stop()
        }
    });
    reqwest::Client::builder()
        .redirect(policy)
        .connect_timeout(std::time::Duration::from_secs(20))
        .timeout(std::time::Duration::from_secs(30 * 60))
        .user_agent(concat!("Oxitune/", env!("CARGO_PKG_VERSION")))
        .build()
        .map_err(|e| e.to_string())
}

/// The tag `/releases/latest` points at, so the checksum file and the
/// binary come from the same release.
async fn latest_ytdlp_tag() -> Result<String, String> {
    let no_redirect = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .connect_timeout(std::time::Duration::from_secs(20))
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| e.to_string())?;
    let res = no_redirect.get(YTDLP_LATEST).send().await.map_err(|_| "plugins.error.toolsNetwork".to_string())?;
    let location = res
        .headers()
        .get(reqwest::header::LOCATION)
        .and_then(|v| v.to_str().ok())
        .ok_or("plugins.error.toolsNetwork")?;
    tag_from_location(location).ok_or_else(|| "plugins.error.toolsNetwork".into())
}

async fn fetch_text(client: &reqwest::Client, url: &str) -> Result<String, String> {
    let res = client.get(url).send().await.map_err(|_| "plugins.error.toolsNetwork".to_string())?;
    if !res.status().is_success() {
        return Err("plugins.error.toolsNetwork".into());
    }
    let body = res.bytes().await.map_err(|_| "plugins.error.toolsNetwork".to_string())?;
    if body.len() > MAX_SUMS_BYTES {
        return Err("plugins.error.toolsChecksum".into());
    }
    String::from_utf8(body.to_vec()).map_err(|_| "plugins.error.toolsChecksum".into())
}

/// Streams `url` to `target`, checking size and SHA-256 as it goes;
/// `progress` gets the downloaded fraction.
async fn download(
    client: &reqwest::Client,
    url: &str,
    target: &Path,
    sha256: &str,
    max: u64,
    progress: impl Fn(f64),
) -> Result<(), String> {
    let mut res = client.get(url).send().await.map_err(|_| "plugins.error.toolsNetwork".to_string())?;
    if !res.status().is_success() {
        return Err("plugins.error.toolsNetwork".into());
    }
    let total = res.content_length().filter(|&n| n > 0);
    if total.is_some_and(|n| n > max) {
        return Err("plugins.error.toolsTooBig".into());
    }
    let mut file = std::fs::File::create(target).map_err(|e| e.to_string())?;
    let mut hasher = ring::digest::Context::new(&ring::digest::SHA256);
    let mut done: u64 = 0;
    let mut last_shown = -1.0;
    while let Some(chunk) = res.chunk().await.map_err(|_| "plugins.error.toolsNetwork".to_string())? {
        done += chunk.len() as u64;
        if done > max {
            return Err("plugins.error.toolsTooBig".into());
        }
        hasher.update(&chunk);
        file.write_all(&chunk).map_err(|e| e.to_string())?;
        if let Some(total) = total {
            let fraction = (done as f64 / total as f64).min(1.0);
            if fraction - last_shown >= 0.01 {
                last_shown = fraction;
                progress(fraction);
            }
        }
    }
    file.sync_all().map_err(|e| e.to_string())?;
    if !hex_eq(hasher.finish().as_ref(), sha256) {
        return Err("plugins.error.toolsChecksum".into());
    }
    Ok(())
}

fn hex_eq(digest: &[u8], hex: &str) -> bool {
    let ours: String = digest.iter().map(|b| format!("{b:02x}")).collect();
    ours.eq_ignore_ascii_case(hex)
}

/// Copies `bin/ffmpeg` and `bin/ffprobe` out of the archive into `out`
/// under fixed names. Everything else in the archive is ignored.
pub fn extract_ffmpeg(archive: &Path, kind: ArchiveKind, out: &Path) -> Result<(), String> {
    let wanted = [format!("ffmpeg{EXE}"), format!("ffprobe{EXE}")];
    let mut found = [false, false];
    let mut take = |name: &str, parent_is_bin: bool, reader: &mut dyn Read| -> Result<(), String> {
        let Some(i) = wanted.iter().position(|w| w == name).filter(|_| parent_is_bin) else { return Ok(()) };
        if found[i] {
            return Ok(());
        }
        let target = out.join(&wanted[i]);
        let mut file = std::fs::File::create(&target).map_err(|e| e.to_string())?;
        let copied = std::io::copy(&mut reader.take(MAX_TOOL_BYTES + 1), &mut file).map_err(|e| e.to_string())?;
        if copied > MAX_TOOL_BYTES {
            return Err("plugins.error.toolsTooBig".into());
        }
        make_executable(&target)?;
        found[i] = true;
        Ok(())
    };
    match kind {
        ArchiveKind::Zip => {
            let file = std::fs::File::open(archive).map_err(|e| e.to_string())?;
            let mut zip = zip::ZipArchive::new(std::io::BufReader::new(file)).map_err(|_| "plugins.error.toolsArchive".to_string())?;
            for i in 0..zip.len() {
                let mut entry = zip.by_index(i).map_err(|_| "plugins.error.toolsArchive".to_string())?;
                if !entry.is_file() {
                    continue;
                }
                let path = PathBuf::from(entry.name().replace('\\', "/"));
                let (name, parent_is_bin) = split_bin(&path);
                take(&name, parent_is_bin, &mut entry)?;
            }
        }
        ArchiveKind::TarXz => {
            // Unpack the .xz next to it first: lzma-rs decodes into a writer.
            let tar_path = archive.with_extension("");
            {
                let mut input = std::io::BufReader::new(std::fs::File::open(archive).map_err(|e| e.to_string())?);
                let mut output = std::io::BufWriter::new(std::fs::File::create(&tar_path).map_err(|e| e.to_string())?);
                lzma_rs::xz_decompress(&mut input, &mut output).map_err(|_| "plugins.error.toolsArchive".to_string())?;
                output.flush().map_err(|e| e.to_string())?;
            }
            let mut tar = tar::Archive::new(std::fs::File::open(&tar_path).map_err(|e| e.to_string())?);
            for entry in tar.entries().map_err(|_| "plugins.error.toolsArchive".to_string())? {
                let mut entry = entry.map_err(|_| "plugins.error.toolsArchive".to_string())?;
                if !entry.header().entry_type().is_file() {
                    continue;
                }
                let path = entry.path().map_err(|_| "plugins.error.toolsArchive".to_string())?.into_owned();
                let (name, parent_is_bin) = split_bin(&path);
                take(&name, parent_is_bin, &mut entry)?;
            }
            let _ = std::fs::remove_file(&tar_path);
        }
    }
    if found.iter().all(|f| *f) {
        Ok(())
    } else {
        Err("plugins.error.toolsArchive".into())
    }
}

/// The file name, and whether it sits in a folder called `bin`.
fn split_bin(path: &Path) -> (String, bool) {
    let name = path.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default();
    let parent_is_bin = path.parent().and_then(|p| p.file_name()).is_some_and(|p| p == "bin");
    (name, parent_is_bin)
}

fn make_executable(path: &Path) -> Result<(), String> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o755)).map_err(|e| e.to_string())?;
    }
    let _ = path;
    Ok(())
}

/// Moves `from` over `to` (Windows can't rename over an existing file).
fn replace(from: &Path, to: &Path) -> Result<(), String> {
    if cfg!(windows) && to.exists() {
        std::fs::remove_file(to).map_err(|_| "plugins.error.toolsInUse".to_string())?;
    }
    std::fs::rename(from, to).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_checksum_lines() {
        let sums = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef  yt-dlp\n\
                    AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA  yt-dlp_linux\n\
                    bad  yt-dlp.exe\n\
                    1111111111111111111111111111111111111111111111111111111111111111 *ffmpeg-master-latest-win64-gpl.zip\n";
        assert_eq!(sha256_for(sums, "yt-dlp_linux").unwrap(), "a".repeat(64));
        assert!(sha256_for(sums, "yt-dlp.exe").is_none(), "not a SHA-256");
        assert!(sha256_for(sums, "yt-dlp_linu").is_none(), "exact names only");
        assert_eq!(sha256_for(sums, "ffmpeg-master-latest-win64-gpl.zip").unwrap(), "1".repeat(64));
    }

    #[test]
    fn test_release_tag_from_redirect() {
        assert_eq!(tag_from_location("https://github.com/yt-dlp/yt-dlp/releases/tag/2026.08.19").as_deref(), Some("2026.08.19"));
        assert!(tag_from_location("https://github.com/yt-dlp/yt-dlp/releases/tag/../../x/y").is_none());
        assert!(tag_from_location("https://github.com/yt-dlp/yt-dlp/releases").is_none());
    }

    #[test]
    fn test_only_github_https() {
        for ok in ["https://github.com/a", "https://objects.githubusercontent.com/x", "https://release-assets.githubusercontent.com/x"] {
            assert!(allowed_url(&url::Url::parse(ok).unwrap()), "{ok}");
        }
        for bad in ["http://github.com/a", "https://github.com.evil.com/a", "https://evil.com/githubusercontent.com", "https://githubusercontent.com.evil/x"] {
            assert!(!allowed_url(&url::Url::parse(bad).unwrap()), "{bad}");
        }
    }

    fn tar_with(entries: &[(&str, &[u8])]) -> Vec<u8> {
        let mut builder = tar::Builder::new(Vec::new());
        for (path, data) in entries {
            let mut header = tar::Header::new_gnu();
            header.set_size(data.len() as u64);
            header.set_mode(0o644);
            header.set_cksum();
            builder.append_data(&mut header, path, *data).unwrap();
        }
        builder.into_inner().unwrap()
    }

    #[test]
    fn test_extracts_only_ffmpeg_and_ffprobe_from_tar_xz() {
        let dir = tempfile::tempdir().unwrap();
        let (ffmpeg, ffprobe) = (format!("ffmpeg-master/bin/ffmpeg{EXE}"), format!("ffmpeg-master/bin/ffprobe{EXE}"));
        let tar = tar_with(&[
            (ffmpeg.as_str(), b"FFMPEG"),
            (ffprobe.as_str(), b"FFPROBE"),
            ("ffmpeg-master/bin/ffplay", b"no"),
            ("ffmpeg-master/doc/ffmpeg", b"not in bin"),
            ("ffmpeg-master/LICENSE.txt", b"gpl"),
        ]);
        let mut xz = Vec::new();
        lzma_rs::xz_compress(&mut std::io::Cursor::new(tar), &mut xz).unwrap();
        let archive = dir.path().join("ffmpeg.tar.xz");
        std::fs::write(&archive, xz).unwrap();
        let out = dir.path().join("out");
        std::fs::create_dir(&out).unwrap();
        extract_ffmpeg(&archive, ArchiveKind::TarXz, &out).unwrap();
        let mut names: Vec<String> = std::fs::read_dir(&out).unwrap().flatten().map(|e| e.file_name().to_string_lossy().into_owned()).collect();
        names.sort();
        assert_eq!(names, vec![format!("ffmpeg{EXE}"), format!("ffprobe{EXE}")]);
        assert_eq!(std::fs::read(out.join(format!("ffmpeg{EXE}"))).unwrap(), b"FFMPEG");
        assert!(!archive.with_extension("").exists(), "the unpacked .tar is removed");
    }

    /// Archives made by the real `xz` tool the way release builds are
    /// (`tar cJf` = xz defaults with a CRC64 check; multi-threaded = several
    /// blocks; big dictionary). lzma-rs can't read the optional SHA-256
    /// check: such an archive fails with `toolsArchive`, never silently.
    /// Skipped where `xz` isn't installed.
    #[cfg(unix)]
    #[test]
    fn test_extracts_what_the_xz_tool_makes() {
        if find_in_path("xz").is_none() {
            return;
        }
        let dir = tempfile::tempdir().unwrap();
        let big: Vec<u8> = (0..3_000_000u32).map(|i| (i.wrapping_mul(2654435761) >> 13) as u8).collect();
        let tar = tar_with(&[("ffmpeg-x/bin/ffmpeg", &big), ("ffmpeg-x/bin/ffprobe", b"FFPROBE")]);
        std::fs::write(dir.path().join("source.tar"), &tar).unwrap();
        for opts in [&[][..], &["-T2", "--block-size=1MiB"], &["--check=crc32"], &["-9e"]] {
            let out = std::process::Command::new("xz").args(opts).args(["-k", "-c"]).arg(dir.path().join("source.tar")).output().unwrap();
            assert!(out.status.success(), "xz {opts:?}: {}", String::from_utf8_lossy(&out.stderr));
            let archive = dir.path().join("t.tar.xz");
            std::fs::write(&archive, out.stdout).unwrap();
            let target = dir.path().join(format!("out{}", opts.join("")));
            std::fs::create_dir(&target).unwrap();
            extract_ffmpeg(&archive, ArchiveKind::TarXz, &target).unwrap_or_else(|e| panic!("{opts:?}: {e}"));
            assert_eq!(std::fs::read(target.join("ffmpeg")).unwrap(), big, "{opts:?}");
        }
        let out = std::process::Command::new("xz").args(["--check=sha256", "-k", "-c"]).arg(dir.path().join("source.tar")).output().unwrap();
        let archive = dir.path().join("sha.tar.xz");
        std::fs::write(&archive, out.stdout).unwrap();
        assert_eq!(extract_ffmpeg(&archive, ArchiveKind::TarXz, dir.path()).unwrap_err(), "plugins.error.toolsArchive");
    }

    #[test]
    fn test_extracts_from_zip_and_ignores_paths_in_it() {
        let dir = tempfile::tempdir().unwrap();
        let archive = dir.path().join("ffmpeg.zip");
        {
            let mut zip = zip::ZipWriter::new(std::fs::File::create(&archive).unwrap());
            let opts = zip::write::SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);
            for (path, data) in [
                (format!("../../evil/bin/ffmpeg{EXE}"), b"EVIL-PATH-IGNORED".as_slice()),
                (format!("ffmpeg-master/bin/ffprobe{EXE}"), b"FFPROBE".as_slice()),
                ("ffmpeg-master/bin/readme.txt".to_string(), b"x".as_slice()),
            ] {
                zip.start_file(path, opts).unwrap();
                zip.write_all(data).unwrap();
            }
            zip.finish().unwrap();
        }
        let out = dir.path().join("out");
        std::fs::create_dir(&out).unwrap();
        extract_ffmpeg(&archive, ArchiveKind::Zip, &out).unwrap();
        // Only the fixed names are written, always into `out`.
        assert_eq!(std::fs::read(out.join(format!("ffmpeg{EXE}"))).unwrap(), b"EVIL-PATH-IGNORED");
        assert!(!dir.path().join("evil").exists());
    }

    #[test]
    fn test_an_archive_without_ffmpeg_is_refused() {
        let dir = tempfile::tempdir().unwrap();
        let mut xz = Vec::new();
        lzma_rs::xz_compress(&mut std::io::Cursor::new(tar_with(&[("x/bin/ffmpeg", b"only one")])), &mut xz).unwrap();
        let archive = dir.path().join("a.tar.xz");
        std::fs::write(&archive, xz).unwrap();
        assert_eq!(extract_ffmpeg(&archive, ArchiveKind::TarXz, dir.path()).unwrap_err(), "plugins.error.toolsArchive");
    }

    #[test]
    fn test_paths_prefer_our_copies() {
        let dir = tempfile::tempdir().unwrap();
        let tools = Tools::new(dir.path().to_path_buf());
        assert_eq!(tools.paths(), ToolPaths { ytdlp: "yt-dlp".into(), ffmpeg_dir: None });
        assert!(!tools.ytdlp_stale());
        for name in ["yt-dlp", "ffmpeg", "ffprobe"] {
            std::fs::write(dir.path().join(format!("{name}{EXE}")), b"x").unwrap();
        }
        let paths = tools.paths();
        assert_eq!(PathBuf::from(&paths.ytdlp), dir.path().join(format!("yt-dlp{EXE}")));
        assert_eq!(paths.ffmpeg_dir.as_deref(), Some(dir.path()));
        assert_eq!(tools.status().ytdlp, Found::Managed);
        assert!(tools.ytdlp_stale(), "no install time recorded: refresh it");
        tools.write_installed(&Installed { ytdlp_installed_at: Some(now_secs()), ..Default::default() }).unwrap();
        assert!(!tools.ytdlp_stale());
    }

    #[test]
    fn test_one_install_at_a_time() {
        let dir = tempfile::tempdir().unwrap();
        let tools = Tools::new(dir.path().to_path_buf());
        tools.installing.store(true, Ordering::SeqCst);
        let rt = tokio::runtime::Runtime::new().unwrap();
        let emit: EmitInstall = Arc::new(|_| {});
        assert_eq!(rt.block_on(tools.install(true, emit)).unwrap_err(), "plugins.error.toolsBusy");
    }

    /// Serves `body` once per connection on a local port.
    fn serve(body: Vec<u8>) -> String {
        let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = listener.local_addr().unwrap();
        std::thread::spawn(move || {
            for stream in listener.incoming().flatten() {
                let mut stream = stream;
                let mut buf = [0u8; 1024];
                let _ = stream.read(&mut buf);
                let head = format!("HTTP/1.1 200 OK\r\nContent-Length: {}\r\nConnection: close\r\n\r\n", body.len());
                let _ = stream.write_all(head.as_bytes());
                let _ = stream.write_all(&body);
            }
        });
        format!("http://{addr}/file")
    }

    #[test]
    fn test_download_checks_size_and_checksum() {
        let body = b"pretend this is yt-dlp".to_vec();
        let good: String = ring::digest::digest(&ring::digest::SHA256, &body).as_ref().iter().map(|b| format!("{b:02x}")).collect();
        let url = serve(body);
        let client = reqwest::Client::builder().no_proxy().build().unwrap();
        let dir = tempfile::tempdir().unwrap();
        let target = dir.path().join("f");
        let rt = tokio::runtime::Runtime::new().unwrap();
        let seen = std::sync::Mutex::new(Vec::new());
        rt.block_on(download(&client, &url, &target, &good, 1024, |f| seen.lock().unwrap().push(f))).unwrap();
        assert_eq!(std::fs::read(&target).unwrap(), b"pretend this is yt-dlp");
        assert_eq!(seen.lock().unwrap().last().copied(), Some(1.0));
        let wrong = "0".repeat(64);
        assert_eq!(rt.block_on(download(&client, &url, &target, &wrong, 1024, |_| {})).unwrap_err(), "plugins.error.toolsChecksum");
        assert_eq!(rt.block_on(download(&client, &url, &target, &good, 5, |_| {})).unwrap_err(), "plugins.error.toolsTooBig");
    }

    /// Real downloads from GitHub (not reachable from CI sandboxes):
    /// `cargo test real_tools_install -- --ignored`
    #[test]
    #[ignore]
    fn test_real_tools_install() {
        let dir = tempfile::tempdir().unwrap();
        let tools = Tools::new(dir.path().to_path_buf());
        let rt = tokio::runtime::Runtime::new().unwrap();
        let emit: EmitInstall = Arc::new(|p| eprintln!("{p:?}"));
        rt.block_on(tools.install(true, emit)).unwrap();
        let status = tools.status();
        assert_eq!(status.ytdlp, Found::Managed);
        let out = std::process::Command::new(tools.ytdlp_path()).arg("--version").output().unwrap();
        assert!(out.status.success());
    }
}
