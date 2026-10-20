use crate::config::AppConfig;
use crate::discord_rpc::TrackPayload;
use crate::AppState;
use serde::Serialize;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_notification::NotificationExt;

/// The music.youtube.com page's only request command (see bridge.rs and
/// page_ipc.rs): runs one entry of the bridge table.
#[tauri::command]
pub async fn oxitune_bridge(
    webview: tauri::Webview,
    app_handle: AppHandle,
    cmd: String,
    args: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    if !crate::page_ipc::is_main_page(webview.label(), webview.url().ok().as_ref()) {
        return Err("not allowed".into());
    }
    let state = app_handle.state::<Arc<AppState>>().inner().clone();
    crate::bridge::dispatch(app_handle, state, &cmd, args).await
}

/// The offline screen's retry: back to YouTube Music once it answers.
#[tauri::command]
pub async fn retry_connection(webview: tauri::Webview, app_handle: AppHandle) -> Result<(), String> {
    if webview.label() != "main" || !webview.url().is_ok_and(|u| crate::connectivity::is_offline_page(&u)) {
        return Err("not allowed".into());
    }
    if !crate::connectivity::youtube_music_reachable().await {
        return Err("offline".into());
    }
    app_handle.state::<Arc<crate::connectivity::PageAlive>>().reset();
    let url = crate::session::start_url(None).parse::<url::Url>().map_err(|e| e.to_string())?;
    webview.navigate(url).map_err(|e| e.to_string())
}

/// The page's event feed: app events listed in `page_ipc::PAGE_EVENTS`.
#[tauri::command]
pub fn oxitune_subscribe(
    webview: tauri::Webview,
    app_handle: AppHandle,
    channel: tauri::ipc::Channel<serde_json::Value>,
) -> Result<(), String> {
    if !crate::page_ipc::is_main_page(webview.label(), webview.url().ok().as_ref()) {
        return Err("not allowed".into());
    }
    app_handle.state::<crate::page_ipc::PageChannel>().set(channel);
    Ok(())
}

#[tauri::command]
pub fn get_config(state: State<'_, Arc<AppState>>) -> AppConfig {
    state.config_manager.load()
}

#[tauri::command]
pub fn save_config(app_handle: AppHandle, state: State<'_, Arc<AppState>>, config: AppConfig) -> Result<(), String> {
    let config = keep_onboarding_done(&state.config_manager.load(), config);
    state.config_manager.save(&config)?;
    apply_autostart(&app_handle, config.autostart);
    Ok(())
}

/// A window that loaded the config before the welcome window was finished
/// (Settings left open) must not bring the welcome window back by saving.
pub fn keep_onboarding_done(current: &AppConfig, mut next: AppConfig) -> AppConfig {
    next.onboarding_done |= current.onboarding_done;
    next
}

/// The welcome window is done (finished, skipped or closed): it no longer
/// opens at launch, the player window (hidden behind it on first launch)
/// shows up, and the page shows its tips (`onboarding-finished`, also after
/// "Run setup again"). With `open_settings`, Settings opens over the player.
#[tauri::command]
pub fn finish_onboarding(app_handle: AppHandle, state: State<'_, Arc<AppState>>, open_settings: bool) -> Result<(), String> {
    let mut config = state.config_manager.load();
    if !config.onboarding_done {
        config.onboarding_done = true;
        state.config_manager.save(&config)?;
        let _ = app_handle.emit("config-updated", &config);
    }
    let _ = app_handle.emit("onboarding-finished", ());
    crate::tray::show_main_window(&app_handle);
    if open_settings {
        crate::windows::show(&app_handle, "settings");
    }
    Ok(())
}

/// Settings → About → "Run setup again".
#[tauri::command]
pub fn open_welcome_window(app_handle: AppHandle) -> Result<(), String> {
    crate::windows::show(&app_handle, crate::windows::WELCOME);
    Ok(())
}

