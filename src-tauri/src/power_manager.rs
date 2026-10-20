use parking_lot::Mutex;

/// Inhibits system sleep/idle for as long as music is actively playing.
///
/// Linux: holds open a child `systemd-inhibit` process wrapping
/// `sleep infinity`: systemd's logind grants the inhibitor lock for the
/// lifetime of that child, and killing the child releases it immediately.
/// This intentionally avoids adding a D-Bus/`libc` dependency (none is
/// available in this crate) — shelling out matches the existing pattern
/// used elsewhere for child processes. On a non-systemd platform
/// (or one without `systemd-inhibit` on PATH) the spawn simply fails and is
/// logged; playback still works, sleep is just not prevented.
///
/// Windows: `SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED)`.
/// That request belongs to the calling thread and lapses when the thread
/// exits, so a dedicated thread holds it until told to release.
pub struct PowerManager {
    inner: Mutex<Inner>,
}

#[derive(Default)]
struct Inner {
    is_inhibited: bool,
    inhibitor: Option<platform::Inhibitor>,
}

impl Default for PowerManager {
    fn default() -> Self {
        Self::new()
    }
}

impl PowerManager {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(Inner::default()),
        }
    }

    pub fn set_inhibit_sleep(&self, inhibit: bool) {
        let mut guard = self.inner.lock();
        if guard.is_inhibited == inhibit {
            return;
        }
        guard.is_inhibited = inhibit;

        if inhibit {
            match platform::Inhibitor::acquire() {
                Some(inhibitor) => {
                    log::info!("[Oxitune Power] Sleep inhibited during active playback.");
                    guard.inhibitor = Some(inhibitor);
                }
                None => {
                    log::warn!("[Oxitune Power] Could not inhibit sleep — it will NOT be prevented during playback.");
                }
            }
        } else {
            if let Some(inhibitor) = guard.inhibitor.take() {
                inhibitor.release();
            }
            log::info!("[Oxitune Power] Sleep inhibition released.");
        }
    }

    pub fn is_sleep_inhibited(&self) -> bool {
        self.inner.lock().is_inhibited
    }

    #[cfg(all(test, unix))]
    fn inhibitor_pid(&self) -> Option<u32> {
        self.inner.lock().inhibitor.as_ref().map(|i| i.child.id())
    }

    #[cfg(all(test, unix))]
    fn has_live_inhibitor(&self) -> bool {
        let mut guard = self.inner.lock();
        match guard.inhibitor.as_mut() {
            Some(i) => matches!(i.child.try_wait(), Ok(None)),
            None => false,
        }
    }
}

/// Ensure the app never leaves an orphaned inhibitor running after
/// `PowerManager` itself goes away (e.g. a graceful app shutdown that drops
/// `AppState`). This is defense-in-depth, not the primary release path —
/// the primary path is the frontend calling `set_inhibit_sleep(false)` on
/// pause/stop (see `src/plugins/power/index.ts`).
impl Drop for PowerManager {
    fn drop(&mut self) {
        if let Some(inhibitor) = self.inner.lock().inhibitor.take() {
            inhibitor.release();
        }
    }
}

#[cfg(unix)]
mod platform {
    use std::process::{Child, Command, Stdio};

    pub(super) struct Inhibitor {
        pub(super) child: Child,
    }

    impl Inhibitor {
        pub(super) fn acquire() -> Option<Self> {
            spawn_inhibitor_with("systemd-inhibit").map(|child| Self { child })
        }

        pub(super) fn release(mut self) {
            let _ = self.child.kill();
            // Reap it so it doesn't linger as a zombie.
            let _ = self.child.wait();
        }
    }

    pub(super) fn spawn_inhibitor_with(program: &str) -> Option<Child> {
        Command::new(program)
            .args([
                "--what=sleep:idle",
                "--who=Oxitune",
                "--why=Music is playing",
                "--mode=block",
                "sleep",
                "infinity",
            ])
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .ok()
    }
}

#[cfg(windows)]
mod platform {
    use std::sync::mpsc;
    use std::thread;
    use windows::Win32::System::Power::{SetThreadExecutionState, ES_CONTINUOUS, ES_SYSTEM_REQUIRED};

    pub(super) struct Inhibitor {
        stop: mpsc::Sender<()>,
        thread: thread::JoinHandle<()>,
    }

