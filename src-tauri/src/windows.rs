//! Companion windows, created when first opened instead of at startup.
//!
//! On WebKitGTK every window is its own web process: four hidden windows
//! created at launch cost ~280 MB (PSS) before the user opened any of them
//! (measured, see AUDIT.md). Settings and the local library are rarely open,
//! so closing them destroys them; the mini player and Listen Together keep
//! running once opened (the mini player is toggled often, the Listen
//! Together window holds the room's approval prompts while hidden).

use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

pub struct WindowSpec {
    pub label: &'static str,
    pub title: &'static str,
    pub page: &'static str,
    pub size: (f64, f64),
    pub min_size: (f64, f64),
    pub always_on_top: bool,
    /// Closing destroys the window (and its web process) instead of hiding.
    pub destroy_on_close: bool,
}

pub const COMPANIONS: &[WindowSpec] = &[
    WindowSpec {
        label: "miniplayer",
        title: "Oscilla Mini Player",
        page: "miniplayer.html",
        size: (320.0, 420.0),
        min_size: (260.0, 320.0),
        always_on_top: true,
        destroy_on_close: false,
    },
    WindowSpec {
        label: "settings",
        title: "Oscilla Preferences",
        page: "settings.html",
        size: (780.0, 640.0),
        min_size: (540.0, 440.0),
        always_on_top: false,
        destroy_on_close: true,
    },
    WindowSpec {
        label: "local",
        title: "Oscilla Local Music Library",
        page: "local.html",
        size: (900.0, 650.0),
        min_size: (600.0, 450.0),
        always_on_top: false,
        destroy_on_close: true,
    },
    WindowSpec {
        label: "sync",
        title: "Oscilla Listen Together",
        page: "sync.html",
        size: (640.0, 520.0),
        min_size: (480.0, 380.0),
        always_on_top: false,
        destroy_on_close: false,
    },
];

pub fn spec(label: &str) -> Option<&'static WindowSpec> {
    COMPANIONS.iter().find(|s| s.label == label)
}

/// The companion window `label`, created (hidden) if it doesn't exist.
/// `fragment` is appended to the page URL on creation (`#sec-remote`), so a
/// window that has to open on a given section doesn't depend on an event
/// arriving after its page loaded.
pub fn ensure(app: &AppHandle, label: &str, fragment: Option<&str>) -> Option<WebviewWindow> {
    if let Some(existing) = app.get_webview_window(label) {
        return Some(existing);
    }
    let spec = spec(label)?;
    let page = match fragment {
        Some(f) => format!("{}#{f}", spec.page),
        None => spec.page.to_string(),
    };
    let mut builder = WebviewWindowBuilder::new(app, spec.label, WebviewUrl::App(page.into()))
        .title(spec.title)
        .inner_size(spec.size.0, spec.size.1)
        .min_inner_size(spec.min_size.0, spec.min_size.1)
        .resizable(true)
        .decorations(false)
        .always_on_top(spec.always_on_top)
        .visible(false);
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone()).ok()?;
    }
    match builder.build() {
        Ok(win) => Some(win),
        Err(e) => {
            log::warn!("[Oscilla] couldn't open the {label} window: {e}");
            None
        }
    }
}

pub fn show(app: &AppHandle, label: &str) {
    if let Some(win) = ensure(app, label, None) {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
    }
}

/// Closes the window if the user can see it, else brings it to the front.
pub fn toggle(app: &AppHandle, label: &str) {
    match app.get_webview_window(label) {
        Some(win) if in_sight(&win) => close(&win),
        _ => show(app, label),
    }
}

/// Whether the window is in front of the user. `is_visible` alone is also
/// true for a minimized window, or one behind the main window, so clicking
/// its menu entry closed it instead of showing it.
fn in_sight(win: &WebviewWindow) -> bool {
    let on_top = spec(win.label()).is_some_and(|s| s.always_on_top);
    should_close(
        win.is_visible().unwrap_or(false),
        win.is_minimized().unwrap_or(false),
        on_top || win.is_focused().unwrap_or(false),
    )
}

/// A window not always on top may sit under the main window, where the
/// toggle is clicked from (so it's never focused then): showing it is the
/// only safe answer. Its own close button closes it.
fn should_close(visible: bool, minimized: bool, in_front: bool) -> bool {
    visible && !minimized && in_front
}

/// Shows Settings on one section (`sec-…` id in settings.html).
pub fn show_settings_section(app: &AppHandle, section: &'static str) {
    if app.get_webview_window("settings").is_some() {
        let _ = app.emit_to("settings", "settings-open-section", section);
        show(app, "settings");
    } else if let Some(win) = ensure(app, "settings", Some(section)) {
        let _ = win.show();
        let _ = win.set_focus();
    }
}

/// Hides or destroys a companion window, per its spec.
pub fn close(win: &WebviewWindow) {
    match spec(win.label()) {
        Some(s) if s.destroy_on_close => {
            let _ = win.destroy();
        }
        _ => {
            let _ = win.hide();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_every_companion_has_a_capability_and_a_page() {
        let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
        for s in COMPANIONS {
            assert!(root.join("..").join(s.page).exists(), "{} page", s.label);
            let caps = std::fs::read_to_string(root.join("capabilities").join(format!("{}.json", s.label)))
                .or_else(|_| std::fs::read_to_string(root.join("capabilities").join("local.json")))
                .unwrap();
            assert!(caps.contains(&format!("\"{}\"", s.label)), "{} capability", s.label);
        }
    }

    // Regression: a minimized Settings was closed by its menu entry instead
    // of being shown, and only the next click brought it up.
    #[test]
    fn test_toggle_closes_only_a_window_in_front() {
        assert!(should_close(true, false, true));
        assert!(!should_close(true, true, true), "minimized: show it");
        assert!(!should_close(true, false, false), "behind another window: show it");
        assert!(!should_close(false, false, true), "hidden: show it");
    }

    #[test]
    fn test_rarely_used_windows_are_destroyed_on_close() {
        assert!(spec("settings").unwrap().destroy_on_close);
        assert!(spec("local").unwrap().destroy_on_close);
        assert!(!spec("miniplayer").unwrap().destroy_on_close);
        assert!(!spec("sync").unwrap().destroy_on_close, "keeps room prompts while hidden");
        assert!(spec("main").is_none());
    }
}
