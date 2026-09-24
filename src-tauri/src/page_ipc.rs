//! What the music.youtube.com page (main window) can see and call.
//!
//! The page is a remote origin: YouTube's own scripts (and anything that
//! manages to run in that top frame) share the JS realm with our injected
//! script, so everything the page can reach, they can reach too. It gets
//! exactly two commands (`capabilities/main.json`) and no event access:
//!
//! - `ytmd_bridge { cmd, args }`: the narrow command table in `bridge.rs`,
//!   answered directly (no broadcast reply events any more).
//! - `ytmd_subscribe { channel }`: a Tauri channel on which Rust relays the
//!   app events the page reacts to (`PAGE_EVENTS`), filtered through the
//!   projections below. Events it isn't listed for (room codes, join links,
//!   remote tokens, local scans, ...) never reach it.

use crate::config::AppConfig;
use crate::sync_room::RoomState;
use parking_lot::Mutex;
use serde::Serialize;
use serde_json::{Map, Value};
use tauri::ipc::Channel;
use tauri::{AppHandle, Listener, Manager};

/// App events relayed to the page, and nothing else.
pub const PAGE_EVENTS: &[&str] = &[
    // Player control from the tray, media keys, shortcuts, mini player.
    "player-command",
    "tray-command",
    "mpris-command",
    "global-shortcut-event",
    "player-seek",
    "mpris-command-seek",
    "player-volume",
    // Live settings from the Settings window.
    "config-updated",
    "set-ambient-enabled",
    "set-ambient-intensity",
    "set-custom-css",
    "set-eq-band",
    "set-eq-all",
    "set-eq-preset",
    "set-preamp",
    "set-crossfade-seconds",
    "set-skip-silence",
    "set-loudness-normalization",
    "set-playback-rate",
    "set-preserves-pitch",
    // Lyrics, Listen Together, phone remote.
    "lyrics-changed",
    "sync-room-updated",
    "sync-room-left",
    "sync-playback-remote",
    "sync-control-remote",
    "sync-reaction",
    "remote-action",
    "remote-clients",
];

/// Config fields the page's plugins read. Paths, ports, the remote and
/// Discord settings stay out.
pub const PAGE_CONFIG_KEYS: &[&str] = &[
    "lyrics_enabled",
    "notifications_enabled",
    "remote_enabled",
    "wheel_volume_step",
    "wheel_volume_on_player_page",
    "custom_css",
    "equalizer_enabled",
    "equalizer_preset",
    "equalizer_gains",
    "preamp_gain",
    "loudness_normalization",
    "crossfade_seconds",
    "skip_silence_enabled",
    "playback_speed",
    "preserve_pitch",
    "ambient_lighting_enabled",
    "ambient_intensity",
    "inhibit_sleep",
    "pause_on_lock",
];

/// Keeps only `PAGE_CONFIG_KEYS` of a (possibly partial) config object.
pub fn project_config_value(value: &Value) -> Value {
    let mut out = Map::new();
    if let Some(obj) = value.as_object() {
        for key in PAGE_CONFIG_KEYS {
            if let Some(v) = obj.get(*key) {
                out.insert((*key).to_string(), v.clone());
            }
        }
    }
    Value::Object(out)
}

pub fn page_config(config: &AppConfig) -> Value {
    project_config_value(&serde_json::to_value(config).unwrap_or(Value::Null))
}

/// The room as the page sees it: no room code (it is the room's secret),
/// no ban list or waiting guests. `room_id` is a stable, non-secret id the
/// page uses to tell one room from the next.
pub fn page_room_value(room: &RoomState) -> Value {
    let mut value = serde_json::to_value(room).unwrap_or(Value::Null);
    if let Some(obj) = value.as_object_mut() {
        obj.remove("room_code");
        obj.remove("banned");
        obj.remove("pending");
        obj.insert("room_id".into(), Value::String(crate::join_link::party_id(&room.room_code)));
    }
    value
}

