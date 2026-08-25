use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::sync::mpsc;

const DISCORD_CLIENT_ID: &str = "1343516590254948402"; // YouTube Music Desktop client ID

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackPayload {
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub cover_url: Option<String>,
    pub duration_secs: u64,
    pub current_time_secs: u64,
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

impl DiscordRpcHandle {
    pub fn new() -> Self {
        let (tx, mut rx) = mpsc::channel::<DiscordCommand>(32);
        let running = Arc::new(AtomicBool::new(true));
        let running_clone = running.clone();

        tokio::spawn(async move {
            let mut stream: Option<tokio::net::UnixStream> = None;

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
                                if send_activity(s, Some(&track)).await.is_err() {
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

async fn connect_discord() -> Option<tokio::net::UnixStream> {
    #[cfg(unix)]
    {
        let runtime_dir = std::env::var("XDG_RUNTIME_DIR")
            .unwrap_or_else(|_| format!("/run/user/{}", libc_getuid()));

        for i in 0..10 {
            let path = format!("{}/discord-ipc-{}", runtime_dir, i);
            if let Ok(mut stream) = tokio::net::UnixStream::connect(&path).await {
                // Handshake with client ID
                let handshake = json!({
                    "v": 1,
                    "client_id": DISCORD_CLIENT_ID
                });
                if send_frame(&mut stream, 0, &handshake.to_string()).await.is_ok() {
                    let mut buf = vec![0u8; 1024];
                    if let Ok(n) = stream.read(&mut buf).await {
                        if n > 0 {
                            return Some(stream);
                        }
                    }
                }
            }
        }
    }
    None
}

#[cfg(unix)]
fn libc_getuid() -> u32 {
    1000 // Fallback UID
}

async fn send_frame(stream: &mut tokio::net::UnixStream, opcode: u32, payload: &str) -> std::io::Result<()> {
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

async fn send_activity(
    stream: &mut tokio::net::UnixStream,
    track: Option<&TrackPayload>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let nonce = uuid_nonce();
    let payload = match track {
        Some(t) if t.is_playing => {
            let now = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs();
            let start_time = now.saturating_sub(t.current_time_secs);
            let end_time = if t.duration_secs > 0 {
                Some(start_time + t.duration_secs)
            } else {
                None
            };

            let mut activity = json!({
                "details": t.title,
                "state": format!("by {}", t.artist),
                "assets": {
                    "large_image": t.cover_url.clone().unwrap_or_else(|| "ytm_logo".to_string()),
                    "large_text": t.album.clone().unwrap_or_else(|| t.title.clone()),
                    "small_image": "play",
                    "small_text": "Playing"
                },
                "timestamps": {
                    "start": start_time
                }
            });

            if let Some(end) = end_time {
                activity["timestamps"]["end"] = json!(end);
            }

            if let Some(ref vid) = t.video_id {
                activity["buttons"] = json!([
                    {
                        "label": "Listen on YouTube Music",
                        "url": format!("https://music.youtube.com/watch?v={}", vid)
                    }
                ]);
            }

            json!({
                "cmd": "SET_ACTIVITY",
                "args": {
                    "pid": std::process::id(),
                    "activity": activity
                },
                "nonce": nonce
            })
        }
        Some(t) => {
            // Paused
            json!({
                "cmd": "SET_ACTIVITY",
                "args": {
                    "pid": std::process::id(),
                    "activity": {
                        "details": t.title,
                        "state": format!("Paused - {}", t.artist),
                        "assets": {
                            "large_image": t.cover_url.clone().unwrap_or_else(|| "ytm_logo".to_string()),
                            "large_text": t.album.clone().unwrap_or_else(|| t.title.clone()),
                            "small_image": "pause",
                            "small_text": "Paused"
                        }
                    }
                },
                "nonce": nonce
            })
        }
        None => {
            json!({
                "cmd": "SET_ACTIVITY",
                "args": {
                    "pid": std::process::id(),
                    "activity": null
                },
                "nonce": nonce
            })
        }
    };

    send_frame(stream, 1, &payload.to_string()).await?;
    Ok(())
}

fn uuid_nonce() -> String {
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
    format!("{:x}", now)
}
