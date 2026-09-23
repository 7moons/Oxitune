use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub autostart: bool,
    pub minimize_to_tray: bool,
    pub close_to_tray: bool,
    pub discord_rpc_enabled: bool,
    pub mpris_enabled: bool,
    pub notifications_enabled: bool,
    pub adblock_enabled: bool,
    pub sponsorblock_enabled: bool,
    pub lyrics_enabled: bool,
    pub miniplayer_enabled: bool,
    pub wheel_volume_step: f64,
    #[serde(default)]
    pub wheel_volume_on_player_page: bool,
    pub custom_css: String,
    pub custom_user_agent: String,
    pub quality: String,
    pub normalize_volume: bool,
    pub equalizer_enabled: bool,
    pub equalizer_preset: String,
    pub equalizer_gains: Vec<f64>,
    pub preamp_gain: f64,
    pub loudness_normalization: bool,
    pub crossfade_seconds: f64,
    pub skip_silence_enabled: bool,
    pub playback_speed: f64,
    pub preserve_pitch: bool,
    pub ambient_lighting_enabled: bool,
    pub ambient_intensity: f64,
    pub download_dir: String,
    pub download_format: String,
    pub embed_lyrics: bool,
    pub local_music_dir: String,
    pub remote_enabled: bool,
    pub remote_port: u16,
    pub inhibit_sleep: bool,
    pub pause_on_lock: bool,
    pub lastfm_enabled: bool,
    pub lastfm_api_key: String,
    pub lastfm_secret: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        let default_music_dir = dirs::audio_dir()
            .unwrap_or_else(|| dirs::home_dir().unwrap_or_default().join("Music"))
            .to_string_lossy()
            .to_string();

        let default_download_dir = dirs::audio_dir()
            .unwrap_or_else(|| dirs::home_dir().unwrap_or_default().join("Music"))
            .join("YTMD")
            .to_string_lossy()
            .to_string();

        Self {
            autostart: false,
            minimize_to_tray: true,
            close_to_tray: true,
            discord_rpc_enabled: true,
            mpris_enabled: true,
            notifications_enabled: false,
            adblock_enabled: true,
            sponsorblock_enabled: true,
            lyrics_enabled: true,
            miniplayer_enabled: true,
            wheel_volume_step: 0.05,
            wheel_volume_on_player_page: false,
            custom_css: "".to_string(),
            custom_user_agent: "".to_string(),
            quality: "high".to_string(),
            normalize_volume: false,
            equalizer_enabled: true,
            equalizer_preset: "flat".to_string(),
            equalizer_gains: vec![0.0; 10], // 10 bands default at 0dB
            preamp_gain: 0.0,
            loudness_normalization: false,
            crossfade_seconds: 0.0, // Disabled by default
            skip_silence_enabled: false,
            playback_speed: 1.0,
            preserve_pitch: true,
            ambient_lighting_enabled: true,
            ambient_intensity: 0.6,
            download_dir: default_download_dir,
            download_format: "mp3".to_string(),
            embed_lyrics: true,
            local_music_dir: default_music_dir,
            remote_enabled: true,
            remote_port: 9863,
            inhibit_sleep: true,
            pause_on_lock: true,
            lastfm_enabled: false,
            lastfm_api_key: "".to_string(),
            lastfm_secret: "".to_string(),
        }
    }
}

impl AppConfig {
    /// Clamps every numeric/enum-ish field to its sane operating range and
    /// falls back to defaults for blank paths. save_config is reachable from
    /// any window's JS (including the untrusted music.youtube.com origin —
    /// see the capabilities/architecture notes in remote_server.rs), so a
    /// config blob arriving there must never be persisted unvalidated: e.g.
    /// an out-of-range remote_port, a negative crossfade, or a multi-million
    /// entry equalizer_gains vector would otherwise be written straight to
    /// disk and reloaded on every future run.
    pub fn sanitized(mut self) -> Self {
        // NaN/Infinity can't be meaningfully clamped into a range (NaN
        // compares false to everything, Infinity.clamp(lo, hi) == hi in
        // Rust) — fall back to a sane default instead of silently letting
        // one slip through as a boundary value.
        fn clamp(v: f64, lo: f64, hi: f64, fallback: f64) -> f64 {
            if !v.is_finite() {
                return fallback;
            }
            v.clamp(lo, hi)
        }

        self.wheel_volume_step = clamp(self.wheel_volume_step, 0.0, 1.0, 0.05);
        self.preamp_gain = clamp(self.preamp_gain, -24.0, 24.0, 0.0);
        self.crossfade_seconds = clamp(self.crossfade_seconds, 0.0, 30.0, 0.0);
        self.playback_speed = clamp(self.playback_speed, 0.25, 4.0, 1.0);
        self.ambient_intensity = clamp(self.ambient_intensity, 0.0, 1.0, 0.6);

        self.equalizer_gains.truncate(32);
        for gain in self.equalizer_gains.iter_mut() {
            *gain = clamp(*gain, -24.0, 24.0, 0.0);
        }

        // Never allow binding to a privileged port (<1024, requires root on
        // most platforms and includes many well-known services).
        if self.remote_port < 1024 {
            self.remote_port = AppConfig::default().remote_port;
        }

        if self.download_dir.trim().is_empty() {
            self.download_dir = AppConfig::default().download_dir;
        }
        if self.local_music_dir.trim().is_empty() {
            self.local_music_dir = AppConfig::default().local_music_dir;
        }

        self
    }
}

