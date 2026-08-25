use tauri::{AppHandle, Emitter};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

pub fn setup_shortcuts(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let shortcuts_manager = app.global_shortcut();

    // Default global shortcuts
    let play_pause_shortcut = "MediaPlayPause".parse::<Shortcut>();
    let next_shortcut = "MediaTrackNext".parse::<Shortcut>();
    let prev_shortcut = "MediaTrackPrevious".parse::<Shortcut>();

    if let Ok(sc) = play_pause_shortcut {
        let app_handle = app.clone();
        let _ = shortcuts_manager.on_shortcut(sc, move |_app, _shortcut, _event| {
            let _ = app_handle.emit("global-shortcut-event", "play-pause");
        });
    }

    if let Ok(sc) = next_shortcut {
        let app_handle = app.clone();
        let _ = shortcuts_manager.on_shortcut(sc, move |_app, _shortcut, _event| {
            let _ = app_handle.emit("global-shortcut-event", "next");
        });
    }

    if let Ok(sc) = prev_shortcut {
        let app_handle = app.clone();
        let _ = shortcuts_manager.on_shortcut(sc, move |_app, _shortcut, _event| {
            let _ = app_handle.emit("global-shortcut-event", "previous");
        });
    }

    Ok(())
}
