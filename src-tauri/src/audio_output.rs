//! Equalizer per output device: the sound saved for the headphones comes
//! back when they do.
//!
//! The page can't tell which device the system plays through (the browser
//! hides device names without a microphone permission), so the default
//! output is read here: Core Audio's default render endpoint on Windows,
//! `pactl` on Linux (PulseAudio and PipeWire's pulse server). A background
//! thread polls it every `POLL_INTERVAL`; on a change, the profile saved for
//! the new device (`AppConfig::equalizer_device_profiles`) becomes the
//! current equalizer and is pushed to the player. A device with no profile
//! changes nothing. Other systems report no device and the feature stays
//! out of the way.

use crate::config::AppConfig;
use parking_lot::Mutex;
use serde::Serialize;
use std::time::Duration;
use tauri::AppHandle;

pub const POLL_INTERVAL: Duration = Duration::from_secs(3);

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct OutputDevice {
    /// Stable across reboots and replugging; the profile's key.
    pub id: String,
    /// What the system calls it, for the Settings window.
    pub name: String,
}

/// The default output as last seen by the poller.
#[derive(Default)]
pub struct OutputState(Mutex<Option<OutputDevice>>);

impl OutputState {
    pub fn current(&self) -> Option<OutputDevice> {
        self.0.lock().clone()
    }
}

/// Makes the profile saved for `device_id` the current equalizer. Returns
/// whether anything changed (no profile, or already the same: `false`).
pub fn apply_profile(config: &mut AppConfig, device_id: &str) -> bool {
    let Some(profile) = config.equalizer_device_profiles.get(device_id).cloned() else {
        return false;
    };
    if config.equalizer_preset == profile.preset
        && config.equalizer_gains == profile.gains
        && config.preamp_gain == profile.preamp
    {
        return false;
    }
    config.equalizer_preset = profile.preset;
    config.equalizer_gains = profile.gains;
    config.preamp_gain = profile.preamp;
    true
}

/// The default sink out of `pactl list sinks` (run with `LC_ALL=C`), by the
/// name `pactl get-default-sink` printed.
pub fn parse_pactl_sinks(list: &str, default_sink: &str) -> Option<OutputDevice> {
    let default_sink = default_sink.trim();
    if default_sink.is_empty() {
        return None;
    }
    let mut in_default = false;
    for line in list.lines() {
        let line = line.trim();
        if let Some(name) = line.strip_prefix("Name:") {
            in_default = name.trim() == default_sink;
        } else if in_default {
            if let Some(description) = line.strip_prefix("Description:") {
                let description = description.trim();
                if !description.is_empty() {
                    return Some(OutputDevice { id: default_sink.to_string(), name: description.to_string() });
                }
            }
        }
    }
    // Listing failed or has no description: the sink name is still an id.
    Some(OutputDevice { id: default_sink.to_string(), name: default_sink.to_string() })
}

#[cfg(target_os = "linux")]
fn read_default_output() -> Option<OutputDevice> {
    let run = |args: &[&str]| -> Option<String> {
        let out = std::process::Command::new("pactl").args(args).env("LC_ALL", "C").output().ok()?;
        out.status.success().then(|| String::from_utf8_lossy(&out.stdout).into_owned())
    };
    let default_sink = run(&["get-default-sink"])?;
    parse_pactl_sinks(&run(&["list", "sinks"]).unwrap_or_default(), &default_sink)
}

#[cfg(windows)]
fn read_default_output() -> Option<OutputDevice> {
    use windows::Win32::Devices::FunctionDiscovery::PKEY_Device_FriendlyName;
    use windows::Win32::Media::Audio::{eMultimedia, eRender, IMMDeviceEnumerator, MMDeviceEnumerator};
    use windows::Win32::System::Com::{CoCreateInstance, CoTaskMemFree, CLSCTX_ALL, STGM_READ};

    // SAFETY: plain COM calls on this thread, which `start` initialized for
    // COM. The id string is owned by us until freed with CoTaskMemFree.
    unsafe {
        let enumerator: IMMDeviceEnumerator = CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL).ok()?;
        let device = enumerator.GetDefaultAudioEndpoint(eRender, eMultimedia).ok()?;
        let raw_id = device.GetId().ok()?;
        let id = raw_id.to_string().ok();
        CoTaskMemFree(Some(raw_id.0 as *const _));
        let id = id.filter(|id| !id.is_empty())?;
        let name = device
            .OpenPropertyStore(STGM_READ)
            .and_then(|store| store.GetValue(&PKEY_Device_FriendlyName))
            .map(|value| value.to_string())
            .ok()
            .filter(|name| !name.trim().is_empty())
            .unwrap_or_else(|| id.clone());
        Some(OutputDevice { id, name })
    }
}

#[cfg(not(any(target_os = "linux", windows)))]
fn read_default_output() -> Option<OutputDevice> {
    None
}

/// What the Settings window asks for when it opens.
#[tauri::command]
pub fn get_audio_output(state: tauri::State<'_, OutputState>) -> Option<OutputDevice> {
    state.current()
}