/// Registers or removes Oxitune from the system's login items to match the
/// setting (off by default). Launched that way, Oxitune starts in the tray.
pub fn apply_autostart(app_handle: &AppHandle, enabled: bool) {
    use tauri_plugin_autostart::ManagerExt;
    let launcher = app_handle.autolaunch();
    let result = match (enabled, launcher.is_enabled().unwrap_or(false)) {
        (true, false) => launcher.enable(),
        (false, true) => launcher.disable(),
        _ => Ok(()),
    };
    if let Err(e) = result {
        log::warn!("[Oxitune] couldn't change autostart: {e}");
    }
}

/// Sets the global shortcut for one player action (empty clears it) and
/// saves it. Returns every action's shortcut; errors are i18n keys
/// (`settings.shortcuts.*`), e.g. when another app already owns the keys.
#[tauri::command]
pub fn set_shortcut(
    app_handle: AppHandle,
    state: State<'_, Arc<AppState>>,
    action: String,
    accelerator: String,
) -> Result<std::collections::BTreeMap<String, String>, String> {
    let mut config = state.config_manager.load();
    let shortcuts = crate::shortcuts::set_shortcut(&app_handle, &config.shortcuts, &action, &accelerator)?;
    config.shortcuts = shortcuts.clone();
    state.config_manager.save(&config)?;
    Ok(shortcuts)
}

#[tauri::command]
pub fn reset_shortcuts(
    app_handle: AppHandle,
    state: State<'_, Arc<AppState>>,
) -> Result<std::collections::BTreeMap<String, String>, String> {
    let mut config = state.config_manager.load();
    config.shortcuts = crate::shortcuts::default_shortcuts();
    crate::shortcuts::apply(&app_handle, &config.shortcuts);
    state.config_manager.save(&config)?;
    Ok(config.shortcuts)
}

#[tauri::command]
pub fn open_logs_folder(app_handle: AppHandle, state: State<'_, Arc<AppState>>) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    std::fs::create_dir_all(&state.logs_dir).map_err(|e| e.to_string())?;
    app_handle
        .opener()
        .open_path(state.logs_dir.to_string_lossy(), None::<&str>)
        .map_err(|e| e.to_string())
}

/// What a settings backup file holds. `kind` tells an Oxitune backup from any
/// other JSON someone picks by mistake.
#[derive(Serialize, serde::Deserialize)]
struct SettingsBackup {
    kind: String,
    version: u32,
    config: AppConfig,
}

const BACKUP_KIND: &str = "oxitune-settings";

pub fn settings_backup_json(config: &AppConfig) -> Result<String, String> {
    serde_json::to_string_pretty(&SettingsBackup {
        kind: BACKUP_KIND.to_string(),
        version: 1,
        config: config.clone(),
    })
    .map_err(|e| e.to_string())
}

/// Biggest backup file we read (real ones are a few KB).
pub const MAX_BACKUP_BYTES: u64 = 1024 * 1024;

/// What an import applies, and the custom CSS it carried, which the user
/// must confirm separately (it can load outside resources into YouTube
/// Music, and a backup may come from someone else).
#[derive(Serialize)]
pub struct ImportedSettings {
    pub config: AppConfig,
    pub custom_css: Option<String>,
}

/// A backup file is input from possibly someone else: everything is
/// sanitized, and four things are never taken from it: folders (the
/// library path stays this computer's), whether the phone remote is on
/// and where it listens (a file must not open a port), custom CSS
/// (returned separately for the user to confirm), and whether this
/// computer has seen the welcome window.
pub fn merge_imported(current: &AppConfig, imported: AppConfig) -> ImportedSettings {
    let css = imported.custom_css.trim().to_string();
    let custom_css = (!css.is_empty() && imported.custom_css != current.custom_css).then_some(imported.custom_css.clone());
    let config = AppConfig {
        local_music_dir: current.local_music_dir.clone(),
        remote_enabled: current.remote_enabled,
        remote_bind: current.remote_bind.clone(),
        custom_css: current.custom_css.clone(),
        onboarding_done: current.onboarding_done,
        ..imported
    };
    ImportedSettings { config, custom_css }
}

