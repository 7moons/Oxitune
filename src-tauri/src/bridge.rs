//! The injected-page → Rust command bridge.
//!
//! The main window loads the external `https://music.youtube.com` origin.
//! Its capability (`capabilities/main.json`) allows exactly one command for
//! requests, `ytmd_bridge { cmd, args }` (`invokeBackend()` in
//! src/preload/bridgeClient.ts), which runs [`dispatch`] and answers the
//! invoke directly. Events reach the page only through `page_ipc.rs`.
//!
//! Everything here is callable by any script running in that page, not
//! just ours, so the table is the minimum the page needs to be a player:
//! no file system, no downloads, no whole-config reads or writes, no room
//! code, no remote token, no updater. Every command validates its input.
//!
//! Every bridge-callable command is declared exactly once, in the
//! `bridge_commands!` invocation below: the macro generates both
//! [`BRIDGE_COMMANDS`] and [`dispatch`]'s `match` from that one list, so a
//! command can't be listed without being dispatched (or the reverse).
//! `src/tests/sync.test.ts` parses the same list and fails if the injected
//! page invokes anything missing from it — a missing command used to fail
//! silently (the call just timed out), which is how Listen Together and the
//! sleep inhibitor were once dead.

use crate::{commands, discord_rpc::TrackPayload, lyrics, page_ipc, sync_room, AppState};
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Arc;
use tauri::{AppHandle, Manager};

/// Longest pasted link or id the shared queue accepts.
const MAX_QUEUE_INPUT_CHARS: usize = 300;
/// Most lyrics offsets imported from the page's old localStorage at once.
const MAX_IMPORTED_OFFSETS: usize = 5_000;

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
struct RemotePublishArgs {
    kind: String,
    #[serde(default)]
    data: Value,
}

