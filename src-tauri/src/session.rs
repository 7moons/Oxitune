//! "Resume on launch": the song and position playing when the app last ran,
//! kept in `~/.ytmd/session.json`. Its own file, not `config.json`, because
//! it is rewritten every few seconds while music plays.

use crate::discord_rpc::TrackPayload;
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

/// At most one write per this interval for the same song.
pub const SAVE_INTERVAL: Duration = Duration::from_secs(5);
/// A song this close to its end is finished; starting it again is useless.
pub const NEAR_END_SECS: u64 = 5;
/// A session older than this isn't resumed.
pub const MAX_AGE_MS: u64 = 30 * 24 * 60 * 60 * 1000;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SessionSnapshot {
    pub video_id: String,
    #[serde(default)]
    pub playlist_id: Option<String>,
    pub position_secs: u64,
    pub duration_secs: u64,
    pub saved_at_ms: u64,
}

impl SessionSnapshot {
    /// The part of a track update worth resuming; `None` for updates with
    /// no song id (ads, idle, local files).
    pub fn from_track(track: &TrackPayload, now_ms: u64) -> Option<Self> {
        let video_id = track.video_id.as_deref().map(str::trim).filter(|v| !v.is_empty())?;
        Some(Self {
            video_id: video_id.to_string(),
            playlist_id: track
                .playlist_id
                .as_deref()
                .map(str::trim)
                .filter(|p| !p.is_empty())
                .map(str::to_string),
            position_secs: track.current_time_secs,
            duration_secs: track.duration_secs,
            saved_at_ms: now_ms,
        })
    }
}

/// What the page needs to put the player back where it was.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct ResumeTarget {
    pub video_id: String,
    pub position_secs: u64,
    pub autoplay: bool,
}

pub fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

/// Whether a stored session is still worth resuming at `now_ms`.
pub fn is_resumable(s: &SessionSnapshot, now_ms: u64) -> bool {
    if s.video_id.trim().is_empty() {
        return false;
    }
    if now_ms.saturating_sub(s.saved_at_ms) > MAX_AGE_MS {
        return false;
    }
    !(s.duration_secs > 0 && s.position_secs + NEAR_END_SECS >= s.duration_secs)
}

/// Parses a stored session; missing, corrupt or stale ones are `None`.
pub fn parse_session(raw: &str, now_ms: u64) -> Option<SessionSnapshot> {
    serde_json::from_str::<SessionSnapshot>(raw)
        .ok()
        .filter(|s| is_resumable(s, now_ms))
}

/// The main window's first URL: the saved song (and its playlist, so "up
/// next" continues from there), or YouTube Music's home page.
pub fn start_url(session: Option<&SessionSnapshot>) -> String {
    let Some(s) = session else {
        return "https://music.youtube.com".to_string();
    };
    let mut url = url::Url::parse("https://music.youtube.com/watch").expect("static url");
    {
        let mut q = url.query_pairs_mut();
        q.append_pair("v", &s.video_id);
        if let Some(list) = s.playlist_id.as_deref() {
            q.append_pair("list", list);
        }
    }
    url.to_string()
}

/// Whether this launch came from an `oscilla://` (or older `ytmd://`) link
/// (a room invite); such a
/// launch has its own place to go and must not resume the last song.
pub fn launched_from_link<I: IntoIterator<Item = String>>(args: I) -> bool {
    args.into_iter().skip(1).any(|a| a.starts_with("oscilla://") || a.starts_with("ytmd://"))
}

/// Whether a new snapshot should be written now.
fn should_write(last: Option<&(Instant, String)>, snapshot: &SessionSnapshot, now: Instant) -> bool {
    match last {
        None => true,
        Some((at, video)) => *video != snapshot.video_id || now.duration_since(*at) >= SAVE_INTERVAL,
    }
}

pub struct SessionStore {
    path: PathBuf,
    last_write: Mutex<Option<(Instant, String)>>,
    pending: Mutex<Option<SessionSnapshot>>,
    /// Taken once by the page on its first load, so a reload doesn't seek again.
    resume: Mutex<Option<ResumeTarget>>,
}

impl SessionStore {
    pub fn new(path: PathBuf) -> Self {
        Self {
            path,
            last_write: Mutex::new(None),
            pending: Mutex::new(None),
            resume: Mutex::new(None),
        }
    }

    pub fn load(&self) -> Option<SessionSnapshot> {
        let raw = std::fs::read_to_string(&self.path).ok()?;
        parse_session(&raw, now_ms())
    }

    /// Keeps the latest track; writes it right away on a song change,
    /// otherwise at most every `SAVE_INTERVAL`.
    pub fn record(&self, track: &TrackPayload) {
        let Some(snapshot) = SessionSnapshot::from_track(track, now_ms()) else {
            return;
        };
        let now = Instant::now();
        let write = should_write(self.last_write.lock().as_ref(), &snapshot, now);
        *self.pending.lock() = Some(snapshot.clone());
        if write {
            self.write(&snapshot, now);
        }
    }

    /// Writes whatever is newer than the last write (window close, quit).
    pub fn flush(&self) {
        if let Some(snapshot) = self.pending.lock().clone() {
            self.write(&snapshot, Instant::now());
        }
    }

