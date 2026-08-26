use parking_lot::Mutex;
use std::process::{Child, Command, Stdio};

/// Inhibits system sleep/idle for as long as music is actively playing.
///
/// Implemented by holding open a child `systemd-inhibit` process wrapping
/// `sleep infinity`: systemd's logind grants the inhibitor lock for the
/// lifetime of that child, and killing the child releases it immediately.
/// This intentionally avoids adding a D-Bus/`libc` dependency (none is
/// available in this crate) — shelling out matches the existing pattern
/// already used for `yt-dlp` in downloader.rs. On a non-systemd platform
/// (or one without `systemd-inhibit` on PATH) the spawn simply fails and is
/// logged; playback still works, sleep is just not prevented.
pub struct PowerManager {
    inner: Mutex<Inner>,
}

#[derive(Default)]
struct Inner {
    is_inhibited: bool,
    inhibitor: Option<Child>,
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
            match spawn_inhibitor() {
                Some(child) => {
                    log::info!(
                        "[YTMD Power] Sleep inhibited during active playback (systemd-inhibit pid {}).",
                        child.id()
                    );
                    guard.inhibitor = Some(child);
                }
                None => {
                    log::warn!(
                        "[YTMD Power] Could not start systemd-inhibit (missing, or not a systemd session) — sleep will NOT be prevented during playback."
                    );
                }
            }
        } else {
            release_inhibitor(&mut guard.inhibitor);
            log::info!("[YTMD Power] Sleep inhibition released.");
        }
    }

    pub fn is_sleep_inhibited(&self) -> bool {
        self.inner.lock().is_inhibited
    }

    #[cfg(test)]
    fn inhibitor_pid(&self) -> Option<u32> {
        self.inner.lock().inhibitor.as_ref().map(|c| c.id())
    }

    #[cfg(test)]
    fn has_live_inhibitor(&self) -> bool {
        let mut guard = self.inner.lock();
        match guard.inhibitor.as_mut() {
            Some(child) => matches!(child.try_wait(), Ok(None)),
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
        let mut guard = self.inner.lock();
        release_inhibitor(&mut guard.inhibitor);
    }
}

fn spawn_inhibitor() -> Option<Child> {
    spawn_inhibitor_with("systemd-inhibit")
}

fn spawn_inhibitor_with(program: &str) -> Option<Child> {
    Command::new(program)
        .args([
            "--what=sleep:idle",
            "--who=YTMD",
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

fn release_inhibitor(inhibitor: &mut Option<Child>) {
    if let Some(mut child) = inhibitor.take() {
        let _ = child.kill();
        // Reap it so it doesn't linger as a zombie.
        let _ = child.wait();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

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
    fn test_spawn_inhibitor_with_missing_binary_fails_gracefully() {
        // Must never panic, regardless of platform/environment, even when
        // the binary flat out doesn't exist.
        assert!(spawn_inhibitor_with("ytmd-definitely-does-not-exist-binary").is_none());
    }

    #[test]
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
