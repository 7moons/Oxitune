//! `manifest.json`: what a plugin is, what it may do, and what it runs.
//! Everything a manifest says is checked here before a plugin is installed,
//! loaded from a dev folder, or shown to the user. See docs/PLUGIN_API.md.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;

/// The plugin API this Oxitune speaks. A manifest asking for another is
/// refused (and says which Oxitune it needs).
pub const API_VERSION: u32 = 1;

/// The closed set of permissions. `external` ones can be granted to any
/// plugin; the rest belong to Oxitune's built-in plugins only.
pub const PERMISSIONS: &[(&str, bool)] = &[
    ("player:read", true),
    ("player:control", true),
    ("page", true),
    ("storage", true),
    ("network", true),
    ("ui", true),
    ("media:save", true),
    ("internal:config", false),
    ("internal:lyrics", false),
    ("internal:sync", false),
    ("internal:remote", false),
    ("internal:power", false),
    ("internal:windows", false),
    ("internal:notify", false),
];

pub const MAX_ENTRY_BYTES: u64 = 1024 * 1024;
pub const MAX_STYLE_BYTES: u64 = 256 * 1024;
pub const MAX_PLUGIN_BYTES: u64 = 5 * 1024 * 1024;
const MAX_TEXT: usize = 500;
const MAX_SETTINGS: usize = 50;
const MAX_HOSTS: usize = 20;

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum RunAt {
    DocumentStart,
    #[default]
    DocumentIdle,
}

/// A label in one language, or per language (`{"en": ..., "pl": ...}`).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum Text {
    Plain(String),
    Localized(BTreeMap<String, String>),
}

