//! The Settings window's plugin manager (commands) and the page's plugin
//! bridge entries (`bridge.rs` calls into these).

use super::manifest::Manifest;
use super::registry::{IndexEntry, Registry};
use super::{PluginInfo, PluginManager};
use serde::Serialize;
use serde_json::Value;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};

pub type Plugins<'a> = State<'a, Arc<PluginManager>>;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginsOverview {
    pub plugins: Vec<PluginInfo>,
    pub registries: Vec<Registry>,
    pub official_hidden: bool,
    /// Where `media:save` puts songs, shown only when a plugin uses it.
    pub media_dir: String,
    pub media_in_use: bool,
    pub update_interval_hours: u32,
    pub restart_needed: bool,
    pub api_version: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Available {
    pub registry: String,
    pub registry_name: String,
    pub entry: IndexEntry,
    pub installed_version: Option<String>,
}

#[derive(Serialize, Clone)]
struct PageStateChange<'a> {
    id: &'a str,
    enabled: bool,
}

#[derive(Serialize, Clone)]
struct PageSettingsChange<'a> {
    id: &'a str,
    values: &'a serde_json::Map<String, Value>,
}

#[tauri::command]
pub fn plugins_list(plugins: Plugins<'_>) -> PluginsOverview {
    let state = plugins.state();
    PluginsOverview {
        plugins: plugins.list(),
        registries: plugins.registries(),
        official_hidden: state.official_hidden,
        media_dir: plugins.media_dir().to_string_lossy().into_owned(),
        media_in_use: plugins.media_in_use(),
        update_interval_hours: state.update_interval_hours,
        restart_needed: plugins.reload_needed(),
        api_version: super::manifest::API_VERSION,
    }
}

/// Turning a plugin off takes effect at once (the page unloads it);
/// turning one on needs a restart, since its code is added when the main
/// window is created.
#[tauri::command]
pub fn plugins_set_enabled(app: AppHandle, plugins: Plugins<'_>, id: String, enabled: bool) -> Result<(), String> {
    plugins.set_enabled(&id, enabled)?;
    let _ = app.emit("plugin-state-changed", PageStateChange { id: &id, enabled });
    Ok(())
}

#[tauri::command]
pub fn plugins_uninstall(app: AppHandle, plugins: Plugins<'_>, id: String) -> Result<(), String> {
    plugins.uninstall(&id)?;
    let _ = app.emit("plugin-state-changed", PageStateChange { id: &id, enabled: false });
    Ok(())
}

#[tauri::command]
pub fn plugins_set_setting(
    app: AppHandle,
    plugins: Plugins<'_>,
    id: String,
    key: String,
    value: Value,
) -> Result<serde_json::Map<String, Value>, String> {
    let values = plugins.set_setting(&id, &key, value)?;
    let _ = app.emit("plugin-settings-changed", PageSettingsChange { id: &id, values: &values });
    Ok(values)
}

#[tauri::command]
pub async fn plugins_add_registry(
    plugins: Plugins<'_>,
    url: String,
    public_key: String,
    name: Option<String>,
) -> Result<(), String> {
    plugins
        .add_registry(Registry {
            url: url.trim().to_string(),
            public_key: public_key.trim().to_string(),
            name: name.unwrap_or_default(),
            official: false,
        })
        .await
        .map(|_| ())
}

#[tauri::command]
pub fn plugins_remove_registry(plugins: Plugins<'_>, url: String) {
    plugins.remove_registry(&url);
}

#[tauri::command]
pub fn plugins_restore_official(plugins: Plugins<'_>) {
    plugins.restore_official();
}

/// Everything the user's registries offer (each index verified).
#[tauri::command]
pub async fn plugins_available(plugins: Plugins<'_>) -> Result<Vec<Available>, String> {
    let state = plugins.state();
    let mut out = Vec::new();
    for reg in &plugins.registries() {
        let index = match super::registry::fetch_index(reg).await {
            Ok(i) => i,
            Err(e) => {
                log::info!("[YTMD Plugins] {}: {e}", reg.url);
                continue;
            }
        };
        for entry in index.plugins {
            if entry.api_version != super::manifest::API_VERSION {
                continue;
            }
            out.push(Available {
                registry: reg.url.clone(),
                registry_name: if reg.name.is_empty() { index.name.clone() } else { reg.name.clone() },
                installed_version: state.installed.get(&entry.id).map(|i| i.version.clone()),
                entry,
            });
        }
    }
    Ok(out)
}

/// Installs or updates a plugin; `accepted` is the permission list the
/// user saw and agreed to.
#[tauri::command]
pub async fn plugins_install(
    plugins: Plugins<'_>,
    registry: String,
    id: String,
    accepted: Vec<String>,
) -> Result<Manifest, String> {
    plugins.install(&registry, &id, accepted).await
}

#[tauri::command]
pub async fn plugins_check_updates(plugins: Plugins<'_>) -> Result<usize, String> {
    Ok(plugins.check_updates().await)
}

