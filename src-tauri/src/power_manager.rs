use parking_lot::Mutex;

pub struct PowerManager {
    is_inhibited: Mutex<bool>,
}

impl PowerManager {
    pub fn new() -> Self {
        Self {
            is_inhibited: Mutex::new(false),
        }
    }

    pub fn set_inhibit_sleep(&self, inhibit: bool) {
        let mut guard = self.is_inhibited.lock();
        if *guard != inhibit {
            *guard = inhibit;
            if inhibit {
                log::info!("[YTMD Power] Sleep inhibited during active playback.");
            } else {
                log::info!("[YTMD Power] Sleep inhibition released.");
            }
        }
    }

    pub fn is_sleep_inhibited(&self) -> bool {
        *self.is_inhibited.lock()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_power_manager_inhibit_toggle() {
        let pm = PowerManager::new();
        assert!(!pm.is_sleep_inhibited());

        pm.set_inhibit_sleep(true);
        assert!(pm.is_sleep_inhibited());

        pm.set_inhibit_sleep(false);
        assert!(!pm.is_sleep_inhibited());
    }
}
