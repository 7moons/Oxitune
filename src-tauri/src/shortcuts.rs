//! Global shortcuts: one per player action, set by the user in Settings and
//! stored in `AppConfig::shortcuts` as accelerator strings
//! (`"MediaPlayPause"`, `"Control+Alt+ArrowRight"`, ...). A press emits
//! `global-shortcut-event` with the action, which the YTM page runs like any
//! other player command.

use std::collections::BTreeMap;
use tauri::{AppHandle, Emitter};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

/// Actions a shortcut can trigger, with their default key. The names are
/// the YTM page's player commands (`handlePlayerCommand` in
/// src/preload/index.ts). Play/pause used to emit `play-pause`, which the
/// page doesn't know, so the Play/Pause media key did nothing.
pub const ACTIONS: &[(&str, &str)] = &[
    ("play_pause", "MediaPlayPause"),
    ("next", "MediaTrackNext"),
    ("previous", "MediaTrackPrevious"),
    ("like", ""),
    ("dislike", ""),
    ("mute", ""),
];

/// i18n keys (`src/ui/i18n.ts`) for the errors Settings explains.
const ERR_INVALID: &str = "settings.shortcuts.invalid";
const ERR_DUPLICATE: &str = "settings.shortcuts.duplicate";
const ERR_TAKEN: &str = "settings.shortcuts.taken";
const ERR_UNKNOWN_ACTION: &str = "settings.shortcuts.unknownAction";

pub fn default_shortcuts() -> BTreeMap<String, String> {
    ACTIONS.iter().map(|(a, k)| (a.to_string(), k.to_string())).collect()
}

/// A shortcut is either a media key or a combination with a modifier: a
/// bare letter bound globally would stop that letter from typing anywhere.
fn parse(accelerator: &str) -> Result<Shortcut, String> {
    let shortcut = accelerator.parse::<Shortcut>().map_err(|_| ERR_INVALID.to_string())?;
    let is_media = accelerator.starts_with("Media") || accelerator.starts_with("AudioVolume");
    let is_function_key = accelerator
        .strip_prefix('F')
        .is_some_and(|n| n.parse::<u8>().is_ok_and(|n| (1..=24).contains(&n)));
    if shortcut.mods.is_empty() && !is_media && !is_function_key {
        return Err(ERR_INVALID.to_string());
    }
    Ok(shortcut)
}

/// The map with `action` set to `accelerator`, if that's allowed: a known
/// action, a valid shortcut (or empty to clear), not already used by
/// another action.
pub fn with_shortcut(
    current: &BTreeMap<String, String>,
    action: &str,
    accelerator: &str,
) -> Result<BTreeMap<String, String>, String> {
    if !ACTIONS.iter().any(|(a, _)| *a == action) {
        return Err(ERR_UNKNOWN_ACTION.to_string());
    }
    let accelerator = accelerator.trim();
    if !accelerator.is_empty() {
        let wanted = parse(accelerator)?;
        let clash = current
            .iter()
            .filter(|(other, _)| other.as_str() != action)
            .any(|(_, other)| !other.is_empty() && parse(other).is_ok_and(|s| s == wanted));
        if clash {
            return Err(ERR_DUPLICATE.to_string());
        }
    }
    let mut next = current.clone();
    next.insert(action.to_string(), accelerator.to_string());
    Ok(next)
}

/// Replaces every registered shortcut with `shortcuts`. Returns the actions
/// whose shortcut couldn't be registered (invalid, or already owned by
/// another running application at the OS level).
pub fn apply(app: &AppHandle, shortcuts: &BTreeMap<String, String>) -> Vec<String> {
    if let Err(e) = app.global_shortcut().unregister_all() {
        log::warn!("[YTMD Shortcuts] Couldn't clear shortcuts: {e}");
    }
    let mut failed = Vec::new();
    for (action, accelerator) in shortcuts {
        let Some(&(command, _)) = ACTIONS.iter().find(|(a, _)| a == action) else {
            continue;
        };
        if accelerator.is_empty() {
            continue;
        }
        let shortcut = match parse(accelerator) {
            Ok(s) => s,
            Err(_) => {
                log::error!("[YTMD Shortcuts] Invalid shortcut '{accelerator}' for '{action}'");
                failed.push(action.clone());
                continue;
            }
        };
        let handle = app.clone();
        let registered = app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, event| {
            // Fire once per press, not again on release.
            if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                let _ = handle.emit("global-shortcut-event", command);
            }
        });
        if let Err(e) = registered {
            log::warn!(
                "[YTMD Shortcuts] Could not register '{accelerator}' for '{action}': {e} \
                 (likely already bound by another running application)."
            );
            failed.push(action.clone());
        }
    }
    failed
}

/// Sets one shortcut: registers the new set, and if the new shortcut is
/// taken by another application, puts the old set back and says so.
pub fn set_shortcut(
    app: &AppHandle,
    current: &BTreeMap<String, String>,
    action: &str,
    accelerator: &str,
) -> Result<BTreeMap<String, String>, String> {
    let next = with_shortcut(current, action, accelerator)?;
    let failed = apply(app, &next);
    if failed.iter().any(|a| a == action) {
        apply(app, current);
        return Err(ERR_TAKEN.to_string());
    }
    Ok(next)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_shortcuts_parse_and_cover_every_action() {
        let defaults = default_shortcuts();
        assert_eq!(defaults.len(), ACTIONS.len());
        for (action, accel) in &defaults {
            assert!(accel.is_empty() || parse(accel).is_ok(), "{action}: {accel}");
        }
    }

    /// Regression: the default play/pause shortcut emitted `play-pause`,
    /// which the page ignores (it handles `play_pause`).
    #[test]
    fn test_actions_are_page_player_commands() {
        let page = std::fs::read_to_string(concat!(env!("CARGO_MANIFEST_DIR"), "/../src/preload/index.ts")).unwrap();
        for (action, _) in ACTIONS {
            assert!(page.contains(&format!("case '{action}':")), "the page has no `{action}` command");
        }
    }

    #[test]
    fn test_setting_a_shortcut() {
        let defaults = default_shortcuts();
        let next = with_shortcut(&defaults, "like", "Control+Alt+KeyL").unwrap();
        assert_eq!(next["like"], "Control+Alt+KeyL");
        assert_eq!(next["play_pause"], "MediaPlayPause");

        let cleared = with_shortcut(&next, "play_pause", "").unwrap();
        assert_eq!(cleared["play_pause"], "");
    }

    #[test]
    fn test_rejects_bad_duplicate_and_bare_shortcuts() {
        let defaults = default_shortcuts();
        assert_eq!(with_shortcut(&defaults, "like", "NotAKey").err().as_deref(), Some(ERR_INVALID));
        assert_eq!(with_shortcut(&defaults, "like", "KeyL").err().as_deref(), Some(ERR_INVALID), "a bare letter");
        assert!(with_shortcut(&defaults, "like", "F8").is_ok(), "function keys are fine alone");
        assert_eq!(
            with_shortcut(&defaults, "like", "MediaTrackNext").err().as_deref(),
            Some(ERR_DUPLICATE),
            "already the next-track key"
        );
        // Same keys written differently still clash.
        let set = with_shortcut(&defaults, "like", "Control+Shift+KeyL").unwrap();
        assert_eq!(with_shortcut(&set, "dislike", "Shift+Control+KeyL").err().as_deref(), Some(ERR_DUPLICATE));
        assert_eq!(with_shortcut(&defaults, "format_disk", "F9").err().as_deref(), Some(ERR_UNKNOWN_ACTION));
    }
}
