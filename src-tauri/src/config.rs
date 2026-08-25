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
    pub lastfm_enabled: bool,
    pub lastfm_api_key: String,
    pub lastfm_secret: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            autostart: false,
            minimize_to_tray: true,
            close_to_tray: true,
            discord_rpc_enabled: true,
            mpris_enabled: true,
            notifications_enabled: true,
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
        assert_eq!(config.wheel_volume_step, 0.05);
        assert_eq!(config.quality, "high");
    }

    #[test]
    fn test_config_serialization() {
        let config = AppConfig::default();
        let serialized = serde_json::to_string(&config).expect("Serialization failed");
        let deserialized: AppConfig = serde_json::from_str(&serialized).expect("Deserialization failed");
        assert_eq!(deserialized.theme, "default-dark");
        assert_eq!(deserialized.mpris_enabled, true);
    }
}
