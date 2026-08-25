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
    pub theme: String,
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
    pub theme_preset: String,
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
            theme: "default-dark".to_string(),
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
            theme_preset: "default".to_string(),
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

pub struct ConfigManager {
    config_path: PathBuf,
}

impl ConfigManager {
    pub fn new() -> Self {
        let base_dir = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
        let app_dir = base_dir.join("ytmd");
        if !app_dir.exists() {
            let _ = fs::create_dir_all(&app_dir);
        }
        let config_path = app_dir.join("config.json");
        Self { config_path }
    }

    pub fn load(&self) -> AppConfig {
        if self.config_path.exists() {
            if let Ok(content) = fs::read_to_string(&self.config_path) {
                if let Ok(config) = serde_json::from_str::<AppConfig>(&content) {
                    return config;
                }
            }
        }
        let default_config = AppConfig::default();
        let _ = self.save(&default_config);
        default_config
    }

    pub fn save(&self, config: &AppConfig) -> Result<(), String> {
        let json = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
        fs::write(&self.config_path, json).map_err(|e| e.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

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
        assert_eq!(config.skip_silence_enabled, false);
        assert_eq!(config.playback_speed, 1.0);
        assert_eq!(config.preserve_pitch, true);
        assert_eq!(config.ambient_lighting_enabled, true);
        assert_eq!(config.ambient_intensity, 0.6);
        assert_eq!(config.theme_preset, "default");
        assert_eq!(config.download_format, "mp3");
        assert_eq!(config.embed_lyrics, true);
        assert_eq!(config.remote_enabled, true);
        assert_eq!(config.remote_port, 9863);
        assert_eq!(config.inhibit_sleep, true);
        assert_eq!(config.pause_on_lock, true);
        assert_eq!(config.wheel_volume_step, 0.05);
        assert_eq!(config.quality, "high");
    }

    #[test]
    fn test_config_serialization() {
        let mut config = AppConfig::default();
        config.equalizer_gains = vec![3.0, 2.5, 1.0, 0.0, -1.0, -2.0, 0.0, 1.5, 3.0, 4.0];
        config.preamp_gain = 1.5;
        config.crossfade_seconds = 5.0;
        config.skip_silence_enabled = true;
        config.playback_speed = 1.25;
        config.preserve_pitch = false;
        config.ambient_lighting_enabled = true;
        config.ambient_intensity = 0.8;
        config.theme_preset = "catppuccin".to_string();
        config.download_format = "flac".to_string();
        config.embed_lyrics = true;
        config.remote_enabled = false;
        config.remote_port = 8888;
        let serialized = serde_json::to_string(&config).expect("Serialization failed");
        let deserialized: AppConfig = serde_json::from_str(&serialized).expect("Deserialization failed");
        assert_eq!(deserialized.theme, "default-dark");
        assert_eq!(deserialized.mpris_enabled, true);
        assert_eq!(deserialized.equalizer_gains.len(), 10);
        assert_eq!(deserialized.equalizer_gains[0], 3.0);
        assert_eq!(deserialized.preamp_gain, 1.5);
        assert_eq!(deserialized.crossfade_seconds, 5.0);
        assert_eq!(deserialized.skip_silence_enabled, true);
        assert_eq!(deserialized.playback_speed, 1.25);
        assert_eq!(deserialized.preserve_pitch, false);
        assert_eq!(deserialized.ambient_lighting_enabled, true);
        assert_eq!(deserialized.ambient_intensity, 0.8);
        assert_eq!(deserialized.theme_preset, "catppuccin");
        assert_eq!(deserialized.download_format, "flac");
        assert_eq!(deserialized.embed_lyrics, true);
        assert_eq!(deserialized.remote_enabled, false);
        assert_eq!(deserialized.remote_port, 8888);
    }
}
