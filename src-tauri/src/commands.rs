use crate::config::AppConfig;
use crate::discord_rpc::TrackPayload;
use crate::AppState;
use serde::Serialize;
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
        let mut rpc_lock = state.discord_rpc.lock();
        if rpc_lock.is_none() {
            *rpc_lock = Some(crate::discord_rpc::DiscordRpcHandle::new());
        }
        if let Some(ref rpc) = *rpc_lock {
            rpc.update(track.clone());
        }
    } else {
        let mut rpc_lock = state.discord_rpc.lock();
        if let Some(ref rpc) = *rpc_lock {
            rpc.clear();
        }
        *rpc_lock = None;
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

fn normalize_for_comparison(s: &str) -> String {
    let mut clean = s.to_lowercase();
    // Strip parenthetical/bracketed content
    while let Some(start) = clean.find('(') {
        if let Some(end) = clean[start..].find(')') {
            clean.replace_range(start..=start + end, " ");
        } else {
            break;
        }
    }
    while let Some(start) = clean.find('[') {
        if let Some(end) = clean[start..].find(']') {
            clean.replace_range(start..=start + end, " ");
        } else {
            break;
        }
    }
    clean = clean.replace(|c: char| !c.is_alphanumeric() && !c.is_whitespace(), " ");
    clean.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn calculate_token_similarity(a: &str, b: &str) -> f64 {
    let norm_a = normalize_for_comparison(a);
    let norm_b = normalize_for_comparison(b);

    if norm_a.is_empty() || norm_b.is_empty() {
        return 0.0;
    }
    if norm_a == norm_b {
        return 1.0;
    }
    if norm_a.contains(&norm_b) || norm_b.contains(&norm_a) {
        return 0.85;
    }

    let tokens_a: std::collections::HashSet<&str> = norm_a.split_whitespace().collect();
    let tokens_b: std::collections::HashSet<&str> = norm_b.split_whitespace().collect();

    if tokens_a.is_empty() || tokens_b.is_empty() {
        return 0.0;
    }

    let intersection = tokens_a.intersection(&tokens_b).count();
    let union = tokens_a.union(&tokens_b).count();

    if union == 0 {
        0.0
    } else {
        intersection as f64 / union as f64
    }
}

fn clean_track_name(title: &str) -> String {
    let mut cleaned = title.to_string();

    // If title is formatted as "Artist - Title", extract the Title portion
    if let Some(idx) = cleaned.find(" - ") {
        cleaned = cleaned[idx + 3..].to_string();
    } else if let Some(idx) = cleaned.find(" – ") {
        cleaned = cleaned[idx + 3..].to_string();
    }

    let mut noise_patterns = [
        "official music video",
        "official visualizer",
        "oficjalny teledysk",
        "official video",
        "official audio",
        "lyrics video",
        "lyric video",
        "music video",
        "clip officiel",
        "visualizer",
        "remastered",
        "teledysk",
        "official",
        "prod by",
        "prod.",
        "lyrics",
        "audio",
        "video",
        "4k",
        "hd",
        "hq",
    ];
    noise_patterns.sort_by_key(|b| std::cmp::Reverse(b.len()));

    for pat in &noise_patterns {
        let mut start = 0;
        while let Some(pos) = cleaned[start..].to_lowercase().find(pat) {
            let abs_pos = start + pos;
            let end_pos = abs_pos + pat.len();
            let mut rem_start = abs_pos;
            let mut rem_end = end_pos;

            if rem_start > 0 && (cleaned.as_bytes()[rem_start - 1] == b'(' || cleaned.as_bytes()[rem_start - 1] == b'[') {
                rem_start -= 1;
            }
            if rem_end < cleaned.len() && (cleaned.as_bytes()[rem_end] == b')' || cleaned.as_bytes()[rem_end] == b']') {
                rem_end += 1;
            }

            cleaned.replace_range(rem_start..rem_end, " ");
            start = rem_start;
        }
    }

    let result = cleaned.trim().to_string();
    if result.is_empty() {
        title.to_string()
    } else {
        result
    }
}

fn score_candidate(
    item: &serde_json::Value,
    clean_title: &str,
    clean_artist: &str,
    target_duration: Option<f64>,
) -> f64 {
    let cand_title = item.get("trackName").and_then(|v| v.as_str()).unwrap_or("");
    let cand_artist = item.get("artistName").and_then(|v| v.as_str()).unwrap_or("");

    let title_sim = calculate_token_similarity(cand_title, clean_title);
    let artist_sim = calculate_token_similarity(cand_artist, clean_artist);

    // Reject candidates that have no title resemblance whatsoever
    if title_sim < 0.25 && !cand_title.to_lowercase().contains(&clean_title.to_lowercase()) {
        return 0.0;
    }

    let mut score = title_sim * 50.0 + artist_sim * 25.0;

    let has_synced = item.get("syncedLyrics")
        .and_then(|s| s.as_str())
        .map(|s| !s.trim().is_empty())
        .unwrap_or(false);

    if has_synced {
        score += 20.0;
    }

    if let Some(target) = target_duration {
        if let Some(cand_dur) = item.get("duration").and_then(|d| d.as_f64()) {
            let diff = (cand_dur - target).abs();
            if diff <= 2.0 {
                score += 25.0;
            } else if diff <= 5.0 {
                score += 15.0;
            } else if diff <= 10.0 {
                score += 5.0;
            } else if diff > 30.0 {
                score -= 20.0;
            }
        }
    }

    score
}

fn pick_best_match(
    items: &[serde_json::Value],
    clean_title: &str,
    clean_artist: &str,
    target_duration: Option<f64>,
) -> Option<serde_json::Value> {
    let mut best_item: Option<serde_json::Value> = None;
    let mut best_score = 0.0;

    for item in items {
        let score = score_candidate(item, clean_title, clean_artist, target_duration);
        if score > 35.0 && score > best_score {
            best_score = score;
            best_item = Some(item.clone());
        }
    }

    best_item
}

#[tauri::command]
pub async fn fetch_lyrics(
    artist: String,
    title: String,
    album_name: Option<String>,
    duration: Option<f64>,
) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::builder()
        .user_agent("YTMD-Desktop/1.0 (https://github.com/dachluczaj/ytmd)")
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let clean_title = clean_track_name(&title);
    let clean_artist = artist.trim();

    // 1. Try the exact-match endpoint with duration
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
    if let Some(d) = duration {
        get_url.push_str(&format!("&duration={}", d.round() as i64));
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
                    if let Some(best) = pick_best_match(arr, &clean_title, clean_artist, duration) {
                        return Ok(best);
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
                    if let Some(best) = pick_best_match(arr, &clean_title, clean_artist, duration) {
                        return Ok(best);
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
                    if let Some(best) = pick_best_match(arr, &clean_title, clean_artist, duration) {
                        return Ok(best);
                    }
                }
            }
        }
    }

    Err("Lyrics not found in database".to_string())
}