pub struct ConfigManager {
    config_path: PathBuf,
}

impl Default for ConfigManager {
    fn default() -> Self {
        Self::new()
    }
}

impl ConfigManager {
    pub fn new() -> Self {
        let app_dir = dirs::home_dir()
            .map(|h| h.join(".ytmd"))
            .unwrap_or_else(|| dirs::config_dir().unwrap_or_else(|| PathBuf::from(".")).join(".ytmd"));

        if !app_dir.exists() {
            let _ = fs::create_dir_all(&app_dir);
        }
        let config_path = app_dir.join("config.json");

        // If new config at ~/.ytmd/config.json does not exist yet, check legacy ~/.config/ytmd/config.json
        if !config_path.exists() {
            if let Some(legacy_dir) = dirs::config_dir() {
                let legacy_path = legacy_dir.join("ytmd").join("config.json");
                if legacy_path.exists() {
                    if let Ok(content) = fs::read_to_string(&legacy_path) {
                        let _ = fs::write(&config_path, content);
                    }
                }
            }
        }

        Self { config_path }
    }

    pub fn config_path(&self) -> &PathBuf {
        &self.config_path
    }

    pub fn load(&self) -> AppConfig {
        if self.config_path.exists() {
            if let Ok(content) = fs::read_to_string(&self.config_path) {
                if let Ok(config) = serde_json::from_str::<AppConfig>(&content) {
                    // Every on-disk config must be re-sanitized on the way
                    // back in, not just on the way out through `save()`:
                    // the legacy-path migration in `new()` copies the old
                    // file's bytes verbatim (never through `save()`), and a
                    // hand-edited or pre-clamp-era file bypasses it too.
                    // Without this, a stale out-of-range value (e.g. a
                    // privileged remote_port or a NaN gain) would be loaded
                    // as-is into the running app on every single startup.
                    return config.sanitized();
                }
            }
        }
        let default_config = AppConfig::default();
        let _ = self.save(&default_config);
        default_config
    }

