// App commands get an ACL manifest: with one, Tauri checks *every* app
// command against the calling window's capabilities (capabilities/*.json),
// so each companion window can reach only the commands it uses, and the
// music.youtube.com page only `ytmd_bridge`/`ytmd_subscribe` (see bridge.rs).
const APP_COMMANDS: &[&str] = &[
    // Injected page (music.youtube.com), main window only.
    "ytmd_bridge",
    "ytmd_subscribe",
    // Offline screen (offline.html) in the main window.
    "retry_connection",
    // Companion windows.
    "get_config",
    "save_config",
    "get_current_track",
    "get_current_lyrics",
    "scan_local_music",
    "create_sync_room",
    "join_sync_room",
    "leave_sync_room",
    "get_sync_room_state",
    "kick_sync_member",
    "set_sync_member_role",
    "set_sync_default_role",
    "unban_sync_member",
    "end_sync_room",
    "transfer_sync_host",
    "set_sync_require_approval",
    "set_discord_invite",
    "get_discord_invite",
    "take_pending_join_code",
    "decide_sync_join",
    "vote_sync_skip",
    "send_sync_reaction",
    "sync_queue_remove",
    "sync_queue_play",
    "sync_queue_move",
    "test_sync_connection",
    "set_shortcut",
    "reset_shortcuts",
    "open_logs_folder",
    "export_settings",
    "import_settings",
    "get_remote_info",
    "regenerate_remote_token",
    "minimize_window",
    "toggle_maximize_window",
    "close_window",
    "get_app_version",
    "check_for_updates",
    "install_update",
    "restart_app",
    // Plugin manager (Settings).
    "plugins_list",
    "plugins_set_enabled",
    "plugins_uninstall",
    "plugins_set_setting",
    "plugins_add_registry",
    "plugins_remove_registry",
    "plugins_available",
    "plugins_install",
    "plugins_check_updates",
    "plugins_add_dev",
    "plugins_set_update_interval",
];

fn main() {
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(APP_COMMANDS)),
    )
    .expect("failed to run tauri-build");
}
