//! Owner-only files and folders for what YTMD keeps in `~/.ytmd`: the
//! config, the room identity, the remote token, the session, logs. On unix
//! files are created 0600 and the folder 0700; elsewhere the user's profile
//! folder already limits access.

use std::fs;
use std::io::Write;
use std::path::Path;

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
/// file owner-only from the moment it exists.
pub fn write_private(path: &Path, data: &[u8]) -> std::io::Result<()> {
    let mut tmp = path.as_os_str().to_owned();
    tmp.push(".tmp");
    let tmp = std::path::PathBuf::from(tmp);
    let _ = fs::remove_file(&tmp);
    let mut opts = fs::OpenOptions::new();
    opts.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        opts.mode(0o600);
    }
    let mut file = opts.open(&tmp)?;
    file.write_all(data)?;
    file.sync_all()?;
    drop(file);
    fs::rename(&tmp, path)
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
        assert!(!dir.path().join("secret.tmp").exists());
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            assert_eq!(fs::metadata(&path).unwrap().permissions().mode() & 0o777, 0o600);
        }
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
