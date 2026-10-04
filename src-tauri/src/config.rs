use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub autostart: bool,
    pub minimize_to_tray: bool,
    pub close_to_tray: bool,
    pub discord_rpc_enabled: bool,
    /// Minutes a song may stay paused before its Discord status is cleared;
    /// 0 keeps it for as long as the song is paused.
    #[serde(default = "default_discord_clear_after_pause_min")]
    pub discord_clear_after_pause_min: u32,
    pub mpris_enabled: bool,
    pub notifications_enabled: bool,
    pub lyrics_enabled: bool,
    /// Lyrics providers in priority order, each on or off.
    #[serde(default = "crate::lyrics::default_provider_settings")]
    pub lyrics_providers: Vec<crate::lyrics::ProviderSetting>,
    /// A translation under each lyrics line, into `lyrics_translate_lang`.
    #[serde(default)]
    pub lyrics_translate_enabled: bool,
    #[serde(default = "default_lyrics_translate_lang")]
    pub lyrics_translate_lang: String,
    /// Lyrics in other scripts also shown in Latin letters.
    #[serde(default)]
    pub lyrics_romanize_enabled: bool,
    /// Open the Lyrics tab when a song that has lyrics starts.
    #[serde(default)]
    pub lyrics_auto_open: bool,
    /// How the lyrics look (one of `LYRICS_THEMES`).
    #[serde(default = "default_lyrics_theme")]
    pub lyrics_theme: String,
    /// Blur on the lines not being sung and the glow on the one that is.
    #[serde(default = "default_lyrics_effects")]
    pub lyrics_effects: bool,
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
    pub local_music_dir: String,
    pub remote_enabled: bool,
    pub remote_port: u16,
    /// Where the phone remote listens: `lan` (this PC's private LAN address
    /// only, the default) or `all` (every interface, e.g. for VPN setups).
    #[serde(default = "default_remote_bind")]
    pub remote_bind: String,
    pub inhibit_sleep: bool,
    pub pause_on_lock: bool,
    /// Reopen the last song at its position when the app starts.
    #[serde(default = "default_true")]
    pub resume_on_launch: bool,
    /// Start playing it too, instead of waiting paused.
    #[serde(default)]
    pub resume_autoplay: bool,
    /// Equalizer presets the user saved; picked by `equalizer_preset` = id.
    #[serde(default)]
    pub equalizer_custom_presets: Vec<CustomEqPreset>,
    /// Global shortcut per player action (`crate::shortcuts::ACTIONS`), as
    /// an accelerator string; empty = no shortcut.
    #[serde(default = "crate::shortcuts::default_shortcuts")]
    pub shortcuts: BTreeMap<String, String>,
}

fn default_true() -> bool {
    true
}

/// The looks the lyrics come in (styles.ts has a block per id).
pub const LYRICS_THEMES: [&str; 6] = ["classic", "spotlight", "centered", "accent", "compact", "karaoke"];

fn default_lyrics_theme() -> String {
    LYRICS_THEMES[0].to_string()
}

fn default_lyrics_translate_lang() -> String {
    "en".to_string()
}

/// Off on Linux: WebKitGTK repaints a blurred layer on every frame, and
/// one per lyrics line made the whole page stutter there.
fn default_lyrics_effects() -> bool {
    !cfg!(target_os = "linux")
}

fn default_remote_bind() -> String {
    "lan".to_string()
}

fn default_discord_clear_after_pause_min() -> u32 {
    5
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CustomEqPreset {
    /// `user-` followed by a few lowercase letters/digits.
    pub id: String,
    pub name: String,
    pub gains: Vec<f64>,
    #[serde(default)]
    pub preamp: f64,
}

const EQ_BANDS: usize = 10;
const MAX_CUSTOM_PRESETS: usize = 30;
const MAX_PRESET_NAME_CHARS: usize = 40;
const MAX_ACCELERATOR_LEN: usize = 64;

fn is_custom_preset_id(id: &str) -> bool {
    id.strip_prefix("user-")
        .is_some_and(|rest| (1..=16).contains(&rest.len()) && rest.bytes().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit()))
}

