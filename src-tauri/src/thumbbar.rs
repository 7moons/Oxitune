//! Windows taskbar thumbnail buttons: previous / play-pause / next under
//! the main window's taskbar preview (`ITaskbarList3::ThumbBarAddButtons`).
//! Clicks arrive as `WM_COMMAND` + `THBN_CLICKED` on the main window, which
//! is subclassed to catch them and turn them into the same player commands
//! the tray sends. The media overlay and lock screen (SMTC) come from
//! `mpris.rs` (souvlaki's Windows backend). No-op on other platforms.

#[cfg(windows)]
mod imp {
    use parking_lot::Mutex;
    use std::sync::OnceLock;
    use tauri::{AppHandle, Emitter, WebviewWindow};
    use windows::core::w;
    use windows::Win32::Foundation::{HWND, LPARAM, LRESULT, WPARAM};
    use windows::Win32::Graphics::Gdi::{CreateBitmap, DeleteObject, HBITMAP};
    use windows::Win32::System::Com::{CoCreateInstance, CLSCTX_INPROC_SERVER};
    use windows::Win32::UI::Shell::{
        DefSubclassProc, ITaskbarList3, SetWindowSubclass, TaskbarList, THBF_ENABLED, THBN_CLICKED, THB_FLAGS,
        THB_ICON, THB_TOOLTIP, THUMBBUTTON,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        CreateIconIndirect, RegisterWindowMessageW, HICON, ICONINFO, WM_COMMAND,
    };

    const ID_PREV: u32 = 1;
    const ID_PLAY: u32 = 2;
    const ID_NEXT: u32 = 3;
    const SUBCLASS_ID: usize = 0x5954_4d44; // "Oscilla"
    const SIZE: i32 = 16;

    struct State {
        app: AppHandle,
        hwnd: isize,
        added: bool,
        playing: bool,
    }

    static STATE: OnceLock<Mutex<State>> = OnceLock::new();
    static TASKBAR_CREATED: OnceLock<u32> = OnceLock::new();

    #[derive(Clone, Copy)]
    enum Glyph {
        Previous,
        Play,
        Pause,
        Next,
    }

    /// A white glyph on transparent, drawn in code so no icon files ship.
    fn glyph_pixels(glyph: Glyph) -> Vec<u8> {
        let mut px = vec![0u8; (SIZE * SIZE * 4) as usize];
        let mut set = |x: i32, y: i32| {
            if (0..SIZE).contains(&x) && (0..SIZE).contains(&y) {
                let i = ((y * SIZE + x) * 4) as usize;
                px[i..i + 4].copy_from_slice(&[255, 255, 255, 255]); // BGRA white
            }
        };
        // A triangle over rows 3..=12 pointing right (or left) from column
        // `x0`: 2 px wide at the top and bottom rows, 10 px in the middle.
        let triangle = |set: &mut dyn FnMut(i32, i32), x0: i32, left: bool| {
            for y in 3..=12 {
                let width = 2 * (y - 3).min(12 - y) + 2;
                for dx in 0..width {
                    set(if left { x0 - dx } else { x0 + dx }, y);
                }
            }
        };
        match glyph {
            Glyph::Play => triangle(&mut set, 5, false),
            Glyph::Pause => {
                for y in 3..=12 {
                    for x in [4, 5, 6, 9, 10, 11] {
                        set(x, y);
                    }
                }
            }
            Glyph::Next => {
                triangle(&mut set, 3, false);
                for y in 3..=12 {
                    set(11, y);
                    set(12, y);
                }
            }
            Glyph::Previous => {
                triangle(&mut set, 12, true);
                for y in 3..=12 {
                    set(3, y);
                    set(4, y);
                }
            }
        }
        px
    }

    fn make_icon(glyph: Glyph) -> Option<HICON> {
        let color = glyph_pixels(glyph);
        let mask = vec![0u8; (SIZE * SIZE / 8) as usize];
        // SAFETY: both buffers match the bitmap sizes passed; the bitmaps are
        // copied into the icon and deleted right after.
        unsafe {
            let color_bmp: HBITMAP = CreateBitmap(SIZE, SIZE, 1, 32, Some(color.as_ptr().cast()));
            let mask_bmp: HBITMAP = CreateBitmap(SIZE, SIZE, 1, 1, Some(mask.as_ptr().cast()));
            let info = ICONINFO { fIcon: true.into(), xHotspot: 0, yHotspot: 0, hbmMask: mask_bmp, hbmColor: color_bmp };
            let icon = CreateIconIndirect(&info).ok();
            let _ = DeleteObject(color_bmp.into());
            let _ = DeleteObject(mask_bmp.into());
            icon
        }
    }

