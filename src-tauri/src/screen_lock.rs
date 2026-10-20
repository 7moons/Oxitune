//! "Pause on screen lock", driven by the desktop's real lock signals.
//!
//! Not `document.hidden` in the page, which is also true when the window is
//! minimized or hidden to the tray. Here we listen on D-Bus instead:
//!
//!   * session bus, `ActiveChanged(true)` on `org.freedesktop.ScreenSaver`
//!     (KDE Plasma, Xfce, LXQt, Cinnamon, MATE, most others) and on
//!     `org.gnome.ScreenSaver` (GNOME Shell);
//!   * system bus, logind's `org.freedesktop.login1.Session.Lock` for this
//!     process's session (what `loginctl lock-session` and many lockers such
//!     as swaylock/hyprlock setups go through). If the session can't be
//!     resolved (e.g. launched outside a logind session), `Lock` from any
//!     session path is accepted instead — on a single-user desktop that's
//!     the same thing.
//!
//! Every source is best effort: a missing bus or interface is logged at
//! debug level and the others keep working. One lock often fires several
//! of these at once, so repeats within `DUPLICATE_LOCK_WINDOW` count once.
//! Unlocking never auto-resumes playback.
//!
//! Windows: there's no signal to subscribe to without owning a message
//! loop, so a background thread polls the session's lock state
//! (`WTSQuerySessionInformationW` / `WTSSessionInfoEx`) every
//! `WINDOWS_POLL_INTERVAL` and reports the unlocked -> locked edge.

use std::time::{Duration, Instant};
use tauri::AppHandle;

/// Lock notifications closer together than this are one lock seen through
/// several sources (e.g. logind `Lock` + the screensaver's `ActiveChanged`).
pub const DUPLICATE_LOCK_WINDOW: Duration = Duration::from_secs(2);

pub fn is_duplicate_lock(last_lock: Option<Instant>, now: Instant) -> bool {
    last_lock.is_some_and(|last| now.saturating_duration_since(last) < DUPLICATE_LOCK_WINDOW)
}

/// Whether a lock signal arriving at `now` should pause playback.
pub fn should_pause_on_lock(pause_on_lock: bool, last_lock: Option<Instant>, now: Instant) -> bool {
    pause_on_lock && !is_duplicate_lock(last_lock, now)
}

/// Called with the name of the source that saw a lock.
#[cfg(any(target_os = "linux", windows))]
pub(crate) type LockCallback = std::sync::Arc<dyn Fn(&'static str) + Send + Sync>;

/// Only the unlocked -> locked edge is a lock event; staying locked (or
/// the first poll finding the session already locked) is not.
pub fn is_lock_edge(was_locked: Option<bool>, locked: bool) -> bool {
    locked && was_locked == Some(false)
}

/// Starts listening for screen locks in the background (Linux, Windows).
pub fn start(app: AppHandle) {
    #[cfg(any(target_os = "linux", windows))]
    {
        use crate::AppState;
        use parking_lot::Mutex;
        use std::sync::Arc;
        use tauri::{Emitter, Manager};

        let last_lock: Arc<Mutex<Option<Instant>>> = Arc::new(Mutex::new(None));
        let on_lock: LockCallback = Arc::new(move |source: &'static str| {
            let now = Instant::now();
            let mut last = last_lock.lock();
            let pause_on_lock = app
                .try_state::<Arc<AppState>>()
                .map(|s| s.config_manager.load().pause_on_lock)
                .unwrap_or(false);
            let pause = should_pause_on_lock(pause_on_lock, *last, now);
            if !is_duplicate_lock(*last, now) {
                *last = Some(now);
            }
            drop(last);
            log::debug!("screen lock via {source}; pausing: {pause}");
            if pause {
                // Same event every other remote-control path uses; the
                // injected page routes "pause" to the player.
                let _ = app.emit("player-command", "pause");
            }
        });
        #[cfg(target_os = "linux")]
        tauri::async_runtime::spawn(imp::listen(on_lock));
        #[cfg(windows)]
        windows_imp::spawn_poller(on_lock);
    }
    #[cfg(not(any(target_os = "linux", windows)))]
    {
        let _ = app;
    }
}

#[cfg(windows)]
const WINDOWS_POLL_INTERVAL: Duration = Duration::from_secs(2);

