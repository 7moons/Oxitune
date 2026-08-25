use crate::config::AppConfig;
use crate::discord_rpc::TrackPayload;
use crate::AppState;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_notification::NotificationExt;

#[tauri::command]
pub fn get_config(state: State<'_, Arc<AppState>>) -> AppConfig {
    state.config_manager.load()
}

#[tauri::command]
pub fn save_config(state: State<'_, Arc<AppState>>, config: AppConfig) -> Result<(), String> {
    state.config_manager.save(&config)
}

#[tauri::command]
pub fn update_track_info(
    app_handle: AppHandle,
    state: State<'_, Arc<AppState>>,
    track: TrackPayload,
) -> Result<(), String> {
    let config = state.config_manager.load();

    // Update internal state
    *state.current_track.lock() = Some(track.clone());

    // Update Discord RPC if enabled
    if config.discord_rpc_enabled {
        if let Some(ref rpc) = *state.discord_rpc.lock() {
            rpc.update(track.clone());
        }
    }

    // Update MPRIS if enabled
    if config.mpris_enabled {
        if let Some(ref mpris) = *state.mpris.lock() {
            mpris.update_track(&track);
        }
    }

    // Broadcast track update to miniplayer and any other windows
    let _ = app_handle.emit("track-changed", &track);

    Ok(())
}

