use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::sync::mpsc;

#[cfg(unix)]
type DiscordStream = tokio::net::UnixStream;
#[cfg(windows)]
type DiscordStream = tokio::net::windows::named_pipe::NamedPipeClient;

fn deserialize_f64_or_u64<'de, D>(deserializer: D) -> Result<u64, D::Error>
where
    D: serde::Deserializer<'de>,
{
    struct F64OrU64Visitor;

    impl<'de> serde::de::Visitor<'de> for F64OrU64Visitor {
        type Value = u64;

        fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
            formatter.write_str("a number (float or integer)")
        }

        fn visit_u64<E>(self, value: u64) -> Result<u64, E> {
            Ok(value)
        }

        fn visit_i64<E>(self, value: i64) -> Result<u64, E> {
            Ok(value.max(0) as u64)
        }

        fn visit_f64<E>(self, value: f64) -> Result<u64, E> {
            if value.is_nan() || value < 0.0 {
                Ok(0)
            } else {
                Ok(value.round() as u64)
            }
        }
    }

    deserializer.deserialize_any(F64OrU64Visitor)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackPayload {
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub cover_url: Option<String>,
    #[serde(deserialize_with = "deserialize_f64_or_u64", default)]
    pub duration_secs: u64,
    #[serde(deserialize_with = "deserialize_f64_or_u64", default)]
    pub current_time_secs: u64,
    #[serde(default)]
    pub is_playing: bool,
    pub video_id: Option<String>,
}

#[derive(Debug)]
pub enum DiscordCommand {
    Update(TrackPayload),
    Clear,
    Shutdown,
}

pub struct DiscordRpcHandle {
    sender: mpsc::Sender<DiscordCommand>,
    _running: Arc<AtomicBool>,
}

impl Default for DiscordRpcHandle {
    fn default() -> Self {
        Self::new()
    }
}

impl DiscordRpcHandle {
    pub fn new() -> Self {
        let (tx, mut rx) = mpsc::channel::<DiscordCommand>(32);
        let running = Arc::new(AtomicBool::new(true));
        let running_clone = running.clone();

        tauri::async_runtime::spawn(async move {
            let mut stream: Option<DiscordStream> = None;

            while running_clone.load(Ordering::Relaxed) {
                if let Some(cmd) = rx.recv().await {
                    match cmd {
                        DiscordCommand::Shutdown => break,
                        DiscordCommand::Clear => {
                            if let Some(ref mut s) = stream {
                                let _ = send_activity(s, None).await;
                            }
                        }
                        DiscordCommand::Update(track) => {
                            if stream.is_none() {
                                stream = connect_discord().await;
                            }

                            if let Some(ref mut s) = stream {
                                if let Err(e) = send_activity(s, Some(&track)).await {
                                    log::warn!("[YTMD Discord RPC] Failed to send activity: {e}");
                                    stream = None;
                                }
                            }
                        }
                    }
                }
            }
        });

        Self {
            sender: tx,
            _running: running,
        }
    }

    pub fn update(&self, track: TrackPayload) {
        let _ = self.sender.try_send(DiscordCommand::Update(track));
    }

    pub fn clear(&self) {
        let _ = self.sender.try_send(DiscordCommand::Clear);
    }
}

pub const DISCORD_CLIENT_IDS: &[&str] = &[
    "1177081335727267940", // YouTube Music Desktop (Verified active Discord application)
];

/// Discord Rich Presence requires strings (details, state, large_text) to be between 2 and 128 characters.
/// If string is empty, fallback is used.
/// If string has 1 character, pad with Braille whitespace \u{2800}.
pub fn sanitize_discord_str(input: &str, fallback: &str, max_len: usize) -> String {
    let trimmed = input.trim();
    let text = if trimmed.is_empty() {
        fallback.trim()
    } else {
        trimmed
    };

    let mut result: String = text.chars().take(max_len).collect();
    if result.is_empty() {
        result = fallback.to_string();
    }
    if result.chars().count() < 2 {
        result.push('\u{2800}');
    }
    result
}

