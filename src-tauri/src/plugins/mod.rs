//! Runtime plugins (docs/PLUGIN_API.md).
//!
//! A plugin is a folder with `manifest.json`, one entry script and optional
//! styles. External plugins live in `~/.ytmd/plugins/installed/<id>/`, come
//! from registries the user added (signed index, SHA-256 per archive) or,
//! in developer mode, straight from a local folder. They run in the YouTube
//! Music page (like a user script), each as its own initialization script,
//! and reach the app only through the page bridge; what the manifest grants
//! is enforced there (storage, network hosts) and by the page's plugin host.
//!
//! State (`~/.ytmd/plugins/state.json`): what is installed, enabled,
//! granted, auto-disabled after repeated errors, each plugin's settings,
//! the registries, and the update interval.

pub mod archive;
pub mod commands;
pub mod manifest;
pub mod registry;

use archive::LoadedPlugin;
use manifest::Manifest;
use parking_lot::Mutex;
use registry::{IndexEntry, Registry};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

/// Errors in a row (without a restart in between) before a plugin is
/// switched off.
pub const MAX_ERRORS: u32 = 5;
const MAX_STORAGE_BYTES: usize = 1024 * 1024;
const MAX_FETCH_BYTES: usize = 1024 * 1024;
pub const DEFAULT_UPDATE_HOURS: u32 = 12;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Source {
    Registry,
    Dev,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Installed {
    pub version: String,
    pub source: Source,
    /// Registry URL it came from (`Source::Registry`).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub registry: Option<String>,
    /// Folder it's loaded from (`Source::Dev`).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub dev_path: Option<PathBuf>,
    pub enabled: bool,
    /// Permissions the user agreed to.
    #[serde(default)]
    pub granted: Vec<String>,
    #[serde(default)]
    pub auto_disabled: bool,
    #[serde(default)]
    pub errors: u32,
    /// A newer version that asks for more permissions, waiting for consent.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub pending_update: Option<IndexEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginState {
    #[serde(default)]
    pub installed: BTreeMap<String, Installed>,
    #[serde(default)]
    pub settings: BTreeMap<String, Map<String, Value>>,
    #[serde(default)]
    pub registries: Vec<Registry>,
    #[serde(default = "default_update_hours")]
    pub update_interval_hours: u32,
}

fn default_update_hours() -> u32 {
    DEFAULT_UPDATE_HOURS
}

impl Default for PluginState {
    fn default() -> Self {
        Self {
            installed: BTreeMap::new(),
            settings: BTreeMap::new(),
            registries: Vec::new(),
            update_interval_hours: DEFAULT_UPDATE_HOURS,
        }
    }
}

/// A fresh folder next to the installed plugins (same file system, so the
/// final rename is atomic), removed when dropped.
struct Staging(PathBuf);

impl Staging {
    fn new(parent: &Path) -> Result<Self, String> {
        use rand::Rng;
        let name = format!(".staging-{:016x}", rand::rng().random::<u64>());
        let path = parent.join(name);
        std::fs::create_dir(&path).map_err(|e| e.to_string())?;
        Ok(Self(path))
    }
}

impl Drop for Staging {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

/// What the Settings window shows for an installed plugin.
#[derive(Debug, Clone, Serialize)]
pub struct PluginInfo {
    pub manifest: Option<Manifest>,
    pub id: String,
    pub installed: Installed,
    pub settings: Map<String, Value>,
    /// Why it couldn't be loaded (a dev folder that went away, a broken
    /// install).
    pub error: Option<String>,
}

pub struct PluginManager {
    root: PathBuf,
    state: Mutex<PluginState>,
    /// Something changed that the page only picks up on reload.
    reload_needed: std::sync::atomic::AtomicBool,
}

impl PluginManager {
    /// `root` is `~/.ytmd/plugins`.
    pub fn new(root: PathBuf) -> Self {
        let state = std::fs::read(root.join("state.json"))
            .ok()
            .and_then(|raw| serde_json::from_slice::<PluginState>(&raw).ok())
            .unwrap_or_default();
        Self { root, state: Mutex::new(state), reload_needed: Default::default() }
    }

    fn installed_dir(&self) -> PathBuf {
        self.root.join("installed")
    }

    fn data_file(&self, id: &str) -> PathBuf {
        self.root.join("data").join(format!("{id}.json"))
    }

    fn save(&self, state: &PluginState) {
        let _ = crate::secure_fs::ensure_private_dir(&self.root);
        if let Ok(json) = serde_json::to_vec_pretty(state) {
            if let Err(e) = crate::secure_fs::write_private(&self.root.join("state.json"), &json) {
                log::warn!("[YTMD Plugins] couldn't save plugin state: {e}");
            }
        }
    }

    fn update_state<T>(&self, f: impl FnOnce(&mut PluginState) -> T) -> T {
        let mut state = self.state.lock();
        let out = f(&mut state);
        self.save(&state);
        out
    }

    pub fn state(&self) -> PluginState {
        self.state.lock().clone()
    }

    pub fn mark_reload_needed(&self) {
        self.reload_needed.store(true, std::sync::atomic::Ordering::SeqCst);
    }

    pub fn reload_needed(&self) -> bool {
        self.reload_needed.load(std::sync::atomic::Ordering::SeqCst)
    }

    pub fn clear_reload_needed(&self) {
        self.reload_needed.store(false, std::sync::atomic::Ordering::SeqCst);
    }

    fn dir_of(&self, id: &str, inst: &Installed) -> PathBuf {
        match (&inst.source, &inst.dev_path) {
            (Source::Dev, Some(p)) => p.clone(),
            _ => self.installed_dir().join(id),
        }
    }

    /// Loads an installed plugin from disk and checks it is the one we
    /// installed.
    pub fn load(&self, id: &str) -> Result<LoadedPlugin, String> {
        let inst = self.state.lock().installed.get(id).cloned().ok_or("plugins.error.notInstalled")?;
        let loaded = archive::load_dir(&self.dir_of(id, &inst))?;
        if loaded.manifest.id != id {
            return Err("plugins.error.idMismatch".into());
        }
        // A dev plugin may have changed on disk: only what was granted runs.
        if !loaded.manifest.new_permissions(&inst.granted).is_empty() {
            return Err("plugins.error.needsConsent".into());
        }
        Ok(loaded)
    }

    pub fn list(&self) -> Vec<PluginInfo> {
        let state = self.state();
        state
            .installed
            .iter()
            .map(|(id, inst)| {
                let loaded = self.load(id);
                let settings = loaded
                    .as_ref()
                    .map(|l| l.manifest.settings_values(state.settings.get(id)))
                    .unwrap_or_default();
                PluginInfo {
                    manifest: loaded.as_ref().ok().map(|l| l.manifest.clone()),
                    id: id.clone(),
                    installed: inst.clone(),
                    settings,
                    error: loaded.err(),
                }
            })
            .collect()
    }

    /// Enabled plugins, loaded and checked, for the page.
    pub fn enabled_plugins(&self) -> Vec<(LoadedPlugin, Map<String, Value>)> {
        let state = self.state();
        state
            .installed
            .iter()
            .filter(|(_, i)| i.enabled && !i.auto_disabled)
            .filter_map(|(id, _)| match self.load(id) {
                Ok(p) => {
                    let values = p.manifest.settings_values(state.settings.get(id));
                    Some((p, values))
                }
                Err(e) => {
                    log::warn!("[YTMD Plugins] not loading {id}: {e}");
                    None
                }
            })
            .collect()
    }

    pub fn set_enabled(&self, id: &str, enabled: bool) -> Result<(), String> {
        self.update_state(|s| {
            let inst = s.installed.get_mut(id).ok_or("plugins.error.notInstalled")?;
            inst.enabled = enabled;
            if enabled {
                inst.auto_disabled = false;
                inst.errors = 0;
            }
            Ok::<_, String>(())
        })?;
        self.mark_reload_needed();
        Ok(())
    }

    pub fn set_setting(&self, id: &str, key: &str, value: Value) -> Result<Map<String, Value>, String> {
        let manifest = self.load(id)?.manifest;
        let spec = manifest.settings.iter().find(|s| s.key == key).ok_or("plugins.error.noSuchSetting")?;
        let value = spec.coerce(&value).ok_or("plugins.error.badSetting")?;
        let saved = self.update_state(|s| {
            let entry = s.settings.entry(id.to_string()).or_default();
            entry.insert(key.to_string(), value);
            entry.clone()
        });
        Ok(manifest.settings_values(Some(&saved)))
    }

    pub fn uninstall(&self, id: &str) -> Result<(), String> {
        let inst = self.update_state(|s| {
            s.settings.remove(id);
            s.installed.remove(id)
        });
        let inst = inst.ok_or("plugins.error.notInstalled")?;
        if inst.source == Source::Registry && manifest::is_valid_id(id) {
            let _ = std::fs::remove_dir_all(self.installed_dir().join(id));
        }
        let _ = std::fs::remove_file(self.data_file(id));
        self.mark_reload_needed();
        Ok(())
    }

    /// Records an error from the page; returns true when this one switched
    /// the plugin off.
    pub fn report_error(&self, id: &str, message: &str) -> bool {
        log::warn!("[YTMD Plugins] {id}: {}", message.chars().take(300).collect::<String>());
        self.update_state(|s| {
            let Some(inst) = s.installed.get_mut(id) else { return false };
            inst.errors += 1;
            if inst.errors >= MAX_ERRORS && !inst.auto_disabled {
                inst.auto_disabled = true;
                inst.enabled = false;
                log::warn!("[YTMD Plugins] {id} switched off after {MAX_ERRORS} errors");
                return true;
            }
            false
        })
    }

    /// Checks `id` may use `permission` right now (installed, on, granted).
    pub fn check_permission(&self, id: &str, permission: &str) -> Result<LoadedPlugin, String> {
        let state = self.state.lock();
        let inst = state.installed.get(id).ok_or("plugins.error.notInstalled")?;
        if !inst.enabled || inst.auto_disabled || !inst.granted.iter().any(|g| g == permission) {
            return Err("plugins.error.notAllowed".into());
        }
        drop(state);
        self.load(id)
    }

    // --- Storage ---------------------------------------------------------

    fn read_storage(&self, id: &str) -> Map<String, Value> {
        std::fs::read(self.data_file(id))
            .ok()
            .and_then(|raw| serde_json::from_slice(&raw).ok())
            .unwrap_or_default()
    }

    pub fn storage_get(&self, id: &str, key: &str) -> Result<Value, String> {
        self.check_permission(id, "storage")?;
        Ok(self.read_storage(id).get(key).cloned().unwrap_or(Value::Null))
    }

    pub fn storage_keys(&self, id: &str) -> Result<Vec<String>, String> {
        self.check_permission(id, "storage")?;
        Ok(self.read_storage(id).keys().cloned().collect())
    }

    /// `None` removes the key.
    pub fn storage_set(&self, id: &str, key: &str, value: Option<Value>) -> Result<(), String> {
        self.check_permission(id, "storage")?;
        if key.is_empty() || key.len() > 200 {
            return Err("plugins.error.badKey".into());
        }
        let mut data = self.read_storage(id);
        match value {
            Some(v) => data.insert(key.to_string(), v),
            None => data.remove(key),
        };
        let json = serde_json::to_vec(&data).map_err(|e| e.to_string())?;
        if json.len() > MAX_STORAGE_BYTES {
            return Err("plugins.error.storageFull".into());
        }
        let _ = crate::secure_fs::ensure_private_dir(&self.root.join("data"));
        crate::secure_fs::write_private(&self.data_file(id), &json).map_err(|e| e.to_string())
    }

    // --- Network -----------------------------------------------------------

    /// GET `url` for plugin `id`: https only, to a host its manifest lists.
    pub async fn fetch(&self, id: &str, url: &str) -> Result<String, String> {
        let plugin = self.check_permission(id, "network")?;
        let parsed = url::Url::parse(url).map_err(|_| "plugins.error.badUrl".to_string())?;
        let host = parsed.host_str().unwrap_or_default().to_ascii_lowercase();
        if parsed.scheme() != "https" || !plugin.manifest.hosts.contains(&host) {
            return Err("plugins.error.hostNotAllowed".into());
        }
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .redirect(reqwest::redirect::Policy::none())
            .build()
            .map_err(|e| e.to_string())?;
        let mut res = client.get(parsed).send().await.map_err(|_| "plugins.error.network".to_string())?;
        if !res.status().is_success() {
            return Err(format!("plugins.error.http:{}", res.status().as_u16()));
        }
        let mut body = Vec::new();
        while let Some(chunk) = res.chunk().await.map_err(|_| "plugins.error.network".to_string())? {
            if body.len() + chunk.len() > MAX_FETCH_BYTES {
                return Err("plugins.error.tooBig".into());
            }
            body.extend_from_slice(&chunk);
        }
        String::from_utf8(body).map_err(|_| "plugins.error.notText".to_string())
    }

    // --- Registries and installs -----------------------------------------------

    pub async fn add_registry(&self, reg: Registry) -> Result<registry::RegistryIndex, String> {
        let index = registry::fetch_index(&reg).await?;
        let reg = Registry { name: if reg.name.trim().is_empty() { index.name.clone() } else { reg.name }, ..reg };
        self.update_state(|s| {
            s.registries.retain(|r| r.url != reg.url);
            s.registries.push(reg);
        });
        Ok(index)
    }

    pub fn remove_registry(&self, url: &str) {
        self.update_state(|s| s.registries.retain(|r| r.url != url));
    }

    /// Unpacks a verified archive into place: staging folder → checks →
    /// rename over the old version (kept until the swap succeeded).
    fn install_archive(&self, data: &[u8], entry: &IndexEntry) -> Result<Manifest, String> {
        let dir = self.installed_dir();
        crate::secure_fs::ensure_private_dir(&dir).map_err(|e| e.to_string())?;
        let staging = Staging::new(&dir)?;
        archive::extract_tar_gz(data, &staging.0)?;
        let root = archive::plugin_root(&staging.0).ok_or("plugins.error.noManifest")?;
        let loaded = archive::load_dir(&root)?;
        let m = &loaded.manifest;
        // The signed index must describe exactly this plugin.
        let same_permissions = {
            let mut a = m.permissions.clone();
            let mut b = entry.permissions.clone();
            a.sort();
            b.sort();
            a == b
        };
        if m.id != entry.id || m.version != entry.version || !same_permissions {
            return Err("plugins.error.indexMismatch".into());
        }
        let target = dir.join(&m.id);
        let old = dir.join(format!(".old-{}", m.id));
        let _ = std::fs::remove_dir_all(&old);
        if target.exists() {
            std::fs::rename(&target, &old).map_err(|e| e.to_string())?;
        }
        if let Err(e) = std::fs::rename(&root, &target) {
            // Put the old version back.
            let _ = std::fs::rename(&old, &target);
            return Err(e.to_string());
        }
        let _ = std::fs::remove_dir_all(&old);
        Ok(loaded.manifest)
    }

    async fn find_entry(&self, registry_url: &str, id: &str) -> Result<IndexEntry, String> {
        let reg = self
            .state()
            .registries
            .into_iter()
            .find(|r| r.url == registry_url)
            .ok_or("plugins.error.noSuchRegistry")?;
        let index = registry::fetch_index(&reg).await?;
        index.plugins.into_iter().find(|p| p.id == id).ok_or_else(|| "plugins.error.notInRegistry".to_string())
    }

    /// Installs (or updates to) `id` from a registry. `accepted` must be
    /// exactly what the user was shown: the version's permissions.
    pub async fn install(&self, registry_url: &str, id: &str, accepted: Vec<String>) -> Result<Manifest, String> {
        let entry = self.find_entry(registry_url, id).await?;
        self.install_entry(registry_url, &entry, accepted).await
    }

    async fn install_entry(&self, registry_url: &str, entry: &IndexEntry, accepted: Vec<String>) -> Result<Manifest, String> {
        if entry.api_version != manifest::API_VERSION {
            return Err("plugins.error.apiVersion".into());
        }
        if entry.permissions.iter().any(|p| !accepted.contains(p) || !manifest::is_external_permission(p)) {
            return Err("plugins.error.needsConsent".into());
        }
        let data = registry::fetch_archive(entry).await?;
        let manifest = self.install_archive(&data, entry)?;
        self.update_state(|s| {
            let was_enabled = s.installed.get(&manifest.id).map(|i| i.enabled);
            s.installed.insert(
                manifest.id.clone(),
                Installed {
                    version: manifest.version.clone(),
                    source: Source::Registry,
                    registry: Some(registry_url.to_string()),
                    dev_path: None,
                    enabled: was_enabled.unwrap_or(true),
                    granted: manifest.permissions.clone(),
                    auto_disabled: false,
                    errors: 0,
                    pending_update: None,
                },
            );
        });
        self.mark_reload_needed();
        Ok(manifest)
    }

    /// Developer mode: a local folder, used as is (and re-read on every
    /// page load). Added switched off; the user turns it on.
    pub fn add_dev(&self, dir: &Path) -> Result<Manifest, String> {
        let loaded = archive::load_dir(dir)?;
        let m = loaded.manifest.clone();
        self.update_state(|s| {
            if s.installed.get(&m.id).is_some_and(|i| i.source == Source::Registry) {
                return Err("plugins.error.alreadyInstalled".to_string());
            }
            s.installed.insert(
                m.id.clone(),
                Installed {
                    version: m.version.clone(),
                    source: Source::Dev,
                    registry: None,
                    dev_path: Some(dir.to_path_buf()),
                    enabled: false,
                    granted: m.permissions.clone(),
                    auto_disabled: false,
                    errors: 0,
                    pending_update: None,
                },
            );
            Ok(())
        })?;
        Ok(m)
    }

    /// Checks every registry for newer versions of installed plugins.
    /// Updates that ask for no new permissions are installed; the others
    /// wait in `pending_update` until the user agrees. Returns how many
    /// were installed.
    pub async fn check_updates(&self) -> usize {
        let state = self.state();
        let mut installed = 0;
        for reg in &state.registries {
            let index = match registry::fetch_index(reg).await {
                Ok(i) => i,
                Err(e) => {
                    log::info!("[YTMD Plugins] registry {} unavailable: {e}", reg.url);
                    continue;
                }
            };
            for entry in index.plugins {
                let Some(inst) = state.installed.get(&entry.id) else { continue };
                if inst.source != Source::Registry || inst.registry.as_deref() != Some(reg.url.as_str()) {
                    continue;
                }
                let newer = match (semver::Version::parse(&entry.version), semver::Version::parse(&inst.version)) {
                    (Ok(new), Ok(cur)) => new > cur,
                    _ => false,
                };
                if !newer || entry.api_version != manifest::API_VERSION {
                    continue;
                }
                let expands = entry.permissions.iter().any(|p| !inst.granted.contains(p));
                if expands {
                    let pending = entry.clone();
                    self.update_state(|s| {
                        if let Some(i) = s.installed.get_mut(&pending.id) {
                            i.pending_update = Some(pending);
                        }
                    });
                    continue;
                }
                match self.install_entry(&reg.url, &entry, inst.granted.clone()).await {
                    Ok(_) => installed += 1,
                    Err(e) => log::warn!("[YTMD Plugins] update of {} failed: {e}", entry.id),
                }
            }
        }
        installed
    }

    pub fn set_update_interval(&self, hours: u32) {
        self.update_state(|s| s.update_interval_hours = hours.min(24 * 7));
    }
}

/// The page's initialization scripts for the enabled plugins: one per
/// plugin (a syntax error in one can't stop the others), each handing its
/// code to the plugin host in `src/preload/pluginHost.ts`, which calls it
/// with the Tauri globals shadowed (and `window`/`document` too without the
/// `page` permission): tidiness against accidental use, not a sandbox, the
/// code runs in the YouTube Music page (docs/PLUGIN_API.md, "Security").
pub fn page_scripts(plugins: &[(LoadedPlugin, Map<String, Value>)]) -> Vec<String> {
    plugins
        .iter()
        .map(|(p, settings)| {
            let payload = serde_json::json!({
                "manifest": p.manifest,
                "settings": settings,
                "styles": p.styles,
            });
            format!(
                "(function(){{var d=window.__ytmdDefinePlugin;if(typeof d!=='function')return;d({payload},function(ytmd,window,globalThis,self,document,__TAURI__,__TAURI_INTERNALS__){{\"use strict\";\n{code}\n}});}})();",
                code = p.code,
            )
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn manager() -> (tempfile::TempDir, PluginManager) {
        let dir = tempfile::tempdir().unwrap();
        let m = PluginManager::new(dir.path().join("plugins"));
        (dir, m)
    }

    fn entry(data: &[u8]) -> IndexEntry {
        IndexEntry {
            id: "com.example.theme".into(),
            name: "Theme".into(),
            version: "1.0.0".into(),
            api_version: 1,
            description: String::new(),
            author: String::new(),
            permissions: vec!["ui".into()],
            url: "https://example.com/x.tar.gz".into(),
            sha256: registry::sha256_hex(data),
        }
    }

    #[test]
    fn test_install_is_atomic_and_matches_the_index() {
        let (_d, m) = manager();
        let data = archive::tests::sample_plugin();
        let manifest = m.install_archive(&data, &entry(&data)).unwrap();
        assert_eq!(manifest.id, "com.example.theme");
        assert!(m.installed_dir().join("com.example.theme/manifest.json").exists());
        // Reinstalling over it swaps cleanly, leaving no staging/old folders.
        m.install_archive(&data, &entry(&data)).unwrap();
        let leftovers: Vec<_> = std::fs::read_dir(m.installed_dir()).unwrap().flatten().map(|e| e.file_name()).collect();
        assert_eq!(leftovers.len(), 1, "{leftovers:?}");

        // The archive must be the plugin the signed index describes.
        let lying = IndexEntry { version: "9.9.9".into(), ..entry(&data) };
        assert_eq!(m.install_archive(&data, &lying).unwrap_err(), "plugins.error.indexMismatch");
        let fewer = IndexEntry { permissions: vec![], ..entry(&data) };
        assert_eq!(m.install_archive(&data, &fewer).unwrap_err(), "plugins.error.indexMismatch");
    }

    #[test]
    fn test_failed_install_leaves_the_old_version() {
        let (_d, m) = manager();
        let data = archive::tests::sample_plugin();
        m.install_archive(&data, &entry(&data)).unwrap();
        let broken = archive::tests::tar_gz(&[("manifest.json", b"{}")]);
        assert!(m.install_archive(&broken, &entry(&broken)).is_err());
        assert!(m.installed_dir().join("com.example.theme/main.js").exists());
    }

    fn with_installed(m: &PluginManager, granted: &[&str]) {
        let data = archive::tests::sample_plugin();
        m.install_archive(&data, &entry(&data)).unwrap();
        m.update_state(|s| {
            s.installed.insert(
                "com.example.theme".into(),
                Installed {
                    version: "1.0.0".into(),
                    source: Source::Registry,
                    registry: None,
                    dev_path: None,
                    enabled: true,
                    granted: granted.iter().map(|g| g.to_string()).collect(),
                    auto_disabled: false,
                    errors: 0,
                    pending_update: None,
                },
            );
        });
    }

    #[test]
    fn test_repeated_errors_switch_a_plugin_off() {
        let (_d, m) = manager();
        with_installed(&m, &["ui"]);
        for _ in 1..MAX_ERRORS {
            assert!(!m.report_error("com.example.theme", "boom"));
        }
        assert!(m.report_error("com.example.theme", "boom"));
        assert!(m.enabled_plugins().is_empty());
        m.set_enabled("com.example.theme", true).unwrap();
        assert_eq!(m.enabled_plugins().len(), 1, "turning it on again resets the count");
    }

    #[test]
    fn test_storage_needs_the_permission_and_is_capped() {
        let (_d, m) = manager();
        with_installed(&m, &["ui"]);
        assert_eq!(m.storage_get("com.example.theme", "k").unwrap_err(), "plugins.error.notAllowed");
        m.update_state(|s| s.installed.get_mut("com.example.theme").unwrap().granted.push("storage".into()));
        // The manifest doesn't ask for storage, so loading refuses nothing,
        // but grants beyond the manifest are harmless: the key is its own.
        m.storage_set("com.example.theme", "k", Some(serde_json::json!({ "a": 1 }))).unwrap();
        assert_eq!(m.storage_get("com.example.theme", "k").unwrap()["a"], 1);
        assert_eq!(m.storage_keys("com.example.theme").unwrap(), vec!["k".to_string()]);
        let huge = "x".repeat(MAX_STORAGE_BYTES);
        assert_eq!(m.storage_set("com.example.theme", "big", Some(huge.into())).unwrap_err(), "plugins.error.storageFull");
        m.storage_set("com.example.theme", "k", None).unwrap();
        assert!(m.storage_get("com.example.theme", "k").unwrap().is_null());
    }

    #[test]
    fn test_network_only_to_listed_hosts() {
        let (_d, m) = manager();
        with_installed(&m, &["ui"]);
        let rt = tokio::runtime::Runtime::new().unwrap();
        assert_eq!(rt.block_on(m.fetch("com.example.theme", "https://example.com/")).unwrap_err(), "plugins.error.notAllowed");
        m.update_state(|s| s.installed.get_mut("com.example.theme").unwrap().granted.push("network".into()));
        // The sample manifest lists no hosts: nothing is reachable.
        assert_eq!(rt.block_on(m.fetch("com.example.theme", "https://example.com/")).unwrap_err(), "plugins.error.hostNotAllowed");
    }

    #[test]
    fn test_settings_are_validated_against_the_schema() {
        let (_d, m) = manager();
        with_installed(&m, &["ui"]);
        let values = m.set_setting("com.example.theme", "mode", "light".into()).unwrap();
        assert_eq!(values["mode"], "light");
        assert!(m.set_setting("com.example.theme", "mode", "neon".into()).is_err());
        assert!(m.set_setting("com.example.theme", "nope", true.into()).is_err());
    }

    #[test]
    fn test_dev_plugin_with_new_permissions_needs_consent() {
        let (_d, m) = manager();
        let dev = tempfile::tempdir().unwrap();
        archive::extract_tar_gz(&archive::tests::sample_plugin(), dev.path()).unwrap();
        m.add_dev(dev.path()).unwrap();
        m.set_enabled("com.example.theme", true).unwrap();
        assert_eq!(m.enabled_plugins().len(), 1);
        // The developer edits the manifest to ask for more.
        let mut manifest: Value = serde_json::from_slice(&std::fs::read(dev.path().join("manifest.json")).unwrap()).unwrap();
        manifest["permissions"] = serde_json::json!(["ui", "storage"]);
        std::fs::write(dev.path().join("manifest.json"), serde_json::to_vec(&manifest).unwrap()).unwrap();
        assert!(m.enabled_plugins().is_empty());
        assert_eq!(m.load("com.example.theme").unwrap_err(), "plugins.error.needsConsent");
    }

    #[test]
    fn test_page_scripts_shadow_tauri_and_window_without_page() {
        let dir = tempfile::tempdir().unwrap();
        archive::extract_tar_gz(&archive::tests::sample_plugin(), dir.path()).unwrap();
        let loaded = archive::load_dir(dir.path()).unwrap();
        let scripts = page_scripts(&[(loaded, Map::new())]);
        assert_eq!(scripts.len(), 1);
        assert!(scripts[0].contains("function(ytmd,window,globalThis,self,document,__TAURI__,__TAURI_INTERNALS__)"));
        assert!(scripts[0].contains("ytmd.log.info('hi');"));
    }

    #[test]
    fn test_state_survives_restart() {
        let (_d, m) = manager();
        with_installed(&m, &["ui"]);
        m.set_update_interval(6);
        let again = PluginManager::new(m.root.clone());
        assert!(again.state().installed.contains_key("com.example.theme"));
        assert_eq!(again.state().update_interval_hours, 6);
    }
}