/// One poll: remembers the device and, when it changed, applies its profile.
fn poll(app: &AppHandle, device: Option<OutputDevice>) {
    use crate::AppState;
    use std::sync::Arc;
    use tauri::{Emitter, Manager};

    let Some(state) = app.try_state::<OutputState>() else {
        return;
    };
    {
        let mut current = state.0.lock();
        if *current == device {
            return;
        }
        *current = device.clone();
    }
    if let (Some(device), Some(app_state)) = (device.as_ref(), app.try_state::<Arc<AppState>>()) {
        let mut config = app_state.config_manager.load();
        if apply_profile(&mut config, &device.id) {
            match app_state.config_manager.save(&config) {
                Ok(()) => {
                    log::info!("audio output changed: equalizer profile applied");
                    let _ = app.emit("config-updated", &config);
                    let _ = app.emit(
                        "set-eq-all",
                        serde_json::json!({ "gains": config.equalizer_gains, "preset": config.equalizer_preset }),
                    );
                    let _ = app.emit("set-preamp", config.preamp_gain);
                }
                Err(e) => log::warn!("couldn't save the equalizer profile for the new output: {e}"),
            }
        }
    }
    // After the save, so a Settings window reloading on this sees it.
    let _ = app.emit("audio-output-changed", &device);
}

/// Starts watching the default output device in the background.
pub fn start(app: AppHandle) {
    use tauri::Manager;
    app.manage(OutputState::default());
    if !cfg!(any(target_os = "linux", windows)) {
        return;
    }
    let spawned = std::thread::Builder::new().name("oxitune-audio-output".into()).spawn(move || {
        #[cfg(windows)]
        // SAFETY: initializes COM for this thread only; it lives as long as
        // the process, so there is no matching uninitialize to miss.
        unsafe {
            use windows::Win32::System::Com::{CoInitializeEx, COINIT_MULTITHREADED};
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
        }
        loop {
            poll(&app, read_default_output());
            std::thread::sleep(POLL_INTERVAL);
        }
    });
    if let Err(e) = spawned {
        log::warn!("couldn't start the audio output watcher: {e}");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::DeviceEqProfile;

    fn profile(preset: &str, first: f64, preamp: f64) -> DeviceEqProfile {
        let mut gains = vec![0.0; 10];
        gains[0] = first;
        DeviceEqProfile { name: "Headphones".into(), preset: preset.into(), gains, preamp }
    }

    #[test]
    fn test_a_saved_profile_becomes_the_equalizer() {
        let mut config = AppConfig::default();
        config.equalizer_device_profiles.insert("hp".into(), profile("bass_boost", 6.0, -2.0));
        assert!(apply_profile(&mut config, "hp"));
        assert_eq!(config.equalizer_preset, "bass_boost");
        assert_eq!(config.equalizer_gains[0], 6.0);
        assert_eq!(config.preamp_gain, -2.0);
        assert!(!apply_profile(&mut config, "hp"), "already applied: nothing to save or push");
    }

    #[test]
    fn test_a_device_without_a_profile_changes_nothing() {
        let mut config = AppConfig { equalizer_preset: "rock".into(), ..AppConfig::default() };
        config.equalizer_device_profiles.insert("hp".into(), profile("bass_boost", 6.0, 0.0));
        assert!(!apply_profile(&mut config, "speakers"));
        assert_eq!(config.equalizer_preset, "rock");
    }

    // The real Core Audio call: a machine with no output device gives None,
    // any other an id and a name.
    #[cfg(windows)]
    #[test]
    fn test_windows_default_output_reads_without_crashing() {
        unsafe {
            use windows::Win32::System::Com::{CoInitializeEx, COINIT_MULTITHREADED};
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
        }
        let first = read_default_output();
        if let Some(device) = &first {
            println!("default output: {} ({} chars of id)", device.name, device.id.len());
            assert!(!device.id.is_empty() && !device.name.trim().is_empty());
        }
        assert_eq!(read_default_output(), first, "the id is stable between two reads");
    }

    const SINKS: &str = "Sink #51\n\tState: SUSPENDED\n\tName: alsa_output.pci-0000_00_1f.3.analog-stereo\n\tDescription: Built-in Audio Analog Stereo\n\tDriver: PipeWire\nSink #77\n\tState: RUNNING\n\tName: bluez_output.AA_BB.1\n\tDescription: WH-1000XM4\n";

    #[test]
    fn test_pactl_default_sink_is_found_with_its_description() {
        assert_eq!(
            parse_pactl_sinks(SINKS, "bluez_output.AA_BB.1\n"),
            Some(OutputDevice { id: "bluez_output.AA_BB.1".into(), name: "WH-1000XM4".into() })
        );
        assert_eq!(
            parse_pactl_sinks(SINKS, "alsa_output.pci-0000_00_1f.3.analog-stereo").unwrap().name,
            "Built-in Audio Analog Stereo"
        );
    }

    #[test]
    fn test_pactl_without_a_listing_still_names_the_sink() {
        assert_eq!(parse_pactl_sinks("", "some.sink"), Some(OutputDevice { id: "some.sink".into(), name: "some.sink".into() }));
        assert_eq!(parse_pactl_sinks(SINKS, "  \n"), None);
    }
}
