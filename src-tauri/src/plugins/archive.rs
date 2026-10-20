//! Plugin archives (`.tar.gz`) and plugin folders.
//!
//! Extraction refuses anything that could land outside the target folder
//! or be something other than a plain file: absolute paths, `..`, symlinks,
//! hard links, devices, and caps size and file count (zip-slip and
//! decompression bombs). Loading a folder re-checks the manifest and the
//! files it names.

use super::manifest::{Manifest, MAX_ENTRY_BYTES, MAX_PLUGIN_BYTES, MAX_STYLE_BYTES};
use std::io::Read;
use std::path::{Component, Path, PathBuf};

const MAX_FILES: usize = 200;

/// Extracts a `.tar.gz` into `dest` (which must exist and be empty).
pub fn extract_tar_gz(data: &[u8], dest: &Path) -> Result<(), String> {
    let decoder = flate2::read::GzDecoder::new(data).take(MAX_PLUGIN_BYTES + 1);
    let mut archive = tar::Archive::new(decoder);
    let mut total: u64 = 0;
    let mut files = 0usize;
    for entry in archive.entries().map_err(|e| format!("not a plugin archive: {e}"))? {
        let mut entry = entry.map_err(|e| format!("broken archive: {e}"))?;
        let kind = entry.header().entry_type();
        let raw_path = entry.path().map_err(|_| "archive path is not valid UTF-8".to_string())?.into_owned();
        let rel = safe_relative(&raw_path).ok_or_else(|| format!("archive entry {:?} escapes the plugin folder", raw_path))?;
        if kind.is_dir() {
            if !rel.as_os_str().is_empty() {
                std::fs::create_dir_all(dest.join(&rel)).map_err(|e| e.to_string())?;
            }
            continue;
        }
        if !kind.is_file() {
            return Err(format!("archive entry {:?} is not a regular file", raw_path));
        }
        files += 1;
        total += entry.size();
        if files > MAX_FILES || total > MAX_PLUGIN_BYTES {
            return Err("plugin archive is too big".into());
        }
        let target = dest.join(&rel);
        if let Some(parent) = target.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let mut buf = Vec::with_capacity(entry.size() as usize);
        (&mut entry).take(MAX_PLUGIN_BYTES).read_to_end(&mut buf).map_err(|e| e.to_string())?;
        // create_new: never write through something that already exists
        // there (a planted symlink included).
        let mut out = std::fs::OpenOptions::new().write(true).create_new(true).open(&target).map_err(|e| e.to_string())?;
        std::io::Write::write_all(&mut out, &buf).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// `path` as a relative path of normal components only; a leading `./` or
/// a single top folder named like the archive (`plugin/…`) is kept as is.
fn safe_relative(path: &Path) -> Option<PathBuf> {
    let mut out = PathBuf::new();
    for c in path.components() {
        match c {
            Component::Normal(part) => {
                let s = part.to_str()?;
                if s.starts_with('.') && s != "." {
                    return None;
                }
                out.push(part);
            }
            Component::CurDir => {}
            _ => return None,
        }
    }
    Some(out)
}

/// A plugin folder, checked: its manifest, entry script and styles.
#[derive(Debug, Clone)]
pub struct LoadedPlugin {
    pub manifest: Manifest,
    pub dir: PathBuf,
    pub code: String,
    pub styles: Vec<String>,
}

fn read_capped(dir: &Path, rel: &str, cap: u64) -> Result<String, String> {
    let path = dir.join(rel);
    // No following links out of the folder: the canonical file must be in it.
    let canon_dir = dir.canonicalize().map_err(|e| e.to_string())?;
    let canon = path.canonicalize().map_err(|_| format!("{rel} is missing"))?;
    if !canon.starts_with(&canon_dir) {
        return Err(format!("{rel} points outside the plugin folder"));
    }
    let meta = std::fs::metadata(&canon).map_err(|e| e.to_string())?;
    if !meta.is_file() || meta.len() > cap {
        return Err(format!("{rel} is not a file or too big"));
    }
    std::fs::read_to_string(&canon).map_err(|_| format!("{rel} is not UTF-8 text"))
}

/// Reads and checks the plugin in `dir`. Built-in permissions are refused.
pub fn load_dir(dir: &Path) -> Result<LoadedPlugin, String> {
    let manifest_json = read_capped(dir, "manifest.json", 64 * 1024)?;
    let manifest = Manifest::parse(manifest_json.as_bytes())?;
    let code = read_capped(dir, &manifest.entry, MAX_ENTRY_BYTES)?;
    let styles = manifest
        .styles
        .iter()
        .map(|s| read_capped(dir, s, MAX_STYLE_BYTES))
        .collect::<Result<Vec<_>, _>>()?;
    Ok(LoadedPlugin { manifest, dir: dir.to_path_buf(), code, styles })
}

/// The folder in `dest` that holds `manifest.json`: `dest` itself, or its
/// single sub-folder (archives made with `tar czf x.tgz plugin-folder/`).
pub fn plugin_root(dest: &Path) -> Option<PathBuf> {
    if dest.join("manifest.json").is_file() {
        return Some(dest.to_path_buf());
    }
    let mut dirs = std::fs::read_dir(dest).ok()?.flatten().filter(|e| e.path().is_dir());
    let only = dirs.next()?;
    if dirs.next().is_some() {
        return None;
    }
    only.path().join("manifest.json").is_file().then(|| only.path())
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;

    pub(crate) fn tar_gz(entries: &[(&str, &[u8])]) -> Vec<u8> {
        let mut builder = tar::Builder::new(flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::fast()));
        for (path, data) in entries {
            let mut header = tar::Header::new_gnu();
            header.set_size(data.len() as u64);
            header.set_mode(0o644);
            header.set_entry_type(tar::EntryType::Regular);
            // set_path refuses `..`; write the raw name to test hostile input.
            let name = path.as_bytes();
            header.as_old_mut().name[..name.len()].copy_from_slice(name);
            header.set_cksum();
            builder.append(&header, *data).unwrap();
        }
        builder.into_inner().unwrap().finish().unwrap()
    }

    pub(crate) fn sample_plugin() -> Vec<u8> {
        let manifest = serde_json::to_vec(&super::super::manifest::tests::sample()).unwrap();
        tar_gz(&[("manifest.json", &manifest), ("main.js", b"oxitune.log.info('hi');"), ("theme.css", b"body{}")])
    }

    #[test]
    fn test_extracts_and_loads_a_plugin() {
        let dir = tempfile::tempdir().unwrap();
        extract_tar_gz(&sample_plugin(), dir.path()).unwrap();
        let root = plugin_root(dir.path()).unwrap();
        let loaded = load_dir(&root).unwrap();
        assert_eq!(loaded.manifest.id, "com.example.theme");
        assert_eq!(loaded.styles, vec!["body{}".to_string()]);
    }

    #[test]
    fn test_zip_slip_and_absolute_paths_are_refused() {
        for evil in ["../evil.js", "a/../../evil.js", "/etc/evil"] {
            let dir = tempfile::tempdir().unwrap();
            let data = tar_gz(&[(evil, b"x")]);
            assert!(extract_tar_gz(&data, dir.path()).is_err(), "{evil}");
        }
    }

    #[test]
    fn test_links_and_hidden_files_are_refused() {
        let dir = tempfile::tempdir().unwrap();
        let mut builder = tar::Builder::new(flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::fast()));
        let mut header = tar::Header::new_gnu();
        header.set_entry_type(tar::EntryType::Symlink);
        header.set_size(0);
        builder.append_link(&mut header, "link.js", "/etc/passwd").unwrap();
        let data = builder.into_inner().unwrap().finish().unwrap();
        assert!(extract_tar_gz(&data, dir.path()).is_err());
        assert!(extract_tar_gz(&tar_gz(&[(".git/config", b"x")]), dir.path()).is_err());
    }

    #[test]
    fn test_decompression_bombs_are_capped() {
        let dir = tempfile::tempdir().unwrap();
        let big = vec![0u8; (MAX_PLUGIN_BYTES + 10) as usize];
        assert!(extract_tar_gz(&tar_gz(&[("main.js", &big)]), dir.path()).is_err());
    }

    #[cfg(unix)]
    #[test]
    fn test_loading_refuses_files_linked_out_of_the_folder() {
        let dir = tempfile::tempdir().unwrap();
        let outside = tempfile::tempdir().unwrap();
        std::fs::write(outside.path().join("secret.js"), "x").unwrap();
        let manifest = serde_json::to_vec(&super::super::manifest::tests::sample()).unwrap();
        std::fs::write(dir.path().join("manifest.json"), manifest).unwrap();
        std::fs::write(dir.path().join("theme.css"), "body{}").unwrap();
        std::os::unix::fs::symlink(outside.path().join("secret.js"), dir.path().join("main.js")).unwrap();
        assert!(load_dir(dir.path()).unwrap_err().contains("outside"));
    }
}