    fn write(&self, snapshot: &SessionSnapshot, now: Instant) {
        let Ok(json) = serde_json::to_string(snapshot) else {
            return;
        };
        if let Some(dir) = self.path.parent() {
            let _ = std::fs::create_dir_all(dir);
        }
        // Write-then-rename (a crash mid-write can't leave half a file),
        // owner-only: it says what the user listens to.
        match crate::secure_fs::write_private(&self.path, json.as_bytes()) {
            Ok(()) => *self.last_write.lock() = Some((now, snapshot.video_id.clone())),
            Err(e) => log::warn!("[Oscilla Session] Could not save {}: {e}", self.path.display()),
        }
    }

    pub fn set_resume(&self, target: Option<ResumeTarget>) {
        *self.resume.lock() = target;
    }

    pub fn take_resume(&self) -> Option<ResumeTarget> {
        self.resume.lock().take()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const NOW: u64 = 1_800_000_000_000;

    fn snap(pos: u64, dur: u64, saved_at_ms: u64) -> SessionSnapshot {
        SessionSnapshot {
            video_id: "abc123DEF45".into(),
            playlist_id: Some("RDAMVMabc".into()),
            position_secs: pos,
            duration_secs: dur,
            saved_at_ms,
        }
    }

    fn track(video: Option<&str>, pos: u64) -> TrackPayload {
        TrackPayload {
            title: "Maniac".into(),
            artist: "Carpenter Brut".into(),
            album: None,
            cover_url: None,
            duration_secs: 300,
            current_time_secs: pos,
            is_playing: true,
            video_id: video.map(str::to_string),
            sampled_at_ms: None,
            playlist_id: Some("PL1".into()),
        }
    }

    #[test]
    fn test_load_rules() {
        let ok = serde_json::to_string(&snap(60, 300, NOW - 1000)).unwrap();
        assert_eq!(parse_session(&ok, NOW), Some(snap(60, 300, NOW - 1000)));

        assert_eq!(parse_session("", NOW), None, "missing/empty");
        assert_eq!(parse_session("{not json", NOW), None, "corrupt");

        let near_end = serde_json::to_string(&snap(296, 300, NOW)).unwrap();
        assert_eq!(parse_session(&near_end, NOW), None, "within 5 s of the end");
        let just_before = serde_json::to_string(&snap(294, 300, NOW)).unwrap();
        assert!(parse_session(&just_before, NOW).is_some());

        let old = serde_json::to_string(&snap(60, 300, NOW - MAX_AGE_MS - 1)).unwrap();
        assert_eq!(parse_session(&old, NOW), None, "older than 30 days");

        let unknown_duration = serde_json::to_string(&snap(60, 0, NOW)).unwrap();
        assert!(parse_session(&unknown_duration, NOW).is_some());
    }

    #[test]
    fn test_start_url_escapes_params() {
        assert_eq!(start_url(None), "https://music.youtube.com");
        let s = SessionSnapshot {
            video_id: "a&b=c".into(),
            playlist_id: Some("PL x#y".into()),
            ..snap(1, 2, 3)
        };
        assert_eq!(start_url(Some(&s)), "https://music.youtube.com/watch?v=a%26b%3Dc&list=PL+x%23y");
        let no_list = SessionSnapshot {
            playlist_id: None,
            ..snap(1, 2, 3)
        };
        assert_eq!(start_url(Some(&no_list)), "https://music.youtube.com/watch?v=abc123DEF45");
    }

    #[test]
    fn test_launched_from_link_ignores_the_program_path() {
        let args = |v: &[&str]| v.iter().map(|s| s.to_string()).collect::<Vec<_>>();
        assert!(launched_from_link(args(&["oscilla", "oscilla://join/OSC-ABC"])));
        assert!(launched_from_link(args(&["oscilla", "ytmd://join/OSC-ABC"])));
        assert!(!launched_from_link(args(&["ytmd"])));
        assert!(!launched_from_link(args(&["ytmd://weird-binary-name"])));
    }

    #[test]
    fn test_write_throttle() {
        let t0 = Instant::now();
        let s = snap(10, 300, NOW);
        assert!(should_write(None, &s, t0));
        let last = (t0, s.video_id.clone());
        assert!(!should_write(Some(&last), &s, t0 + Duration::from_secs(4)));
        assert!(should_write(Some(&last), &s, t0 + SAVE_INTERVAL));
        let other = SessionSnapshot {
            video_id: "zzz".into(),
            ..s.clone()
        };
        assert!(should_write(Some(&last), &other, t0 + Duration::from_secs(1)), "a new song writes at once");
    }

    #[test]
    fn test_store_record_flush_and_take_resume() {
        let dir = tempfile::tempdir().unwrap();
        let store = SessionStore::new(dir.path().join("session.json"));
        assert_eq!(store.load(), None);

        store.record(&track(None, 10));
        assert_eq!(store.load(), None, "no song id, nothing saved");

        store.record(&track(Some("vid1"), 10));
        assert_eq!(store.load().unwrap().position_secs, 10);

        store.record(&track(Some("vid1"), 12));
        assert_eq!(store.load().unwrap().position_secs, 10, "throttled");
        store.flush();
        let saved = store.load().unwrap();
        assert_eq!((saved.position_secs, saved.playlist_id.as_deref()), (12, Some("PL1")));

        let target = ResumeTarget {
            video_id: "vid1".into(),
            position_secs: 12,
            autoplay: false,
        };
        store.set_resume(Some(target.clone()));
        assert_eq!(store.take_resume(), Some(target));
        assert_eq!(store.take_resume(), None, "a reload must not seek again");
    }
}
