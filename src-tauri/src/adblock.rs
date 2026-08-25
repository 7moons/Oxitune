//! Network-level ad blocking for the main window's WebView2 instance.
//!
//! The old approach detected ads by polling the DOM for `.ad-showing` classes
//! and then muting/fast-forwarding the `<video>` element. That can never be
//! truly invisible: there's always a window — at best one polling interval,
//! in practice often longer — between an ad actually starting and our JS
//! noticing and reacting, during which the user hears or sees it.
//!
//! The only way to make ad blocking actually invisible is to stop the ad
//! request from ever completing, so YouTube Music's own player never
//! receives ad creative and simply proceeds straight to content — the same
//! technique real content blockers use. WebView2 exposes exactly this via
//! `ICoreWebView2::add_WebResourceRequested`, which fires for every network
//! request the webview makes (any origin, any frame) before it hits the
//! network, and lets us hand back a synthetic response instead of letting it
//! through.
//!
//! This intentionally does NOT touch `googlevideo.com` — that's where real
//! song audio/video streams from too, so blocking it would break playback.
//! Blocking the ad *decision*/tracking endpoints (doubleclick, googlesyndication,
//! etc.) is enough: when that request fails, YouTube's ad SDK treats it as
//! "no ad available" and skips the ad slot without ever requesting ad media.
//!
//! A lighter DOM-level cleanup (dismissing promo banners, clicking any skip
//! button that still appears) stays in the JS plugin as a backstop for
//! whatever isn't covered by network blocking, but this is now the primary
//! mechanism.

use tauri::WebviewWindow;
use webview2_com::Microsoft::Web::WebView2::Win32::COREWEBVIEW2_WEB_RESOURCE_CONTEXT_ALL;
use webview2_com::{take_pwstr, WebResourceRequestedEventHandler};
use windows::core::{w, PWSTR};

const BLOCKED_URL_FRAGMENTS: &[&str] = &[
    "doubleclick.net",
    "googlesyndication.com",
    "googleadservices.com",
    "amazon-adsystem.com",
    "adservice.google.",
    // Google's IMA SDK — the actual video-ad tag/VAST/VMAP request endpoint.
    "imasdk.googleapis.com",
    "2mdn.net",
    "googletagservices.com",
];

fn is_ad_request(uri: &str) -> bool {
    let uri = uri.to_ascii_lowercase();
    BLOCKED_URL_FRAGMENTS.iter().any(|frag| uri.contains(frag))
}

/// Headers sent with synthetic adblock responses to satisfy browser CORS checks
/// and prevent ERR_FAILED / CORS policy violations in the webview console.
/// Note: Must specify exact origin (not wildcard '*') and Allow-Credentials
/// because YouTube's Polymer scripts send credentialed (withCredentials=true)
/// requests to endpoints like googleads.g.doubleclick.net/pagead/id.
const CORS_RESPONSE_HEADERS: windows::core::PCWSTR =
    w!("Access-Control-Allow-Origin: https://music.youtube.com\r\nAccess-Control-Allow-Credentials: true\r\nAccess-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE\r\nAccess-Control-Allow-Headers: *\r\nContent-Type: text/plain\r\n");

/// Registers the request filter on the given window's live WebView2 instance.
/// Must be called after the webview has been created (e.g. once
/// `WebviewWindowBuilder::build()` has returned for it), since it needs the
/// real `ICoreWebView2`, not just the pending window configuration.
pub fn install(window: &WebviewWindow) {
    let result = window.with_webview(|webview| {
        let controller = webview.controller();
        let environment = webview.environment();

        let core_webview = match unsafe { controller.CoreWebView2() } {
            Ok(cw) => cw,
            Err(e) => {
                log::warn!("[YTMD Adblock] Failed to get ICoreWebView2: {e}");
                return;
            }
        };

        if let Err(e) =
            unsafe { core_webview.AddWebResourceRequestedFilter(w!("*"), COREWEBVIEW2_WEB_RESOURCE_CONTEXT_ALL) }
        {
            log::warn!("[YTMD Adblock] Failed to register resource filter: {e}");
            return;
        }

        let handler = WebResourceRequestedEventHandler::create(Box::new(move |_sender, args| {
            let Some(args) = args else {
                return Ok(());
            };
            let request = unsafe { args.Request()? };

            let mut uri_ptr = PWSTR::null();
            unsafe { request.Uri(&mut uri_ptr)? };
            let uri = take_pwstr(uri_ptr);

            if is_ad_request(&uri) {
                if let Ok(response) = unsafe {
                    environment.CreateWebResourceResponse(None, 204, w!("No Content"), CORS_RESPONSE_HEADERS)
                } {
                    let _ = unsafe { args.SetResponse(&response) };
                }
            }

            Ok(())
        }));

        let mut token = 0i64;
        if let Err(e) = unsafe { core_webview.add_WebResourceRequested(&handler, &mut token) } {
            log::warn!("[YTMD Adblock] Failed to attach WebResourceRequested handler: {e}");
        } else {
            log::info!("[YTMD Adblock] Network-level ad request blocking active with CORS support.");
        }
    });

    if let Err(e) = result {
        log::warn!("[YTMD Adblock] Could not access the native webview: {e}");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn blocks_known_ad_domains() {
        assert!(is_ad_request(
            "https://securepubads.g.doubleclick.net/gampad/ads?foo=bar"
        ));
        assert!(is_ad_request(
            "https://tpc.googlesyndication.com/simgad/12345"
        ));
        assert!(is_ad_request(
            "HTTPS://WWW.GOOGLEADSERVICES.COM/PAGEAD/CONVERSION"
        ));
        assert!(is_ad_request(
            "https://imasdk.googleapis.com/js/sdkloader/ima3.js"
        ));
        assert!(is_ad_request(
            "https://pubads.g.doubleclick.net/gampad/ads?iu=/1234/music"
        ));
    }

    #[test]
    fn never_blocks_real_content_or_api_traffic() {
        assert!(!is_ad_request(
            "https://rr3---sn-abc.googlevideo.com/videoplayback?id=xyz"
        ));
        assert!(!is_ad_request("https://music.youtube.com/youtubei/v1/next"));
        assert!(!is_ad_request("https://music.youtube.com/youtubei/v1/player"));
        assert!(!is_ad_request(
            "https://music.youtube.com/watch?v=urK0CosVqdM"
        ));
        assert!(!is_ad_request("https://music.youtube.com/ptracking?html5=1&video_id=abc&pltype=content"));
        assert!(!is_ad_request("https://music.youtube.com/api/stats/atr?ns=yt&el=detailpage"));
        assert!(!is_ad_request("https://sponsor.ajay.app/api/skipSegments"));
    }
}