#[derive(Deserialize)]
struct RemoteReplyArgs {
    id: u32,
    ok: bool,
    #[serde(default)]
    data: Value,
    #[serde(default)]
    error: Option<String>,
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
struct PluginKeyArgs {
    id: String,
    key: String,
}

#[derive(Deserialize)]
struct PluginSetArgs {
    id: String,
    key: String,
    value: Value,
}

#[derive(Deserialize)]
struct PluginIdArgs {
    id: String,
}

#[derive(Deserialize)]
struct PluginFetchArgs {
    id: String,
    url: String,
}

#[derive(Deserialize)]
struct PluginErrorArgs {
    id: String,
    #[serde(default)]
    message: String,
}

fn plugin_manager(h: &AppHandle) -> Arc<crate::plugins::PluginManager> {
    h.state::<Arc<crate::plugins::PluginManager>>().inner().clone()
}

#[derive(Deserialize)]
struct InhibitSleepArgs {
    inhibit: bool,
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
    // Only the settings the page's plugins use (`page_ipc::PAGE_CONFIG_KEYS`).
    "get_config" => |h, state, args| {
        // The injected script's first call: YouTube Music is up.
        h.state::<Arc<crate::connectivity::PageAlive>>().mark();
        Ok(page_ipc::page_config(&state.config_manager.load()))
    }
    "take_resume_session" => |h, state, args| {
        // Once per launch; never while in a room (the host decides the song).
        let target = state.session.take_resume();
        if state.sync_room.get_room_state().is_some() {
            return Ok(Value::Null);
        }
        to_data(target)
    }
    // The pairing QR carries the remote's token, so it is shown in the
    // Settings window, never in the page.
    "open_remote_pairing" => |h, state, args| {
        crate::windows::show_settings_section(h, "sec-remote");
        Ok(Value::Null)
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
        commands::update_track_info(h.clone(), h.state::<Arc<AppState>>(), p.track.sanitized())?;
        Ok(Value::Null)
    }
    "notify_track_change" => |h, state, args| {
        let p: NotifyArgs = parse_args("notify_track_change", args)?;
        let title = sync_room::clean_text(&p.title, 200);
        let artist = sync_room::clean_text(&p.artist, 200);
        commands::notify_track_change(h.clone(), h.state::<Arc<AppState>>(), title, artist)?;
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
        if !p.offset_secs.is_finite() {
            return Err("Invalid arguments for `set_lyrics_offset`: not a number".into());
        }
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
        let mut p: ImportOffsetsArgs = parse_args("import_lyrics_offsets", args)?;
        p.entries.truncate(MAX_IMPORTED_OFFSETS);
        p.entries.retain(|(id, offset)| sync_room::is_video_id(id) && offset.is_finite());
        to_data(lyrics::commands::import_offsets(&state.lyrics, p.entries, h))
    }
    "broadcast_sync_state" => |h, state, args| {
        let p: BroadcastSyncArgs = parse_args("broadcast_sync_state", args)?;
        let playback = p.playback.sanitized().ok_or("Invalid arguments for `broadcast_sync_state`")?;
        let sink: Arc<dyn sync_room::SyncEventSink> = Arc::new(h.clone());
        sync_room::broadcast_playback(&state.sync_room, &sink, playback);
        Ok(Value::Null)
    }
    "send_sync_control" => |h, state, args| {
        let p: SyncControlArgs = parse_args("send_sync_control", args)?;
        sync_room::send_control(&state.sync_room, p.action)?;
        Ok(Value::Null)
    }
    "get_sync_room_state" => |h, state, args| {
        Ok(state.sync_room.get_room_state().map_or(Value::Null, |room| page_ipc::page_room_value(&room)))
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
        if p.input.chars().count() > MAX_QUEUE_INPUT_CHARS {
            return Err("sync.error.badLink".into());
        }
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
    // Runtime plugins (plugins/mod.rs). Each call names the plugin; what
    // it may do is checked against that plugin's install (on, granted,
    // hosts), since anything in the page can make these calls.
    "plugin_storage_get" => |h, state, args| {
        let p: PluginKeyArgs = parse_args("plugin_storage_get", args)?;
        plugin_manager(h).storage_get(&p.id, &p.key)
    }
    "plugin_storage_set" => |h, state, args| {
        let p: PluginSetArgs = parse_args("plugin_storage_set", args)?;
        plugin_manager(h).storage_set(&p.id, &p.key, Some(p.value))?;
        Ok(Value::Null)
    }
    "plugin_storage_remove" => |h, state, args| {
        let p: PluginKeyArgs = parse_args("plugin_storage_remove", args)?;
        plugin_manager(h).storage_set(&p.id, &p.key, None)?;
        Ok(Value::Null)
    }
    "plugin_storage_keys" => |h, state, args| {
        let p: PluginIdArgs = parse_args("plugin_storage_keys", args)?;
        to_data(plugin_manager(h).storage_keys(&p.id)?)
    }
    "plugin_fetch" => |h, state, args| {
        let p: PluginFetchArgs = parse_args("plugin_fetch", args)?;
        to_data(plugin_manager(h).fetch(&p.id, &p.url).await?)
    }
    // Returns true when this error switched the plugin off.
    "plugin_error" => |h, state, args| {
        let p: PluginErrorArgs = parse_args("plugin_error", args)?;
        to_data(plugin_manager(h).report_error(&p.id, &p.message))
    }
    // Phone remote (remote_server.rs): the page reports what a connected
    // phone shows and answers the phone's `remote-action` requests.
    "remote_clients" => |h, state, args| {
        to_data(state.remote_status.hub.client_count())
    }
    "remote_publish" => |h, state, args| {
        let p: RemotePublishArgs = parse_args("remote_publish", args)?;
        state.remote_status.hub.publish(&p.kind, p.data)?;
        Ok(Value::Null)
    }
    "remote_reply" => |h, state, args| {
        let p: RemoteReplyArgs = parse_args("remote_reply", args)?;
        let reply = if p.ok { Ok(p.data) } else { Err(p.error.unwrap_or_else(|| "remote.error.failed".into())) };
        state.remote_status.hub.resolve(p.id, reply);
        Ok(Value::Null)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

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

    /// The page is a remote origin shared with YouTube's own scripts:
    /// nothing that touches files, the whole config, the remote token, the
    /// room code or the updater may be reachable from it.
    #[test]
    fn test_bridge_has_no_privileged_commands() {
        for cmd in [
            "get_remote_info",
            "scan_local_music",
            "import_settings",
            "export_settings",
            "install_update",
            "create_sync_room",
            "join_sync_room",
            "kick_sync_member",
            "set_sync_member_role",
            "open_logs_folder",
            "regenerate_remote_token",
        ] {
            assert!(!BRIDGE_COMMANDS.contains(&cmd), "`{cmd}` must not be reachable from music.youtube.com");
        }
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
            "fetch_lyrics",
            "get_current_lyrics",
            "set_lyrics_offset",
            "list_lyrics_candidates",
            "pick_lyrics",
            "import_lyrics_offsets",
            "get_config",
            "open_remote_pairing",
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
            "remote_clients",
            "remote_publish",
            "remote_reply",
        ] {
            assert!(set.contains(cmd), "`{cmd}` missing from BRIDGE_COMMANDS");
        }
    }
}
