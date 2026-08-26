use serde::Serialize;
use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;

#[derive(Serialize, Clone, Debug, PartialEq)]
pub struct UpdateInfo {
    pub version: String,
    pub current_version: String,
    pub body: Option<String>,
    pub date: Option<String>,
}

/// Checks the configured update endpoint for a newer signed release.
/// Returns `None` when the running version is already current.
pub async fn check_for_update(app: &AppHandle) -> Result<Option<UpdateInfo>, String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    let update = updater.check().await.map_err(|e| e.to_string())?;

    Ok(update.map(|u| UpdateInfo {
        version: u.version.clone(),
        current_version: u.current_version.clone(),
        body: u.body.clone(),
        date: u.date.map(|d| d.to_string()),
    }))
}

/// Downloads and installs the latest available update, then restarts the app.
/// No-ops with an error if no update is currently available.
pub async fn install_update(app: &AppHandle) -> Result<(), String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    let update = updater
        .check()
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "No update is available".to_string())?;

    update
        .download_and_install(|_chunk_len, _total_len| {}, || {})
        .await
        .map_err(|e| e.to_string())?;

    app.request_restart();
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Locks the wire contract with `src/ui/settings.ts`'s `UpdateInfo`
    /// interface: a field rename here silently breaks the Settings "update
    /// available" card (it reads `info.version`/`info.body` as plain JS
    /// object keys with no compiler to catch a mismatch on that side).
    #[test]
    fn update_info_serializes_with_the_field_names_settings_ts_expects() {
        let info = UpdateInfo {
            version: "1.2.3".to_string(),
            current_version: "1.0.0".to_string(),
            body: Some("Bug fixes".to_string()),
            date: Some("2026-01-01".to_string()),
        };

        let value = serde_json::to_value(&info).unwrap();
        assert_eq!(value["version"], "1.2.3");
        assert_eq!(value["current_version"], "1.0.0");
        assert_eq!(value["body"], "Bug fixes");
        assert_eq!(value["date"], "2026-01-01");
    }

    #[test]
    fn update_info_serializes_nulls_for_absent_body_and_date() {
        let info = UpdateInfo {
            version: "1.2.3".to_string(),
            current_version: "1.0.0".to_string(),
            body: None,
            date: None,
        };

        let value = serde_json::to_value(&info).unwrap();
        assert!(value["body"].is_null());
        assert!(value["date"].is_null());
    }
}