/// Developer mode: pick a plugin folder. The window has already warned
/// that this code isn't checked by anyone.
#[tauri::command]
pub async fn plugins_add_dev(app: AppHandle, plugins: Plugins<'_>) -> Result<Option<Manifest>, String> {
    use tauri_plugin_dialog::DialogExt;
    let picked = tauri::async_runtime::spawn_blocking(move || app.dialog().file().blocking_pick_folder())
        .await
        .map_err(|e| e.to_string())?;
    let Some(dir) = picked.and_then(|p| p.into_path().ok()) else {
        return Ok(None);
    };
    plugins.add_dev(&dir).map(Some)
}

/// Lets the user pick the folder `media:save` writes to.
#[tauri::command]
pub async fn plugins_pick_media_dir(app: AppHandle, plugins: Plugins<'_>) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let start = plugins.media_dir();
    let picked = tauri::async_runtime::spawn_blocking(move || {
        let dialog = app.dialog().file();
        let dialog = if start.is_dir() { dialog.set_directory(start) } else { dialog };
        dialog.blocking_pick_folder()
    })
    .await
    .map_err(|e| e.to_string())?;
    let Some(dir) = picked.and_then(|p| p.into_path().ok()) else {
        return Ok(None);
    };
    plugins.set_media_dir(dir.clone());
    Ok(Some(dir.to_string_lossy().into_owned()))
}

#[tauri::command]
pub fn plugins_open_media_dir(app: AppHandle, plugins: Plugins<'_>) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    let dir = plugins.media_dir();
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    app.opener().open_path(dir.to_string_lossy(), None::<&str>).map_err(|e| e.to_string())
}

fn tools_emitter(app: &AppHandle) -> super::media_tools::EmitInstall {
    let app = app.clone();
    Arc::new(move |p| {
        let _ = app.emit("plugin-media-tools", p);
    })
}

/// For a plugin's request: YTMD's own dialog first (the page can't answer
/// it), then the install. Everything is reported as `plugin-media-tools`.
pub fn ask_and_install_tools(app: AppHandle, plugins: Arc<PluginManager>, plugin_name: String) {
    use super::media_tools::{InstallProgress, InstallState};
    use crate::i18n::{t, Text};
    use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
    let emit = tools_emitter(&app);
    tauri::async_runtime::spawn(async move {
        let body = crate::i18n::tools_body(&plugin_name);
        let dialog_app = app.clone();
        let agreed = tauri::async_runtime::spawn_blocking(move || {
            dialog_app
                .dialog()
                .message(body)
                .title(t(Text::ToolsTitle))
                .kind(MessageDialogKind::Info)
                .buttons(MessageDialogButtons::OkCancelCustom(t(Text::ToolsInstall).into(), t(Text::Cancel).into()))
                .blocking_show()
        })
        .await
        .unwrap_or(false);
        if !agreed {
            emit(InstallProgress { state: InstallState::Declined, tool: None, percent: 0.0, error: None });
            return;
        }
        let _ = plugins.tools.install(false, emit).await;
    });
}

#[tauri::command]
pub fn plugins_media_tools_status(plugins: Plugins<'_>) -> super::media_tools::ToolStatus {
    plugins.tools.status()
}

/// Settings' own button (the click is the consent): installs what's
/// missing and always refreshes our yt-dlp.
#[tauri::command]
pub async fn plugins_install_media_tools(app: AppHandle, plugins: Plugins<'_>) -> Result<(), String> {
    let tools = Arc::clone(&plugins.tools);
    tools.install(true, tools_emitter(&app)).await
}

#[tauri::command]
pub fn plugins_set_update_interval(plugins: Plugins<'_>, hours: u32) {
    plugins.set_update_interval(hours);
}

/// Restarts YTMD so newly enabled or updated plugins load (the song and
/// position come back through resume on launch).
#[tauri::command]
pub fn restart_app(app: AppHandle) {
    if let Some(state) = tauri::Manager::try_state::<Arc<crate::AppState>>(&app) {
        state.session.flush();
    }
    app.restart();
}

/// Background update checks: shortly after start, then every
/// `update_interval_hours` (0 = off, re-read every hour).
pub fn start_update_checks(app: AppHandle, plugins: Arc<PluginManager>) {
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_secs(60)).await;
        loop {
            // yt-dlp we installed goes stale as YouTube changes.
            if plugins.tools.ytdlp_stale() {
                let _ = plugins.tools.install(true, tools_emitter(&app)).await;
            }
            let hours = plugins.state().update_interval_hours;
            if hours > 0 && !plugins.registries().is_empty() {
                let updated = plugins.check_updates().await;
                if updated > 0 {
                    let _ = app.emit("plugins-updated", updated);
                }
            }
            let wait = if hours == 0 { 1 } else { hours };
            tokio::time::sleep(std::time::Duration::from_secs(u64::from(wait) * 3600)).await;
        }
    });
}
