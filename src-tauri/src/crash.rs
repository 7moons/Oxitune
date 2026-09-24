//! Crash reports: a panic anywhere writes `crash-<time>.log` (message,
//! location, backtrace, version) to the logs folder, and the next launch
//! tells the user and offers to open that folder.

use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

const SEEN_MARKER: &str = ".crash-reported";

pub fn install_panic_hook(logs_dir: PathBuf, version: String) {
    let default_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        let backtrace = std::backtrace::Backtrace::force_capture();
        let thread = std::thread::current();
        let report = format!(
            "YTMD {version} crashed\nthread: {}\n{info}\n\nbacktrace:\n{backtrace}\n",
            thread.name().unwrap_or("<unnamed>")
        );
        log::error!("{report}");
        let _ = std::fs::create_dir_all(&logs_dir);
        let millis = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0);
        let _ = crate::secure_fs::write_private(&logs_dir.join(format!("crash-{millis}.log")), report.as_bytes());
        default_hook(info);
    }));
}

/// The newest crash report not reported yet, and marks it reported.
pub fn take_unreported(logs_dir: &Path) -> Option<PathBuf> {
    let seen = std::fs::read_to_string(logs_dir.join(SEEN_MARKER)).unwrap_or_default();
    let newest = std::fs::read_dir(logs_dir)
        .ok()?
        .flatten()
        .filter_map(|e| {
            let name = e.file_name().to_string_lossy().into_owned();
            let stamp: u128 = name.strip_prefix("crash-")?.strip_suffix(".log")?.parse().ok()?;
            Some((stamp, name, e.path()))
        })
        .max_by_key(|(stamp, _, _)| *stamp)?;
    if seen.trim() == newest.1 {
        return None;
    }
    let _ = std::fs::write(logs_dir.join(SEEN_MARKER), &newest.1);
    Some(newest.2)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_each_crash_is_reported_once() {
        let dir = tempfile::tempdir().unwrap();
        assert!(take_unreported(dir.path()).is_none());
        std::fs::write(dir.path().join("crash-100.log"), "x").unwrap();
        std::fs::write(dir.path().join("crash-200.log"), "y").unwrap();
        std::fs::write(dir.path().join("ytmd.log"), "not a crash").unwrap();
        assert_eq!(take_unreported(dir.path()).unwrap().file_name().unwrap(), "crash-200.log");
        assert!(take_unreported(dir.path()).is_none(), "already reported");
        std::fs::write(dir.path().join("crash-300.log"), "z").unwrap();
        assert_eq!(take_unreported(dir.path()).unwrap().file_name().unwrap(), "crash-300.log");
    }
}