    impl Inhibitor {
        pub(super) fn acquire() -> Option<Self> {
            let (stop, stopped) = mpsc::channel::<()>();
            let (ready_tx, ready_rx) = mpsc::channel::<bool>();
            let thread = thread::Builder::new()
                .name("oxitune-sleep-inhibit".into())
                .spawn(move || {
                    // SAFETY: plain Win32 call with valid flag constants; it
                    // only affects this thread's execution-state request.
                    let prev = unsafe { SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED) };
                    let _ = ready_tx.send(prev.0 != 0);
                    // Blocks until release() sends or drops the sender.
                    let _ = stopped.recv();
                    // SAFETY: as above; ES_CONTINUOUS alone clears the request.
                    unsafe { SetThreadExecutionState(ES_CONTINUOUS) };
                })
                .ok()?;
            match ready_rx.recv() {
                Ok(true) => Some(Self { stop, thread }),
                _ => {
                    drop(stop);
                    let _ = thread.join();
                    None
                }
            }
        }

        pub(super) fn release(self) {
            let _ = self.stop.send(());
            let _ = self.thread.join();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[cfg(unix)]
    use super::platform::spawn_inhibitor_with;
    #[cfg(unix)]
    use std::process::{Command, Stdio};

    #[cfg(unix)]
    fn systemd_inhibit_available() -> bool {
        Command::new("systemd-inhibit")
            .arg("--version")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
    }

    #[test]
    fn test_power_manager_inhibit_toggle() {
        let pm = PowerManager::new();
        assert!(!pm.is_sleep_inhibited());

        pm.set_inhibit_sleep(true);
        assert!(pm.is_sleep_inhibited());

        pm.set_inhibit_sleep(false);
        assert!(!pm.is_sleep_inhibited());
    }

    #[test]
    #[cfg(unix)]
    fn test_spawn_inhibitor_with_missing_binary_fails_gracefully() {
        // Must never panic, regardless of platform/environment, even when
        // the binary flat out doesn't exist.
        assert!(spawn_inhibitor_with("oxitune-definitely-does-not-exist-binary").is_none());
    }

    #[test]
    #[cfg(unix)]
    fn test_set_inhibit_sleep_spawns_and_kills_a_real_inhibitor_process() {
        if !systemd_inhibit_available() {
            eprintln!("skipping: systemd-inhibit not available in this environment");
            return;
        }

        let pm = PowerManager::new();
        pm.set_inhibit_sleep(true);
        assert!(pm.is_sleep_inhibited());
        assert!(
            pm.has_live_inhibitor(),
            "expected a live systemd-inhibit child process to back the inhibited state"
        );
        let pid = pm.inhibitor_pid().expect("pid should be recorded");
        assert!(std::path::Path::new(&format!("/proc/{pid}")).exists());

        pm.set_inhibit_sleep(false);
        assert!(!pm.is_sleep_inhibited());
        // Releasing must actually kill+reap the process, not just flip the
        // flag — an inhibitor process that outlives the "released" state is
        // exactly the "laptop never sleeps again" bug this exists to catch.
        assert!(!std::path::Path::new(&format!("/proc/{pid}")).exists());
    }

    #[test]
    #[cfg(unix)]
    fn test_repeated_inhibit_calls_do_not_leak_processes() {
        if !systemd_inhibit_available() {
            eprintln!("skipping: systemd-inhibit not available in this environment");
            return;
        }

        let pm = PowerManager::new();
        pm.set_inhibit_sleep(true);
        let first_pid = pm.inhibitor_pid().expect("pid recorded");

        // A second call with the same value must be a no-op: it must not
        // spawn a second process on top of the first (leaking one every
        // time the frontend re-fires the same play event).
        pm.set_inhibit_sleep(true);
        let second_pid = pm.inhibitor_pid().expect("pid recorded");
        assert_eq!(first_pid, second_pid);

        pm.set_inhibit_sleep(false);
    }

    #[test]
    #[cfg(unix)]
    fn test_drop_releases_any_active_inhibitor() {
        if !systemd_inhibit_available() {
            eprintln!("skipping: systemd-inhibit not available in this environment");
            return;
        }

        let pid = {
            let pm = PowerManager::new();
            pm.set_inhibit_sleep(true);
            pm.inhibitor_pid().expect("pid recorded")
            // pm dropped here
        };

        assert!(
            !std::path::Path::new(&format!("/proc/{pid}")).exists(),
            "PowerManager::drop must kill the inhibitor process, otherwise the machine can never sleep again"
        );
    }
}
