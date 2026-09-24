use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::VecDeque;
use std::future::Future;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::sync::watch;
use tokio::time::Instant;

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
    /// Page wall clock (Unix ms) at the moment `current_time_secs` was read.
    /// The song's start time is derived from this, not from when the update
    /// reaches Discord, so bridge/queue delay doesn't shift the progress bar.
    #[serde(default)]
    pub sampled_at_ms: Option<u64>,
    /// The playlist the song plays from (URL `list`), for resume on launch.
    #[serde(default)]
    pub playlist_id: Option<String>,
}

const MAX_TRACK_TEXT_CHARS: usize = 512;
const MAX_COVER_URL_LEN: usize = 2048;

fn clean_track_text(raw: &str) -> String {
    raw.trim().chars().filter(|c| !c.is_control()).take(MAX_TRACK_TEXT_CHARS).collect()
}

impl TrackPayload {
    /// What the page reports, made safe to hand to Discord, MPRIS/SMTC,
    /// notifications and the other windows: text trimmed of control
    /// characters and capped, the cover only as an https URL, ids only in
    /// YouTube's own shapes. The page is a remote origin; its values are
    /// treated like any other outside input.
    pub fn sanitized(mut self) -> Self {
        self.title = clean_track_text(&self.title);
        self.artist = clean_track_text(&self.artist);
        self.album = self.album.map(|a| clean_track_text(&a)).filter(|a| !a.is_empty());
        self.cover_url = self.cover_url.filter(|u| {
            u.len() <= MAX_COVER_URL_LEN && url::Url::parse(u).is_ok_and(|p| p.scheme() == "https")
        });
        self.video_id = self.video_id.filter(|v| crate::sync_room::is_video_id(v));
        self.playlist_id = self.playlist_id.filter(|p| {
            (1..=64).contains(&p.len()) && p.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
        });
        // A day is far longer than any song; anything above is junk.
        self.duration_secs = self.duration_secs.min(86_400);
        self.current_time_secs = self.current_time_secs.min(self.duration_secs.max(86_400));
        self
    }
}

/// Discord drops `SET_ACTIVITY` calls past about 5 per 20 s without an
/// error, so a burst of skips used to leave an old song on the profile.
const DISCORD_RATE_MAX: usize = 5;
const DISCORD_RATE_WINDOW: Duration = Duration::from_secs(20);
/// How long to wait before trying the IPC socket again after Discord
/// wasn't reachable (not running, restarting).
const RECONNECT_BACKOFF: Duration = Duration::from_secs(15);
/// How long to wait for Discord's reply to one `SET_ACTIVITY`.
const REPLY_TIMEOUT: Duration = Duration::from_secs(1);
/// Timestamps within this many seconds count as the same presence, so the
/// page's periodic position resync doesn't spend the rate budget.
const TIMESTAMP_TOLERANCE_SECS: i64 = 2;
/// A frame bigger than this means the byte stream is out of step.
const MAX_FRAME_LEN: usize = 64 * 1024;

const OP_HANDSHAKE: u32 = 0;
const OP_FRAME: u32 = 1;
const OP_CLOSE: u32 = 2;
const OP_PING: u32 = 3;
const OP_PONG: u32 = 4;

/// What the app wants Discord to show; the presence task works towards the
/// latest value and skips every one in between.
#[derive(Debug, Clone, Default)]
pub struct Desired {
    pub track: Option<TrackPayload>,
    /// Clear the presence once a song has stayed paused this long.
    pub clear_after_pause: Option<Duration>,
    /// The Listen Together room the host chose to show.
    pub invite: Option<crate::join_link::DiscordInvite>,
}

pub struct DiscordRpcHandle {
    sender: watch::Sender<Desired>,
}

impl Default for DiscordRpcHandle {
    fn default() -> Self {
        Self::new()
    }
}

impl DiscordRpcHandle {
    pub fn new() -> Self {
        let (sender, rx) = watch::channel(Desired::default());
        tauri::async_runtime::spawn(run_presence_loop(rx, IpcTransport::default(), LoopConfig::DISCORD));
        Self { sender }
    }

    /// Replaces the wanted state; never blocks and never drops the newest
    /// update (the old bounded queue discarded updates once full).
    pub fn update(&self, desired: Desired) {
        self.sender.send_replace(desired);
    }

