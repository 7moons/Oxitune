//! The injected-page → Rust command bridge.
//!
//! The main window loads the external `https://music.youtube.com` origin, so
//! its injected script can't call `#[tauri::command]`s directly. Instead
//! `invokeBackend()` (src/preload/index.ts) emits a `ytmd-invoke` event with
//! `{ id, cmd, args }`, `lib.rs` hands it to [`dispatch`], and the result goes
//! back on `ytmd-response-{id}` wrapped by [`response_envelope`]:
//!
//! ```json
//! { "ok": true,  "data": <value or null> }
//! { "ok": false, "error": "<message>" }
//! ```
//!
//! Every bridge-callable command is declared exactly once, in the
//! `bridge_commands!` invocation below: the macro generates both
//! [`BRIDGE_COMMANDS`] and [`dispatch`]'s `match` from that one list, so a
//! command can't be listed without being dispatched (or the reverse).
//! `src/tests/sync.test.ts` parses the same list and fails if the injected
//! page invokes anything missing from it — a missing command used to fail
//! silently (the call just timed out), which is how Listen Together and the
//! sleep inhibitor were once dead.

use crate::{commands, config, discord_rpc::TrackPayload, downloader, lyrics, remote_server, sync_room, AppState};
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Arc;
use tauri::{AppHandle, Manager};

/// Wraps a dispatch result in the wire envelope described in the module docs.
pub fn response_envelope(result: Result<Value, String>) -> Value {
    match result {
        Ok(data) => serde_json::json!({ "ok": true, "data": data }),
        Err(error) => serde_json::json!({ "ok": false, "error": error }),
    }
}

/// Deserializes a command's `args`, naming the command and including serde's
/// own message on failure so a shape mismatch is debuggable from the page.
fn parse_args<T: DeserializeOwned>(cmd: &str, args: Option<Value>) -> Result<T, String> {
    serde_json::from_value(args.unwrap_or(Value::Null))
        .map_err(|e| format!("Invalid arguments for `{cmd}`: {e}"))
}

fn to_data<T: Serialize>(value: T) -> Result<Value, String> {
    serde_json::to_value(value).map_err(|e| e.to_string())
}

#[derive(Deserialize)]
struct SaveConfigArgs {
    config: config::AppConfig,
}

#[derive(Deserialize)]
struct UpdateTrackArgs {
    track: TrackPayload,
}

