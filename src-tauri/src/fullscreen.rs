//! Fullscreen over the whole monitor on Windows.
//!
//! YTM's fullscreen player makes the main window fullscreen (Tauri for the
//! Fullscreen API, the page bridge's `enter_fullscreen` for YTM's attribute),
//! but the window stays maximized, and tao sizes a maximized undecorated
//! window's client area to the monitor's work area in `WM_NCCALCSIZE`, even
//! when the window covers the whole monitor: the webview stopped where the
//! taskbar begins and a black band showed there. Leaving maximized for the
//! fullscreen instead made the way back shrink the window and animate it
//! maximized again. So the main window is subclassed (ahead of tao's own
//! subclass): a maximized window whose proposed rect is exactly its
//! monitor's is fullscreen, and gets that whole rect as client area. Any
//! other size goes on to tao unchanged. No-op on other platforms.

#[cfg(windows)]
mod imp {
    use tauri::WebviewWindow;
    use windows::Win32::Foundation::{HWND, LPARAM, LRESULT, RECT, WPARAM};
    use windows::Win32::Graphics::Gdi::{GetMonitorInfoW, MonitorFromRect, MONITORINFO, MONITOR_DEFAULTTONULL};
    use windows::Win32::UI::Shell::{DefSubclassProc, SetWindowSubclass};
    use windows::Win32::UI::WindowsAndMessaging::{IsZoomed, NCCALCSIZE_PARAMS, WM_NCCALCSIZE};

    const SUBCLASS_ID: usize = 0x4f53_4653; // "OSFS"

    fn same(a: &RECT, b: &RECT) -> bool {
        a.left == b.left && a.top == b.top && a.right == b.right && a.bottom == b.bottom
    }

    unsafe extern "system" fn subclass_proc(
        hwnd: HWND,
        msg: u32,
        wparam: WPARAM,
        lparam: LPARAM,
        _id: usize,
        _data: usize,
    ) -> LRESULT {
        if msg == WM_NCCALCSIZE && wparam.0 != 0 && IsZoomed(hwnd).as_bool() {
            // SAFETY: with wparam TRUE, lparam points at the NCCALCSIZE_PARAMS
            // Windows passes for this message.
            let params = &*(lparam.0 as *const NCCALCSIZE_PARAMS);
            let proposed = params.rgrc[0];
            let monitor = MonitorFromRect(&proposed, MONITOR_DEFAULTTONULL);
            let mut info = MONITORINFO { cbSize: std::mem::size_of::<MONITORINFO>() as u32, ..Default::default() };
            if !monitor.is_invalid() && GetMonitorInfoW(monitor, &mut info).as_bool() && same(&proposed, &info.rcMonitor) {
                // The client area is the whole proposed window rect.
                return LRESULT(0);
            }
        }
        DefSubclassProc(hwnd, msg, wparam, lparam)
    }

    pub fn install(window: &WebviewWindow) {
        let Ok(hwnd) = window.hwnd() else { return };
        // SAFETY: the subclass proc is a plain function with no state and
        // lives for the whole process.
        unsafe {
            let _ = SetWindowSubclass(hwnd, Some(subclass_proc), SUBCLASS_ID, 0);
        }
    }
}

#[cfg(windows)]
pub use imp::install;

#[cfg(not(windows))]
pub fn install(_window: &tauri::WebviewWindow) {}