/// Validates that Discord IPC handshake response is Opcode 1 (FRAME) and contains READY / DISPATCH user data,
/// strictly rejecting Opcode 2 (CLOSE) or error payloads.
pub fn is_valid_handshake_response(buf: &[u8]) -> bool {
    if buf.len() < 8 {
        return false;
    }
    let opcode = u32::from_le_bytes(buf[0..4].try_into().unwrap_or([0; 4]));
    if opcode != 1 {
        // Opcode 1 is FRAME. Opcode 2 is CLOSE.
        return false;
    }
    let length = u32::from_le_bytes(buf[4..8].try_into().unwrap_or([0; 4])) as usize;
    let payload_bytes = &buf[8..std::cmp::min(buf.len(), 8 + length)];

    if let Ok(val) = serde_json::from_slice::<serde_json::Value>(payload_bytes) {
        if val.get("evt").and_then(|v| v.as_str()) == Some("READY") {
            return true;
        }
        if val.get("cmd").and_then(|v| v.as_str()) == Some("DISPATCH") {
            if let Some(data) = val.get("data") {
                if data.get("user").is_some() || data.get("v").is_some() {
                    return true;
                }
            }
        }
    }
    false
}

#[cfg(unix)]
async fn connect_discord() -> Option<DiscordStream> {
    let runtime_dir = std::env::var("XDG_RUNTIME_DIR")
        .unwrap_or_else(|_| format!("/run/user/{}", current_uid()));

    for i in 0..10 {
        let path = format!("{}/discord-ipc-{}", runtime_dir, i);
        for &client_id in DISCORD_CLIENT_IDS {
            if let Ok(mut stream) = DiscordStream::connect(&path).await {
                let handshake = json!({
                    "v": 1,
                    "client_id": client_id
                });
                if send_frame(&mut stream, 0, &handshake.to_string()).await.is_ok() {
                    let mut buf = vec![0u8; 4096];
                    let read_res = tokio::time::timeout(
                        std::time::Duration::from_millis(2000),
                        stream.read(&mut buf),
                    )
                    .await;
                    if let Ok(Ok(n)) = read_res {
                        if is_valid_handshake_response(&buf[..n]) {
                            log::info!("[YTMD Discord RPC] Connected to {} with client ID {}", path, client_id);
                            return Some(stream);
                        } else {
                            log::debug!("[YTMD Discord RPC] Handshake rejected on {} for client ID {}", path, client_id);
                        }
                    }
                }
                drop(stream);
                tokio::time::sleep(std::time::Duration::from_millis(50)).await;
            }
        }
    }
    None
}

#[cfg(windows)]
async fn connect_discord() -> Option<DiscordStream> {
    use tokio::net::windows::named_pipe::ClientOptions;

    for i in 0..10 {
        let path = format!(r"\\.\pipe\discord-ipc-{}", i);
        for &client_id in DISCORD_CLIENT_IDS {
            if let Ok(mut stream) = ClientOptions::new().open(&path) {
                let handshake = json!({
                    "v": 1,
                    "client_id": client_id
                });
                if send_frame(&mut stream, 0, &handshake.to_string()).await.is_ok() {
                    let mut buf = vec![0u8; 4096];
                    let read_res = tokio::time::timeout(
                        std::time::Duration::from_millis(2000),
                        stream.read(&mut buf),
                    )
                    .await;
                    if let Ok(Ok(n)) = read_res {
                        if is_valid_handshake_response(&buf[..n]) {
                            log::info!("[YTMD Discord RPC] Connected to {} with client ID {}", path, client_id);
                            return Some(stream);
                        } else {
                            log::debug!("[YTMD Discord RPC] Handshake rejected on {} for client ID {}", path, client_id);
                        }
                    }
                }
                drop(stream);
                tokio::time::sleep(std::time::Duration::from_millis(50)).await;
            }
        }
    }
    None
}

/// The real UID of the current process, used only as the `XDG_RUNTIME_DIR`
/// fallback when that env var is unset — the standard systemd/XDG runtime
/// dir is `/run/user/<uid>`. Previously this returned a hardcoded `1000`
/// regardless of who was actually running the process (despite the name
/// implying an actual `getuid(2)` call), which silently pointed Discord IPC
/// discovery at the wrong socket path for any user whose UID wasn't 1000
/// (a second account, a service/system user, most container setups) on any
/// session where `XDG_RUNTIME_DIR` happened not to be set. No `libc` crate
/// is available in this crate's dependencies, so this reads the real UID
/// straight from procfs instead of hardcoding a guess.
#[cfg(target_os = "linux")]
fn current_uid() -> u32 {
    std::fs::read_to_string("/proc/self/status")
        .ok()
        .and_then(|content| {
            content
                .lines()
                .find_map(|line| line.strip_prefix("Uid:").map(str::to_string))
        })
        .and_then(|rest| rest.split_whitespace().next().map(str::to_string))
        .and_then(|s| s.parse::<u32>().ok())
        .unwrap_or(1000)
}