    pub fn save(&self, config: &AppConfig) -> Result<(), String> {
        let sanitized = config.clone().sanitized();
        let json = serde_json::to_string_pretty(&sanitized).map_err(|e| e.to_string())?;

        // Write to a sibling temp file and rename it into place instead of
        // truncating config.json directly. `fs::write` truncates then
        // writes as two separate steps; a crash, power loss, or kill -9 of
        // the app between those steps leaves a zero-byte or partial
        // config.json that fails to parse on the next launch, silently
        // discarding every saved setting (see `load()`'s fallback to
        // `AppConfig::default()`). `rename` within the same directory is a
        // single atomic syscall on the filesystems this app ships on, so a
        // reader only ever observes the fully-old or fully-new file.
        let mut tmp_os = self.config_path.clone().into_os_string();
        tmp_os.push(".tmp");
        let tmp_path = PathBuf::from(tmp_os);

        fs::write(&tmp_path, &json).map_err(|e| e.to_string())?;
        fs::rename(&tmp_path, &self.config_path).map_err(|e| e.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitized_clamps_malicious_out_of_range_values() {
        let config = AppConfig {
            wheel_volume_step: 999.0,
            preamp_gain: -9999.0,
            crossfade_seconds: -5.0,
            playback_speed: f64::INFINITY,
            ambient_intensity: f64::NAN,
            remote_port: 22, // SSH — a malicious save_config trying to steer us onto a privileged port
            download_dir: "".to_string(),
            local_music_dir: "   ".to_string(),
            equalizer_gains: vec![1000.0; 5000],
            ..AppConfig::default()
        };

        let clean = config.sanitized();

        assert_eq!(clean.wheel_volume_step, 1.0);
        assert_eq!(clean.preamp_gain, -24.0);
        assert_eq!(clean.crossfade_seconds, 0.0);
        assert_eq!(clean.playback_speed, 1.0); // non-finite input falls back to the default, not a clamp bound
        assert_eq!(clean.ambient_intensity, 0.6); // same for NaN
        assert_eq!(clean.remote_port, AppConfig::default().remote_port);
        assert_eq!(clean.download_dir, AppConfig::default().download_dir);
        assert_eq!(clean.local_music_dir, AppConfig::default().local_music_dir);
        assert_eq!(clean.equalizer_gains.len(), 32);
        assert!(clean.equalizer_gains.iter().all(|g| *g == 24.0));
    }

    #[test]
    fn test_sanitized_preserves_valid_values() {
        let config = AppConfig {
            wheel_volume_step: 0.1,
            preamp_gain: 3.5,
            crossfade_seconds: 5.0,
            playback_speed: 1.25,
            ambient_intensity: 0.6,
            remote_port: 9863,
            equalizer_gains: vec![1.0, -2.0, 3.0],
            ..AppConfig::default()
        };

        let clean = config.sanitized();

        assert_eq!(clean.wheel_volume_step, 0.1);
        assert_eq!(clean.preamp_gain, 3.5);
        assert_eq!(clean.crossfade_seconds, 5.0);
        assert_eq!(clean.playback_speed, 1.25);
        assert_eq!(clean.ambient_intensity, 0.6);
        assert_eq!(clean.remote_port, 9863);
        assert_eq!(clean.equalizer_gains, vec![1.0, -2.0, 3.0]);
    }

    #[test]
    fn test_config_manager_save_persists_sanitized_config() {
        use tempfile::tempdir;
        let dir = tempdir().expect("tempdir");
        let manager = ConfigManager {
            config_path: dir.path().join("config.json"),
        };

        let config = AppConfig {
            remote_port: 1, // would otherwise let an attacker steer us onto a privileged port
            ..AppConfig::default()
        };

        manager.save(&config).expect("save should succeed");
        let loaded = manager.load();
        assert_eq!(loaded.remote_port, AppConfig::default().remote_port);
    }

    #[test]
    fn test_config_manager_new_initializes_path() {
        let manager = ConfigManager::new();
        assert!(manager.config_path().to_string_lossy().contains(".ytmd"));
        assert!(manager.config_path().to_string_lossy().ends_with("config.json"));
    }

    #[test]
    fn test_default_config_values() {
        let config = AppConfig::default();
        assert!(config.discord_rpc_enabled);
        assert!(config.mpris_enabled);
        assert!(config.adblock_enabled);
        assert!(config.sponsorblock_enabled);
        assert!(config.lyrics_enabled);
        assert!(config.equalizer_enabled);
        assert_eq!(config.equalizer_gains.len(), 10);
        assert_eq!(config.equalizer_preset, "flat");
        assert_eq!(config.crossfade_seconds, 0.0);
        assert!(!config.skip_silence_enabled);
        assert_eq!(config.playback_speed, 1.0);
        assert!(config.preserve_pitch);
        assert!(config.ambient_lighting_enabled);
        assert_eq!(config.ambient_intensity, 0.6);
        assert_eq!(config.download_format, "mp3");
        assert!(config.embed_lyrics);
        assert!(config.remote_enabled);
        assert_eq!(config.remote_port, 9863);
        assert!(config.inhibit_sleep);
        assert!(config.pause_on_lock);
        assert_eq!(config.wheel_volume_step, 0.05);
        assert!(!config.wheel_volume_on_player_page);
        assert_eq!(config.quality, "high");
    }

    #[test]
    fn test_old_config_without_player_page_wheel_setting_keeps_other_values() {
        let mut saved = serde_json::to_value(AppConfig {
            wheel_volume_step: 0.12,
            ..AppConfig::default()
        })
        .expect("serialize");
        saved.as_object_mut().expect("config object").remove("wheel_volume_on_player_page");

        let loaded: AppConfig = serde_json::from_value(saved).expect("old config still loads");
        assert!(!loaded.wheel_volume_on_player_page);
        assert_eq!(loaded.wheel_volume_step, 0.12);
    }

    #[test]
    fn test_config_serialization() {
        let config = AppConfig {
            equalizer_gains: vec![3.0, 2.5, 1.0, 0.0, -1.0, -2.0, 0.0, 1.5, 3.0, 4.0],
            preamp_gain: 1.5,
            crossfade_seconds: 5.0,
            skip_silence_enabled: true,
            playback_speed: 1.25,
            preserve_pitch: false,
            ambient_lighting_enabled: true,
            ambient_intensity: 0.8,
            download_format: "flac".to_string(),
            embed_lyrics: true,
            remote_enabled: false,
            remote_port: 8888,
            ..AppConfig::default()
        };
        let serialized = serde_json::to_string(&config).expect("Serialization failed");
        let deserialized: AppConfig = serde_json::from_str(&serialized).expect("Deserialization failed");
        assert!(deserialized.mpris_enabled);
        assert_eq!(deserialized.equalizer_gains.len(), 10);
        assert_eq!(deserialized.equalizer_gains[0], 3.0);
        assert_eq!(deserialized.preamp_gain, 1.5);
        assert_eq!(deserialized.crossfade_seconds, 5.0);
        assert!(deserialized.skip_silence_enabled);
        assert_eq!(deserialized.playback_speed, 1.25);
        assert!(!deserialized.preserve_pitch);
        assert!(deserialized.ambient_lighting_enabled);
        assert_eq!(deserialized.ambient_intensity, 0.8);
        assert_eq!(deserialized.download_format, "flac");
        assert!(deserialized.embed_lyrics);
        assert!(!deserialized.remote_enabled);
        assert_eq!(deserialized.remote_port, 8888);
    }

    #[test]
    fn test_load_sanitizes_a_hand_edited_or_legacy_config_file() {
        use tempfile::tempdir;
        let dir = tempdir().expect("tempdir");
        let manager = ConfigManager {
            config_path: dir.path().join("config.json"),
        };

        // Simulate a config.json that never went through `save()`'s
        // sanitize step: a hand-edited file, one written by an older
        // version predating a clamp, or one copied verbatim by the
        // legacy-path migration in `ConfigManager::new()`.
        let malicious = AppConfig {
            remote_port: 22,
            preamp_gain: 999.0,
            equalizer_gains: vec![1000.0; 5000],
            ..AppConfig::default()
        };
        let raw_json = serde_json::to_string(&malicious).expect("serialize");
        fs::write(manager.config_path(), raw_json).expect("write raw config");

        let loaded = manager.load();

        assert_eq!(loaded.remote_port, AppConfig::default().remote_port);
        assert_eq!(loaded.preamp_gain, 24.0);
        assert_eq!(loaded.equalizer_gains.len(), 32);
        assert!(loaded.equalizer_gains.iter().all(|g| *g == 24.0));
    }

    #[test]
    fn test_config_manager_save_is_atomic_no_leftover_tmp_file() {
        use tempfile::tempdir;
        let dir = tempdir().expect("tempdir");
        let manager = ConfigManager {
            config_path: dir.path().join("config.json"),
        };

        manager.save(&AppConfig::default()).expect("save should succeed");

        assert!(manager.config_path().exists());
        let loaded = manager.load();
        assert_eq!(loaded.custom_css, AppConfig::default().custom_css);

        // The write-then-rename must not leave its temp artifact behind.
        let mut tmp_os = manager.config_path().clone().into_os_string();
        tmp_os.push(".tmp");
        assert!(!PathBuf::from(tmp_os).exists());
    }

    #[test]
    fn test_load_recovers_from_a_torn_write_left_by_a_previous_crash() {
        use tempfile::tempdir;
        let dir = tempdir().expect("tempdir");
        let manager = ConfigManager {
            config_path: dir.path().join("config.json"),
        };

        // Simulate a crash mid-save under the old non-atomic write scheme:
        // a truncated, unparseable config.json plus a leftover temp file
        // from a write that never got renamed into place.
        fs::write(manager.config_path(), b"{\"custom_css\": \"def").unwrap();
        fs::write(dir.path().join("config.json.tmp"), b"{}").unwrap();

        // load() must fail closed to defaults rather than panicking or
        // propagating the parse error, and it must repair the on-disk file.
        let loaded = manager.load();
        assert_eq!(loaded.custom_css, AppConfig::default().custom_css);

        let loaded_again = manager.load();
        assert_eq!(loaded_again.custom_css, AppConfig::default().custom_css);
    }
}
