pub mod bridge;
pub mod commands;
pub mod config;
pub mod discord_rpc;
pub mod downloader;
pub mod local_files;
pub mod mpris;
pub mod p2p_sync;
pub mod power_manager;
pub mod remote_server;
pub mod screen_lock;
pub mod session;
pub mod shortcuts;
pub mod sync_crypto;
pub mod sync_room;
pub mod tray;
pub mod updater;

use config::ConfigManager;
use discord_rpc::{DiscordRpcHandle, TrackPayload};
use mpris::MprisManager;
use parking_lot::Mutex;
use power_manager::PowerManager;
use std::sync::Arc;
use sync_room::SyncRoomManager;
use tauri::{Emitter, Listener, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};

pub struct AppState {
    pub config_manager: ConfigManager,
    pub discord_rpc: Mutex<Option<DiscordRpcHandle>>,
    pub mpris: Mutex<Option<MprisManager>>,
    pub current_track: Mutex<Option<TrackPayload>>,
    pub sync_room: Arc<SyncRoomManager>,
    pub power_manager: PowerManager,
    pub remote_token: String,
    pub remote_status: Arc<remote_server::RemoteServerStatus>,
    /// Where tauri-plugin-log writes (`~/.ytmd/logs`).
    pub logs_dir: std::path::PathBuf,
    /// Last song and position, for resume on launch (`~/.ytmd/session.json`).
    pub session: session::SessionStore,
}

/// Installs the process-wide rustls crypto provider exactly once.
///
/// Pulling in `tauri-plugin-updater` (via `rustls-platform-verifier`) put both
/// the `ring` and `aws_lc_rs` cargo features of `rustls` in play at once
/// (Cargo unifies features across the whole dependency graph, and rumqttc's
/// TLS stack and the updater's each want a different one) — with neither a
/// clear majority, rustls refuses to auto-select a default provider the
/// moment anything (room sync, p2p sync, the updater) opens a TLS
/// connection, and panics instead. Call this before any such connection is
/// made; `#[ctor]` below does that for `cargo test`, and `run()` does it for
/// the real app.
pub fn ensure_crypto_provider() {
    static INIT: std::sync::Once = std::sync::Once::new();
    INIT.call_once(|| {
        let _ = rustls::crypto::ring::default_provider().install_default();
    });
}

#[cfg(test)]
#[ctor::ctor]
fn install_crypto_provider_for_tests() {
    ensure_crypto_provider();
}