/// The settings in a backup file, sanitized like any saved config. Errors
/// are i18n keys.
pub fn parse_settings_backup(json: &str) -> Result<AppConfig, String> {
    let backup: SettingsBackup = serde_json::from_str(json).map_err(|_| "settings.backup.invalid".to_string())?;
    if backup.kind != BACKUP_KIND {
        return Err("settings.backup.invalid".to_string());
    }
    Ok(backup.config.sanitized())
}

/// Saves all settings (equalizer, custom presets, shortcuts, ...) to a file
/// the user picks. `Ok(false)` when they cancel.
#[tauri::command]
pub async fn export_settings(app_handle: AppHandle, state: State<'_, Arc<AppState>>) -> Result<bool, String> {
    use tauri_plugin_dialog::DialogExt;
    let json = settings_backup_json(&state.config_manager.load())?;
    let handle = app_handle.clone();
    let picked = tauri::async_runtime::spawn_blocking(move || {
        handle
            .dialog()
            .file()
            .add_filter("Oxitune", &["json"])
            .set_file_name("oxitune-settings.json")
            .blocking_save_file()
    })
    .await
    .map_err(|e| e.to_string())?;
    let Some(path) = picked.and_then(|p| p.into_path().ok()) else {
        return Ok(false);
    };
    std::fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(true)
}