    pub fn clear(&self) {
        self.sender.send_modify(|d| d.track = None);
    }
}

/// Our own Discord application (Developer Portal → General Information →
/// Application ID; public, not a secret). Its name is what friends see
/// ("Listening to …"). Never borrow another project's application.
pub const DISCORD_CLIENT_IDS: &[&str] = &[
    "1552722936966680676", // Oscilla
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

fn now_unix_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

/// The activity object for `track`, or `None` when there is nothing worth
/// showing (no title: YTM idle, between songs, or an ad).
pub fn build_activity(
    track: &TrackPayload,
    invite: Option<&crate::join_link::DiscordInvite>,
    now_ms: u64,
) -> Option<Value> {
    let title = track.title.trim();
    if title.is_empty() {
        return None;
    }

    let artist = track.artist.trim();
    let mut activity = json!({
        "type": 2,
        "details": sanitize_discord_str(title, "Unknown Track", 128),
    });
    if !artist.is_empty() {
        let state = if track.is_playing {
            format!("by {artist}")
        } else {
            format!("Paused - {artist}")
        };
        activity["state"] = json!(sanitize_discord_str(&state, "Unknown Artist", 128));
    } else if !track.is_playing {
        activity["state"] = json!("Paused");
    }

    if track.is_playing {
        let sampled_ms = track.sampled_at_ms.unwrap_or(now_ms);
        let start = (sampled_ms / 1000).saturating_sub(track.current_time_secs);
        activity["timestamps"] = json!({ "start": start });
        if track.duration_secs > track.current_time_secs {
            activity["timestamps"]["end"] = json!(start + track.duration_secs);
        }
    }

    if let Some(cover) = track.cover_url.as_deref() {
        if cover.starts_with("http://") || cover.starts_with("https://") {
            let mut assets = json!({ "large_image": cover });
            if let Some(album) = track.album.as_deref().filter(|a| !a.trim().is_empty()) {
                assets["large_text"] = json!(sanitize_discord_str(album, "Album", 128));
            }
            activity["assets"] = assets;
        }
    }

    if let Some(vid) = track.video_id.as_deref().map(str::trim).filter(|v| !v.is_empty()) {
        let watch_url = if vid.starts_with("http://") || vid.starts_with("https://") {
            vid.to_string()
        } else {
            format!("https://music.youtube.com/watch?v={vid}")
        };
        activity["buttons"] = json!([{ "label": "Listen on YouTube Music", "url": watch_url }]);
    }

    if let Some(invite) = invite {
        let listen_along = json!({ "label": "Listen along", "url": invite.url });
        match activity["buttons"].as_array_mut() {
            Some(buttons) => buttons.push(listen_along),
            None => activity["buttons"] = json!([listen_along]),
        }
        // Discord wants 1 <= current <= max; the host always counts.
        let max = invite.max_members.max(1);
        activity["party"] = json!({
            "id": invite.party_id,
            "size": [invite.members.clamp(1, max), max]
        });
    }

    Some(activity)
}

/// The `SET_ACTIVITY` command frame; a `None` activity clears the presence.
pub fn set_activity_command(activity: Option<&Value>, pid: u32, nonce: &str) -> Value {
    json!({
        "cmd": "SET_ACTIVITY",
        "args": { "pid": pid, "activity": activity },
        "nonce": nonce
    })
}

/// Whether two presences look the same on a profile. Start/end times may
/// differ by the page's rounding, which isn't worth a rate-limited update.
pub fn same_presence(a: Option<&Value>, b: Option<&Value>) -> bool {
    fn split(v: &Value) -> (Value, Option<i64>, Option<i64>) {
        let mut rest = v.clone();
        let ts = rest.as_object_mut().and_then(|o| o.remove("timestamps"));
        let get = |k: &str| ts.as_ref().and_then(|t| t.get(k)).and_then(Value::as_i64);
        (rest, get("start"), get("end"))
    }
    fn close(x: Option<i64>, y: Option<i64>) -> bool {
        match (x, y) {
            (None, None) => true,
            (Some(x), Some(y)) => (x - y).abs() <= TIMESTAMP_TOLERANCE_SECS,
            _ => false,
        }
    }
    match (a, b) {
        (None, None) => true,
        (Some(a), Some(b)) => {
            let (ra, sa, ea) = split(a);
            let (rb, sb, eb) = split(b);
            ra == rb && close(sa, sb) && close(ea, eb)
        }
        _ => false,
    }
}

/// Sliding-window limiter: at most `max` sends in any `window`.
struct RateLimiter {
    max: usize,
    window: Duration,
    sent: VecDeque<Instant>,
}

impl RateLimiter {
    fn new(max: usize, window: Duration) -> Self {
        Self {
            max,
            window,
            sent: VecDeque::with_capacity(max),
        }
    }

    fn next_allowed(&mut self, now: Instant) -> Instant {
        while self.sent.front().is_some_and(|t| now.duration_since(*t) >= self.window) {
            self.sent.pop_front();
        }
        if self.sent.len() < self.max {
            now
        } else {
            self.sent[0] + self.window
        }
    }

    fn record(&mut self, at: Instant) {
        self.sent.push_back(at);
    }
}

#[derive(Debug, Clone, Copy)]
pub struct LoopConfig {
    pub rate_max: usize,
    pub rate_window: Duration,
    pub retry_after: Duration,
}

impl LoopConfig {
    pub const DISCORD: LoopConfig = LoopConfig {
        rate_max: DISCORD_RATE_MAX,
        rate_window: DISCORD_RATE_WINDOW,
        retry_after: RECONNECT_BACKOFF,
    };
}

/// Where presences go: the Discord IPC socket in the app, a recorder in tests.
pub trait PresenceTransport: Send {
    /// `Err` means Discord wasn't reachable; the loop retries later.
    fn send(&mut self, activity: Option<&Value>) -> impl Future<Output = Result<(), String>> + Send;
}

/// Tracks how long the current song has been paused, keyed by song so a
/// paused song that changes restarts the clock.
#[derive(Default)]
struct PauseClock {
    since: Option<(String, Instant)>,
}

impl PauseClock {
    /// The presence to show now and, while paused, when it should clear.
    fn effective(&mut self, desired: &Desired, now: Instant, now_ms: u64) -> (Option<Value>, Option<Instant>) {
        let Some(track) = desired.track.as_ref() else {
            self.since = None;
            return (None, None);
        };
        if track.is_playing {
            self.since = None;
            return (build_activity(track, desired.invite.as_ref(), now_ms), None);
        }
        let key = track.video_id.clone().unwrap_or_else(|| track.title.clone());
        let started = match &self.since {
            Some((k, t)) if *k == key => *t,
            _ => {
                self.since = Some((key, now));
                now
            }
        };
        match desired.clear_after_pause {
            Some(after) if now >= started + after => (None, None),
            Some(after) => (build_activity(track, desired.invite.as_ref(), now_ms), Some(started + after)),
            None => (build_activity(track, desired.invite.as_ref(), now_ms), None),
        }
    }
}

/// Keeps Discord showing the latest wanted presence: rate-limited, deduped,
/// retried while Discord is unreachable. Ends (clearing the presence) when
/// every `DiscordRpcHandle` is dropped.
pub async fn run_presence_loop<T: PresenceTransport>(
    mut rx: watch::Receiver<Desired>,
    mut transport: T,
    cfg: LoopConfig,
) {
    let mut limiter = RateLimiter::new(cfg.rate_max, cfg.rate_window);
    let mut pause = PauseClock::default();
    // Outer None: nothing sent on this connection yet.
    let mut shown: Option<Option<Value>> = None;
    let mut retry_at: Option<Instant> = None;

    loop {
        let desired = rx.borrow_and_update().clone();
        let now = Instant::now();
        let (activity, clear_at) = pause.effective(&desired, now, now_unix_ms());

        let needs_send = match &shown {
            Some(prev) => !same_presence(prev.as_ref(), activity.as_ref()),
            None => activity.is_some(),
        };

        let mut wake = clear_at;
        if needs_send {
            let allowed = limiter.next_allowed(now).max(retry_at.unwrap_or(now));
            if allowed <= now {
                match transport.send(activity.as_ref()).await {
                    Ok(()) => {
                        limiter.record(now);
                        shown = Some(activity);
                        retry_at = None;
                    }
                    Err(e) => {
                        log::debug!("[YTMD Discord RPC] {e}; retrying in {:?}", cfg.retry_after);
                        shown = None;
                        retry_at = Some(now + cfg.retry_after);
                    }
                }
                continue;
            }
            wake = Some(wake.map_or(allowed, |w| w.min(allowed)));
        }

        tokio::select! {
            changed = rx.changed() => {
                if changed.is_err() {
                    if matches!(shown, Some(Some(_))) {
                        let _ = transport.send(None).await;
                    }
                    return;
                }
            }
            _ = sleep_until_opt(wake) => {}
        }
    }
}

async fn sleep_until_opt(at: Option<Instant>) {
    match at {
        Some(at) => tokio::time::sleep_until(at).await,
        None => std::future::pending().await,
    }
}

/// Pulls one complete IPC frame (`opcode`, JSON body) off the front of
/// `buf`. Reads can split a frame or carry several, so bytes stay in `buf`
/// until a whole frame is there.
pub fn take_frame(buf: &mut Vec<u8>) -> Result<Option<(u32, Value)>, String> {
    if buf.len() < 8 {
        return Ok(None);
    }
    let opcode = u32::from_le_bytes([buf[0], buf[1], buf[2], buf[3]]);
    let len = u32::from_le_bytes([buf[4], buf[5], buf[6], buf[7]]) as usize;
    if len > MAX_FRAME_LEN {
        return Err(format!("frame of {len} bytes, stream out of step"));
    }
    if buf.len() < 8 + len {
        return Ok(None);
    }
    let body = serde_json::from_slice(&buf[8..8 + len]).unwrap_or(Value::Null);
    buf.drain(..8 + len);
    Ok(Some((opcode, body)))
}

/// Discord's reply to the handshake: a `READY` dispatch frame. A `CLOSE`
/// frame (bad client id, outdated protocol) is a rejection.
pub fn is_ready_frame(opcode: u32, body: &Value) -> bool {
    opcode == OP_FRAME
        && body.get("cmd").and_then(Value::as_str) == Some("DISPATCH")
        && body.get("evt").and_then(Value::as_str) == Some("READY")
}

fn encode_frame(opcode: u32, payload: &str) -> Vec<u8> {
    let mut out = Vec::with_capacity(8 + payload.len());
    out.extend_from_slice(&opcode.to_le_bytes());
    out.extend_from_slice(&(payload.len() as u32).to_le_bytes());
    out.extend_from_slice(payload.as_bytes());
    out
}

struct Connection {
    stream: DiscordStream,
    buf: Vec<u8>,
}

impl Connection {
    async fn write(&mut self, opcode: u32, payload: &str) -> Result<(), String> {
        let frame = encode_frame(opcode, payload);
        self.stream.write_all(&frame).await.map_err(|e| e.to_string())?;
        self.stream.flush().await.map_err(|e| e.to_string())
    }

    /// Next frame, or `Ok(None)` once `deadline` passes. Cancel-safe: a
    /// partial frame stays in `buf` for the next call.
    async fn next_frame(&mut self, deadline: Instant) -> Result<Option<(u32, Value)>, String> {
        let mut chunk = [0u8; 4096];
        loop {
            if let Some(frame) = take_frame(&mut self.buf)? {
                return Ok(Some(frame));
            }
            match tokio::time::timeout_at(deadline, self.stream.read(&mut chunk)).await {
                Err(_) => return Ok(None),
                Ok(Ok(0)) => return Err("Discord closed the connection".into()),
                Ok(Ok(n)) => self.buf.extend_from_slice(&chunk[..n]),
                Ok(Err(e)) => return Err(e.to_string()),
            }
        }
    }

    /// Waits for the reply carrying `nonce`, answering pings and logging
    /// Discord's error replies on the way.
    async fn await_reply(&mut self, nonce: &str) -> Result<(), String> {
        let deadline = Instant::now() + REPLY_TIMEOUT;
        while let Some((opcode, body)) = self.next_frame(deadline).await? {
            match opcode {
                OP_PING => self.write(OP_PONG, &body.to_string()).await?,
                OP_CLOSE => return Err(format!("Discord closed the connection: {body}")),
                _ if body.get("nonce").and_then(Value::as_str) == Some(nonce) => {
                    if body.get("evt").and_then(Value::as_str) == Some("ERROR") {
                        log::warn!("[YTMD Discord RPC] Discord rejected the activity: {}", body["data"]);
                    }
                    return Ok(());
                }
                _ => {}
            }
        }
        // No reply in time; the connection is kept and a late reply is
        // skipped by nonce next time.
        Ok(())
    }
}

#[derive(Default)]
struct IpcTransport {
    conn: Option<Connection>,
    nonce_seq: u64,
}

impl PresenceTransport for IpcTransport {
    async fn send(&mut self, activity: Option<&Value>) -> Result<(), String> {
        if self.conn.is_none() {
            self.conn = connect_discord().await;
        }
        let Some(conn) = self.conn.as_mut() else {
            return Err("Discord isn't running".into());
        };
        self.nonce_seq += 1;
        let nonce = format!("{:x}-{}", now_unix_ms(), self.nonce_seq);
        let command = set_activity_command(activity, std::process::id(), &nonce);
        let result = match conn.write(OP_FRAME, &command.to_string()).await {
            Ok(()) => conn.await_reply(&nonce).await,
            Err(e) => Err(e),
        };
        if let Err(e) = &result {
            log::warn!("[YTMD Discord RPC] Connection lost: {e}");
            self.conn = None;
        }
        result
    }
}

#[cfg(unix)]
fn ipc_paths() -> Vec<String> {
    let runtime_dir = std::env::var("XDG_RUNTIME_DIR").unwrap_or_else(|_| format!("/run/user/{}", current_uid()));
    (0..10).map(|i| format!("{runtime_dir}/discord-ipc-{i}")).collect()
}

#[cfg(windows)]
fn ipc_paths() -> Vec<String> {
    (0..10).map(|i| format!(r"\\.\pipe\discord-ipc-{i}")).collect()
}

#[cfg(unix)]
async fn open_ipc(path: &str) -> std::io::Result<DiscordStream> {
    DiscordStream::connect(path).await
}

#[cfg(windows)]
async fn open_ipc(path: &str) -> std::io::Result<DiscordStream> {
    tokio::net::windows::named_pipe::ClientOptions::new().open(path)
}

async fn connect_discord() -> Option<Connection> {
    for path in ipc_paths() {
        for &client_id in DISCORD_CLIENT_IDS {
            let Ok(stream) = open_ipc(&path).await else {
                continue;
            };
            let mut conn = Connection { stream, buf: Vec::new() };
            let handshake = json!({ "v": 1, "client_id": client_id }).to_string();
            if conn.write(OP_HANDSHAKE, &handshake).await.is_err() {
                continue;
            }
            let deadline = Instant::now() + Duration::from_secs(2);
            match conn.next_frame(deadline).await {
                Ok(Some((opcode, body))) if is_ready_frame(opcode, &body) => {
                    log::info!("[YTMD Discord RPC] Connected to {path} with client ID {client_id}");
                    return Some(conn);
                }
                other => {
                    log::debug!("[YTMD Discord RPC] Handshake rejected on {path} for client ID {client_id}: {other:?}");
                }
            }
        }
    }
    None
}

/// The real UID of the current process, used only as the `XDG_RUNTIME_DIR`
/// fallback when that env var is unset — the standard systemd/XDG runtime
/// dir is `/run/user/<uid>`. No `libc` crate is available in this crate's
/// dependencies, so this reads the real UID straight from procfs.
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
/// there doesn't live under `/run/user/<uid>` anyway.
#[cfg(all(unix, not(target_os = "linux")))]
fn current_uid() -> u32 {
    1000
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_uses_our_own_discord_application() {
        assert_eq!(super::DISCORD_CLIENT_IDS, ["1552722936966680676"]);
        assert!(super::DISCORD_CLIENT_IDS.iter().all(|id| id.len() >= 17 && id.bytes().all(|b| b.is_ascii_digit())));
    }

    use super::*;
    use std::sync::{Arc, Mutex};

    fn track(title: &str, playing: bool) -> TrackPayload {
        TrackPayload {
            title: title.to_string(),
            artist: "Carpenter Brut".to_string(),
            album: Some("Trilogy".to_string()),
            cover_url: Some("https://lh3.googleusercontent.com/img.jpg".to_string()),
            duration_secs: 300,
            current_time_secs: 50,
            is_playing: playing,
            video_id: Some(format!("id-{title}")),
            sampled_at_ms: None,
            playlist_id: None,
        }
    }

    type SentLog = Arc<Mutex<Vec<(Instant, Option<Value>)>>>;

    #[derive(Clone, Default)]
    struct Recorder {
        sent: SentLog,
        fail: Arc<Mutex<bool>>,
    }

    impl Recorder {
        fn details(&self) -> Vec<Option<String>> {
            self.sent
                .lock()
                .unwrap()
                .iter()
                .map(|(_, a)| a.as_ref().map(|a| a["details"].as_str().unwrap_or_default().to_string()))
                .collect()
        }
    }

    impl PresenceTransport for Recorder {
        async fn send(&mut self, activity: Option<&Value>) -> Result<(), String> {
            if *self.fail.lock().unwrap() {
                return Err("down".into());
            }
            self.sent.lock().unwrap().push((Instant::now(), activity.cloned()));
            Ok(())
        }
    }

    const FAST: LoopConfig = LoopConfig {
        rate_max: 2,
        rate_window: Duration::from_millis(300),
        retry_after: Duration::from_millis(100),
    };

    fn spawn_loop(rec: &Recorder) -> (watch::Sender<Desired>, tokio::task::JoinHandle<()>) {
        let (tx, rx) = watch::channel(Desired::default());
        let task = tokio::spawn(run_presence_loop(rx, rec.clone(), FAST));
        (tx, task)
    }

    fn play(tx: &watch::Sender<Desired>, t: TrackPayload, clear_after_pause: Option<Duration>) {
        tx.send_replace(Desired {
            track: Some(t),
            clear_after_pause,
            invite: None,
        });
    }

    #[test]
    #[cfg(target_os = "linux")]
    fn test_current_uid_matches_the_process_real_uid() {
        use std::os::unix::fs::MetadataExt;
        let tmp = tempfile::NamedTempFile::new().expect("tempfile");
        let owner_uid = std::fs::metadata(tmp.path()).expect("metadata").uid();
        assert_eq!(current_uid(), owner_uid);
    }

    #[test]
    fn test_discord_rpc_handle_initialization() {
        let handle = DiscordRpcHandle::new();
        handle.clear();
        handle.update(Desired {
            track: Some(track("Starboy", true)),
            ..Desired::default()
        });
    }

    #[test]
    fn test_track_payload_deserialization_handles_floats_and_integers() {
        let track: TrackPayload = serde_json::from_value(json!({
            "title": "Blinding Lights",
            "artist": "The Weeknd",
            "album": "After Hours",
            "cover_url": "https://lh3.googleusercontent.com/abc",
            "duration_secs": 200.45,
            "current_time_secs": 15.89,
            "is_playing": true,
            "video_id": "4NRXx6U8ABQ"
        }))
        .unwrap();
        assert_eq!(track.duration_secs, 200);
        assert_eq!(track.current_time_secs, 16);
        assert_eq!(track.sampled_at_ms, None);
    }

    #[test]
    fn test_sanitize_discord_str_handles_padding_and_truncation() {
        assert_eq!(sanitize_discord_str("A", "Default", 128), "A\u{2800}");
        assert_eq!(sanitize_discord_str("   ", "Fallback Title", 128), "Fallback Title");
        assert_eq!(sanitize_discord_str(&"a".repeat(200), "Default", 128).chars().count(), 128);
    }

    #[test]
    fn test_build_activity_playing_and_paused() {
        let act = build_activity(&track("Maniac", true), None, 1_000_000_000).unwrap();
        assert_eq!(act["type"], 2);
        assert_eq!(act["details"], "Maniac");
        assert_eq!(act["state"], "by Carpenter Brut");
        assert_eq!(act["timestamps"]["start"], 1_000_000 - 50);
        assert_eq!(act["timestamps"]["end"], 1_000_000 - 50 + 300);
        assert_eq!(act["assets"]["large_image"], "https://lh3.googleusercontent.com/img.jpg");
        assert_eq!(act["assets"]["large_text"], "Trilogy");
        assert_eq!(act["buttons"][0]["url"], "https://music.youtube.com/watch?v=id-Maniac");

        let paused = build_activity(&track("Maniac", false), None, 1_000_000_000).unwrap();
        assert_eq!(paused["state"], "Paused - Carpenter Brut");
        assert!(paused.get("timestamps").is_none());

        assert!(set_activity_command(None, 1, "n")["args"]["activity"].is_null());
    }

    #[test]
    fn test_start_time_comes_from_the_page_sample_not_the_send_time() {
        let mut t = track("Maniac", true);
        t.sampled_at_ms = Some(2_000_000_400);
        // Sent 7 s after the sample: the start must not move by those 7 s.
        let act = build_activity(&t, None, 2_000_007_400).unwrap();
        assert_eq!(act["timestamps"]["start"], 2_000_000 - 50);
    }

    #[test]
    fn test_invite_adds_listen_along_and_party() {
        let invite = crate::join_link::DiscordInvite {
            url: crate::join_link::invite_url("YTMD-ABCDEFGH23"),
            party_id: crate::join_link::party_id("YTMD-ABCDEFGH23"),
            members: 3,
            max_members: 16,
        };
        let act = build_activity(&track("Maniac", true), Some(&invite), 0).unwrap();
        let buttons = act["buttons"].as_array().unwrap();
        assert_eq!(buttons.len(), 2, "Discord allows at most 2 buttons");
        assert_eq!(buttons[1]["label"], "Listen along");
        assert_eq!(buttons[1]["url"], invite.url.as_str());
        assert!(buttons.iter().all(|b| b["label"].as_str().unwrap().chars().count() <= 32));
        assert_eq!(act["party"]["size"], json!([3, 16]));

        let mut no_id = track("Maniac", true);
        no_id.video_id = None;
        let alone = crate::join_link::DiscordInvite { members: 0, ..invite };
        let act = build_activity(&no_id, Some(&alone), 0).unwrap();
        assert_eq!(act["buttons"].as_array().unwrap().len(), 1);
        assert_eq!(act["party"]["size"], json!([1, 16]), "an empty member list still counts the host");

        assert!(build_activity(&track("Maniac", true), None, 0).unwrap().get("party").is_none());
    }

    #[test]
    fn test_nothing_to_show_without_a_title() {
        let mut t = track("", true);
        assert!(build_activity(&t, None, 0).is_none());
        t.title = "   ".into();
        assert!(build_activity(&t, None, 0).is_none());
    }

    #[test]
    fn test_missing_artist_never_shows_a_bare_by() {
        let mut t = track("Maniac", true);
        t.artist = " ".into();
        assert!(build_activity(&t, None, 0).unwrap().get("state").is_none());
        t.is_playing = false;
        assert_eq!(build_activity(&t, None, 0).unwrap()["state"], "Paused");
    }

    #[test]
    fn test_same_presence_ignores_small_timestamp_jitter() {
        let a = build_activity(&track("Maniac", true), None, 1_000_000_000).unwrap();
        let b = build_activity(&track("Maniac", true), None, 1_000_001_000).unwrap();
        let far = build_activity(&track("Maniac", true), None, 1_000_010_000).unwrap();
        let other = build_activity(&track("Turbo Killer", true), None, 1_000_000_000).unwrap();
        assert!(same_presence(Some(&a), Some(&b)));
        assert!(!same_presence(Some(&a), Some(&far)), "a seek must still be sent");
        assert!(!same_presence(Some(&a), Some(&other)));
        assert!(!same_presence(Some(&a), None));
        assert!(same_presence(None, None));
    }

    #[test]
    fn test_take_frame_handles_split_and_combined_reads() {
        let one = encode_frame(1, r#"{"nonce":"a"}"#);
        let two = encode_frame(3, r#"{"x":1}"#);

        let mut buf = one[..5].to_vec();
        assert_eq!(take_frame(&mut buf).unwrap(), None);
        buf.extend_from_slice(&one[5..]);
        buf.extend_from_slice(&two[..9]);
        let (op, body) = take_frame(&mut buf).unwrap().unwrap();
        assert_eq!((op, body["nonce"].as_str()), (1, Some("a")));
        assert_eq!(take_frame(&mut buf).unwrap(), None);
        buf.extend_from_slice(&two[9..]);
        assert_eq!(take_frame(&mut buf).unwrap().unwrap().0, 3);
        assert!(buf.is_empty());

        let mut huge = encode_frame(1, "");
        huge[4..8].copy_from_slice(&(MAX_FRAME_LEN as u32 + 1).to_le_bytes());
        assert!(take_frame(&mut huge).is_err());
    }

    #[test]
    fn test_ready_frame_detection() {
        let ready = json!({ "cmd": "DISPATCH", "evt": "READY", "data": { "v": 1 } });
        assert!(is_ready_frame(OP_FRAME, &ready));
        assert!(!is_ready_frame(OP_CLOSE, &json!({ "code": 4000, "message": "Invalid Client ID" })));
        assert!(!is_ready_frame(OP_FRAME, &json!({ "evt": "ERROR" })));
    }

    #[tokio::test]
    async fn test_burst_of_updates_respects_rate_limit_and_ends_on_the_last_song() {
        let rec = Recorder::default();
        let (tx, _task) = spawn_loop(&rec);
        for i in 0..10 {
            play(&tx, track(&format!("Song {i}"), true), None);
            tokio::time::sleep(Duration::from_millis(5)).await;
        }
        tokio::time::sleep(Duration::from_millis(800)).await;

        let sent = rec.sent.lock().unwrap().clone();
        assert_eq!(rec.details().last().cloned().flatten().as_deref(), Some("Song 9"));
        assert!(sent.len() < 10, "intermediate songs must be skipped, sent {}", sent.len());
        for (i, (at, _)) in sent.iter().enumerate() {
            let in_window = sent[i..].iter().filter(|(t, _)| t.duration_since(*at) < FAST.rate_window).count();
            assert!(in_window <= FAST.rate_max, "more than {} sends in one window", FAST.rate_max);
        }
    }

    #[tokio::test]
    async fn test_repeated_state_is_sent_once() {
        let rec = Recorder::default();
        let (tx, _task) = spawn_loop(&rec);
        for _ in 0..3 {
            play(&tx, track("Maniac", true), None);
            tokio::time::sleep(Duration::from_millis(30)).await;
        }
        assert_eq!(rec.details(), vec![Some("Maniac".to_string())]);
    }

    #[tokio::test]
    async fn test_clears_when_nothing_is_playing() {
        let rec = Recorder::default();
        let (tx, _task) = spawn_loop(&rec);
        play(&tx, track("Maniac", true), None);
        tokio::time::sleep(Duration::from_millis(30)).await;
        play(&tx, track("", false), None);
        tokio::time::sleep(Duration::from_millis(30)).await;
        assert_eq!(rec.details(), vec![Some("Maniac".to_string()), None]);
    }

    #[tokio::test]
    async fn test_long_pause_clears_the_presence() {
        let rec = Recorder::default();
        let (tx, _task) = spawn_loop(&rec);
        play(&tx, track("Maniac", false), Some(Duration::from_millis(150)));
        tokio::time::sleep(Duration::from_millis(50)).await;
        assert_eq!(rec.details(), vec![Some("Maniac".to_string())]);
        tokio::time::sleep(Duration::from_millis(250)).await;
        assert_eq!(rec.details(), vec![Some("Maniac".to_string()), None]);

        // Resuming shows it again.
        play(&tx, track("Maniac", true), Some(Duration::from_millis(150)));
        tokio::time::sleep(Duration::from_millis(50)).await;
        assert_eq!(rec.details().last().cloned().flatten().as_deref(), Some("Maniac"));
    }

    #[tokio::test]
    async fn test_retries_the_latest_state_after_discord_was_unreachable() {
        let rec = Recorder::default();
        *rec.fail.lock().unwrap() = true;
        let (tx, _task) = spawn_loop(&rec);
        play(&tx, track("Old", true), None);
        tokio::time::sleep(Duration::from_millis(20)).await;
        play(&tx, track("New", true), None);
        *rec.fail.lock().unwrap() = false;
        tokio::time::sleep(Duration::from_millis(250)).await;
        assert_eq!(rec.details(), vec![Some("New".to_string())]);
    }

    #[tokio::test]
    async fn test_dropping_the_handle_clears_and_ends_the_loop() {
        let rec = Recorder::default();
        let (tx, task) = spawn_loop(&rec);
        play(&tx, track("Maniac", true), None);
        tokio::time::sleep(Duration::from_millis(30)).await;
        drop(tx);
        tokio::time::timeout(Duration::from_millis(500), task)
            .await
            .expect("loop must end when every handle is gone")
            .unwrap();
        assert_eq!(rec.details(), vec![Some("Maniac".to_string()), None]);
    }

    #[tokio::test]
    #[ignore = "needs a running Discord client"]
    async fn test_live_discord_connect_and_activity() {
        let mut transport = IpcTransport::default();
        let act = build_activity(&track("Starboy", true), None, now_unix_ms());
        transport.send(act.as_ref()).await.expect("send over live Discord");
    }
}