pub fn run() {
    ensure_crypto_provider();

    let config_manager = ConfigManager::new();
    let initial_config = config_manager.load();

    let discord_rpc = if initial_config.discord_rpc_enabled {
        Some(DiscordRpcHandle::new())
    } else {
        None
    };

    let remote_token = remote_server::generate_token();
    let logs_dir = config_manager
        .config_path()
        .parent()
        .map(|dir| dir.join("logs"))
        .unwrap_or_else(|| std::path::PathBuf::from("logs"));
    let session_store = session::SessionStore::new(
        config_manager
            .config_path()
            .parent()
            .map(|dir| dir.join("session.json"))
            .unwrap_or_else(|| std::path::PathBuf::from("session.json")),
    );
    let resume_session = if initial_config.resume_on_launch && !session::launched_from_link(std::env::args()) {
        session_store.load()
    } else {
        None
    };
    session_store.set_resume(resume_session.as_ref().map(|s| session::ResumeTarget {
        video_id: s.video_id.clone(),
        position_secs: s.position_secs,
        autoplay: initial_config.resume_autoplay,
    }));
    let start_url = session::start_url(resume_session.as_ref());

    let sync_client_id = config_manager
        .config_path()
        .parent()
        .map(|dir| sync_room::load_or_create_client_id(&dir.join("sync_client_id")))
        .unwrap_or_else(sync_room::generate_user_id);

    let app_state = Arc::new(AppState {
        config_manager,
        discord_rpc: Mutex::new(discord_rpc),
        mpris: Mutex::new(None),
        current_track: Mutex::new(None),
        sync_room: Arc::new(SyncRoomManager::new().with_client_id(sync_client_id)),
        power_manager: PowerManager::new(),
        remote_token: remote_token.clone(),
        remote_status: Arc::new(remote_server::RemoteServerStatus::new(initial_config.remote_enabled)),
        logs_dir: logs_dir.clone(),
        session: session_store,
    });

    let app_state_for_setup = app_state.clone();
    let remote_port = initial_config.remote_port;
    let remote_enabled = initial_config.remote_enabled;
    let initial_shortcuts = initial_config.shortcuts.clone();

    tauri::Builder::default()
        // Must be the first plugin: a second launch (even while this one sits
        // in the tray) exits right away and brings this window back instead
        // of starting a second player, tray icon and sync host.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            tray::show_main_window(app);
        }))
        // Every log::info!/warn!/error! goes to ~/.ytmd/logs/ytmd.log (and the
        // console in dev): a release build has no console, so without files
        // a user's "it doesn't work" left nothing to look at.
        .plugin(
            tauri_plugin_log::Builder::new()
                .clear_targets()
                .target(tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout))
                .target(tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Folder {
                    path: logs_dir,
                    file_name: Some("ytmd".into()),
                }))
                .level(log::LevelFilter::Info)
                .level_for("rumqttc", log::LevelFilter::Warn)
                .level_for("tao", log::LevelFilter::Warn)
                .max_file_size(2_000_000)
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepSome(5))
                .build(),
        )
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(app_state)
        .setup(move |app| {
            let handle = app.handle().clone();

            // Initialize Tray
            let _ = tray::setup_tray(&handle);

            // Global shortcuts, as configured in Settings.
            shortcuts::apply(&handle, &initial_shortcuts);

            // Mobile web remote: only listens on the LAN when the user has it
            // turned on (takes effect on restart, like the port).
            if remote_enabled {
                remote_server::start_remote_server(
                    handle.clone(),
                    remote_port,
                    remote_token.clone(),
                    app_state_for_setup.remote_status.clone(),
                );
            }

            // Real screen-lock detection for "pause on lock" (Linux; no-op
            // elsewhere). Replaces the page's `document.hidden` check, which
            // also fired on minimize/hide-to-tray.
            screen_lock::start(handle.clone());

            // Injected-page command bridge (see bridge.rs for the protocol).
            // Always answers when a request id is present, including for
            // unknown commands and malformed args, so the page never has to
            // fall back on its timeout to learn something failed.
            let handle_for_bridge = handle.clone();
            let app_state_for_bridge = app_state_for_setup.clone();
            handle.listen("ytmd-invoke", move |event| {
                let Ok(raw) = serde_json::from_str::<serde_json::Value>(event.payload()) else {
                    return;
                };
                let Some(id) = raw.get("id").and_then(|v| v.as_str()).map(str::to_owned) else {
                    return;
                };
                let cmd = raw.get("cmd").and_then(|v| v.as_str()).unwrap_or_default().to_owned();
                let args = raw.get("args").cloned();
                let h = handle_for_bridge.clone();
                let state = app_state_for_bridge.clone();
                tauri::async_runtime::spawn(async move {
                    let result = bridge::dispatch(h.clone(), state, &cmd, args).await;
                    let _ = h.emit(&format!("ytmd-response-{id}"), bridge::response_envelope(result));
                });
            });

            // Build main window with embedded initialization script
            let mut main_builder = WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::External(start_url.parse().expect("valid youtube music url")),
            )
            .title("YTMD")
            .inner_size(1280.0, 820.0)
            // YouTube Music's own UI isn't built for anything much narrower than this: its
            // right-side flyout panels (queue, "up next") are a fixed ~400-460px wide and
            // anchored to the right edge, so at the old 480px minimum they had almost no
            // margin and got visibly clipped on their left edge.
            .min_inner_size(700.0, 500.0)
            .resizable(true)
            .initialization_script(include_str!("../inject/preload.js"));

            if let Ok(icon) = tauri::image::Image::from_bytes(include_bytes!("../icons/icon.png")) {
                main_builder = main_builder.icon(icon)?;
            } else if let Some(icon) = app.default_window_icon() {
                main_builder = main_builder.icon(icon.clone())?;
            }

            let main_win = main_builder.build()?;

            // Initialize MPRIS (needs the main window's HWND on Windows)
            let mpris_manager = MprisManager::new(handle.clone(), &main_win);
            *app_state_for_setup.mpris.lock() = Some(mpris_manager);

            // Silent background update check, delayed so it never competes with
            // startup work for network/CPU. Surfaces a system notification when a
            // newer signed release is published; the user installs it from
            // Settings, which also re-checks (and lets them retry) on demand.
            let handle_for_update = handle.clone();
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_secs(15)).await;
                match updater::check_for_update(&handle_for_update).await {
                    Ok(Some(info)) => {
                        use tauri_plugin_notification::NotificationExt;
                        let _ = handle_for_update
                            .notification()
                            .builder()
                            .title("YTMD update available")
                            .body(format!("Version {} is ready to install from Settings.", info.version))
                            .show();
                    }
                    Ok(None) => {}
                    Err(e) => log::warn!("startup update check failed: {e}"),
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    let state = window.state::<Arc<AppState>>();
                    state.session.flush();
                    let config = state.config_manager.load();
                    if config.close_to_tray {
                        api.prevent_close();
                        let _ = window.hide();
                    }
                } else if window.label() == "miniplayer" || window.label() == "settings" || window.label() == "local" || window.label() == "sync" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_config,
            commands::save_config,
            commands::update_track_info,
            commands::get_current_track,
            commands::toggle_mini_player,
            commands::toggle_settings_window,
            commands::toggle_local_library_window,
            commands::toggle_sync_window,
            commands::send_player_command,
            commands::send_seek_command,
            commands::send_volume_command,
            commands::fetch_lyrics,
            commands::notify_track_change,
            commands::download_track,
            commands::scan_local_music,
            commands::create_sync_room,
            commands::join_sync_room,
            commands::leave_sync_room,
            commands::get_sync_room_state,
            commands::kick_sync_member,
            commands::set_sync_member_role,
            commands::set_sync_default_role,
            commands::unban_sync_member,
            commands::end_sync_room,
            commands::transfer_sync_host,
            commands::set_sync_require_approval,
            commands::decide_sync_join,
            commands::vote_sync_skip,
            commands::send_sync_reaction,
            commands::sync_queue_remove,
            commands::sync_queue_play,
            commands::sync_queue_move,
            commands::test_sync_connection,
            commands::set_shortcut,
            commands::reset_shortcuts,
            commands::open_logs_folder,
            commands::export_settings,
            commands::import_settings,
            commands::broadcast_sync_state,
            commands::get_remote_info,
            commands::set_inhibit_sleep,
            commands::minimize_window,
            commands::toggle_maximize_window,
            commands::close_window,
            commands::get_app_version,
            commands::check_for_updates,
            commands::install_update,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            if let tauri::RunEvent::Exit = event {
                app.state::<Arc<AppState>>().session.flush();
            }
        });
}