impl Default for AppConfig {
    fn default() -> Self {
        let default_music_dir = dirs::audio_dir()
            .unwrap_or_else(|| dirs::home_dir().unwrap_or_default().join("Music"))
            .to_string_lossy()
            .to_string();

        Self {
            autostart: false,
            minimize_to_tray: true,
            close_to_tray: true,
            discord_rpc_enabled: true,
            discord_clear_after_pause_min: default_discord_clear_after_pause_min(),
            mpris_enabled: true,
            notifications_enabled: false,
            lyrics_enabled: true,
            lyrics_providers: crate::lyrics::default_provider_settings(),
            lyrics_translate_enabled: false,
            lyrics_translate_lang: default_lyrics_translate_lang(),
            lyrics_romanize_enabled: false,
            lyrics_auto_open: false,
            lyrics_effects: default_lyrics_effects(),
            lyrics_theme: default_lyrics_theme(),
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
            local_music_dir: default_music_dir,
            // Off until the user turns it on: it opens a port on the LAN.
            remote_enabled: false,
            remote_port: 9863,
            remote_bind: default_remote_bind(),
            inhibit_sleep: true,
            pause_on_lock: true,
            resume_on_launch: true,
            resume_autoplay: false,
            equalizer_custom_presets: Vec::new(),
            shortcuts: crate::shortcuts::default_shortcuts(),
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
        self.discord_clear_after_pause_min = self.discord_clear_after_pause_min.min(24 * 60);

        self.equalizer_gains.truncate(32);
        for gain in self.equalizer_gains.iter_mut() {
            *gain = clamp(*gain, -24.0, 24.0, 0.0);
        }

        // Never allow binding to a privileged port (<1024, requires root on
        // most platforms and includes many well-known services).
        if self.remote_port < 1024 {
            self.remote_port = AppConfig::default().remote_port;
        }

        if self.remote_bind != "lan" && self.remote_bind != "all" {
            self.remote_bind = default_remote_bind();
        }

        if self.local_music_dir.trim().is_empty() {
            self.local_music_dir = AppConfig::default().local_music_dir;
        }

        // Custom presets: well-formed ids, no duplicates, a name, exactly one
        // gain per band, everything in range.
        self.lyrics_providers = crate::lyrics::sanitize_provider_settings(std::mem::take(&mut self.lyrics_providers));
        if !crate::lyrics::translate::is_lang(&self.lyrics_translate_lang) {
            self.lyrics_translate_lang = default_lyrics_translate_lang();
        }
        if !LYRICS_THEMES.contains(&self.lyrics_theme.as_str()) {
            self.lyrics_theme = default_lyrics_theme();
        }

        let mut seen = std::collections::HashSet::new();
        self.equalizer_custom_presets.retain(|p| is_custom_preset_id(&p.id) && seen.insert(p.id.clone()));
        self.equalizer_custom_presets.truncate(MAX_CUSTOM_PRESETS);
        for preset in self.equalizer_custom_presets.iter_mut() {
            preset.name = preset.name.trim().chars().filter(|c| !c.is_control()).take(MAX_PRESET_NAME_CHARS).collect();
            if preset.name.is_empty() {
                preset.name = preset.id.clone();
            }
            preset.gains.resize(EQ_BANDS, 0.0);
            for gain in preset.gains.iter_mut() {
                *gain = clamp(*gain, -24.0, 24.0, 0.0);
            }
            preset.preamp = clamp(preset.preamp, -24.0, 24.0, 0.0);
        }

        // Shortcuts: only known actions, every action present (missing ones
        // fall back to their default), no absurd strings. Whether a string
        // is a valid, free shortcut is checked when it's registered.
        let defaults = crate::shortcuts::default_shortcuts();
        self.shortcuts.retain(|action, accel| defaults.contains_key(action) && accel.len() <= MAX_ACCELERATOR_LEN);
        for (action, accel) in defaults {
            self.shortcuts.entry(action).or_insert(accel);
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

/// The app's data folder under `base` (the home folder): `.oscilla`. On the
/// first launch after the rename, YTMD's `.ytmd` is moved there in one
/// rename (same disk), so the config, the session, the Listen Together
/// identity, plugins and caches all come along. If that fails, the old
/// folder stays in use: nothing is lost or half-copied.
pub fn app_dir_in(base: &std::path::Path) -> PathBuf {
    let dir = base.join(".oscilla");
    let old = base.join(".ytmd");
    if !dir.exists() && old.is_dir() {
        if let Err(e) = fs::rename(&old, &dir) {
            // Logging isn't set up yet this early.
            eprintln!("couldn't move {} to {}: {e}; keeping the old folder", old.display(), dir.display());
            return old;
        }
    }
    dir
}

impl ConfigManager {
    pub fn new() -> Self {
        let base = dirs::home_dir().unwrap_or_else(|| dirs::config_dir().unwrap_or_else(|| PathBuf::from(".")));
        let app_dir = app_dir_in(&base);

        // Owner-only: it holds the config, the room identity, the remote
        // token, the last session and the logs.
        if let Err(e) = crate::secure_fs::ensure_private_dir(&app_dir) {
            log::warn!("couldn't set up {}: {e}", app_dir.display());
        }
        let config_path = app_dir.join("config.json");

        // No config yet: take the one from ~/.config/ytmd/config.json (an
        // even older layout), if any.
        if !config_path.exists() {
            if let Some(legacy_dir) = dirs::config_dir() {
                let legacy_path = legacy_dir.join("ytmd").join("config.json");
                if legacy_path.exists() {
                    if let Ok(content) = fs::read_to_string(&legacy_path) {
                        let _ = crate::secure_fs::write_private(&config_path, content.as_bytes());
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
        crate::secure_fs::write_private(&self.config_path, json.as_bytes()).map_err(|e| e.to_string())
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_old_data_folder_moves_to_the_new_name() {
        let home = tempfile::tempdir().unwrap();
        std::fs::create_dir(home.path().join(".ytmd")).unwrap();
        std::fs::write(home.path().join(".ytmd/config.json"), b"{}").unwrap();
        let dir = app_dir_in(home.path());
        assert_eq!(dir, home.path().join(".oscilla"));
        assert!(dir.join("config.json").is_file(), "everything comes along");
        assert!(!home.path().join(".ytmd").exists());
        // Later launches just use it; an old folder showing up again is left alone.
        std::fs::create_dir(home.path().join(".ytmd")).unwrap();
        assert_eq!(app_dir_in(home.path()), dir);
        assert!(home.path().join(".ytmd").exists());
    }

    #[test]
    fn test_fresh_install_uses_the_new_folder() {
        let home = tempfile::tempdir().unwrap();
        assert_eq!(app_dir_in(home.path()), home.path().join(".oscilla"));
    }

    use super::*;

    #[test]
    fn test_lyrics_translation_language_is_a_language_tag() {
        let with = |lang: &str| AppConfig { lyrics_translate_lang: lang.into(), ..AppConfig::default() }.sanitized().lyrics_translate_lang;
        assert_eq!(with("pl"), "pl");
        assert_eq!(with("zh-CN"), "zh-CN");
        for bad in ["", "polish language", "en&q=x"] {
            assert_eq!(with(bad), "en", "{bad}");
        }
        // A config saved before these settings existed loads with them off.
        let mut old = serde_json::to_value(AppConfig::default()).unwrap();
        for key in ["lyrics_translate_enabled", "lyrics_translate_lang", "lyrics_romanize_enabled", "lyrics_auto_open", "lyrics_effects", "lyrics_theme"] {
            old.as_object_mut().unwrap().remove(key);
        }
        let theme = |id: &str| AppConfig { lyrics_theme: id.into(), ..AppConfig::default() }.sanitized().lyrics_theme;
        assert_eq!((theme("karaoke"), theme("neon"), theme("")), ("karaoke".into(), "classic".into(), "classic".into()));
        let loaded: AppConfig = serde_json::from_value(old).unwrap();
        assert!(!loaded.lyrics_translate_enabled && !loaded.lyrics_romanize_enabled && !loaded.lyrics_auto_open);
        assert_eq!(loaded.lyrics_translate_lang, "en");
        assert_eq!(loaded.lyrics_theme, "classic");
        assert_eq!(loaded.lyrics_effects, !cfg!(target_os = "linux"));
    }

    #[test]
    fn test_sanitized_clamps_malicious_out_of_range_values() {
        let config = AppConfig {
            wheel_volume_step: 999.0,
            preamp_gain: -9999.0,
            crossfade_seconds: -5.0,
            playback_speed: f64::INFINITY,
            ambient_intensity: f64::NAN,
            remote_port: 22, // SSH — a malicious save_config trying to steer us onto a privileged port
            local_music_dir: "   ".to_string(),
            equalizer_gains: vec![1000.0; 5000],
            discord_clear_after_pause_min: u32::MAX,
            ..AppConfig::default()
        };

        let clean = config.sanitized();

        assert_eq!(clean.wheel_volume_step, 1.0);
        assert_eq!(clean.preamp_gain, -24.0);
        assert_eq!(clean.crossfade_seconds, 0.0);
        assert_eq!(clean.playback_speed, 1.0); // non-finite input falls back to the default, not a clamp bound
        assert_eq!(clean.ambient_intensity, 0.6); // same for NaN
        assert_eq!(clean.remote_port, AppConfig::default().remote_port);
        assert_eq!(clean.local_music_dir, AppConfig::default().local_music_dir);
        assert_eq!(clean.equalizer_gains.len(), 32);
        assert!(clean.equalizer_gains.iter().all(|g| *g == 24.0));
        assert_eq!(clean.discord_clear_after_pause_min, 24 * 60);
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
        assert!(manager.config_path().to_string_lossy().contains(".oscilla") || manager.config_path().to_string_lossy().contains(".ytmd"));
        assert!(manager.config_path().to_string_lossy().ends_with("config.json"));
    }

    #[test]
    fn test_default_config_values() {
        let config = AppConfig::default();
        assert!(config.discord_rpc_enabled);
        assert_eq!(config.discord_clear_after_pause_min, 5);
        assert!(config.resume_on_launch);
        assert!(!config.resume_autoplay);
        assert!(config.mpris_enabled);
        assert!(config.lyrics_enabled);
        assert_eq!(config.lyrics_providers, crate::lyrics::default_provider_settings());
        assert!(config.equalizer_enabled);
        assert_eq!(config.equalizer_gains.len(), 10);
        assert_eq!(config.equalizer_preset, "flat");
        assert_eq!(config.crossfade_seconds, 0.0);
        assert!(!config.skip_silence_enabled);
        assert_eq!(config.playback_speed, 1.0);
        assert!(config.preserve_pitch);
        assert!(config.ambient_lighting_enabled);
        assert_eq!(config.ambient_intensity, 0.6);
        assert!(!config.remote_enabled, "the phone remote opens a LAN port: off by default");
        assert_eq!(config.remote_port, 9863);
        assert_eq!(config.remote_bind, "lan");
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

    /// Configs written by 0.2 still load; fields of features that were
    /// removed since are dropped on the next save.
    #[test]
    fn test_config_with_removed_download_fields_still_loads() {
        let mut saved = serde_json::to_value(AppConfig { crossfade_seconds: 3.0, ..AppConfig::default() }).unwrap();
        let obj = saved.as_object_mut().unwrap();
        obj.insert("download_dir".into(), serde_json::json!("/home/me/Music/Oscilla"));
        obj.insert("download_format".into(), serde_json::json!("flac"));
        obj.insert("embed_lyrics".into(), serde_json::json!(true));
        let loaded: AppConfig = serde_json::from_value(saved).expect("old config still loads");
        assert_eq!(loaded.crossfade_seconds, 3.0);
        assert!(!serde_json::to_string(&loaded).unwrap().contains("download"));
    }

    /// A config written before custom presets and shortcuts existed (and
    /// still carrying the removed Last.fm fields) keeps every other value
    /// instead of failing to parse and falling back to defaults.
    #[test]
    fn test_config_from_before_presets_and_shortcuts_still_loads() {
        let mut saved = serde_json::to_value(AppConfig { crossfade_seconds: 4.0, ..AppConfig::default() }).unwrap();
        let obj = saved.as_object_mut().unwrap();
        obj.remove("equalizer_custom_presets");
        obj.remove("shortcuts");
        obj.insert("lastfm_enabled".into(), serde_json::json!(true));
        obj.insert("lastfm_api_key".into(), serde_json::json!("k"));
        let loaded: AppConfig = serde_json::from_value(saved).expect("old config still loads");
        assert_eq!(loaded.crossfade_seconds, 4.0);
        assert!(loaded.equalizer_custom_presets.is_empty());
        assert_eq!(loaded.shortcuts, crate::shortcuts::default_shortcuts());
    }

    #[test]
    fn test_custom_presets_are_sanitized() {
        let preset = |id: &str, name: &str, gains: Vec<f64>, preamp: f64| CustomEqPreset {
            id: id.into(),
            name: name.into(),
            gains,
            preamp,
        };
        let config = AppConfig {
            equalizer_custom_presets: vec![
                preset("user-abc", "  Mój bas \n", vec![99.0, -99.0], f64::NAN),
                preset("user-abc", "duplicate", vec![0.0; 10], 0.0),
                preset("flat", "shadows a built-in", vec![0.0; 10], 0.0),
                preset("user-x", "", vec![1.0; 40], 30.0),
            ],
            ..AppConfig::default()
        }
        .sanitized();
        let presets = &config.equalizer_custom_presets;
        assert_eq!(presets.iter().map(|p| p.id.as_str()).collect::<Vec<_>>(), vec!["user-abc", "user-x"]);
        assert_eq!(presets[0].name, "Mój bas");
        assert_eq!(presets[0].gains, vec![24.0, -24.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]);
        assert_eq!(presets[0].preamp, 0.0);
        assert_eq!(presets[1].name, "user-x");
        assert_eq!(presets[1].gains.len(), 10);
        assert_eq!(presets[1].preamp, 24.0);

        let many = AppConfig {
            equalizer_custom_presets: (0..50).map(|i| preset(&format!("user-{i}"), "p", vec![0.0; 10], 0.0)).collect(),
            ..AppConfig::default()
        }
        .sanitized();
        assert_eq!(many.equalizer_custom_presets.len(), MAX_CUSTOM_PRESETS);
    }

    #[test]
    fn test_shortcuts_keep_known_actions_and_fill_missing_ones() {
        let mut shortcuts = BTreeMap::new();
        shortcuts.insert("next".to_string(), "Control+Alt+ArrowRight".to_string());
        shortcuts.insert("format_disk".to_string(), "Control+KeyF".to_string());
        shortcuts.insert("like".to_string(), "x".repeat(500));
        let clean = AppConfig { shortcuts, ..AppConfig::default() }.sanitized().shortcuts;
        assert_eq!(clean.get("next").map(String::as_str), Some("Control+Alt+ArrowRight"));
        assert!(!clean.contains_key("format_disk"));
        assert_eq!(clean.get("like").map(String::as_str), Some(""), "too long: back to the default (none)");
        assert_eq!(clean.get("play_pause").map(String::as_str), Some("MediaPlayPause"));
        assert_eq!(clean.len(), crate::shortcuts::ACTIONS.len());
    }
}
