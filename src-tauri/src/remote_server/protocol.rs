//! Phone remote WebSocket protocol, version 1. The contract is
//! `schemas/remote_v1.json`; `src/remote/protocol.ts` mirrors these types
//! for the phone. A breaking change bumps `PROTOCOL_VERSION` and the schema.

use serde::{Deserialize, Serialize};
use serde_json::Value;

pub const PROTOCOL_VERSION: u32 = 1;

/// The song, as the phone shows it.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TrackView {
    pub title: String,
    pub artist: String,
    #[serde(default)]
    pub album: Option<String>,
    #[serde(default)]
    pub cover_url: Option<String>,
    pub duration_secs: f64,
    #[serde(default)]
    pub video_id: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LikeStatus {
    Like,
    Dislike,
    #[default]
    None,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RepeatMode {
    #[default]
    None,
    All,
    One,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Accent {
    pub primary: String,
    pub secondary: String,
    pub accent: String,
}

/// Everything on the Now Playing screen.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PlayerState {
    pub track: Option<TrackView>,
    pub playing: bool,
    /// Position at `sampled_at_ms` (the desktop's clock).
    pub position_secs: f64,
    pub sampled_at_ms: u64,
    /// The desktop's clock when this message was sent: the phone advances
    /// the position by `server_time_ms - sampled_at_ms` plus its own time
    /// since receipt, never comparing the two machines' clocks.
    pub server_time_ms: u64,
    /// 0..=1
    pub volume: f64,
    pub muted: bool,
    pub like: LikeStatus,
    pub shuffle: bool,
    pub repeat: RepeatMode,
    pub accent: Option<Accent>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct QueueEntry {
    /// Opaque to the phone; sent back in queue actions.
    pub id: String,
    pub video_id: String,
    pub title: String,
    pub artist: String,
    #[serde(default)]
    pub thumbnail: Option<String>,
    #[serde(default)]
    pub current: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct QueueView {
    pub items: Vec<QueueEntry>,
    /// The Listen Together room's shared queue rather than YTM's own.
    pub shared: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RoomMemberView {
    pub id: String,
    pub nickname: String,
    pub role: String,
    pub is_host: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RoomView {
    pub is_host: bool,
    pub me: String,
    pub members: Vec<RoomMemberView>,
    pub skip_votes: Vec<String>,
    pub votes_needed: usize,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SearchResult {
    pub video_id: String,
    pub title: String,
    pub subtitle: String,
    #[serde(default)]
    pub thumbnail: Option<String>,
}

/// Desktop to phone.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ServerMsg {
    Hello { version: u32 },
    State(PlayerState),
    Queue(QueueView),
    /// Part of the lyrics feature's `lyrics-changed` payload, passed through
    /// untouched; `null` when there are none.
    Lyrics { lyrics: Value },
    Room { room: Option<RoomView> },
    Reaction { from: String, emoji: String },
    SearchResults { id: u32, results: Vec<SearchResult> },
    /// Outcome of a phone message that carried an `id`.
    Result {
        id: u32,
        ok: bool,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        error: Option<String>,
    },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PlayerCommand {
    PlayPause,
    Next,
    Previous,
    Like,
    Dislike,
    Mute,
    Shuffle,
    Repeat,
}

impl PlayerCommand {
    /// The page's `handlePlayerCommand` name.
    pub fn as_page_command(self) -> &'static str {
        match self {
            PlayerCommand::PlayPause => "play_pause",
            PlayerCommand::Next => "next",
            PlayerCommand::Previous => "previous",
            PlayerCommand::Like => "like",
            PlayerCommand::Dislike => "dislike",
            PlayerCommand::Mute => "mute",
            PlayerCommand::Shuffle => "shuffle",
            PlayerCommand::Repeat => "repeat",
        }
    }
}

/// Phone to desktop. `id`, when present, gets a `Result` (or
/// `SearchResults`) back.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ClientMsg {
    Cmd {
        #[serde(default)]
        id: Option<u32>,
        command: PlayerCommand,
    },
    Seek {
        #[serde(default)]
        id: Option<u32>,
        position_secs: f64,
    },
    Volume {
        #[serde(default)]
        id: Option<u32>,
        volume: f64,
    },
    QueueJump {
        #[serde(default)]
        id: Option<u32>,
        item_id: String,
    },
    QueueMove {
        #[serde(default)]
        id: Option<u32>,
        item_id: String,
        to_index: usize,
    },
    QueueRemove {
        #[serde(default)]
        id: Option<u32>,
        item_id: String,
    },
    Search { id: u32, query: String },
    Play {
        #[serde(default)]
        id: Option<u32>,
        video_id: String,
    },
    Enqueue {
        #[serde(default)]
        id: Option<u32>,
        video_id: String,
        #[serde(default)]
        next: bool,
    },
    React {
        #[serde(default)]
        id: Option<u32>,
        emoji: String,
    },
    VoteSkip {
        #[serde(default)]
        id: Option<u32>,
    },
}

impl ClientMsg {
    pub fn id(&self) -> Option<u32> {
        match self {
            ClientMsg::Search { id, .. } => Some(*id),
            ClientMsg::Cmd { id, .. }
            | ClientMsg::Seek { id, .. }
            | ClientMsg::Volume { id, .. }
            | ClientMsg::QueueJump { id, .. }
            | ClientMsg::QueueMove { id, .. }
            | ClientMsg::QueueRemove { id, .. }
            | ClientMsg::Play { id, .. }
            | ClientMsg::Enqueue { id, .. }
            | ClientMsg::React { id, .. }
            | ClientMsg::VoteSkip { id } => *id,
        }
    }
}

/// Longest search query forwarded to YouTube Music.
pub const MAX_QUERY_CHARS: usize = 200;
/// Reactions are single emoji; anything longer is dropped.
pub const MAX_EMOJI_CHARS: usize = 8;

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn schema() -> Value {
        serde_json::from_str(include_str!("../../../schemas/remote_v1.json")).expect("schema is valid JSON")
    }

    /// Resolves a local `$ref` (`#/$defs/x`) against the schema root.
    fn resolve<'a>(root: &'a Value, node: &'a Value) -> &'a Value {
        match node.get("$ref").and_then(Value::as_str) {
            Some(r) => {
                let mut cur = root;
                for part in r.trim_start_matches("#/").split('/') {
                    cur = &cur[part];
                }
                resolve(root, cur)
            }
            None => node,
        }
    }

    /// A small structural check against the schema: the message's `type`
    /// matches one variant, every required field is there, nothing unknown
    /// is sent, and nested objects/arrays hold recursively. Enough to catch
    /// Rust and the contract drifting apart without a validator crate.
    fn conforms(root: &Value, schema: &Value, value: &Value, path: &str) -> Result<(), String> {
        let schema = resolve(root, schema);
        if let Some(any) = schema.get("oneOf").or_else(|| schema.get("anyOf")).and_then(Value::as_array) {
            let errors: Vec<String> = any.iter().filter_map(|s| conforms(root, s, value, path).err()).collect();
            return if errors.len() < any.len() { Ok(()) } else { Err(format!("{path}: no variant matched: {errors:?}")) };
        }
        if let Some(c) = schema.get("const") {
            return if c == value { Ok(()) } else { Err(format!("{path}: expected {c}, got {value}")) };
        }
        if let Some(options) = schema.get("enum").and_then(Value::as_array) {
            return if options.contains(value) { Ok(()) } else { Err(format!("{path}: {value} not in enum")) };
        }
        let types: Vec<&str> = match schema.get("type") {
            Some(Value::String(t)) => vec![t.as_str()],
            Some(Value::Array(ts)) => ts.iter().filter_map(Value::as_str).collect(),
            _ => vec![],
        };
        let type_ok = types.is_empty()
            || types.iter().any(|t| match *t {
                "object" => value.is_object(),
                "array" => value.is_array(),
                "string" => value.is_string(),
                "number" => value.is_number(),
                "integer" => value.is_u64() || value.is_i64(),
                "boolean" => value.is_boolean(),
                "null" => value.is_null(),
                _ => false,
            });
        if !type_ok {
            return Err(format!("{path}: {value} is not {types:?}"));
        }
        if let (Some(obj), Some(props)) = (value.as_object(), schema.get("properties").and_then(Value::as_object)) {
            for req in schema.get("required").and_then(Value::as_array).into_iter().flatten() {
                let key = req.as_str().unwrap_or_default();
                if !obj.contains_key(key) {
                    return Err(format!("{path}: missing required `{key}`"));
                }
            }
            for (k, v) in obj {
                match props.get(k) {
                    Some(s) => conforms(root, s, v, &format!("{path}.{k}"))?,
                    None => return Err(format!("{path}: `{k}` is not in the schema")),
                }
            }
        }
        if let (Some(items), Some(s)) = (value.as_array(), schema.get("items")) {
            for (i, v) in items.iter().enumerate() {
                conforms(root, s, v, &format!("{path}[{i}]"))?;
            }
        }
        Ok(())
    }

    fn sample_state() -> PlayerState {
        PlayerState {
            track: Some(TrackView {
                title: "Maniac".into(),
                artist: "Carpenter Brut".into(),
                album: Some("Trilogy".into()),
                cover_url: Some("https://lh3.googleusercontent.com/a".into()),
                duration_secs: 300.0,
                video_id: Some("aaaaaaaaaaa".into()),
            }),
            playing: true,
            position_secs: 12.5,
            sampled_at_ms: 1_000,
            server_time_ms: 1_200,
            volume: 0.5,
            muted: false,
            like: LikeStatus::Like,
            shuffle: false,
            repeat: RepeatMode::All,
            accent: Some(Accent { primary: "#112233".into(), secondary: "#000000".into(), accent: "#ffffff".into() }),
        }
    }

    fn server_samples() -> Vec<ServerMsg> {
        vec![
            ServerMsg::Hello { version: PROTOCOL_VERSION },
            ServerMsg::State(sample_state()),
            ServerMsg::State(PlayerState { track: None, accent: None, ..sample_state() }),
            ServerMsg::Queue(QueueView {
                items: vec![QueueEntry {
                    id: "0:aaaaaaaaaaa".into(),
                    video_id: "aaaaaaaaaaa".into(),
                    title: "Maniac".into(),
                    artist: "Carpenter Brut".into(),
                    thumbnail: None,
                    current: true,
                }],
                shared: false,
            }),
            ServerMsg::Lyrics { lyrics: Value::Null },
            ServerMsg::Lyrics { lyrics: json!({ "video_id": "aaaaaaaaaaa", "synced": [] }) },
            ServerMsg::Room { room: None },
            ServerMsg::Room {
                room: Some(RoomView {
                    is_host: true,
                    me: "m1".into(),
                    members: vec![RoomMemberView { id: "m1".into(), nickname: "Kay".into(), role: "host".into(), is_host: true }],
                    skip_votes: vec![],
                    votes_needed: 1,
                }),
            },
            ServerMsg::Reaction { from: "Kay".into(), emoji: "🔥".into() },
            ServerMsg::SearchResults {
                id: 3,
                results: vec![SearchResult { video_id: "aaaaaaaaaaa".into(), title: "Maniac".into(), subtitle: "Song".into(), thumbnail: None }],
            },
            ServerMsg::Result { id: 4, ok: true, error: None },
            ServerMsg::Result { id: 5, ok: false, error: Some("remote.error.unsupported".into()) },
        ]
    }

    fn client_samples() -> Vec<Value> {
        vec![
            json!({ "type": "cmd", "command": "play_pause" }),
            json!({ "type": "cmd", "id": 1, "command": "repeat" }),
            json!({ "type": "seek", "position_secs": 42.5 }),
            json!({ "type": "volume", "volume": 0.3 }),
            json!({ "type": "queue_jump", "item_id": "2:bbbbbbbbbbb" }),
            json!({ "type": "queue_move", "id": 2, "item_id": "2:bbbbbbbbbbb", "to_index": 0 }),
            json!({ "type": "queue_remove", "item_id": "2:bbbbbbbbbbb" }),
            json!({ "type": "search", "id": 3, "query": "carpenter brut" }),
            json!({ "type": "play", "video_id": "aaaaaaaaaaa" }),
            json!({ "type": "enqueue", "id": 4, "video_id": "aaaaaaaaaaa", "next": true }),
            json!({ "type": "react", "emoji": "🔥" }),
            json!({ "type": "vote_skip" }),
        ]
    }

    #[test]
    fn test_server_messages_match_the_schema() {
        let root = schema();
        for msg in server_samples() {
            let value = serde_json::to_value(&msg).unwrap();
            conforms(&root, &root["$defs"]["ServerMsg"], &value, "server").unwrap();
            let back: ServerMsg = serde_json::from_value(value).unwrap();
            assert_eq!(back, msg, "round trip");
        }
    }

    #[test]
    fn test_client_messages_match_the_schema_and_parse() {
        let root = schema();
        for value in client_samples() {
            conforms(&root, &root["$defs"]["ClientMsg"], &value, "client").unwrap();
            let msg: ClientMsg = serde_json::from_value(value.clone()).unwrap_or_else(|e| panic!("{value}: {e}"));
            assert_eq!(serde_json::from_value::<ClientMsg>(serde_json::to_value(&msg).unwrap()).unwrap(), msg);
        }
    }

    #[test]
    fn test_every_message_type_is_in_the_schema_and_sampled() {
        let root = schema();
        let schema_types = |def: &str| -> Vec<String> {
            root["$defs"][def]["oneOf"]
                .as_array()
                .unwrap()
                .iter()
                .map(|v| resolve(&root, v)["properties"]["type"]["const"].as_str().unwrap().to_string())
                .collect()
        };
        let mut sent: Vec<String> = server_samples()
            .iter()
            .map(|m| serde_json::to_value(m).unwrap()["type"].as_str().unwrap().to_string())
            .collect();
        sent.sort();
        sent.dedup();
        let mut server = schema_types("ServerMsg");
        server.sort();
        assert_eq!(sent, server);

        let mut received: Vec<String> =
            client_samples().iter().map(|v| v["type"].as_str().unwrap().to_string()).collect();
        received.sort();
        received.dedup();
        let mut client = schema_types("ClientMsg");
        client.sort();
        assert_eq!(received, client);
    }

    #[test]
    fn test_schema_checker_rejects_drift() {
        let root = schema();
        let missing = json!({ "type": "seek" });
        assert!(conforms(&root, &root["$defs"]["ClientMsg"], &missing, "c").is_err());
        let unknown = json!({ "type": "vote_skip", "extra": 1 });
        assert!(conforms(&root, &root["$defs"]["ClientMsg"], &unknown, "c").is_err());
        let bad_enum = json!({ "type": "cmd", "command": "self_destruct" });
        assert!(conforms(&root, &root["$defs"]["ClientMsg"], &bad_enum, "c").is_err());
    }

    #[test]
    fn test_unknown_client_messages_are_rejected() {
        assert!(serde_json::from_value::<ClientMsg>(json!({ "type": "invoke", "cmd": "download_track" })).is_err());
        assert!(serde_json::from_value::<ClientMsg>(json!({ "type": "cmd", "command": "download" })).is_err());
    }
}
