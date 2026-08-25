pub mod commands;
pub mod config;
pub mod discord_rpc;
pub mod downloader;
pub mod local_files;
pub mod mpris;
pub mod shortcuts;
pub mod sync_room;
pub mod tray;

use config::ConfigManager;
use discord_rpc::{DiscordRpcHandle, TrackPayload};
use mpris::MprisManager;
use parking_lot::Mutex;
use std::sync::Arc;
use sync_room::SyncRoomManager;
use tauri::{Manager, WindowEvent};

pub struct AppState {
    pub config_manager: ConfigManager,
    pub discord_rpc: Mutex<Option<DiscordRpcHandle>>,
    pub mpris: Mutex<Option<MprisManager>>,
    pub current_track: Mutex<Option<TrackPayload>>,
    pub sync_room: SyncRoomManager,
}

pub fn run() {
    let config_manager = ConfigManager::new();
    let initial_config = config_manager.load();

    let discord_rpc = if initial_config.discord_rpc_enabled {
        Some(DiscordRpcHandle::new())
    } else {
        None
    };

    let app_state = Arc::new(AppState {
        config_manager,
        discord_rpc: Mutex::new(discord_rpc),
        mpris: Mutex::new(None),
        current_track: Mutex::new(None),
        sync_room: SyncRoomManager::new(),
    });

    let app_state_for_setup = app_state.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .manage(app_state)
        .setup(move |app| {
            let handle = app.handle().clone();

            // Initialize MPRIS
            let mpris_manager = MprisManager::new(handle.clone());
            *app_state_for_setup.mpris.lock() = Some(mpris_manager);

            // Initialize Tray
            let _ = tray::setup_tray(&handle);

            // Initialize Global Shortcuts
            let _ = shortcuts::setup_shortcuts(&handle);

            // Inject preload script into the main window when initialized
            if let Some(main_win) = handle.get_webview_window("main") {
                let _ = main_win.eval(include_str!("../inject/init.js"));
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    let state = window.state::<Arc<AppState>>();
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
            commands::broadcast_sync_state,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
