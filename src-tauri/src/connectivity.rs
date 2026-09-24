//! The offline screen: when YouTube Music can't be reached at startup, the
//! main window shows `offline.html` (a local page whose capability allows
//! only `retry_connection`) instead of a blank or browser error page, and
//! goes back to YouTube Music once it answers.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Manager};

pub const OFFLINE_PAGE: &str = "offline.html";
const CHECK_TIMEOUT: Duration = Duration::from_secs(6);
/// How long the page gets to report in before a failed check counts: some
/// networks (PAC proxies, captive portals) let the webview through where
/// our own request fails, so the check alone never decides.
const PAGE_GRACE: Duration = Duration::from_secs(8);

/// Set once the injected script has talked to us: YouTube Music loaded.
#[derive(Default)]
pub struct PageAlive(AtomicBool);

impl PageAlive {
    pub fn mark(&self) {
        self.0.store(true, Ordering::SeqCst);
    }

    pub fn is_alive(&self) -> bool {
        self.0.load(Ordering::SeqCst)
    }

    pub fn reset(&self) {
        self.0.store(false, Ordering::SeqCst);
    }
}

/// Whether music.youtube.com answers at all (any HTTP status). One client
/// for every check: building one loads the TLS roots, which isn't free.
pub async fn youtube_music_reachable() -> bool {
    static CLIENT: std::sync::OnceLock<Option<reqwest::Client>> = std::sync::OnceLock::new();
    let Some(client) = CLIENT.get_or_init(|| reqwest::Client::builder().timeout(CHECK_TIMEOUT).build().ok()) else {
        return false;
    };
    client.head("https://music.youtube.com/").send().await.is_ok()
}

/// The app's own URL for a bundled page, as the main window loads it.
pub fn app_page_url(app: &AppHandle, page: &str) -> Option<url::Url> {
    if tauri::is_dev() {
        return app.config().build.dev_url.as_ref().and_then(|u| u.join(page).ok());
    }
    let base = if cfg!(windows) { "http://tauri.localhost/" } else { "tauri://localhost/" };
    url::Url::parse(base).ok()?.join(page).ok()
}

/// Whether `url` is our bundled offline page (the only local page the main
/// window may show).
pub fn is_offline_page(url: &url::Url) -> bool {
    let local = matches!(
        (url.scheme(), url.host_str()),
        ("tauri", Some("localhost")) | ("http" | "https", Some("tauri.localhost"))
    ) || (tauri::is_dev() && url.host_str() == Some("127.0.0.1") && url.port() == Some(24681));
    local && url.path() == format!("/{OFFLINE_PAGE}")
}

/// At startup: if YouTube Music can't be reached and the page never came
/// up, show the offline screen.
pub fn watch_startup(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let started = std::time::Instant::now();
        if youtube_music_reachable().await {
            return;
        }
        tokio::time::sleep(PAGE_GRACE.saturating_sub(started.elapsed())).await;
        if app.state::<Arc<PageAlive>>().is_alive() {
            return;
        }
        log::warn!("[Oscilla] YouTube Music unreachable, showing the offline screen");
        if let (Some(win), Some(url)) = (app.get_webview_window("main"), app_page_url(&app, OFFLINE_PAGE)) {
            let _ = win.navigate(url);
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_only_the_bundled_offline_page_counts() {
        for ok in ["tauri://localhost/offline.html", "http://tauri.localhost/offline.html"] {
            assert!(is_offline_page(&url::Url::parse(ok).unwrap()), "{ok}");
        }
        for bad in [
            "tauri://localhost/settings.html",
            "https://evil.example/offline.html",
            "http://tauri.localhost.evil.example/offline.html",
            "file:///offline.html",
        ] {
            assert!(!is_offline_page(&url::Url::parse(bad).unwrap()), "{bad}");
        }
    }
}
