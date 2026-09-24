//! Plugin registries: an `index.json` signed with minisign (Ed25519) by the
//! registry's own key, listing each plugin's archive URL and SHA-256.
//!
//! YTMD ships no registry; the user adds one (URL + public key). Nothing
//! from a registry is used unless the signature checks out with that key,
//! and no archive is unpacked unless its SHA-256 matches the signed index.

use serde::{Deserialize, Serialize};

pub const INDEX_FORMAT: u32 = 1;
const MAX_INDEX_BYTES: usize = 2 * 1024 * 1024;
const MAX_ARCHIVE_BYTES: usize = super::manifest::MAX_PLUGIN_BYTES as usize;
const FETCH_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(20);

/// A registry the user added.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Registry {
    /// `https://…/index.json`; the signature is at `…/index.json.minisig`.
    pub url: String,
    /// The minisign public key (the `RW…` line, or the whole key file).
    pub public_key: String,
    #[serde(default)]
    pub name: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IndexEntry {
    pub id: String,
    pub name: String,
    pub version: String,
    pub api_version: u32,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub author: String,
    #[serde(default)]
    pub permissions: Vec<String>,
    /// `https://` URL of the `.tar.gz`.
    pub url: String,
    /// Lower-case hex SHA-256 of the archive.
    pub sha256: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RegistryIndex {
    pub format: u32,
    #[serde(default)]
    pub name: String,
    pub plugins: Vec<IndexEntry>,
}

fn public_key(text: &str) -> Result<minisign_verify::PublicKey, String> {
    let text = text.trim();
    let parsed = if text.contains('\n') {
        minisign_verify::PublicKey::decode(text)
    } else {
        minisign_verify::PublicKey::from_base64(text)
    };
    parsed.map_err(|_| "plugins.error.badKey".to_string())
}

pub fn validate_registry(reg: &Registry) -> Result<(), String> {
    let url = url::Url::parse(&reg.url).map_err(|_| "plugins.error.badRegistryUrl".to_string())?;
    if url.scheme() != "https" {
        return Err("plugins.error.badRegistryUrl".into());
    }
    public_key(&reg.public_key).map(|_| ())
}

/// Checks `signature` (a `.minisig` file) over `index` with `key` and
/// parses the index. Refuses unknown formats and malformed entries.
pub fn verify_index(index: &[u8], signature: &str, key: &str) -> Result<RegistryIndex, String> {
    if index.len() > MAX_INDEX_BYTES {
        return Err("plugins.error.badIndex".into());
    }
    let key = public_key(key)?;
    let sig = minisign_verify::Signature::decode(signature).map_err(|_| "plugins.error.badSignature".to_string())?;
    // Legacy (non-prehashed) signatures are Ed25519 by the same key too.
    key.verify(index, &sig, true).map_err(|_| "plugins.error.badSignature".to_string())?;
    let parsed: RegistryIndex = serde_json::from_slice(index).map_err(|_| "plugins.error.badIndex".to_string())?;
    if parsed.format != INDEX_FORMAT {
        return Err("plugins.error.badIndex".into());
    }
    for e in &parsed.plugins {
        let https = url::Url::parse(&e.url).is_ok_and(|u| u.scheme() == "https");
        let hex = e.sha256.len() == 64 && e.sha256.bytes().all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b));
        if !super::manifest::is_valid_id(&e.id) || !https || !hex || semver::Version::parse(&e.version).is_err() {
            return Err("plugins.error.badIndex".into());
        }
    }
    Ok(parsed)
}

fn client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(FETCH_TIMEOUT)
        .https_only(true)
        .build()
        .map_err(|e| e.to_string())
}

async fn get_capped(url: &str, cap: usize) -> Result<Vec<u8>, String> {
    let mut res = client()?
        .get(url)
        .send()
        .await
        .and_then(|r| r.error_for_status())
        .map_err(|_| "plugins.error.network".to_string())?;
    let mut body = Vec::new();
    while let Some(chunk) = res.chunk().await.map_err(|_| "plugins.error.network".to_string())? {
        if body.len() + chunk.len() > cap {
            return Err("plugins.error.tooBig".into());
        }
        body.extend_from_slice(&chunk);
    }
    Ok(body)
}