#[derive(Deserialize)]
struct NotifyArgs {
    title: String,
    artist: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LyricsOffsetArgs {
    offset_secs: f64,
}

#[derive(Deserialize)]
struct PickLyricsArgs {
    provider: String,
    id: String,
}

#[derive(Deserialize)]
struct ImportOffsetsArgs {
    entries: Vec<(String, f64)>,
}

#[derive(Deserialize)]
struct BroadcastSyncArgs {
    playback: sync_room::SyncPlaybackState,
}

#[derive(Deserialize)]
struct SyncControlArgs {
    action: sync_room::SyncControl,
}

#[derive(Deserialize)]
struct QueueAddArgs {
    input: String,
    #[serde(default)]
    next: bool,
}

#[derive(Deserialize)]
struct QueueMoveArgs {
    #[serde(rename = "itemId")]
    item_id: String,
    #[serde(rename = "toIndex")]
    to_index: usize,
}

#[derive(Deserialize)]
struct QueueItemArgs {
    #[serde(rename = "itemId")]
    item_id: String,
}

#[derive(Deserialize)]
struct ReactionArgs {
    emoji: String,
}

#[derive(Deserialize)]
struct InhibitSleepArgs {
    inhibit: bool,
}

#[derive(Deserialize)]
struct DownloadArgs {
    request: downloader::DownloadRequest,
}

/// Declares the bridge command table. Each entry is
/// `"name" => |handle, state, args| { body }`, where the body evaluates to
/// `Result<Value, String>` and may `.await`.
macro_rules! bridge_commands {
    ($($name:literal => |$h:ident, $s:ident, $a:ident| $body:block)*) => {
        /// Every command the injected page may invoke, in declaration order.
        pub const BRIDGE_COMMANDS: &[&str] = &[$($name),*];

        /// Runs one bridge command. Unknown commands, malformed args and
        /// command failures all come back as `Err` with a readable message.
        pub async fn dispatch(
            handle: AppHandle,
            state: Arc<AppState>,
            cmd: &str,
            args: Option<Value>,
        ) -> Result<Value, String> {
            match cmd {
                $($name => {
                    #[allow(unused_variables)]
                    let $h = &handle;
                    #[allow(unused_variables)]
                    let $s = &state;
                    #[allow(unused_variables)]
                    let $a = args;
                    $body
                })*
                other => Err(format!("Unknown bridge command `{other}`")),
            }
        }
    };
}

bridge_commands! {
    "get_config" => |h, state, args| {
        to_data(state.config_manager.load())
    }
    "take_resume_session" => |h, state, args| {
        // Once per launch; never while in a room (the host decides the song).
        let target = state.session.take_resume();
        if state.sync_room.get_room_state().is_some() {
            return Ok(Value::Null);
        }
        to_data(target)
    }
    "save_config" => |h, state, args| {
        let p: SaveConfigArgs = parse_args("save_config", args)?;
        state.config_manager.save(&p.config)?;
        Ok(Value::Null)
    }
    "get_remote_info" => |h, state, args| {
        let port = state.remote_status.serving_port()?;
        to_data(remote_server::get_remote_info(port, &state.remote_token))
    }
    "toggle_settings_window" => |h, state, args| {
        commands::toggle_settings_window(h.clone())?;
        Ok(Value::Null)
    }
    "toggle_mini_player" => |h, state, args| {
        commands::toggle_mini_player(h.clone())?;
        Ok(Value::Null)
    }
    "toggle_local_library_window" => |h, state, args| {
        commands::toggle_local_library_window(h.clone())?;
        Ok(Value::Null)
    }
    "toggle_sync_window" => |h, state, args| {
        commands::toggle_sync_window(h.clone())?;
        Ok(Value::Null)
    }
    "update_track_info" => |h, state, args| {
        let p: UpdateTrackArgs = parse_args("update_track_info", args)?;
        commands::update_track_info(h.clone(), h.state::<Arc<AppState>>(), p.track)?;
        Ok(Value::Null)
    }
    "notify_track_change" => |h, state, args| {
        let p: NotifyArgs = parse_args("notify_track_change", args)?;
        commands::notify_track_change(h.clone(), h.state::<Arc<AppState>>(), p.title, p.artist)?;
        Ok(Value::Null)
    }
    "fetch_lyrics" => |h, state, args| {
        let p: lyrics::commands::FetchArgs = parse_args("fetch_lyrics", args)?;
        to_data(lyrics::commands::fetch(h, state, p).await)
    }
    "get_current_lyrics" => |h, state, args| {
        to_data(state.lyrics.current.lock().clone())
    }
    "set_lyrics_offset" => |h, state, args| {
        let p: LyricsOffsetArgs = parse_args("set_lyrics_offset", args)?;
        to_data(lyrics::commands::set_offset(&state.lyrics, p.offset_secs, h)?)
    }
    "list_lyrics_candidates" => |h, state, args| {
        to_data(lyrics::commands::candidates(state).await?)
    }
    "pick_lyrics" => |h, state, args| {
        let p: PickLyricsArgs = parse_args("pick_lyrics", args)?;
        to_data(lyrics::commands::pick(&state.lyrics, &p.provider, &p.id, h)?)
    }
    "import_lyrics_offsets" => |h, state, args| {
        let p: ImportOffsetsArgs = parse_args("import_lyrics_offsets", args)?;
        to_data(lyrics::commands::import_offsets(&state.lyrics, p.entries, h))
    }
    "broadcast_sync_state" => |h, state, args| {
        let p: BroadcastSyncArgs = parse_args("broadcast_sync_state", args)?;
        let sink: Arc<dyn sync_room::SyncEventSink> = Arc::new(h.clone());
        sync_room::broadcast_playback(&state.sync_room, &sink, p.playback);
        Ok(Value::Null)
    }
    "send_sync_control" => |h, state, args| {
        let p: SyncControlArgs = parse_args("send_sync_control", args)?;
        sync_room::send_control(&state.sync_room, p.action)?;
        Ok(Value::Null)
    }
    "get_sync_room_state" => |h, state, args| {
        to_data(state.sync_room.get_room_state())
    }
    // A listener's next button (and anyone's, if they choose) votes instead.
    "vote_sync_skip" => |h, state, args| {
        let sink: Arc<dyn sync_room::SyncEventSink> = Arc::new(h.clone());
        sync_room::vote_skip(&state.sync_room, &sink)?;
        Ok(Value::Null)
    }
    "send_sync_reaction" => |h, state, args| {
        let p: ReactionArgs = parse_args("send_sync_reaction", args)?;
        let sink: Arc<dyn sync_room::SyncEventSink> = Arc::new(h.clone());
        sync_room::send_reaction(&state.sync_room, &sink, &p.emoji)?;
        Ok(Value::Null)
    }
    // The shared queue panel and YTM's own queue menu items, in a room.
    "sync_queue_add" => |h, state, args| {
        let p: QueueAddArgs = parse_args("sync_queue_add", args)?;
        commands::add_to_sync_queue(h.clone(), state, &p.input, p.next).await?;
        Ok(Value::Null)
    }
    "sync_queue_remove" => |h, state, args| {
        let p: QueueItemArgs = parse_args("sync_queue_remove", args)?;
        sync_room::queue_remove(&state.sync_room, &commands::sync_sink(h.clone()), &p.item_id)?;
        Ok(Value::Null)
    }
    "sync_queue_play" => |h, state, args| {
        let p: QueueItemArgs = parse_args("sync_queue_play", args)?;
        sync_room::queue_play(&state.sync_room, &commands::sync_sink(h.clone()), &p.item_id)?;
        Ok(Value::Null)
    }
    "sync_queue_move" => |h, state, args| {
        let p: QueueMoveArgs = parse_args("sync_queue_move", args)?;
        sync_room::queue_move(&state.sync_room, &commands::sync_sink(h.clone()), &p.item_id, p.to_index)?;
        Ok(Value::Null)
    }
    // Host page, as its song ends: the next song from the shared queue.
    "sync_queue_take_next" => |h, state, args| {
        let sink: Arc<dyn sync_room::SyncEventSink> = Arc::new(h.clone());
        to_data(sync_room::queue_take_next(&state.sync_room, &sink))
    }
    "set_inhibit_sleep" => |h, state, args| {
        let p: InhibitSleepArgs = parse_args("set_inhibit_sleep", args)?;
        state.power_manager.set_inhibit_sleep(p.inhibit);
        Ok(Value::Null)
    }
    // Returns as soon as the download starts: a download outlives any
    // reasonable bridge timeout, so progress, completion and failure are
    // reported through `download-progress` events instead.
    "download_track" => |h, state, args| {
        let p: DownloadArgs = parse_args("download_track", args)?;
        let handle = h.clone();
        tauri::async_runtime::spawn(async move {
            let state = handle.state::<Arc<AppState>>();
            if let Err(e) = commands::download_track(handle.clone(), state, p.request).await {
                log::warn!("download failed: {e}");
            }
        });
        Ok(Value::Null)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    #[test]
    fn test_envelope_success_shape() {
        let v = response_envelope(Ok(serde_json::json!({ "a": 1 })));
        assert_eq!(v, serde_json::json!({ "ok": true, "data": { "a": 1 } }));
        assert_eq!(response_envelope(Ok(Value::Null)), serde_json::json!({ "ok": true, "data": null }));
    }

    #[test]
    fn test_envelope_error_shape() {
        let v = response_envelope(Err("boom".to_string()));
        assert_eq!(v, serde_json::json!({ "ok": false, "error": "boom" }));
    }

    #[test]
    fn test_parse_args_error_names_command_and_serde_reason() {
        let err = parse_args::<InhibitSleepArgs>("set_inhibit_sleep", Some(serde_json::json!({ "inhibit": "yes" })))
            .err()
            .expect("string is not a bool");
        assert!(err.starts_with("Invalid arguments for `set_inhibit_sleep`:"), "{err}");
        assert!(err.contains("invalid type"), "{err}");

        let missing = parse_args::<InhibitSleepArgs>("set_inhibit_sleep", None).err().expect("args required");
        assert!(missing.contains("set_inhibit_sleep"), "{missing}");
    }

    /// Regression: the bridge used to deserialize `save_config`'s args with
    /// `if let Ok(..)` and reply success either way, so a malformed config
    /// silently didn't save.
    #[test]
    fn test_save_config_rejects_malformed_config() {
        let err = parse_args::<SaveConfigArgs>("save_config", Some(serde_json::json!({ "config": 42 })))
            .err()
            .expect("a number is not a config");
        assert!(err.contains("save_config"), "{err}");
    }

    #[test]
    fn test_bridge_commands_unique_and_cover_injected_page() {
        let set: HashSet<&str> = BRIDGE_COMMANDS.iter().copied().collect();
        assert_eq!(set.len(), BRIDGE_COMMANDS.len(), "duplicate bridge command");
        // What src/preload + src/plugins invoke today; sync.test.ts checks
        // this against the TS sources themselves.
        for cmd in [
            "broadcast_sync_state",
            "send_sync_control",
            "download_track",
            "fetch_lyrics",
            "get_current_lyrics",
            "set_lyrics_offset",
            "list_lyrics_candidates",
            "pick_lyrics",
            "import_lyrics_offsets",
            "get_config",
            "get_remote_info",
            "notify_track_change",
            "set_inhibit_sleep",
            "toggle_local_library_window",
            "toggle_mini_player",
            "toggle_settings_window",
            "toggle_sync_window",
            "update_track_info",
            "get_sync_room_state",
            "vote_sync_skip",
            "send_sync_reaction",
            "sync_queue_take_next",
            "sync_queue_add",
            "sync_queue_remove",
            "sync_queue_play",
            "sync_queue_move",
            "save_config",
        ] {
            assert!(set.contains(cmd), "`{cmd}` missing from BRIDGE_COMMANDS");
        }
    }
}