#[tauri::command]
pub fn toggle_mini_player(app_handle: AppHandle) -> Result<(), String> {
    if let Some(mini_win) = app_handle.get_webview_window("miniplayer") {
        if let Ok(visible) = mini_win.is_visible() {
            if visible {
                let _ = mini_win.hide();
            } else {
                let _ = mini_win.show();
                let _ = mini_win.set_focus();
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub fn toggle_settings_window(app_handle: AppHandle) -> Result<(), String> {
    if let Some(settings_win) = app_handle.get_webview_window("settings") {
        if let Ok(visible) = settings_win.is_visible() {
            if visible {
                let _ = settings_win.hide();
            } else {
                let _ = settings_win.show();
                let _ = settings_win.set_focus();
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub fn send_player_command(app_handle: AppHandle, command: String) -> Result<(), String> {
    let _ = app_handle.emit("player-command", command);
    Ok(())
}

#[tauri::command]
pub fn send_seek_command(app_handle: AppHandle, position: f64) -> Result<(), String> {
    let _ = app_handle.emit("player-seek", position);
    Ok(())
}

#[tauri::command]
pub fn send_volume_command(app_handle: AppHandle, volume: f64) -> Result<(), String> {
    let _ = app_handle.emit("player-volume", volume);
    Ok(())
}

fn clean_track_name(title: &str) -> String {
    let mut cleaned = title.to_string();
    let patterns = [
        "(Official Video)", "(Official Music Video)", "(Official Audio)",
        "[Official Video]", "[Official Music Video]", "[Official Audio]",
        "(Official Visualizer)", "[Official Visualizer]", "(Official)",
        "(Audio)", "[Audio]", "(Lyrics)", "[Lyrics]", "(Lyric Video)",
        "(Visualizer)", "[Visualizer]", "(Clip Officiel)", "(Video)",
        "(Remastered)", "[Remastered]", "(Teledysk)", "(Oficjalny teledysk)"
    ];
    for p in &patterns {
        cleaned = cleaned.replace(p, "");
    }
    cleaned = cleaned.trim().to_string();
    if cleaned.is_empty() {
        title.to_string()
    } else {
        cleaned
    }
}

#[tauri::command]
pub async fn fetch_lyrics(
    artist: String,
    title: String,
    album_name: Option<String>,
    _duration: Option<f64>,
) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::builder()
        .user_agent("YTMD-Desktop/1.0 (https://github.com/dachluczaj/ytmd)")
        .build()
        .map_err(|e| e.to_string())?;

    let clean_title = clean_track_name(&title);
    let clean_artist = artist.trim();

    // 1. Try exact get without rigid duration filter
    let mut get_url = format!(
        "https://lrclib.net/api/get?artist_name={}&track_name={}",
        urlencoding::encode(clean_artist),
        urlencoding::encode(&clean_title)
    );
    if let Some(album) = &album_name {
        if !album.is_empty() {
            get_url.push_str(&format!("&album_name={}", urlencoding::encode(album)));
        }
    }

    if let Ok(res) = client.get(&get_url).send().await {
        if res.status().is_success() {
            if let Ok(val) = res.json::<serde_json::Value>().await {
                if val.get("syncedLyrics").is_some() || val.get("plainLyrics").is_some() {
                    return Ok(val);
                }
            }
        }
    }

    // 2. Try structured search API
    let search_url = format!(
        "https://lrclib.net/api/search?track_name={}&artist_name={}",
        urlencoding::encode(&clean_title),
        urlencoding::encode(clean_artist)
    );
    if let Ok(search_res) = client.get(&search_url).send().await {
        if search_res.status().is_success() {
            if let Ok(items) = search_res.json::<serde_json::Value>().await {
                if let Some(arr) = items.as_array() {
                    // Prefer item with synced lyrics first
                    if let Some(synced) = arr.iter().find(|it| it.get("syncedLyrics").and_then(|s| s.as_str()).map(|s| !s.is_empty()).unwrap_or(false)) {
                        return Ok(synced.clone());
                    }
                    if let Some(first) = arr.first() {
                        return Ok(first.clone());
                    }
                }
            }
        }
    }

    // 3. Try broad text search API query with clean artist + clean title
    let broad_url = format!(
        "https://lrclib.net/api/search?q={}+{}",
        urlencoding::encode(clean_artist),
        urlencoding::encode(&clean_title)
    );
    if let Ok(broad_res) = client.get(&broad_url).send().await {
        if broad_res.status().is_success() {
            if let Ok(items) = broad_res.json::<serde_json::Value>().await {
                if let Some(arr) = items.as_array() {
                    if let Some(synced) = arr.iter().find(|it| it.get("syncedLyrics").and_then(|s| s.as_str()).map(|s| !s.is_empty()).unwrap_or(false)) {
                        return Ok(synced.clone());
                    }
                    if let Some(first) = arr.first() {
                        return Ok(first.clone());
                    }
                }
            }
        }
    }

    // 4. Try raw title query as listed on YouTube
    let raw_url = format!(
        "https://lrclib.net/api/search?q={}",
        urlencoding::encode(&title)
    );
    if let Ok(raw_res) = client.get(&raw_url).send().await {
        if raw_res.status().is_success() {
            if let Ok(items) = raw_res.json::<serde_json::Value>().await {
                if let Some(arr) = items.as_array() {
                    if let Some(synced) = arr.iter().find(|it| it.get("syncedLyrics").and_then(|s| s.as_str()).map(|s| !s.is_empty()).unwrap_or(false)) {
                        return Ok(synced.clone());
                    }
                    if let Some(first) = arr.first() {
                        return Ok(first.clone());
                    }
                }
            }
        }
    }

    Err("Lyrics not found in database".to_string())
}

#[tauri::command]
pub fn notify_track_change(
    app_handle: AppHandle,
    state: State<'_, Arc<AppState>>,
    title: String,
    artist: String,
) -> Result<(), String> {
    let config = state.config_manager.load();
    if config.notifications_enabled {
        let _ = app_handle
            .notification()
            .builder()
            .title(&title)
            .body(&format!("Now playing: {}", artist))
            .show();
    }
    Ok(())
}

#[tauri::command]
pub async fn download_track(
    app_handle: AppHandle,
    state: State<'_, Arc<AppState>>,
    request: crate::downloader::DownloadRequest,
) -> Result<String, String> {
    let config = state.config_manager.load();
    let output_dir = std::path::PathBuf::from(&config.download_dir);
    crate::downloader::execute_download(app_handle, request, output_dir).await
}

#[tauri::command]
pub fn scan_local_music(
    state: State<'_, Arc<AppState>>,
    directory: Option<String>,
) -> Vec<crate::local_files::LocalTrack> {
    let config = state.config_manager.load();
    let library_root = std::path::PathBuf::from(&config.local_music_dir);

    let target_dir = match directory {
        Some(requested) => {
            let requested_path = std::path::PathBuf::from(&requested);
            if crate::local_files::is_within_root(&library_root, &requested_path) {
                requested_path
            } else {
                log::warn!(
                    "[YTMD] scan_local_music rejected a directory outside the configured library root: {}",
                    requested
                );
                library_root
            }
        }
        None => library_root,
    };

    crate::local_files::scan_directory(&target_dir)
}

#[tauri::command]
pub fn toggle_local_library_window(app_handle: AppHandle) -> Result<(), String> {
    if let Some(local_win) = app_handle.get_webview_window("local") {
        if let Ok(visible) = local_win.is_visible() {
            if visible {
                let _ = local_win.hide();
            } else {
                let _ = local_win.show();
                let _ = local_win.set_focus();
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub fn toggle_sync_window(app_handle: AppHandle) -> Result<(), String> {
    if let Some(sync_win) = app_handle.get_webview_window("sync") {
        if let Ok(visible) = sync_win.is_visible() {
            if visible {
                let _ = sync_win.hide();
            } else {
                let _ = sync_win.show();
                let _ = sync_win.set_focus();
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub fn create_sync_room(
    app_handle: AppHandle,
    state: State<'_, Arc<AppState>>,
    nickname: String,
) -> crate::sync_room::RoomState {
    let room = state.sync_room.create_room(nickname);
    let _ = app_handle.emit("sync-room-updated", &room);
    room
}

#[tauri::command]
pub fn join_sync_room(
    app_handle: AppHandle,
    state: State<'_, Arc<AppState>>,
    room_code: String,
    nickname: String,
) -> crate::sync_room::RoomState {
    let room = state.sync_room.join_room(room_code, nickname);
    let _ = app_handle.emit("sync-room-updated", &room);
    room
}

#[tauri::command]
pub fn leave_sync_room(
    app_handle: AppHandle,
    state: State<'_, Arc<AppState>>,
) -> Result<(), String> {
    state.sync_room.leave_room();
    let _ = app_handle.emit("sync-room-left", ());
    Ok(())
}

#[tauri::command]
pub fn get_sync_room_state(
    state: State<'_, Arc<AppState>>,
) -> Option<crate::sync_room::RoomState> {
    state.sync_room.get_room_state()
}

#[tauri::command]
pub fn broadcast_sync_state(
    app_handle: AppHandle,
    state: State<'_, Arc<AppState>>,
    playback: crate::sync_room::SyncPlaybackState,
) -> Result<(), String> {
    state.sync_room.update_playback_state(playback.clone());
    let _ = app_handle.emit("sync-playback-remote", &playback);
    Ok(())
}

#[tauri::command]
pub fn get_remote_info(
    state: State<'_, Arc<AppState>>,
    port: Option<u16>,
) -> crate::remote_server::RemoteInfo {
    let config = state.config_manager.load();
    let target_port = port.unwrap_or(config.remote_port);
    crate::remote_server::get_remote_info(target_port, &state.remote_token)
}

#[tauri::command]
pub fn set_inhibit_sleep(
    state: State<'_, Arc<AppState>>,
    inhibit: bool,
) -> Result<(), String> {
    state.power_manager.set_inhibit_sleep(inhibit);
    Ok(())
}

#[tauri::command]
pub fn minimize_window(window: tauri::Window) -> Result<(), String> {
    let _ = window.minimize();
    Ok(())
}

#[tauri::command]
pub fn toggle_maximize_window(window: tauri::Window) -> Result<(), String> {
    if let Ok(max) = window.is_maximized() {
        if max {
            let _ = window.unmaximize();
        } else {
            let _ = window.maximize();
        }
    }
    Ok(())
}

#[tauri::command]
pub fn close_window(window: tauri::Window) -> Result<(), String> {
    let _ = window.hide();
    Ok(())
}

mod urlencoding {
    pub fn encode(s: &str) -> String {
        url::form_urlencoded::byte_serialize(s.as_bytes()).collect()
    }
}