impl Text {
    fn validate(&self, what: &str) -> Result<(), String> {
        let ok = match self {
            Text::Plain(s) => !s.trim().is_empty() && s.chars().count() <= MAX_TEXT,
            Text::Localized(m) => {
                m.contains_key("en")
                    && m.len() <= 8
                    && m.iter().all(|(k, v)| k.len() <= 8 && !v.trim().is_empty() && v.chars().count() <= MAX_TEXT)
            }
        };
        if ok {
            Ok(())
        } else {
            Err(format!("{what}: empty, too long, or missing an \"en\" text"))
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SettingType {
    Boolean,
    Number,
    String,
    Select,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SettingOption {
    pub value: String,
    pub label: Text,
}

/// One setting the Settings window renders for the plugin.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SettingSpec {
    pub key: String,
    #[serde(rename = "type")]
    pub kind: SettingType,
    pub label: Text,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<Text>,
    pub default: Value,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub min: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max: Option<f64>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub options: Vec<SettingOption>,
}

impl SettingSpec {
    /// `value` coerced to this setting's type and bounds, or `None`.
    pub fn coerce(&self, value: &Value) -> Option<Value> {
        match self.kind {
            SettingType::Boolean => value.as_bool().map(Value::Bool),
            SettingType::Number => {
                let n = value.as_f64().filter(|n| n.is_finite())?;
                let n = n.max(self.min.unwrap_or(f64::MIN)).min(self.max.unwrap_or(f64::MAX));
                serde_json::Number::from_f64(n).map(Value::Number)
            }
            SettingType::String => value
                .as_str()
                .map(|s| Value::String(s.chars().filter(|c| !c.is_control()).take(MAX_TEXT).collect())),
            SettingType::Select => value
                .as_str()
                .filter(|s| self.options.iter().any(|o| o.value == *s))
                .map(|s| Value::String(s.to_string())),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Manifest {
    pub id: String,
    pub name: String,
    pub version: String,
    pub api_version: u32,
    pub description: String,
    pub author: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub homepage: Option<String>,
    pub matches: Vec<String>,
    #[serde(default)]
    pub run_at: RunAt,
    #[serde(default)]
    pub permissions: Vec<String>,
    /// Hosts `network` may reach (`api.example.com`), nothing else.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub hosts: Vec<String>,
    pub entry: String,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub styles: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub settings: Vec<SettingSpec>,
}

/// Reverse-DNS: at least two dot-separated labels of `a-z0-9-`, no leading
/// or trailing `-`, at most 100 chars. Also a safe directory name.
pub fn is_valid_id(id: &str) -> bool {
    let labels: Vec<&str> = id.split('.').collect();
    id.len() <= 100
        && labels.len() >= 2
        && labels.iter().all(|l| {
            !l.is_empty()
                && l.len() <= 63
                && !l.starts_with('-')
                && !l.ends_with('-')
                && l.bytes().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
        })
}

/// A file inside the plugin folder: relative, `/`-separated, no `..`, no
/// hidden parts, `.js` or `.css`.
pub fn is_safe_file(path: &str, ext: &str) -> bool {
    path.len() <= 200
        && path.ends_with(ext)
        && !path.starts_with('/')
        && !path.contains('\\')
        && path.split('/').all(|p| {
            !p.is_empty() && !p.starts_with('.') && p.bytes().all(|b| b.is_ascii_alphanumeric() || b"-_.".contains(&b))
        })
}

fn is_valid_host(host: &str) -> bool {
    !host.is_empty()
        && host.len() <= 253
        && host.contains('.')
        && host.split('.').all(|l| !l.is_empty() && l.len() <= 63 && l.bytes().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-'))
}

pub fn is_external_permission(p: &str) -> bool {
    PERMISSIONS.iter().any(|(name, external)| *name == p && *external)
}

impl Manifest {
    pub fn parse(json: &[u8]) -> Result<Manifest, String> {
        let manifest: Manifest = serde_json::from_slice(json).map_err(|e| format!("manifest.json: {e}"))?;
        manifest.validate(false)?;
        Ok(manifest)
    }

    /// `builtin` allows the `internal:*` permissions.
    pub fn validate(&self, builtin: bool) -> Result<(), String> {
        if !is_valid_id(&self.id) {
            return Err(format!("id {:?} is not reverse-DNS (e.g. com.example.my-plugin)", self.id));
        }
        if self.api_version != API_VERSION {
            return Err(format!("needs plugin API {}, this Oxitune has {API_VERSION}", self.api_version));
        }
        semver::Version::parse(&self.version).map_err(|_| format!("version {:?} is not semver", self.version))?;
        Text::Plain(self.name.clone()).validate("name")?;
        Text::Plain(self.description.clone()).validate("description")?;
        Text::Plain(self.author.clone()).validate("author")?;
        if let Some(home) = &self.homepage {
            let url = url::Url::parse(home).map_err(|_| "homepage is not a URL".to_string())?;
            if url.scheme() != "https" {
                return Err("homepage must be https".into());
            }
        }
        if self.matches.is_empty() || !self.matches.iter().all(|m| m.starts_with("https://music.youtube.com/")) {
            return Err("matches must be https://music.youtube.com/ patterns".into());
        }
        let mut seen = std::collections::HashSet::new();
        for p in &self.permissions {
            if !seen.insert(p) {
                return Err(format!("permission {p} listed twice"));
            }
            match PERMISSIONS.iter().find(|(name, _)| name == p) {
                None => return Err(format!("unknown permission {p}")),
                Some((_, false)) if !builtin => return Err(format!("{p} is only for Oxitune's built-in plugins")),
                _ => {}
            }
        }
        let network = self.permissions.iter().any(|p| p == "network");
        if network == self.hosts.is_empty() {
            return Err("network needs hosts, and hosts need the network permission".into());
        }
        if self.hosts.len() > MAX_HOSTS || !self.hosts.iter().all(|h| is_valid_host(h)) {
            return Err("hosts must be plain host names".into());
        }
        if !is_safe_file(&self.entry, ".js") {
            return Err(format!("entry {:?} must be a .js file inside the plugin", self.entry));
        }
        if !self.styles.is_empty() && !self.permissions.iter().any(|p| p == "ui") {
            return Err("styles need the ui permission".into());
        }
        if !self.styles.iter().all(|s| is_safe_file(s, ".css")) {
            return Err("styles must be .css files inside the plugin".into());
        }
        if self.settings.len() > MAX_SETTINGS {
            return Err("too many settings".into());
        }
        let mut keys = std::collections::HashSet::new();
        for s in &self.settings {
            if !keys.insert(&s.key) || s.key.is_empty() || s.key.len() > 64 || !s.key.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'_') {
                return Err(format!("setting key {:?} is invalid or repeated", s.key));
            }
            s.label.validate("setting label")?;
            if let Some(d) = &s.description {
                d.validate("setting description")?;
            }
            if s.kind == SettingType::Select && s.options.is_empty() {
                return Err(format!("select setting {} has no options", s.key));
            }
            for o in &s.options {
                o.label.validate("option label")?;
            }
            if s.coerce(&s.default).as_ref() != Some(&s.default) {
                return Err(format!("default of setting {} doesn't fit its type", s.key));
            }
        }
        Ok(())
    }

    /// Permissions this version asks for that `granted` doesn't have.
    pub fn new_permissions(&self, granted: &[String]) -> Vec<String> {
        self.permissions.iter().filter(|p| !granted.contains(p)).cloned().collect()
    }

    /// Defaults for every setting, overridden by valid saved values.
    pub fn settings_values(&self, saved: Option<&serde_json::Map<String, Value>>) -> serde_json::Map<String, Value> {
        self.settings
            .iter()
            .map(|s| {
                let v = saved.and_then(|m| m.get(&s.key)).and_then(|v| s.coerce(v)).unwrap_or_else(|| s.default.clone());
                (s.key.clone(), v)
            })
            .collect()
    }
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    use serde_json::json;

    pub(crate) fn sample() -> Value {
        json!({
            "id": "com.example.theme",
            "name": "Theme",
            "version": "1.0.0",
            "apiVersion": 1,
            "description": "A theme",
            "author": "Someone",
            "matches": ["https://music.youtube.com/*"],
            "permissions": ["ui"],
            "entry": "main.js",
            "styles": ["theme.css"],
            "settings": [
                { "key": "strength", "type": "number", "label": {"en": "Strength", "pl": "Siła"}, "default": 0.5, "min": 0, "max": 1 },
                { "key": "mode", "type": "select", "label": "Mode", "default": "dark",
                  "options": [{"value": "dark", "label": "Dark"}, {"value": "light", "label": "Light"}] }
            ]
        })
    }

    fn with(patch: Value) -> Result<Manifest, String> {
        let mut v = sample();
        for (k, val) in patch.as_object().unwrap() {
            if val.is_null() {
                v.as_object_mut().unwrap().remove(k);
            } else {
                v[k] = val.clone();
            }
        }
        Manifest::parse(&serde_json::to_vec(&v).unwrap())
    }

    #[test]
    fn test_valid_manifest_parses() {
        let m = with(json!({})).unwrap();
        assert_eq!(m.run_at, RunAt::DocumentIdle);
        assert_eq!(m.settings_values(None)["mode"], "dark");
    }

    #[test]
    fn test_ids_versions_and_api() {
        for id in ["Com.Example", "single", "com..x", "com.-x", "../evil", "com.example/../x", "com.ex_ample"] {
            assert!(with(json!({ "id": id })).is_err(), "{id}");
        }
        assert!(with(json!({ "version": "1.0" })).is_err());
        assert!(with(json!({ "apiVersion": 2 })).unwrap_err().contains("needs plugin API 2"));
    }

    #[test]
    fn test_permissions_are_a_closed_set() {
        assert!(with(json!({ "permissions": ["ui", "fs"] })).is_err());
        assert!(with(json!({ "permissions": ["ui", "internal:config"] })).unwrap_err().contains("built-in"));
        assert!(with(json!({ "permissions": ["ui", "ui"] })).is_err());
        assert!(with(json!({ "permissions": ["ui", "network"] })).is_err(), "network needs hosts");
        assert!(with(json!({ "permissions": ["ui", "network"], "hosts": ["api.example.com"] })).is_ok());
        assert!(with(json!({ "hosts": ["api.example.com"] })).is_err(), "hosts need network");
        assert!(with(json!({ "permissions": ["ui", "network"], "hosts": ["https://x.com/"] })).is_err());
        assert!(with(json!({ "permissions": [] })).is_err(), "styles need ui");
    }

    #[test]
    fn test_files_stay_inside_the_plugin() {
        for entry in ["../main.js", "/abs/main.js", "a\\b.js", ".hidden.js", "main.ts", "dir/../main.js"] {
            assert!(with(json!({ "entry": entry })).is_err(), "{entry}");
        }
        assert!(with(json!({ "entry": "dist/main.js" })).is_ok());
        assert!(with(json!({ "styles": ["../x.css"] })).is_err());
    }

    #[test]
    fn test_matches_only_youtube_music_and_https_homepage() {
        assert!(with(json!({ "matches": ["https://evil.example/*"] })).is_err());
        assert!(with(json!({ "matches": [] })).is_err());
        assert!(with(json!({ "homepage": "http://example.com" })).is_err());
        assert!(with(json!({ "homepage": "https://example.com" })).is_ok());
    }

    #[test]
    fn test_settings_schema_and_values() {
        assert!(with(json!({ "settings": [{ "key": "x", "type": "select", "label": "X", "default": "a", "options": [] }] })).is_err());
        assert!(with(json!({ "settings": [{ "key": "x", "type": "number", "label": "X", "default": "no" }] })).is_err());
        assert!(with(json!({ "settings": [{ "key": "bad key", "type": "boolean", "label": "X", "default": true }] })).is_err());
        assert!(with(json!({ "settings": [{ "key": "x", "type": "boolean", "label": {"pl": "tylko pl"}, "default": true }] })).is_err());
        let m = with(json!({})).unwrap();
        let saved = json!({ "strength": 9, "mode": "neon", "unknown": 1 });
        let values = m.settings_values(saved.as_object());
        assert_eq!(values["strength"], 1.0, "clamped to max");
        assert_eq!(values["mode"], "dark", "not an option: default");
        assert!(!values.contains_key("unknown"));
    }

    #[test]
    fn test_new_permissions_on_update() {
        let m = with(json!({ "permissions": ["ui", "storage"] })).unwrap();
        assert_eq!(m.new_permissions(&["ui".into()]), vec!["storage".to_string()]);
        assert!(m.new_permissions(&["ui".into(), "storage".into()]).is_empty());
    }
}

#[cfg(test)]
mod builtin_tests {
    use super::*;

    /// Oxitune's own plugins (src/plugins/*/manifest.json) pass the same checks,
    /// with the built-in permissions allowed.
    #[test]
    fn test_builtin_manifests_are_valid() {
        let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../src/plugins");
        let mut count = 0;
        for entry in std::fs::read_dir(root).unwrap().flatten() {
            let path = entry.path().join("manifest.json");
            if !path.exists() {
                continue;
            }
            let m: Manifest = serde_json::from_slice(&std::fs::read(&path).unwrap()).unwrap();
            m.validate(true).unwrap_or_else(|e| panic!("{}: {e}", path.display()));
            assert!(m.id.starts_with("app.oxitune."));
            count += 1;
        }
        assert!(count >= 10, "found {count} built-in manifests");
    }

}