fn project_event(event: &str, payload: Value) -> Value {
    match event {
        "config-updated" => project_config_value(&payload),
        "sync-room-updated" => match serde_json::from_value::<RoomState>(payload) {
            Ok(room) => page_room_value(&room),
            Err(_) => Value::Null,
        },
        _ => payload,
    }
}

#[derive(Serialize, Clone)]
struct PageEvent<'a> {
    event: &'a str,
    payload: Value,
}

/// The page's current event channel (replaced on every page load).
#[derive(Default)]
pub struct PageChannel(Mutex<Option<Channel<Value>>>);

impl PageChannel {
    pub fn set(&self, channel: Channel<Value>) {
        *self.0.lock() = Some(channel);
    }

    fn send(&self, event: &str, payload: Value) {
        let guard = self.0.lock();
        if let Some(channel) = guard.as_ref() {
            let msg = serde_json::to_value(PageEvent { event, payload: project_event(event, payload) });
            if let Ok(msg) = msg {
                let _ = channel.send(msg);
            }
        }
    }
}

/// Relays `PAGE_EVENTS` (emitted by Rust or by the companion windows) to
/// the page's channel.
pub fn start_relay(app: &AppHandle) {
    app.manage(PageChannel::default());
    for &name in PAGE_EVENTS {
        let handle = app.clone();
        app.listen_any(name, move |event| {
            let payload = serde_json::from_str(event.payload()).unwrap_or(Value::Null);
            handle.state::<PageChannel>().send(name, payload);
        });
    }
}

/// True for the main window showing https://music.youtube.com. The ACL
/// already limits the two page commands to that window and origin; this is
/// the same check again inside the command, in case a capability file is
/// ever widened by mistake.
pub fn is_main_page(label: &str, url: Option<&url::Url>) -> bool {
    label == "main" && url.is_some_and(|u| u.scheme() == "https" && u.host_str() == Some("music.youtube.com"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_page_config_leaves_out_paths_ports_and_shortcuts() {
        let page = page_config(&AppConfig::default());
        let obj = page.as_object().unwrap();
        for secret in ["local_music_dir", "remote_port", "shortcuts", "discord_rpc_enabled", "custom_user_agent"] {
            assert!(!obj.contains_key(secret), "{secret} leaked to the page");
        }
        assert!(obj.contains_key("equalizer_gains"));
        assert!(obj.contains_key("custom_css"));
    }

    #[test]
    fn test_config_updated_event_is_projected() {
        let full = serde_json::json!({ "custom_css": "a{}", "local_music_dir": "/home/me/Music", "remote_port": 9 });
        assert_eq!(project_event("config-updated", full), serde_json::json!({ "custom_css": "a{}" }));
    }

    #[test]
    fn test_page_room_hides_the_code() {
        let room: RoomState = serde_json::from_value(serde_json::json!({
            "room_code": "YTMD-SECRET", "is_host": true, "current_user_id": "u", "members": [],
            "playback_state": null, "banned": [{ "client_hash": "h", "nickname": "n" }]
        }))
        .unwrap();
        let page = page_room_value(&room);
        let text = page.to_string();
        assert!(!text.contains("SECRET"));
        assert!(page.get("banned").is_none());
        assert_eq!(page["room_id"], crate::join_link::party_id("YTMD-SECRET"));
    }

    #[test]
    fn test_only_listed_events_are_relayed() {
        for sensitive in ["sync-join-link", "local-scan-progress", "track-changed", "sync-discord-invite", "ytmd-invoke"] {
            assert!(!PAGE_EVENTS.contains(&sensitive), "{sensitive}");
        }
    }

    #[test]
    fn test_is_main_page() {
        let ytm = url::Url::parse("https://music.youtube.com/watch?v=x").unwrap();
        let evil = url::Url::parse("https://music.youtube.com.evil.example/").unwrap();
        let http = url::Url::parse("http://music.youtube.com/").unwrap();
        assert!(is_main_page("main", Some(&ytm)));
        assert!(!is_main_page("settings", Some(&ytm)));
        assert!(!is_main_page("main", Some(&evil)));
        assert!(!is_main_page("main", Some(&http)));
        assert!(!is_main_page("main", None));
    }
}
