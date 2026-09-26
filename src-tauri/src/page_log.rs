//! Log lines from the injected YouTube Music page (`page_log` in bridge.rs),
//! written to `~/.oscilla/logs/oscilla.log` next to the backend's own.
//!
//! The page's console is gone once the app closes, and what went wrong in
//! Listen Together (a guest seeking every second, YouTube Music's player
//! stuck at 0:00) only ever showed there. Any script in that page can call
//! the bridge, YouTube's own included, so each line is cleaned (no newlines
//! to forge entries with, bounded length) and the rate is capped; lines over
//! the cap are counted and reported with the next one let through.

use std::sync::Mutex;
use std::time::Instant;

/// Longest message kept, in chars.
const MAX_MESSAGE_CHARS: usize = 600;
/// Longest scope (`sync`, `player`, ...), in chars.
const MAX_SCOPE_CHARS: usize = 24;
/// Lines the page may write in a burst, and lines per second after that.
const BURST: f64 = 40.0;
const PER_SEC: f64 = 2.0;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PageLevel {
    Info,
    Warn,
    Error,
}

impl PageLevel {
    pub fn parse(raw: &str) -> Option<Self> {
        match raw {
            "info" => Some(Self::Info),
            "warn" => Some(Self::Warn),
            "error" => Some(Self::Error),
            _ => None,
        }
    }
}

/// A token bucket: `BURST` lines at once, refilled at `PER_SEC`.
#[derive(Debug)]
pub struct RateLimiter {
    tokens: f64,
    last: Option<Instant>,
    dropped: u32,
}

impl RateLimiter {
    pub const fn new() -> Self {
        Self { tokens: BURST, last: None, dropped: 0 }
    }

    /// `Some(n)` when a line may be written now, `n` being how many were
    /// dropped since the last one written; `None` when it's dropped.
    pub fn admit(&mut self, now: Instant) -> Option<u32> {
        if let Some(last) = self.last {
            let elapsed = now.saturating_duration_since(last).as_secs_f64();
            self.tokens = (self.tokens + elapsed * PER_SEC).min(BURST);
        }
        self.last = Some(now);
        if self.tokens < 1.0 {
            self.dropped = self.dropped.saturating_add(1);
            return None;
        }
        self.tokens -= 1.0;
        Some(std::mem::take(&mut self.dropped))
    }
}

impl Default for RateLimiter {
    fn default() -> Self {
        Self::new()
    }
}

static LIMITER: Mutex<RateLimiter> = Mutex::new(RateLimiter::new());

/// `sync`, `player`: letters, digits, `-` and `_` only; anything else is `page`.
fn clean_scope(raw: &str) -> &str {
    let ok = !raw.is_empty()
        && raw.chars().count() <= MAX_SCOPE_CHARS
        && raw.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_');
    if ok {
        raw
    } else {
        "page"
    }
}

/// The line as written: `[page:scope] message`, on one line.
pub fn format_line(scope: &str, message: &str) -> String {
    format!("[page:{}] {}", clean_scope(scope), crate::sync_room::clean_text(message, MAX_MESSAGE_CHARS))
}

/// Writes one line from the page, unless the page is over its rate.
pub fn write(level: PageLevel, scope: &str, message: &str) {
    let admitted = LIMITER.lock().map(|mut l| l.admit(Instant::now())).unwrap_or(None);
    let Some(dropped) = admitted else {
        return;
    };
    if dropped > 0 {
        log::warn!(target: "page", "[page] {dropped} lines dropped (too many at once)");
    }
    let line = format_line(scope, message);
    match level {
        PageLevel::Info => log::info!(target: "page", "{line}"),
        PageLevel::Warn => log::warn!(target: "page", "{line}"),
        PageLevel::Error => log::error!(target: "page", "{line}"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[test]
    fn test_line_is_one_bounded_line_with_a_safe_scope() {
        let line = format_line("sync", "seek\n[2026-01-01][INFO] forged");
        assert!(!line.contains('\n'), "{line}");
        assert!(line.starts_with("[page:sync] seek"), "{line}");

        assert!(format_line("a b]", "x").starts_with("[page:page] "));
        assert!(format_line("", "x").starts_with("[page:page] "));
        assert!(format_line(&"s".repeat(40), "x").starts_with("[page:page] "));

        let long = format_line("sync", &"x".repeat(5_000));
        assert!(long.chars().count() <= "[page:sync] ".len() + MAX_MESSAGE_CHARS);
    }

    #[test]
    fn test_levels() {
        assert_eq!(PageLevel::parse("warn"), Some(PageLevel::Warn));
        assert_eq!(PageLevel::parse("debug"), None);
    }

    #[test]
    fn test_rate_limit_allows_a_burst_then_reports_what_it_dropped() {
        let mut l = RateLimiter::new();
        let t0 = Instant::now();
        for _ in 0..BURST as usize {
            assert_eq!(l.admit(t0), Some(0));
        }
        assert_eq!(l.admit(t0), None);
        assert_eq!(l.admit(t0), None);
        // Half a second at 2/s refills one line, which reports the two lost.
        assert_eq!(l.admit(t0 + Duration::from_millis(500)), Some(2));
        assert_eq!(l.admit(t0 + Duration::from_millis(500)), None);
        // A long quiet spell refills only up to the burst.
        let later = t0 + Duration::from_secs(3_600);
        for _ in 0..BURST as usize {
            assert!(l.admit(later).is_some());
        }
        assert_eq!(l.admit(later), None);
    }
}