/// Lets a companion window (settings, local library, sync) that opens or
/// reloads mid-song fetch the track already playing, instead of sitting
/// blank until the next `track-changed` broadcast.
#[tauri::command]
pub fn get_current_track(state: State<'_, Arc<AppState>>) -> Option<TrackPayload> {
    state.current_track.lock().clone()
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
            .body(format!("Now playing: {}", artist))
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

#[derive(Serialize, Clone)]
struct LocalScanProgress {
    scanned: usize,
    found: usize,
}

#[tauri::command]
pub fn scan_local_music(
    app_handle: AppHandle,
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

    // Large (10k+ file) libraries used to scan silently with zero feedback
    // until the entire tree was walked and every file's tags read. Emit
    // incremental progress so the local-library window can show the user
    // something is actually happening instead of an indefinite spinner.
    crate::local_files::scan_directory_with_progress(&target_dir, |scanned, found| {
        let _ = app_handle.emit("local-scan-progress", LocalScanProgress { scanned, found });
    })
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
pub async fn create_sync_room(
    app_handle: AppHandle,
    state: State<'_, Arc<AppState>>,
    nickname: String,
) -> Result<crate::sync_room::RoomState, String> {
    let sink: Arc<dyn crate::sync_room::SyncEventSink> = Arc::new(app_handle);
    crate::sync_room::create_room(&state.sync_room, sink, nickname).await
}

#[tauri::command]
pub async fn join_sync_room(
    app_handle: AppHandle,
    state: State<'_, Arc<AppState>>,
    room_code: String,
    nickname: String,
) -> Result<crate::sync_room::RoomState, String> {
    let sink: Arc<dyn crate::sync_room::SyncEventSink> = Arc::new(app_handle);
    crate::sync_room::join_room(&state.sync_room, sink, room_code, nickname).await
}

#[tauri::command]
pub fn leave_sync_room(
    app_handle: AppHandle,
    state: State<'_, Arc<AppState>>,
) -> Result<(), String> {
    crate::sync_room::leave_room(&state.sync_room);
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
    state: State<'_, Arc<AppState>>,
    playback: crate::sync_room::SyncPlaybackState,
) -> Result<(), String> {
    crate::sync_room::broadcast_playback(&state.sync_room, playback);
    Ok(())
}

#[tauri::command]
pub fn get_remote_info(
    state: State<'_, Arc<AppState>>,
) -> Result<crate::remote_server::RemoteInfo, String> {
    // The port the server actually bound at startup, not the configured one:
    // a port edited in Settings only applies after a restart.
    let port = state.remote_status.serving_port()?;
    Ok(crate::remote_server::get_remote_info(port, &state.remote_token))
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

#[tauri::command]
pub fn get_app_version(app_handle: AppHandle) -> String {
    app_handle.package_info().version.to_string()
}

#[tauri::command]
pub async fn check_for_updates(app_handle: AppHandle) -> Result<Option<crate::updater::UpdateInfo>, String> {
    crate::updater::check_for_update(&app_handle).await
}

#[tauri::command]
pub async fn install_update(app_handle: AppHandle) -> Result<(), String> {
    crate::updater::install_update(&app_handle).await
}

mod urlencoding {
    pub fn encode(s: &str) -> String {
        url::form_urlencoded::byte_serialize(s.as_bytes()).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_clean_track_name_removes_video_noise_and_artist_prefix() {
        assert_eq!(
            clean_track_name("bbno$ - check (Official Music Video)"),
            "check"
        );
        assert_eq!(
            clean_track_name("Glass Animals - Take A Slice [Official Audio]"),
            "Take A Slice"
        );
        assert_eq!(
            clean_track_name("Kaz Bałagane - ale to MOCNA VIXA (Oficjalny teledysk)"),
            "ale to MOCNA VIXA"
        );
    }

    #[test]
    fn test_token_similarity_matches_relevant_titles() {
        let sim1 = calculate_token_similarity("Take A Slice", "take a slice");
        assert!(sim1 >= 0.9);

        let sim2 = calculate_token_similarity("Blinding Lights", "Save Your Tears");
        assert!(sim2 < 0.3);
    }

    #[test]
    fn test_pick_best_match_rejects_unrelated_songs_even_with_matching_duration() {
        let candidates = vec![
            json!({
                "trackName": "Different Song",
                "artistName": "Glass Animals",
                "duration": 210.0,
                "syncedLyrics": "[00:10.00]Wrong lyrics"
            }),
            json!({
                "trackName": "Take A Slice",
                "artistName": "Glass Animals",
                "duration": 212.0,
                "syncedLyrics": "[00:10.00]Right lyrics"
            }),
        ];

        let best = pick_best_match(&candidates, "Take A Slice", "Glass Animals", Some(210.0));
        assert!(best.is_some());
        let item = best.unwrap();
        assert_eq!(item["trackName"], "Take A Slice");
    }
}