    fn tip(text: &str) -> [u16; 260] {
        let mut out = [0u16; 260];
        for (slot, unit) in out.iter_mut().zip(text.encode_utf16().take(259)) {
            *slot = unit;
        }
        out
    }

    fn buttons(playing: bool) -> Vec<THUMBBUTTON> {
        use crate::i18n::{t, Text};
        let make = |id: u32, glyph: Glyph, text: &str| THUMBBUTTON {
            dwMask: THB_ICON | THB_TOOLTIP | THB_FLAGS,
            iId: id,
            iBitmap: 0,
            hIcon: make_icon(glyph).unwrap_or_default(),
            szTip: tip(text),
            dwFlags: THBF_ENABLED,
        };
        vec![
            make(ID_PREV, Glyph::Previous, t(Text::TrayPrevious)),
            make(ID_PLAY, if playing { Glyph::Pause } else { Glyph::Play }, t(Text::TrayPlayPause)),
            make(ID_NEXT, Glyph::Next, t(Text::TrayNext)),
        ]
    }

    fn taskbar() -> Option<ITaskbarList3> {
        // SAFETY: COM is initialized on the UI thread by the webview.
        unsafe {
            let list: ITaskbarList3 = CoCreateInstance(&TaskbarList, None, CLSCTX_INPROC_SERVER).ok()?;
            list.HrInit().ok()?;
            Some(list)
        }
    }

    /// (Re)creates or updates the buttons; must run on the UI thread.
    fn refresh(state: &mut State) {
        let Some(list) = taskbar() else { return };
        let hwnd = HWND(state.hwnd as *mut _);
        let buttons = buttons(state.playing);
        // SAFETY: `hwnd` is the live main window; the button array outlives
        // the call.
        let result = unsafe {
            if state.added {
                list.ThumbBarUpdateButtons(hwnd, &buttons)
            } else {
                list.ThumbBarAddButtons(hwnd, &buttons)
            }
        };
        match result {
            Ok(()) => state.added = true,
            Err(e) => log::debug!("[Oscilla] thumbnail buttons: {e}"),
        }
    }

    unsafe extern "system" fn subclass_proc(
        hwnd: HWND,
        msg: u32,
        wparam: WPARAM,
        lparam: LPARAM,
        _id: usize,
        _data: usize,
    ) -> LRESULT {
        if msg == WM_COMMAND && ((wparam.0 >> 16) & 0xffff) as u32 == THBN_CLICKED {
            let command = match (wparam.0 & 0xffff) as u32 {
                ID_PREV => Some("previous"),
                ID_PLAY => Some("play_pause"),
                ID_NEXT => Some("next"),
                _ => None,
            };
            if let (Some(command), Some(state)) = (command, STATE.get()) {
                let _ = state.lock().app.emit("tray-command", command);
                return LRESULT(0);
            }
        }
        // Explorer restarted: the taskbar button is new, add ours again.
        if Some(&msg) == TASKBAR_CREATED.get() {
            if let Some(state) = STATE.get() {
                let mut s = state.lock();
                s.added = false;
                refresh(&mut s);
            }
        }
        DefSubclassProc(hwnd, msg, wparam, lparam)
    }

    pub fn install(app: &AppHandle, window: &WebviewWindow) {
        let Ok(hwnd) = window.hwnd() else { return };
        // SAFETY: a static wide string; the subclass proc lives for the
        // whole process and only reads the global state.
        unsafe {
            let _ = TASKBAR_CREATED.set(RegisterWindowMessageW(w!("TaskbarButtonCreated")));
            let _ = SetWindowSubclass(hwnd, Some(subclass_proc), SUBCLASS_ID, 0);
        }
        let _ = STATE.set(Mutex::new(State { app: app.clone(), hwnd: hwnd.0 as isize, added: false, playing: false }));
        let _ = app.run_on_main_thread(|| {
            if let Some(state) = STATE.get() {
                refresh(&mut state.lock());
            }
        });
    }

    pub fn set_playing(app: &AppHandle, playing: bool) {
        let Some(state) = STATE.get() else { return };
        if state.lock().playing == playing {
            return;
        }
        state.lock().playing = playing;
        let _ = app.run_on_main_thread(|| {
            if let Some(state) = STATE.get() {
                refresh(&mut state.lock());
            }
        });
    }
}

#[cfg(windows)]
pub use imp::{install, set_playing};

#[cfg(not(windows))]
pub fn install(_app: &tauri::AppHandle, _window: &tauri::WebviewWindow) {}

#[cfg(not(windows))]
pub fn set_playing(_app: &tauri::AppHandle, _playing: bool) {}