/// Downloads and verifies a registry's index.
pub async fn fetch_index(reg: &Registry) -> Result<RegistryIndex, String> {
    validate_registry(reg)?;
    let index = get_capped(&reg.url, MAX_INDEX_BYTES).await?;
    let sig = get_capped(&format!("{}.minisig", reg.url), 4096).await?;
    verify_index(&index, &String::from_utf8_lossy(&sig), &reg.public_key)
}

pub fn sha256_hex(data: &[u8]) -> String {
    crate::sync_crypto::to_hex(ring::digest::digest(&ring::digest::SHA256, data).as_ref())
}

/// Downloads an archive and checks it against the signed SHA-256.
pub async fn fetch_archive(entry: &IndexEntry) -> Result<Vec<u8>, String> {
    let data = get_capped(&entry.url, MAX_ARCHIVE_BYTES).await?;
    check_archive(&data, entry)?;
    Ok(data)
}

pub fn check_archive(data: &[u8], entry: &IndexEntry) -> Result<(), String> {
    if sha256_hex(data) == entry.sha256 {
        Ok(())
    } else {
        Err("plugins.error.badChecksum".into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const FIXTURES: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures/registry");

    fn fixture(name: &str) -> Vec<u8> {
        std::fs::read(format!("{FIXTURES}/{name}")).unwrap()
    }

    fn key() -> String {
        String::from_utf8(fixture("test.pub")).unwrap()
    }

    #[test]
    fn test_signed_index_verifies_with_the_registry_key() {
        let index = verify_index(&fixture("index.json"), &String::from_utf8(fixture("index.json.minisig")).unwrap(), &key()).unwrap();
        assert_eq!(index.plugins.len(), 1);
        let entry = &index.plugins[0];
        assert_eq!(entry.id, "app.ytmd.example-theme");
        // The key file's bare `RW…` line works too.
        let bare = key().lines().nth(1).unwrap().to_string();
        assert!(verify_index(&fixture("index.json"), &String::from_utf8(fixture("index.json.minisig")).unwrap(), &bare).is_ok());
    }

    #[test]
    fn test_tampered_index_or_other_key_is_refused() {
        let sig = String::from_utf8(fixture("index.json.minisig")).unwrap();
        let mut index = fixture("index.json");
        let pos = index.iter().position(|b| *b == b'1').unwrap();
        index[pos] = b'2';
        assert_eq!(verify_index(&index, &sig, &key()).unwrap_err(), "plugins.error.badSignature");
        let other = "RWQf6LRCGA9i53mlYecO4IzT51TGPpvWucNSCh1CBM0QTaLn73Y7GFO3";
        assert!(verify_index(&fixture("index.json"), &sig, other).is_err());
        assert_eq!(verify_index(&fixture("index.json"), "garbage", &key()).unwrap_err(), "plugins.error.badSignature");
        assert_eq!(verify_index(&fixture("index.json"), &sig, "not a key").unwrap_err(), "plugins.error.badKey");
    }

    #[test]
    fn test_archive_must_match_the_signed_checksum() {
        let sig = String::from_utf8(fixture("index.json.minisig")).unwrap();
        let index = verify_index(&fixture("index.json"), &sig, &key()).unwrap();
        let archive = fixture("app.ytmd.example-theme-1.0.0.tar.gz");
        assert!(check_archive(&archive, &index.plugins[0]).is_ok());
        let mut changed = archive.clone();
        let last = changed.len() - 1;
        changed[last] ^= 1;
        assert_eq!(check_archive(&changed, &index.plugins[0]).unwrap_err(), "plugins.error.badChecksum");
    }

    #[test]
    fn test_registries_must_be_https_with_a_real_key() {
        let good = Registry { url: "https://example.com/index.json".into(), public_key: key(), name: String::new() };
        assert!(validate_registry(&good).is_ok());
        assert!(validate_registry(&Registry { url: "http://example.com/index.json".into(), ..good.clone() }).is_err());
        assert!(validate_registry(&Registry { public_key: "nope".into(), ..good }).is_err());
    }
}