/// No `/proc` on non-Linux unix (e.g. macOS), and the Discord IPC socket
/// there doesn't live under `/run/user/<uid>` anyway (nor does
/// `XDG_RUNTIME_DIR` normally get set) — this fallback constant preserves
/// the pre-existing (already macOS-inapplicable) behavior rather than
/// pretending to support a path scheme that platform doesn't use.
#[cfg(all(unix, not(target_os = "linux")))]
fn current_uid() -> u32 {
    1000
}

async fn send_frame(stream: &mut DiscordStream, opcode: u32, payload: &str) -> std::io::Result<()> {
    let payload_bytes = payload.as_bytes();
    let length = payload_bytes.len() as u32;

    let mut header = [0u8; 8];
    header[0..4].copy_from_slice(&opcode.to_le_bytes());
    header[4..8].copy_from_slice(&length.to_le_bytes());

    stream.write_all(&header).await?;
    stream.write_all(payload_bytes).await?;
    stream.flush().await?;
    Ok(())
}

pub fn build_activity_payload(track: Option<&TrackPayload>, pid: u32, nonce: &str) -> serde_json::Value {
    match track {
        Some(t) if t.is_playing => {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0);
            let start_time = now.saturating_sub(t.current_time_secs);
            let end_time = if t.duration_secs > 0 && t.duration_secs > t.current_time_secs {
                Some(start_time + t.duration_secs)
            } else {
                None
            };

            let title = sanitize_discord_str(&t.title, "Unknown Track", 128);
            let artist = sanitize_discord_str(&format!("by {}", t.artist), "Unknown Artist", 128);

            let mut activity = json!({
                "type": 2,
                "details": title,
                "state": artist,
                "timestamps": {
                    "start": start_time
                }
            });

            if let Some(end) = end_time {
                activity["timestamps"]["end"] = json!(end);
            }

            let mut assets = json!({});
            if let Some(ref cover) = t.cover_url {
                if cover.starts_with("http://") || cover.starts_with("https://") {
                    assets["large_image"] = json!(cover);
                    if let Some(ref album) = t.album {
                        if !album.trim().is_empty() {
                            assets["large_text"] = json!(sanitize_discord_str(album, "Album", 128));
                        }
                    }
                }
            }
            if assets.as_object().is_some_and(|o| !o.is_empty()) {
                activity["assets"] = assets;
            }

            if let Some(ref vid) = t.video_id {
                let trimmed_vid = vid.trim();
                if !trimmed_vid.is_empty() {
                    let watch_url = if trimmed_vid.starts_with("http://") || trimmed_vid.starts_with("https://") {
                        trimmed_vid.to_string()
                    } else {
                        format!("https://music.youtube.com/watch?v={}", trimmed_vid)
                    };
                    activity["buttons"] = json!([
                        {
                            "label": "Listen on YouTube Music",
                            "url": watch_url
                        }
                    ]);
                }
            }

            json!({
                "cmd": "SET_ACTIVITY",
                "args": {
                    "pid": pid,
                    "activity": activity
                },
                "nonce": nonce
            })
        }
        Some(t) => {
            // Paused
            let title = sanitize_discord_str(&t.title, "Unknown Track", 128);
            let artist = sanitize_discord_str(&format!("Paused - {}", t.artist), "Paused", 128);

            let mut activity = json!({
                "type": 2,
                "details": title,
                "state": artist,
            });

            let mut assets = json!({});
            if let Some(ref cover) = t.cover_url {
                if cover.starts_with("http://") || cover.starts_with("https://") {
                    assets["large_image"] = json!(cover);
                    if let Some(ref album) = t.album {
                        if !album.trim().is_empty() {
                            assets["large_text"] = json!(sanitize_discord_str(album, "Album", 128));
                        }
                    }
                }
            }
            if assets.as_object().is_some_and(|o| !o.is_empty()) {
                activity["assets"] = assets;
            }

            if let Some(ref vid) = t.video_id {
                let trimmed_vid = vid.trim();
                if !trimmed_vid.is_empty() {
                    let watch_url = if trimmed_vid.starts_with("http://") || trimmed_vid.starts_with("https://") {
                        trimmed_vid.to_string()
                    } else {
                        format!("https://music.youtube.com/watch?v={}", trimmed_vid)
                    };
                    activity["buttons"] = json!([
                        {
                            "label": "Listen on YouTube Music",
                            "url": watch_url
                        }
                    ]);
                }
            }

            json!({
                "cmd": "SET_ACTIVITY",
                "args": {
                    "pid": pid,
                    "activity": activity
                },
                "nonce": nonce
            })
        }
        None => {
            json!({
                "cmd": "SET_ACTIVITY",
                "args": {
                    "pid": pid,
                    "activity": null
                },
                "nonce": nonce
            })
        }
    }
}