#[cfg(windows)]
mod windows_imp {
    use super::{is_lock_edge, LockCallback, WINDOWS_POLL_INTERVAL};
    use windows::core::PWSTR;
    use windows::Win32::System::RemoteDesktop::{
        WTSFreeMemory, WTSQuerySessionInformationW, WTSSessionInfoEx, WTSINFOEXW, WTS_CURRENT_SERVER_HANDLE,
        WTS_CURRENT_SESSION, WTS_SESSIONSTATE_LOCK,
    };

    /// `None` when the state can't be read (the poller then just skips).
    fn session_locked() -> Option<bool> {
        let mut buffer = PWSTR::null();
        let mut bytes = 0u32;
        // SAFETY: out-pointers are valid locals; the buffer WTS allocates is
        // read only while it's alive and freed with WTSFreeMemory below.
        unsafe {
            WTSQuerySessionInformationW(
                Some(WTS_CURRENT_SERVER_HANDLE),
                WTS_CURRENT_SESSION,
                WTSSessionInfoEx,
                &mut buffer,
                &mut bytes,
            )
            .ok()?;
            if buffer.is_null() {
                return None;
            }
            let info = &*(buffer.0 as *const WTSINFOEXW);
            let locked = if info.Level == 1 {
                Some(info.Data.WTSInfoExLevel1.SessionFlags as u32 == WTS_SESSIONSTATE_LOCK)
            } else {
                None
            };
            WTSFreeMemory(buffer.0 as *mut _);
            locked
        }
    }

    pub(super) fn spawn_poller(on_lock: LockCallback) {
        let spawned = std::thread::Builder::new().name("oxitune-screen-lock".into()).spawn(move || {
            let mut was_locked = None;
            loop {
                if let Some(locked) = session_locked() {
                    if is_lock_edge(was_locked, locked) {
                        on_lock("WTSSessionInfoEx");
                    }
                    was_locked = Some(locked);
                }
                std::thread::sleep(WINDOWS_POLL_INTERVAL);
            }
        });
        if let Err(e) = spawned {
            log::warn!("screen lock watcher unavailable: {e}");
        }
    }
}

#[cfg(target_os = "linux")]
pub(crate) mod imp {
    use futures_util::StreamExt;
    use zbus::message::Type;
    use zbus::zvariant::OwnedObjectPath;
    use zbus::{Connection, MatchRule, MessageStream};

    pub(crate) use super::LockCallback;

    const SCREENSAVER_INTERFACES: &[&str] = &["org.freedesktop.ScreenSaver", "org.gnome.ScreenSaver"];

    /// Subscribes to every available lock source and calls `on_lock` for
    /// each lock seen. Returns once all watchers are running (they keep
    /// running in their own tasks for the life of the app).
    pub async fn listen(on_lock: LockCallback) {
        match Connection::session().await {
            Ok(conn) => {
                for &iface in SCREENSAVER_INTERFACES {
                    let conn = conn.clone();
                    let on_lock = on_lock.clone();
                    tauri::async_runtime::spawn(async move {
                        if let Err(e) = watch_screensaver(&conn, iface, on_lock).await {
                            log::debug!("screen lock: {iface} watcher unavailable: {e}");
                        }
                    });
                }
            }
            Err(e) => log::debug!("screen lock: no session bus: {e}"),
        }

        match Connection::system().await {
            Ok(conn) => {
                tauri::async_runtime::spawn(async move {
                    if let Err(e) = watch_logind(&conn, on_lock).await {
                        log::debug!("screen lock: logind watcher unavailable: {e}");
                    }
                });
            }
            Err(e) => log::debug!("screen lock: no system bus: {e}"),
        }
    }

    async fn watch_screensaver(conn: &Connection, iface: &'static str, on_lock: LockCallback) -> zbus::Result<()> {
        let rule = MatchRule::builder()
            .msg_type(Type::Signal)
            .interface(iface)?
            .member("ActiveChanged")?
            .build();
        let mut stream = MessageStream::for_match_rule(rule, conn, Some(16)).await?;
        while let Some(msg) = stream.next().await {
            let Ok(msg) = msg else { continue };
            if matches!(msg.body().deserialize::<bool>(), Ok(true)) {
                on_lock(iface);
            }
        }
        Ok(())
    }

