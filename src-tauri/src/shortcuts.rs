use tauri::{AppHandle, Emitter};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

pub fn setup_shortcuts(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    register_shortcut(app, "MediaPlayPause", "play-pause");
    register_shortcut(app, "MediaTrackNext", "next");
    register_shortcut(app, "MediaTrackPrevious", "previous");

    Ok(())
}

/// Parses and registers one global media-key shortcut, wiring it to emit
/// `global-shortcut-event` with `command` when pressed.
///
/// Both the parse and the registration can fail, and previously both
/// failures were swallowed with `let _ = ...`/`if let Ok(...)`, silently
/// doing nothing. Registration commonly fails because another running
/// application (a different media player, the desktop environment's own
/// media-key handling, etc.) already owns that global shortcut at the OS
/// level — not a crash, but it silently breaks media-key control with zero
/// way to diagnose it from a bug report unless it's logged.
fn register_shortcut(app: &AppHandle, shortcut_str: &str, command: &'static str) {
    let shortcut = match shortcut_str.parse::<Shortcut>() {
        Ok(sc) => sc,
        Err(e) => {
            log::error!("[YTMD Shortcuts] Failed to parse shortcut '{shortcut_str}': {e}");
            return;
        }
    };

    let app_handle = app.clone();
    if let Err(e) = app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, _event| {
        let _ = app_handle.emit("global-shortcut-event", command);
    }) {
        log::warn!(
            "[YTMD Shortcuts] Could not register global shortcut '{shortcut_str}' for '{command}': {e} \
             (likely already bound by another running application)."
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_media_shortcuts_parse_successfully() {
        // Locks in that the hardcoded shortcut strings setup_shortcuts()
        // depends on remain valid `Shortcut` syntax for this version of
        // tauri-plugin-global-shortcut — a typo here would previously fail
        // completely silently (see register_shortcut's error logging).
        assert!("MediaPlayPause".parse::<Shortcut>().is_ok());
        assert!("MediaTrackNext".parse::<Shortcut>().is_ok());
        assert!("MediaTrackPrevious".parse::<Shortcut>().is_ok());
    }

    #[test]
    fn test_unparseable_shortcut_string_is_rejected_not_panicking() {
        assert!("NotARealShortcutName".parse::<Shortcut>().is_err());
    }
}
