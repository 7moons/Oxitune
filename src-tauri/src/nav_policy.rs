//! Where the main window may go.
//!
//! The main window is YouTube Music plus the Google sign-in flow; nothing
//! else should ever load in it, so a hijacked link or script can't turn the
//! app window into a convincing phishing page. On WebKitGTK the navigation
//! hook also sees iframe loads, so the allowlist covers the Google/YouTube
//! domains YouTube Music frames itself (sign-in, consent, static files,
//! video, the third-party frames it embeds) rather than only its own host.
//!
//! Pop-ups (`window.open`, `target=_blank`) never open inside the app:
//! web links go to the system browser, everything else is dropped.

use url::Url;

/// Registrable domains (and everything under them) allowed in the main
/// window.
const ALLOWED_SUFFIXES: &[&str] = &[
    "youtube.com",
    "youtube-nocookie.com",
    "youtu.be",
    "ytimg.com",
    "googlevideo.com",
    "ggpht.com",
    "gstatic.com",
    "googleusercontent.com",
    "googleapis.com",
    "googlesyndication.com",
    "googleadservices.com",
    "doubleclick.net",
    "recaptcha.net",
];

fn host_matches(host: &str, suffix: &str) -> bool {
    host == suffix || host.strip_suffix(suffix).is_some_and(|rest| rest.ends_with('.'))
}

/// `google.com`, `google.pl`, `google.co.uk`, `google.com.br` and their
/// subdomains (`accounts.google.com`, `www.google.de`, ...): sign-in sets
/// cookies on the country domain too.
fn is_google_domain(host: &str) -> bool {
    let labels: Vec<&str> = host.split('.').collect();
    let Some(pos) = labels.iter().rposition(|l| *l == "google") else {
        return false;
    };
    let tld = &labels[pos + 1..];
    match tld {
        [one] => (2..=3).contains(&one.len()),
        [second, cc] => matches!(*second, "co" | "com") && cc.len() == 2,
        _ => false,
    }
}

/// Whether the main window may load `url` (top level or, on WebKitGTK, a
/// frame).
pub fn is_allowed_navigation(url: &Url) -> bool {
    match url.scheme() {
        // Frames YouTube Music builds itself.
        "about" | "data" | "blob" => true,
        _ if crate::connectivity::is_offline_page(url) => true,
        "https" => url
            .host_str()
            .map(|h| h.to_ascii_lowercase())
            .is_some_and(|h| is_google_domain(&h) || ALLOWED_SUFFIXES.iter().any(|s| host_matches(&h, s))),
        _ => false,
    }
}

/// Whether a pop-up for `url` should be handed to the system browser.
pub fn opens_in_browser(url: &Url) -> bool {
    matches!(url.scheme(), "https" | "http") && url.host_str().is_some()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn allowed(u: &str) -> bool {
        is_allowed_navigation(&Url::parse(u).unwrap())
    }

    #[test]
    fn test_youtube_music_and_sign_in_are_allowed() {
        for u in [
            "https://music.youtube.com/watch?v=abc",
            "https://www.youtube.com/signin?next=x",
            "https://accounts.google.com/ServiceLogin",
            "https://accounts.youtube.com/accounts/SetSID",
            "https://consent.youtube.com/m",
            "https://www.google.pl/",
            "https://accounts.google.co.uk/",
            "https://www.google.com.br/",
            "https://i.ytimg.com/vi/x/default.jpg",
            "https://tpc.googlesyndication.com/sodar/x.html",
            "about:blank",
        ] {
            assert!(allowed(u), "{u}");
        }
    }

    #[test]
    fn test_everything_else_is_refused() {
        for u in [
            "https://evil.example/",
            "https://music.youtube.com.evil.example/",
            "https://notyoutube.com/",
            "https://google.evil.example/",
            "https://www.google.evil/",
            "https://accounts.google.co.evil/",
            "http://music.youtube.com/",
            "file:///etc/passwd",
            "javascript:alert(1)",
            "ytmd://join/YTMD-X",
            "http://127.0.0.1:9863/",
        ] {
            assert!(!allowed(u), "{u}");
        }
    }

    #[test]
    fn test_only_web_links_open_in_the_browser() {
        assert!(opens_in_browser(&Url::parse("https://example.com/x").unwrap()));
        assert!(opens_in_browser(&Url::parse("http://example.com/").unwrap()));
        assert!(!opens_in_browser(&Url::parse("file:///home/me").unwrap()));
        assert!(!opens_in_browser(&Url::parse("ms-settings:privacy").unwrap()));
        assert!(!opens_in_browser(&Url::parse("javascript:alert(1)").unwrap()));
    }
}