    /// This process's logind session object path, if it has one.
    async fn own_session_path(conn: &Connection) -> Option<OwnedObjectPath> {
        let call = |method: &'static str, body: SessionLookup| async move {
            let reply = match body {
                SessionLookup::Pid(pid) => {
                    conn.call_method(
                        Some("org.freedesktop.login1"),
                        "/org/freedesktop/login1",
                        Some("org.freedesktop.login1.Manager"),
                        method,
                        &(pid,),
                    )
                    .await
                }
                SessionLookup::Id(id) => {
                    conn.call_method(
                        Some("org.freedesktop.login1"),
                        "/org/freedesktop/login1",
                        Some("org.freedesktop.login1.Manager"),
                        method,
                        &(id.as_str(),),
                    )
                    .await
                }
            };
            reply.ok()?.body().deserialize::<OwnedObjectPath>().ok()
        };

        if let Some(path) = call("GetSessionByPID", SessionLookup::Pid(std::process::id())).await {
            return Some(path);
        }
        let id = std::env::var("XDG_SESSION_ID").ok()?;
        call("GetSession", SessionLookup::Id(id)).await
    }

    enum SessionLookup {
        Pid(u32),
        Id(String),
    }

    async fn watch_logind(conn: &Connection, on_lock: LockCallback) -> zbus::Result<()> {
        let session = own_session_path(conn).await;
        if session.is_none() {
            log::debug!("screen lock: couldn't resolve this logind session; accepting Lock from any session");
        }
        let mut builder = MatchRule::builder()
            .msg_type(Type::Signal)
            .sender("org.freedesktop.login1")?
            .interface("org.freedesktop.login1.Session")?
            .member("Lock")?;
        if let Some(path) = &session {
            builder = builder.path(path.as_ref())?;
        }
        let mut stream = MessageStream::for_match_rule(builder.build(), conn, Some(16)).await?;
        while let Some(msg) = stream.next().await {
            if msg.is_ok() {
                on_lock("logind");
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lock_edge_only_on_transition_into_locked() {
        assert!(is_lock_edge(Some(false), true));
        assert!(!is_lock_edge(Some(true), true), "staying locked is not a new lock");
        assert!(!is_lock_edge(None, true), "already locked at startup is not a new lock");
        assert!(!is_lock_edge(Some(true), false));
        assert!(!is_lock_edge(Some(false), false));
    }

    #[test]
    fn first_lock_pauses_when_enabled() {
        assert!(should_pause_on_lock(true, None, Instant::now()));
    }

    #[test]
    fn never_pauses_when_disabled() {
        assert!(!should_pause_on_lock(false, None, Instant::now()));
    }

    #[test]
    fn duplicate_lock_from_another_source_is_ignored() {
        let first = Instant::now();
        assert!(!should_pause_on_lock(true, Some(first), first + Duration::from_millis(300)));
        assert!(is_duplicate_lock(Some(first), first + Duration::from_millis(1999)));
    }

    #[test]
    fn a_later_lock_pauses_again() {
        let first = Instant::now();
        assert!(should_pause_on_lock(true, Some(first), first + DUPLICATE_LOCK_WINDOW));
        assert!(should_pause_on_lock(true, Some(first), first + Duration::from_secs(600)));
    }

    /// Real D-Bus round trip: emits a screensaver `ActiveChanged(true)` on
    /// the session bus with `gdbus` and expects the listener to report it.
    /// Needs a session bus and `gdbus`, so it's opt-in:
    /// `cargo test screen_lock -- --ignored`.
    #[cfg(target_os = "linux")]
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    #[ignore]
    async fn receives_a_real_screensaver_signal() {
        use std::sync::Arc;
        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<&'static str>();
        imp::listen(Arc::new(move |src| {
            let _ = tx.send(src);
        }))
        .await;
        // Let the match rules register with the bus before emitting.
        tokio::time::sleep(Duration::from_millis(500)).await;

        let status = std::process::Command::new("gdbus")
            .args([
                "emit",
                "--session",
                "--object-path",
                "/org/freedesktop/ScreenSaver",
                "--signal",
                "org.freedesktop.ScreenSaver.ActiveChanged",
                "true",
            ])
            .status()
            .expect("gdbus available");
        assert!(status.success());

        let got = tokio::time::timeout(Duration::from_secs(3), rx.recv()).await;
        assert_eq!(got.ok().flatten(), Some("org.freedesktop.ScreenSaver"));
    }
}
