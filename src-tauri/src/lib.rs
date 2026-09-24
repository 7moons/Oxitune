pub mod bridge;
pub mod commands;
pub mod config;
pub mod discord_rpc;
pub mod join_link;
pub mod local_files;
pub mod lyrics;
pub mod mpris;
pub mod nav_policy;
pub mod page_ipc;
pub mod p2p_sync;
pub mod power_manager;
pub mod remote_server;
pub mod screen_lock;
pub mod secure_fs;
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
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};

pub struct AppState {
    pub config_manager: ConfigManager,
    pub discord_rpc: Mutex<Option<DiscordRpcHandle>>,
    pub mpris: Mutex<Option<MprisManager>>,
    pub current_track: Mutex<Option<TrackPayload>>,
    /// Listen Together invites: `ytmd://join` links and the Discord button.
    pub invites: join_link::InviteState,
    pub sync_room: Arc<SyncRoomManager>,
    pub power_manager: PowerManager,
    pub remote_status: Arc<remote_server::RemoteServerStatus>,
    /// Where tauri-plugin-log writes (`~/.ytmd/logs`).
    pub logs_dir: std::path::PathBuf,
    /// Last song and position, for resume on launch (`~/.ytmd/session.json`).
    pub session: session::SessionStore,
    pub lyrics: lyrics::LyricsState,
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

    let ytmd_dir = config_manager.config_path().parent().map(|dir| dir.to_path_buf());
    if let Some(dir) = &ytmd_dir {
        // Files written by older versions with the default umask.
        for name in ["config.json", "session.json", "remote_token", "lyrics_offsets.json"] {
            secure_fs::restrict_file(&dir.join(name));
        }
        // Protocol-2 install id, replaced by `sync_identity`.
        let _ = std::fs::remove_file(dir.join("sync_client_id"));
    }
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

    // This install's Listen Together signing key (sync_crypto.rs).
    let sync_identity = Arc::new(
        config_manager
            .config_path()
            .parent()
            .map(|dir| sync_crypto::Identity::load_or_create(&dir.join("sync_identity")))
            .unwrap_or_else(sync_crypto::Identity::generate),
    );

    let app_state = Arc::new(AppState {
        config_manager,
        discord_rpc: Mutex::new(discord_rpc),
        mpris: Mutex::new(None),
        current_track: Mutex::new(None),
        invites: join_link::InviteState::default(),
        sync_room: Arc::new(SyncRoomManager::new().with_identity(sync_identity)),
        power_manager: PowerManager::new(),
        remote_status: Arc::new(remote_server::RemoteServerStatus::new(
            initial_config.remote_enabled,
            ytmd_dir.as_ref().map(|dir| dir.join("remote_token")),
        )),
        logs_dir: logs_dir.clone(),
        session: session_store,
        lyrics: lyrics::LyricsState::new(
            ytmd_dir.clone().unwrap_or_else(|| std::path::PathBuf::from(".")),
        ),
    });

    let app_state_for_setup = app_state.clone();
    let remote_port = initial_config.remote_port;
    let remote_enabled = initial_config.remote_enabled;
    let remote_bind = initial_config.remote_bind.clone();
    let initial_shortcuts = initial_config.shortcuts.clone();

    tauri::Builder::default()
        // Must be the first plugin: a second launch (even while this one sits
        // in the tray) exits right away and brings this window back instead
        // of starting a second player, tray icon and sync host.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            tray::show_main_window(app);
        }))
        // `ytmd://join/<code>` links (the Discord "Listen along" page). With
        // single-instance's `deep-link` feature a link opened while we run
        // arrives through `on_open_url` below, not as a second process.
        .plugin(tauri_plugin_deep_link::init())
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
                    &remote_bind,
                    app_state_for_setup.remote_status.clone(),
                );
            }

            // Real screen-lock detection for "pause on lock" (Linux; no-op
            // elsewhere). Replaces the page's `document.hidden` check, which
            // also fired on minimize/hide-to-tray.
            screen_lock::start(handle.clone());

            // The music.youtube.com page's event feed (page_ipc.rs).
            page_ipc::start_relay(&handle);

            {
                use tauri_plugin_deep_link::DeepLinkExt;
                // Installers register the scheme; AppImage and dev builds
                // have to do it themselves.
                #[cfg(any(target_os = "linux", all(debug_assertions, windows)))]
                if let Err(e) = app.deep_link().register_all() {
                    log::warn!("couldn't register the ytmd:// link scheme: {e}");
                }
                if let Ok(Some(urls)) = app.deep_link().get_current() {
                    join_link::handle_urls(&handle, urls.iter().map(|u| u.as_str()));
                }
                let handle_for_links = handle.clone();
                app.deep_link().on_open_url(move |event| {
                    join_link::handle_urls(&handle_for_links, event.urls().iter().map(|u| u.as_str()));
                });
            }

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
            .initialization_script(include_str!("../inject/preload.js"))
            // YouTube Music and Google sign-in only (nav_policy.rs).
            .on_navigation(|url| {
                let ok = nav_policy::is_allowed_navigation(url);
                if !ok {
                    log::warn!("[YTMD] blocked navigation of the main window to {}", url.origin().ascii_serialization());
                }
                ok
            })
            // Pop-ups never open inside the app: web links go to the browser.
            .on_new_window({
                let handle = handle.clone();
                move |url, _features| {
                    if nav_policy::opens_in_browser(&url) {
                        use tauri_plugin_opener::OpenerExt;
                        if let Err(e) = handle.opener().open_url(url.as_str(), None::<&str>) {
                            log::warn!("[YTMD] couldn't open a link in the browser: {e}");
                        }
                    }
                    tauri::webview::NewWindowResponse::Deny
                }
            });

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
            // Keep in sync with APP_COMMANDS in build.rs and capabilities/*.json.
            commands::ytmd_bridge,
            commands::ytmd_subscribe,
            commands::get_config,
            commands::save_config,
            commands::get_current_track,
            lyrics::commands::get_current_lyrics,
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
            commands::set_discord_invite,
            commands::get_discord_invite,
            commands::take_pending_join_code,
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
            commands::get_remote_info,
            commands::regenerate_remote_token,
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
