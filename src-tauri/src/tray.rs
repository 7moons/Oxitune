use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};

pub fn setup_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let play_pause_i = MenuItem::with_id(app, "play_pause", "Play / Pause", true, None::<&str>)?;
    let next_i = MenuItem::with_id(app, "next", "Next Track", true, None::<&str>)?;
    let prev_i = MenuItem::with_id(app, "prev", "Previous Track", true, None::<&str>)?;
    let sep1 = MenuItem::with_id(app, "sep1", "---", false, None::<&str>)?;
    let miniplayer_i = MenuItem::with_id(app, "miniplayer", "Toggle Mini Player", true, None::<&str>)?;
    let settings_i = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let sep2 = MenuItem::with_id(app, "sep2", "---", false, None::<&str>)?;
    let show_hide_i = MenuItem::with_id(app, "show_hide", "Show / Hide", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[
            &play_pause_i,
            &next_i,
            &prev_i,
            &sep1,
            &miniplayer_i,
            &settings_i,
            &sep2,
            &show_hide_i,
            &quit_i,
        ],
    )?;

    let mut tray_builder = TrayIconBuilder::with_id("main-tray")
        .menu(&menu)
        .tooltip("YTMD")
        .show_menu_on_left_click(false);

    if let Ok(icon) = tauri::image::Image::from_bytes(include_bytes!("../icons/icon.png")) {
        tray_builder = tray_builder.icon(icon);
    } else if let Some(icon) = app.default_window_icon() {
        tray_builder = tray_builder.icon(icon.clone());
    }

    let tray_builder = tray_builder
        .on_menu_event(move |app_handle, event| match event.id.as_ref() {
            "play_pause" => {
                let _ = app_handle.emit("tray-command", "play-pause");
            }
            "next" => {
                let _ = app_handle.emit("tray-command", "next");
            }
            "prev" => {
                let _ = app_handle.emit("tray-command", "previous");
            }
            "miniplayer" => {
                if let Some(mini_win) = app_handle.get_webview_window("miniplayer") {
                    if let Ok(visible) = mini_win.is_visible() {
                        if visible {
                            let _ = mini_win.hide();
                        } else {
                            let _ = mini_win.show();
                            let _ = mini_win.set_focus();
                        }
                    }
                }
            }
            "settings" => {
                if let Some(settings_win) = app_handle.get_webview_window("settings") {
                    let _ = settings_win.show();
                    let _ = settings_win.set_focus();
                }
            }
            "show_hide" => {
                if let Some(main_win) = app_handle.get_webview_window("main") {
                    if let Ok(visible) = main_win.is_visible() {
                        if visible {
                            let _ = main_win.hide();
                        } else {
                            let _ = main_win.show();
                            let _ = main_win.set_focus();
                        }
                    }
                }
            }
            "quit" => {
                app_handle.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(main_win) = app.get_webview_window("main") {
                    if let Ok(visible) = main_win.is_visible() {
                        if visible {
                            let _ = main_win.hide();
                        } else {
                            let _ = main_win.show();
                            let _ = main_win.set_focus();
                        }
                    }
                }
            }
        });

    let _ = tray_builder.build(app)?;

    Ok(())
}