async fn send_activity(
    stream: &mut DiscordStream,
    track: Option<&TrackPayload>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let nonce = uuid_nonce();
    let payload = build_activity_payload(track, std::process::id(), &nonce);

    send_frame(stream, 1, &payload.to_string()).await?;

    let mut buf = vec![0u8; 2048];
    if let Ok(Ok(n)) = tokio::time::timeout(std::time::Duration::from_millis(5), stream.read(&mut buf)).await {
        if n > 8 {
            let resp = String::from_utf8_lossy(&buf[8..n]);
            log::debug!("[YTMD Discord RPC] Response: {}", resp);
        }
    }

    Ok(())
}

fn uuid_nonce() -> String {
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
    format!("{:x}", now)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[cfg(target_os = "linux")]
    fn test_current_uid_matches_the_process_real_uid() {
        use std::os::unix::fs::MetadataExt;

        // Deterministic, no subprocess: a file we just created is owned by
        // our own real UID, so its owner is ground truth to compare
        // against without hardcoding an assumption about what UID this
        // test happens to run as (CI, a container, a second account, etc.
        // may all differ from the developer's own 1000).
        let tmp = tempfile::NamedTempFile::new().expect("tempfile");
        let owner_uid = std::fs::metadata(tmp.path()).expect("metadata").uid();

        assert_eq!(current_uid(), owner_uid);
    }

    #[test]
    fn test_discord_rpc_handle_initialization() {
        let handle = DiscordRpcHandle::new();
        handle.clear();
        handle.update(TrackPayload {
            title: "Starboy".to_string(),
            artist: "The Weeknd".to_string(),
            album: Some("Starboy".to_string()),
            cover_url: None,
            duration_secs: 230,
            current_time_secs: 45,
            is_playing: true,
            video_id: Some("34Na4j8AVgA".to_string()),
        });
    }

    #[test]
    fn test_track_payload_deserialization_handles_floats_and_integers() {
        let json_data = json!({
            "title": "Blinding Lights",
            "artist": "The Weeknd",
            "album": "After Hours",
            "cover_url": "https://lh3.googleusercontent.com/abc",
            "duration_secs": 200.45,
            "current_time_secs": 15.89,
            "is_playing": true,
            "video_id": "4NRXx6U8ABQ"
        });

        let payload: Result<TrackPayload, _> = serde_json::from_value(json_data);
        assert!(payload.is_ok());
        let track = payload.unwrap();
        assert_eq!(track.duration_secs, 200);
        assert_eq!(track.current_time_secs, 16);
        assert_eq!(track.title, "Blinding Lights");
    }

    #[test]
    fn test_sanitize_discord_str_handles_padding_and_truncation() {
        // Single character padded to 2 chars with Braille space
        let single = sanitize_discord_str("A", "Default", 128);
        assert_eq!(single.chars().count(), 2);
        assert_eq!(single, "A\u{2800}");

        // Empty string uses fallback
        let empty = sanitize_discord_str("   ", "Fallback Title", 128);
        assert_eq!(empty, "Fallback Title");

        // Truncation to max_len
        let long_str = "a".repeat(200);
        let truncated = sanitize_discord_str(&long_str, "Default", 128);
        assert_eq!(truncated.chars().count(), 128);
    }

    #[test]
    fn test_handshake_response_validation_accepts_ready_and_rejects_close_and_error() {
        // Valid READY frame (Opcode 1)
        let ready_payload = json!({
            "cmd": "DISPATCH",
            "data": {
                "v": 1,
                "user": { "id": "123", "username": "test" }
            },
            "evt": "READY"
        }).to_string();

        let mut ready_buf = Vec::new();
        ready_buf.extend_from_slice(&1u32.to_le_bytes()); // Opcode 1
        ready_buf.extend_from_slice(&(ready_payload.len() as u32).to_le_bytes());
        ready_buf.extend_from_slice(ready_payload.as_bytes());

        assert!(is_valid_handshake_response(&ready_buf));

        // Invalid Client ID (Opcode 2 - CLOSE)
        let close_payload = json!({
            "code": 4000,
            "message": "Invalid Client ID"
        }).to_string();

        let mut close_buf = Vec::new();
        close_buf.extend_from_slice(&2u32.to_le_bytes()); // Opcode 2
        close_buf.extend_from_slice(&(close_payload.len() as u32).to_le_bytes());
        close_buf.extend_from_slice(close_payload.as_bytes());

        assert!(!is_valid_handshake_response(&close_buf));

        // Short buffer
        assert!(!is_valid_handshake_response(&[0u8; 4]));
    }

    #[test]
    fn test_build_activity_payload_playing_and_paused() {
        let track = TrackPayload {
            title: "Maniac".to_string(),
            artist: "Carpenter Brut".to_string(),
            album: Some("Trilogy".to_string()),
            cover_url: Some("https://lh3.googleusercontent.com/img.jpg".to_string()),
            duration_secs: 300,
            current_time_secs: 50,
            is_playing: true,
            video_id: Some("er416SiHFLw".to_string()),
        };

        // Playing
        let payload_playing = build_activity_payload(Some(&track), 1234, "nonce-1");
        assert_eq!(payload_playing["cmd"], "SET_ACTIVITY");
        let act = &payload_playing["args"]["activity"];
        assert_eq!(act["type"], 2);
        assert_eq!(act["details"], "Maniac");
        assert_eq!(act["state"], "by Carpenter Brut");
        assert!(act["timestamps"]["start"].as_u64().is_some());
        assert!(act["timestamps"]["end"].as_u64().is_some());
        assert_eq!(act["assets"]["large_image"], "https://lh3.googleusercontent.com/img.jpg");
        assert_eq!(act["assets"]["large_text"], "Trilogy");
        assert_eq!(act["buttons"][0]["label"], "Listen on YouTube Music");
        assert_eq!(act["buttons"][0]["url"], "https://music.youtube.com/watch?v=er416SiHFLw");

        // Paused
        let mut paused_track = track.clone();
        paused_track.is_playing = false;
        let payload_paused = build_activity_payload(Some(&paused_track), 1234, "nonce-2");
        let act_paused = &payload_paused["args"]["activity"];
        assert_eq!(act_paused["type"], 2);
        assert_eq!(act_paused["details"], "Maniac");
        assert_eq!(act_paused["state"], "Paused - Carpenter Brut");
        assert!(act_paused.get("timestamps").is_none());

        // Clear (None)
        let payload_clear = build_activity_payload(None, 1234, "nonce-3");
        assert!(payload_clear["args"]["activity"].is_null());
    }

    #[tokio::test]
    async fn test_live_discord_connect_and_activity() {
        let stream = connect_discord().await;
        if let Some(mut s) = stream {
            let track = TrackPayload {
                title: "Starboy".to_string(),
                artist: "The Weeknd".to_string(),
                album: Some("Starboy".to_string()),
                cover_url: Some("https://lh3.googleusercontent.com/test.jpg".to_string()),
                duration_secs: 230,
                current_time_secs: 45,
                is_playing: true,
                video_id: Some("34Na4j8AVgA".to_string()),
            };
            let res = send_activity(&mut s, Some(&track)).await;
            assert!(res.is_ok(), "Expected send_activity to succeed over live Discord connection: {:?}", res);
        }
    }
}




