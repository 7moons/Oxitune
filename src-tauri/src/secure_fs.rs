//! Owner-only files and folders for what Oxitune keeps in `~/.oxitune`: the
//! config, the room identity, the remote token, the session, logs. On unix
//! files are created 0600 and the folder 0700; elsewhere the user's profile
//! folder already limits access.

use std::fs;
use std::io::Write;
use std::path::Path;
use std::sync::atomic::{AtomicU64, Ordering};

/// Creates `dir` (and parents) and makes it owner-only.
pub fn ensure_private_dir(dir: &Path) -> std::io::Result<()> {
    fs::create_dir_all(dir)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(dir, fs::Permissions::from_mode(0o700))?;
    }
    Ok(())
}

/// Tightens an existing file to owner-only (no-op if it doesn't exist).
pub fn restrict_file(path: &Path) {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if path.exists() {
            let _ = fs::set_permissions(path, fs::Permissions::from_mode(0o600));
        }
    }
    #[cfg(not(unix))]
    let _ = path;
}

/// Writes `data` to `path` atomically (sibling temp file, then rename), the
/// file owner-only from the moment it exists. Each call has its own temp
/// file: with one shared `.tmp`, two writes at once deleted or collided with
/// each other's ("file exists" / "file not found", seen on session.json).
pub fn write_private(path: &Path, data: &[u8]) -> std::io::Result<()> {
    static NEXT: AtomicU64 = AtomicU64::new(0);
    let mut tmp = path.as_os_str().to_owned();
    tmp.push(format!(".{}.{}.tmp", std::process::id(), NEXT.fetch_add(1, Ordering::Relaxed)));
    let tmp = std::path::PathBuf::from(tmp);
    let written = write_new(&tmp, data).and_then(|()| rename_over(&tmp, path));
    if written.is_err() {
        let _ = fs::remove_file(&tmp);
    }
    written
}

fn write_new(tmp: &Path, data: &[u8]) -> std::io::Result<()> {
    let mut opts = fs::OpenOptions::new();
    opts.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        opts.mode(0o600);
    }
    let mut file = opts.open(tmp)?;
    file.write_all(data)?;
    file.sync_all()
}

/// `rename`, retried briefly: on Windows replacing a file another thread is
/// replacing (or reading) at that moment fails with "access denied".
fn rename_over(tmp: &Path, path: &Path) -> std::io::Result<()> {
    let mut attempt = 0;
    loop {
        match fs::rename(tmp, path) {
            Err(e) if attempt < 5 && e.kind() == std::io::ErrorKind::PermissionDenied => {
                attempt += 1;
                std::thread::sleep(std::time::Duration::from_millis(20));
            }
            other => return other,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_write_private_replaces_atomically_and_owner_only() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("secret");
        write_private(&path, b"one").unwrap();
        write_private(&path, b"two").unwrap();
        assert_eq!(fs::read(&path).unwrap(), b"two");
        let leftovers: Vec<_> = fs::read_dir(dir.path()).unwrap().map(|e| e.unwrap().file_name()).collect();
        assert_eq!(leftovers, vec![std::ffi::OsString::from("secret")], "no temp files left");
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            assert_eq!(fs::metadata(&path).unwrap().permissions().mode() & 0o777, 0o600);
        }
    }

    // Regression: session.json writes from two threads at once failed with
    // "file exists" / "file not found" through a shared temp file.
    #[test]
    fn test_concurrent_writes_all_succeed() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("session.json");
        let threads: Vec<_> = (0..8)
            .map(|i| {
                let path = path.clone();
                std::thread::spawn(move || {
                    for j in 0..25 {
                        write_private(&path, format!("{i}-{j}").as_bytes()).unwrap();
                    }
                })
            })
            .collect();
        for t in threads {
            t.join().unwrap();
        }
        assert!(fs::read_to_string(&path).unwrap().contains('-'));
        assert_eq!(fs::read_dir(dir.path()).unwrap().count(), 1, "no temp files left");
    }

    #[test]
    fn test_private_dir() {
        let dir = tempfile::tempdir().unwrap();
        let sub = dir.path().join("a/b");
        ensure_private_dir(&sub).unwrap();
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            assert_eq!(fs::metadata(&sub).unwrap().permissions().mode() & 0o777, 0o700);
        }
    }
}
