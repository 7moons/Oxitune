//! The capability files (`capabilities/*.json`) as Tauri enforces them,
//! checked with the mock runtime: the same ACL the real app resolves, with
//! requests coming from the real origins.
//!
//! No command handlers are registered here, so a request the ACL lets
//! through fails with "not found" (or "invalid args" for a plugin command
//! called without arguments), and one it refuses with "not allowed".

use tauri::ipc::{CallbackFn, InvokeBody};
use tauri::test::{get_ipc_response, mock_builder, MockRuntime, INVOKE_KEY};
use tauri::webview::InvokeRequest;
use tauri::{WebviewUrl, WebviewWindow, WebviewWindowBuilder};

fn app() -> tauri::App<MockRuntime> {
    mock_builder().build(tauri::generate_context!()).expect("mock app")
}

fn window(app: &tauri::App<MockRuntime>, label: &str, url: &str) -> WebviewWindow<MockRuntime> {
    WebviewWindowBuilder::new(app, label, WebviewUrl::External(url.parse().unwrap())).build().unwrap()
}

/// A companion window as `tauri.conf.json` declares it: a local page.
fn local_window(app: &tauri::App<MockRuntime>, label: &str) -> WebviewWindow<MockRuntime> {
    WebviewWindowBuilder::new(app, label, WebviewUrl::App(format!("{label}.html").into())).build().unwrap()
}

/// `Ok` if the ACL let `cmd` through for `win` at `url`, `Err` with the
/// refusal otherwise.
fn acl(win: &WebviewWindow<MockRuntime>, url: &str, cmd: &str) -> Result<(), String> {
    let res = get_ipc_response(
        win,
        InvokeRequest {
            cmd: cmd.into(),
            callback: CallbackFn(0),
            error: CallbackFn(1),
            url: url.parse().unwrap(),
            body: InvokeBody::default(),
            headers: Default::default(),
            invoke_key: INVOKE_KEY.to_string(),
        },
    );
    match res {
        Ok(_) => Ok(()),
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("not found") || msg.contains("invalid args") {
                Ok(())
            } else {
                Err(msg)
            }
        }
    }
}

const YTM: &str = "https://music.youtube.com/watch?v=AAAAAAAAAA1";
// Where Tauri serves local pages: `tauri://localhost` on Linux/macOS,
// `http://tauri.localhost` on Windows.
#[cfg(not(windows))]
const LOCAL: &str = "tauri://localhost/settings.html";
#[cfg(windows)]
const LOCAL: &str = "http://tauri.localhost/settings.html";
#[cfg(not(windows))]
const OFFLINE: &str = "tauri://localhost/offline.html";
#[cfg(windows)]
const OFFLINE: &str = "http://tauri.localhost/offline.html";

#[test]
fn test_youtube_music_reaches_only_the_bridge() {
    let app = app();
    let main = window(&app, "main", YTM);
    assert_eq!(acl(&main, YTM, "oxitune_bridge"), Ok(()));
    assert_eq!(acl(&main, YTM, "oxitune_subscribe"), Ok(()));
    for cmd in [
        "get_config",
        "save_config",
        "scan_local_music",
        "import_settings",
        "install_update",
        "get_remote_info",
        "create_sync_room",
        "plugin:event|emit",
        "plugin:event|listen",
        "plugin:window|close",
        "plugin:webview|create_webview_window",
        "plugin:opener|open_url",
        "plugin:dialog|open",
        "plugins_install",
        "plugins_add_registry",
        "plugins_add_dev",
        "restart_app",
    ] {
        assert!(acl(&main, YTM, cmd).is_err(), "music.youtube.com must not reach {cmd}");
    }
}

#[test]
fn test_other_origins_in_the_main_window_reach_nothing() {
    let app = app();
    let main = window(&app, "main", YTM);
    for url in ["https://evil.example/", "https://www.youtube.com/", "http://127.0.0.1:9863/", "https://accounts.google.com/"] {
        assert!(acl(&main, url, "oxitune_bridge").is_err(), "{url}");
    }
}

#[test]
fn test_companion_windows_get_only_their_own_commands() {
    let app = app();
    let settings = local_window(&app, "settings");
    let sync = local_window(&app, "sync");
    let mini = local_window(&app, "miniplayer");

    assert_eq!(acl(&settings, LOCAL, "save_config"), Ok(()));
    assert_eq!(acl(&settings, LOCAL, "plugins_install"), Ok(()));
    assert!(acl(&sync, LOCAL, "plugins_install").is_err(), "only Settings manages plugins");
    assert_eq!(acl(&settings, LOCAL, "plugin:event|emit"), Ok(()));
    assert!(acl(&settings, LOCAL, "oxitune_bridge").is_err(), "the page bridge is for the main window only");
    assert!(acl(&settings, LOCAL, "create_sync_room").is_err());

    assert_eq!(acl(&sync, LOCAL, "create_sync_room"), Ok(()));
    assert!(acl(&sync, LOCAL, "save_config").is_err());

    assert_eq!(acl(&mini, LOCAL, "get_current_lyrics"), Ok(()));
    assert!(acl(&mini, LOCAL, "scan_local_music").is_err());
    assert!(acl(&mini, LOCAL, "install_update").is_err());
}

#[test]
fn test_welcome_window_reaches_only_the_settings_it_asks_about() {
    let app = app();
    let welcome = local_window(&app, "welcome");
    for cmd in ["get_config", "save_config", "finish_onboarding", "close_window"] {
        assert_eq!(acl(&welcome, LOCAL, cmd), Ok(()), "{cmd}");
    }
    for cmd in ["oxitune_bridge", "import_settings", "plugins_install", "get_remote_info", "create_sync_room", "install_update"] {
        assert!(acl(&welcome, LOCAL, cmd).is_err(), "welcome must not reach {cmd}");
    }
    let settings = local_window(&app, "settings");
    assert_eq!(acl(&settings, LOCAL, "open_welcome_window"), Ok(()), "Run setup again");
    assert!(acl(&settings, LOCAL, "finish_onboarding").is_err());
    let main = window(&app, "main", YTM);
    assert!(acl(&main, YTM, "finish_onboarding").is_err(), "the page can't mark it done");
}

#[test]
fn test_a_remote_page_in_a_companion_window_gets_nothing() {
    let app = app();
    let settings = local_window(&app, "settings");
    assert!(acl(&settings, YTM, "save_config").is_err());
    assert!(acl(&settings, "https://evil.example/", "save_config").is_err());
}


#[test]
fn test_offline_screen_can_only_retry() {
    let app = app();
    let main = window(&app, "main", YTM);
    let offline = OFFLINE;
    assert_eq!(acl(&main, offline, "retry_connection"), Ok(()));
    for cmd in ["oxitune_bridge", "get_config", "save_config", "plugin:event|emit"] {
        assert!(acl(&main, offline, cmd).is_err(), "offline page must not reach {cmd}");
    }
    assert!(acl(&main, YTM, "retry_connection").is_err(), "YouTube Music can't call it");
    let settings = local_window(&app, "settings");
    assert!(acl(&settings, LOCAL, "retry_connection").is_err());
}