/// Replaces all settings with a backup file the user picks and applies
/// what can be applied right away (shortcuts). Returns the new settings for
/// the Settings window to show and push live; `None` when they cancel.
#[tauri::command]
pub async fn import_settings(
    app_handle: AppHandle,
    state: State<'_, Arc<AppState>>,
) -> Result<Option<ImportedSettings>, String> {
    use tauri_plugin_dialog::DialogExt;
    let handle = app_handle.clone();
    let picked = tauri::async_runtime::spawn_blocking(move || {
        handle.dialog().file().add_filter("Oxitune", &["json"]).blocking_pick_file()
    })
    .await
    .map_err(|e| e.to_string())?;
    let Some(path) = picked.and_then(|p| p.into_path().ok()) else {
        return Ok(None);
    };
    let too_big = std::fs::metadata(&path).map(|m| m.len() > MAX_BACKUP_BYTES).unwrap_or(true);
    if too_big {
        return Err("settings.backup.invalid".to_string());
    }
    let json = std::fs::read_to_string(&path).map_err(|_| "settings.backup.invalid".to_string())?;
    let imported = merge_imported(&state.config_manager.load(), parse_settings_backup(&json)?);
    state.config_manager.save(&imported.config)?;
    crate::shortcuts::apply(&app_handle, &imported.config.shortcuts);
    apply_autostart(&app_handle, imported.config.autostart);
    Ok(Some(imported))
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
    state.session.record(&track);

    // Update Discord RPC if enabled
    if config.discord_rpc_enabled {
        let mut rpc_lock = state.discord_rpc.lock();
        if rpc_lock.is_none() {
            *rpc_lock = Some(crate::discord_rpc::DiscordRpcHandle::new());
        }
        if let Some(ref rpc) = *rpc_lock {
            rpc.update(discord_desired(&state, &config, Some(track.clone())));
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

    crate::thumbbar::set_playing(&app_handle, track.is_playing);

    // Broadcast track update to miniplayer and any other windows
    let _ = app_handle.emit("track-changed", &track);

    Ok(())
}

pub fn toggle_mini_player(app_handle: AppHandle) -> Result<(), String> {
    crate::windows::toggle(&app_handle, "miniplayer");
    Ok(())
}

pub fn toggle_settings_window(app_handle: AppHandle) -> Result<(), String> {
    crate::windows::toggle(&app_handle, "settings");
    Ok(())
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
            .body(format!("{}: {}", crate::i18n::t(crate::i18n::Text::NowPlaying), artist))
            .show();
    }
    Ok(())
}

#[derive(Serialize, Clone)]
struct LocalScanProgress {
    scanned: usize,
    found: usize,
}

/// Scans the library off the main thread (sync commands run on it, and a
/// big library takes seconds), reading tags only for new or changed files.
#[tauri::command]
pub async fn scan_local_music(
    app_handle: AppHandle,
    state: State<'_, Arc<AppState>>,
    directory: Option<String>,
) -> Result<Vec<crate::local_files::LocalTrack>, String> {
    let config = state.config_manager.load();
    let library_root = std::path::PathBuf::from(&config.local_music_dir);

    // The local-library window plays files through the `asset:` protocol,
    // whose scope starts empty (tauri.conf.json); open it to exactly the
    // configured library, never the whole filesystem.
    if let Err(e) = app_handle.asset_protocol_scope().allow_directory(&library_root, true) {
        log::warn!("[Oxitune] couldn't allow asset access to the music library: {e}");
    }

    let target_dir = match directory {
        Some(requested) => {
            let requested_path = std::path::PathBuf::from(&requested);
            if crate::local_files::is_within_root(&library_root, &requested_path) {
                requested_path
            } else {
                log::warn!("[Oxitune] scan_local_music rejected a directory outside the configured library root");
                library_root
            }
        }
        None => library_root,
    };
    let cache_path = state
        .config_manager
        .config_path()
        .parent()
        .map(|d| d.join("library_cache.json"))
        .ok_or("no data folder")?;

    // Progress events let the window show something during a long first scan.
    tauri::async_runtime::spawn_blocking(move || {
        let cache = crate::local_files::LibraryCache::load(&cache_path);
        let (tracks, next) = crate::local_files::scan_directory_cached(&target_dir, &cache, |scanned, found| {
            let _ = app_handle.emit("local-scan-progress", LocalScanProgress { scanned, found });
        });
        next.save(&cache_path);
        tracks
    })
    .await
    .map_err(|e| e.to_string())
}

pub fn toggle_local_library_window(app_handle: AppHandle) -> Result<(), String> {
    crate::windows::toggle(&app_handle, "local");
    Ok(())
}

pub fn toggle_sync_window(app_handle: AppHandle) -> Result<(), String> {
    crate::windows::toggle(&app_handle, "sync");
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

pub(crate) fn sync_sink(app_handle: AppHandle) -> Arc<dyn crate::sync_room::SyncEventSink> {
    Arc::new(app_handle)
}

/// Leaves the room. A host with guests hands it to the next in line.
#[tauri::command]
pub fn leave_sync_room(
    app_handle: AppHandle,
    state: State<'_, Arc<AppState>>,
) -> Result<(), String> {
    crate::sync_room::leave_room(&state.sync_room);
    let _ = app_handle.emit(
        "sync-room-left",
        crate::sync_room::RoomLeftPayload { reason: crate::sync_room::LeaveReason::Left },
    );
    Ok(())
}

/// Host: ends the room for everyone.
#[tauri::command]
pub fn end_sync_room(
    app_handle: AppHandle,
    state: State<'_, Arc<AppState>>,
) -> Result<(), String> {
    crate::sync_room::end_room(&state.sync_room);
    let _ = app_handle.emit(
        "sync-room-left",
        crate::sync_room::RoomLeftPayload { reason: crate::sync_room::LeaveReason::Left },
    );
    Ok(())
}

/// Host: gives the room to `member_id` and stays in it as a guest.
#[tauri::command]
pub fn transfer_sync_host(
    app_handle: AppHandle,
    state: State<'_, Arc<AppState>>,
    member_id: String,
) -> Result<(), String> {
    crate::sync_room::transfer_host(&state.sync_room, sync_sink(app_handle), &member_id)
}

/// Host or moderator: removes a member and bans their install from the room.
#[tauri::command]
pub fn kick_sync_member(
    app_handle: AppHandle,
    state: State<'_, Arc<AppState>>,
    member_id: String,
) -> Result<(), String> {
    crate::sync_room::kick_member(&state.sync_room, &sync_sink(app_handle), &member_id)
}

#[tauri::command]
pub fn set_sync_member_role(
    app_handle: AppHandle,
    state: State<'_, Arc<AppState>>,
    member_id: String,
    role: crate::sync_room::MemberRole,
) -> Result<(), String> {
    state.sync_room.set_member_role(&member_id, role, &sync_sink(app_handle))
}

#[tauri::command]
pub fn set_sync_default_role(
    app_handle: AppHandle,
    state: State<'_, Arc<AppState>>,
    role: crate::sync_room::MemberRole,
) -> Result<(), String> {
    state.sync_room.set_default_role(role, &sync_sink(app_handle))
}

#[tauri::command]
pub fn set_sync_require_approval(
    app_handle: AppHandle,
    state: State<'_, Arc<AppState>>,
    enabled: bool,
) -> Result<(), String> {
    state.sync_room.set_require_approval(enabled, &sync_sink(app_handle.clone()))?;
    // A public Discord invite is only safe behind approval.
    if !enabled && state.invites.current(state.sync_room.get_room_state().as_ref()).is_some() {
        state.invites.set_published(None);
        refresh_discord(&app_handle, &state);
    }
    Ok(())
}

/// What Discord should show for `track`, including the host's room invite.
fn discord_desired(
    state: &AppState,
    config: &crate::config::AppConfig,
    track: Option<TrackPayload>,
) -> crate::discord_rpc::Desired {
    crate::discord_rpc::Desired {
        track,
        clear_after_pause: (config.discord_clear_after_pause_min > 0)
            .then(|| std::time::Duration::from_secs(u64::from(config.discord_clear_after_pause_min) * 60)),
        invite: state.invites.current(state.sync_room.get_room_state().as_ref()),
    }
}

/// Re-sends the current track so a changed invite shows up right away.
fn refresh_discord(app_handle: &AppHandle, state: &AppState) {
    let config = state.config_manager.load();
    if !config.discord_rpc_enabled {
        return;
    }
    let track = state.current_track.lock().clone();
    if let Some(rpc) = state.discord_rpc.lock().as_ref() {
        rpc.update(discord_desired(state, &config, track));
    }
    let _ = app_handle.emit("sync-discord-invite", state.invites.current(state.sync_room.get_room_state().as_ref()).is_some());
}

/// Host: shows (or stops showing) a "Listen along" button for this room on
/// Discord. Turning it on also turns on join approval, since anyone who can
/// see the status can follow the link.
#[tauri::command]
pub fn set_discord_invite(
    app_handle: AppHandle,
    state: State<'_, Arc<AppState>>,
    enabled: bool,
) -> Result<(), String> {
    let room = state.sync_room.get_room_state().ok_or("sync.error.notInRoom")?;
    if !room.is_host {
        return Err("sync.error.notHost".to_string());
    }
    if enabled {
        if !state.config_manager.load().discord_rpc_enabled {
            return Err("sync.error.discordOff".to_string());
        }
        state.sync_room.set_require_approval(true, &sync_sink(app_handle.clone()))?;
        state.invites.set_published(Some(room.room_code));
    } else {
        state.invites.set_published(None);
    }
    refresh_discord(&app_handle, &state);
    Ok(())
}

#[tauri::command]
pub fn get_discord_invite(state: State<'_, Arc<AppState>>) -> bool {
    state.invites.current(state.sync_room.get_room_state().as_ref()).is_some()
}

/// A room code from an `oxitune://join/...` link that arrived before the Listen
/// Together window was ready.
#[tauri::command]
pub fn take_pending_join_code(state: State<'_, Arc<AppState>>) -> Option<String> {
    state.invites.take_pending_join()
}

/// Host: lets a waiting guest in (`approve`) or turns them away.
#[tauri::command]
pub fn decide_sync_join(
    app_handle: AppHandle,
    state: State<'_, Arc<AppState>>,
    user_id: String,
    approve: bool,
) -> Result<(), String> {
    state.sync_room.decide_pending(&user_id, approve, &sync_sink(app_handle))
}

#[tauri::command]
pub fn unban_sync_member(
    app_handle: AppHandle,
    state: State<'_, Arc<AppState>>,
    client_hash: String,
) -> Result<(), String> {
    state.sync_room.unban(&client_hash, &sync_sink(app_handle))
}

#[tauri::command]
pub fn vote_sync_skip(app_handle: AppHandle, state: State<'_, Arc<AppState>>) -> Result<(), String> {
    crate::sync_room::vote_skip(&state.sync_room, &sync_sink(app_handle))
}

#[tauri::command]
pub fn send_sync_reaction(
    app_handle: AppHandle,
    state: State<'_, Arc<AppState>>,
    emoji: String,
) -> Result<(), String> {
    crate::sync_room::send_reaction(&state.sync_room, &sync_sink(app_handle), &emoji)
}

#[derive(serde::Deserialize)]
struct OEmbed {
    title: String,
    #[serde(default)]
    author_name: String,
}

/// Title and artist of a YouTube video from its public oEmbed endpoint, so
/// the shared queue shows names instead of ids. Best effort: `None` when
/// offline or the video is private.
async fn fetch_video_title(video_id: &str) -> Option<(String, String)> {
    let client = reqwest::Client::builder().timeout(std::time::Duration::from_secs(5)).build().ok()?;
    let info: OEmbed = client
        .get("https://www.youtube.com/oembed")
        .query(&[("url", format!("https://www.youtube.com/watch?v={video_id}").as_str()), ("format", "json")])
        .send()
        .await
        .ok()?
        .error_for_status()
        .ok()?
        .json()
        .await
        .ok()?;
    // YTM's auto-generated artist channels are "<Artist> - Topic".
    let artist = info.author_name.trim_end_matches(" - Topic").to_string();
    Some((info.title, artist))
}

/// Adds a song to the room's shared queue: YTM's own "Add to queue" /
/// "Play next" (`next`) menu items, which the sync plugin redirects here
/// through the bridge.
pub async fn add_to_sync_queue(
    app_handle: AppHandle,
    state: &AppState,
    input: &str,
    next: bool,
) -> Result<(), String> {
    let video_id = crate::sync_room::parse_video_id(input).ok_or("sync.error.badLink")?;
    let (title, artist) = fetch_video_title(&video_id).await.unwrap_or_default();
    crate::sync_room::queue_add(&state.sync_room, &sync_sink(app_handle), &video_id, &title, &artist, next)
}

#[tauri::command]
pub fn sync_queue_remove(
    app_handle: AppHandle,
    state: State<'_, Arc<AppState>>,
    item_id: String,
) -> Result<(), String> {
    crate::sync_room::queue_remove(&state.sync_room, &sync_sink(app_handle), &item_id)
}

#[tauri::command]
pub fn sync_queue_move(
    app_handle: AppHandle,
    state: State<'_, Arc<AppState>>,
    item_id: String,
    to_index: usize,
) -> Result<(), String> {
    crate::sync_room::queue_move(&state.sync_room, &sync_sink(app_handle), &item_id, to_index)
}

#[tauri::command]
pub fn sync_queue_play(
    app_handle: AppHandle,
    state: State<'_, Arc<AppState>>,
    item_id: String,
) -> Result<(), String> {
    crate::sync_room::queue_play(&state.sync_room, &sync_sink(app_handle), &item_id)
}

/// The sync window's connection test: can this network reach each broker?
#[tauri::command]
pub async fn test_sync_connection() -> Vec<crate::p2p_sync::BrokerProbe> {
    crate::p2p_sync::probe_brokers().await
}

#[tauri::command]
pub fn get_sync_room_state(
    state: State<'_, Arc<AppState>>,
) -> Option<crate::sync_room::RoomState> {
    state.sync_room.get_room_state()
}

#[tauri::command]
pub fn get_remote_info(
    state: State<'_, Arc<AppState>>,
) -> Result<crate::remote_server::RemoteInfo, String> {
    // The port the server actually bound at startup, not the configured one:
    // a port edited in Settings only applies after a restart.
    let port = state.remote_status.serving_port()?;
    Ok(crate::remote_server::get_remote_info(port, &state.remote_status.token()))
}

/// "Revoke paired phones": a new pairing token; every phone must scan the
/// QR code again.
#[tauri::command]
pub fn regenerate_remote_token(state: State<'_, Arc<AppState>>) -> Result<(), String> {
    state.remote_status.regenerate_token().map(|_| ())
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

/// A companion window's close button (after the page flushed anything
/// pending): hides it, or destroys it for Settings and the library.
#[tauri::command]
pub fn close_window(window: tauri::WebviewWindow) -> Result<(), String> {
    crate::windows::close(&window);
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


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_settings_backup_roundtrip_keeps_presets_and_shortcuts() {
        let mut config = AppConfig {
            crossfade_seconds: 6.0,
            equalizer_custom_presets: vec![crate::config::CustomEqPreset {
                id: "user-bass".into(),
                name: "Bas".into(),
                gains: vec![5.0; 10],
                preamp: -2.0,
            }],
            ..AppConfig::default()
        };
        config.shortcuts.insert("like".into(), "Control+Alt+KeyL".into());
        let restored = parse_settings_backup(&settings_backup_json(&config).unwrap()).unwrap();
        assert_eq!(restored.crossfade_seconds, 6.0);
        assert_eq!(restored.equalizer_custom_presets, config.equalizer_custom_presets);
        assert_eq!(restored.shortcuts["like"], "Control+Alt+KeyL");
    }

    #[test]
    fn test_import_keeps_local_paths_remote_and_asks_about_css() {
        let current = AppConfig { local_music_dir: "/home/me/Music".into(), custom_css: "a{}".into(), ..AppConfig::default() };
        let from_file = AppConfig {
            local_music_dir: "/etc".into(),
            remote_enabled: true,
            remote_bind: "all".into(),
            custom_css: "@import url(https://evil.example/x.css);".into(),
            crossfade_seconds: 4.0,
            ..AppConfig::default()
        };
        let imported = merge_imported(&current, from_file);
        assert_eq!(imported.config.local_music_dir, "/home/me/Music");
        assert!(!imported.config.remote_enabled);
        assert_eq!(imported.config.remote_bind, "lan");
        assert_eq!(imported.config.custom_css, "a{}", "CSS only after the user confirms");
        assert_eq!(imported.custom_css.as_deref(), Some("@import url(https://evil.example/x.css);"));
        assert_eq!(imported.config.crossfade_seconds, 4.0);

        let same_css = merge_imported(&current, AppConfig { custom_css: "a{}".into(), ..AppConfig::default() });
        assert!(same_css.custom_css.is_none(), "nothing to confirm when the CSS is unchanged");
    }

    #[test]
    fn test_onboarding_done_is_never_undone_by_a_save_or_an_import() {
        let done = AppConfig { onboarding_done: true, ..AppConfig::default() };
        let stale = AppConfig { onboarding_done: false, crossfade_seconds: 3.0, ..AppConfig::default() };
        let saved = keep_onboarding_done(&done, stale.clone());
        assert!(saved.onboarding_done, "Settings opened before the welcome window finished");
        assert_eq!(saved.crossfade_seconds, 3.0, "the rest of the save goes through");
        assert!(!keep_onboarding_done(&AppConfig::default(), stale.clone()).onboarding_done);

        assert!(merge_imported(&done, stale).config.onboarding_done, "a backup from another computer");
        let fresh = AppConfig::default();
        assert!(!merge_imported(&fresh, done).config.onboarding_done, "nor skips it here");
    }

    #[test]
    fn test_settings_backup_rejects_other_files_and_sanitizes() {
        assert_eq!(parse_settings_backup("{}").err().as_deref(), Some("settings.backup.invalid"));
        assert_eq!(parse_settings_backup("not json").err().as_deref(), Some("settings.backup.invalid"));
        let foreign = settings_backup_json(&AppConfig::default()).unwrap().replace("oxitune-settings", "something-else");
        assert_eq!(parse_settings_backup(&foreign).err().as_deref(), Some("settings.backup.invalid"));

        // A hand-edited backup can't smuggle in out-of-range values.
        let hostile = settings_backup_json(&AppConfig { remote_port: 22, preamp_gain: 900.0, ..AppConfig::default() }).unwrap();
        let clean = parse_settings_backup(&hostile).unwrap();
        assert_eq!(clean.remote_port, AppConfig::default().remote_port);
        assert_eq!(clean.preamp_gain, 24.0);
    }
}
