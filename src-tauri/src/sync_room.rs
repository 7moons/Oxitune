//! Real LAN "Listen Together" networking.
//!
//! Previously `join_room` fabricated a fake local "Host" member and never
//! opened a socket — two devices on the same room code never actually saw
//! each other. This module replaces that with:
//!
//!   1. The host binds an ephemeral TCP listener and periodically broadcasts
//!      a small UDP beacon (room code + its TCP port) on the LAN.
//!   2. A guest listens for that beacon, matches the room code, and connects
//!      directly to the host over TCP.
//!   3. Room-state and playback updates are relayed as newline-delimited
//!      JSON over that TCP connection for as long as both sides stay open.
//!
//! This transport only works for devices on the same local network
//! (Wi-Fi/LAN) — it cannot bridge two different networks behind separate
//! NATs, and is tried first for its lower latency. `create_room`/`join_room`
//! below also drive `p2p_sync.rs`, a second transport over a public MQTT
//! broker, so two peers on different networks/NATs (e.g. different cities)
//! can still find each other; see that module for the internet path.

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::tcp::OwnedReadHalf;
use tokio::net::{TcpListener, TcpStream, UdpSocket};
use tokio::sync::{mpsc, oneshot};
use tokio::time::Instant;

const DISCOVERY_UDP_PORT: u16 = 47863;
const DISCOVERY_TIMEOUT: Duration = Duration::from_millis(2500);
const BEACON_INTERVAL: Duration = Duration::from_secs(2);
const MAX_MEMBERS: usize = 16;
const JOIN_HANDSHAKE_TIMEOUT: Duration = Duration::from_secs(5);
/// Hard cap on a single wire-protocol line. Without this, a peer that never
/// sends `\n` can grow `read_line`'s buffer without bound (memory exhaustion
/// from one malformed/hostile LAN connection). Generous for our JSON messages.
const MAX_LINE_LEN: u64 = 64 * 1024;

/// `read_line`, but capped at `MAX_LINE_LEN` bytes. If the peer never sends a
/// newline within the cap, this returns once the limit is hit (as if EOF),
/// leaving `buf` without a trailing `\n` so the caller's message parsing
/// naturally rejects it and the connection gets dropped.
async fn read_line_capped<R: tokio::io::AsyncBufRead + Unpin>(
    reader: &mut R,
    buf: &mut String,
) -> std::io::Result<usize> {
    use tokio::io::AsyncReadExt;
    (&mut *reader).take(MAX_LINE_LEN).read_line(buf).await
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoomMember {
    pub id: String,
    pub nickname: String,
    pub is_host: bool,
    pub joined_at_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncPlaybackState {
    pub video_id: String,
    pub title: String,
    pub artist: String,
    pub current_time_secs: f64,
    pub is_playing: bool,
    pub timestamp_ms: u64,
}

/// The view of room state handed to the frontend. `is_host` and
/// `current_user_id` are perspective-relative — they describe how the
/// *local* process relates to the room, not a globally shared value — so
/// they are never sent over the wire (see `RoomStateWire`) and are instead
/// filled in locally by whichever side is building this struct.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoomState {
    pub room_code: String,
    pub is_host: bool,
    pub current_user_id: String,
    pub members: Vec<RoomMember>,
    pub playback_state: Option<SyncPlaybackState>,
}

/// The objective, shared part of room state that actually goes over the
/// network. Both peers agree on this; only the viewer-relative fields above
/// differ between them.
///
/// `pub(crate)` (rather than private) because `p2p_sync.rs` carries this same
/// struct over its libp2p request-response protocol instead of raw TCP —
/// both transports speak the exact same wire vocabulary.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub(crate) struct RoomStateWire {
    room_code: String,
    members: Vec<RoomMember>,
    playback_state: Option<SyncPlaybackState>,
}

impl From<&RoomState> for RoomStateWire {
    fn from(r: &RoomState) -> Self {
        RoomStateWire {
            room_code: r.room_code.clone(),
            members: r.members.clone(),
            playback_state: r.playback_state.clone(),
        }
    }
}

impl RoomStateWire {
    pub(crate) fn has_member(&self, member_id: &str) -> bool {
        self.members.iter().any(|m| m.id == member_id)
    }

    pub(crate) fn into_local_view(self, is_host: bool, current_user_id: String) -> RoomState {
        RoomState {
            room_code: self.room_code,
            is_host,
            current_user_id,
            members: self.members,
            playback_state: self.playback_state,
        }
    }
}

/// `pub(crate)`: shared verbatim between the LAN TCP transport (this file)
/// and the libp2p transport (`p2p_sync.rs`) — same JSON vocabulary either
/// way, only the bytes' route differs. `Ack` exists only for the libp2p side:
/// libp2p's request-response protocol requires every request to get a
/// response, unlike the LAN transport's fire-and-forget newline stream, so
/// pushed `State`/`Playback` messages there get acknowledged with it.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub(crate) enum WireMessage {
    Join { user_id: String, nickname: String },
    State { room: RoomStateWire },
    Playback { state: SyncPlaybackState },
    Leave { user_id: String },
    Ack,
    /// Liveness ping: guests send one to the host, and the host sends one
    /// (with its own id) to every guest, each `LivenessConfig::heartbeat_interval`.
    /// Either side that hears nothing for `LivenessConfig::timeout` treats the
    /// other as gone. Peers that predate this variant fail to parse it and
    /// skip the line, same as any other unknown message.
    Heartbeat { user_id: String },
    /// Guest -> host: a playback request (skip, pause, pick a song) for the
    /// whole room. Older hosts fail to parse it and skip the line.
    Control { user_id: String, action: SyncControl },
}

/// What a guest asks the host to do. The host's page carries it out and its
/// regular `Playback` broadcast then brings every guest along, the sender
/// included, so a guest never acts on its own player and drifts off.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum SyncControl {
    Next,
    Previous,
    SetPlaying { playing: bool },
    PlayVideo { video_id: String },
}

impl SyncControl {
    /// The host's page navigates to `video_id`, so only YouTube's 11-char id
    /// form gets through.
    pub(crate) fn is_valid(&self) -> bool {
        match self {
            SyncControl::PlayVideo { video_id } => {
                video_id.len() == 11
                    && video_id.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
            }
            _ => true,
        }
    }
}

/// A guest's `Control` as handed to the host's page: the request and the
/// nickname of whoever sent it (for the toast).
#[derive(Debug, Clone, Serialize)]
pub struct SyncControlRequest {
    pub from: String,
    pub action: SyncControl,
}

/// How often peers ping each other and how long silence is tolerated before
/// a member is evicted (host side) or the room is considered gone (guest
/// side). Configurable so tests can run the same logic in milliseconds.
#[derive(Debug, Clone, Copy)]
pub struct LivenessConfig {
    pub heartbeat_interval: Duration,
    pub timeout: Duration,
}

impl Default for LivenessConfig {
    fn default() -> Self {
        Self {
            heartbeat_interval: Duration::from_secs(5),
            timeout: Duration::from_secs(15),
        }
    }
}

/// Members (never the host) whose last sign of life is older than `timeout`.
/// A member with no `last_seen` entry is treated as just seen: every add goes
/// through `add_member`, which records one, so a missing entry only means a
/// racing removal, not silence.
pub(crate) fn stale_members(
    room: &RoomState,
    last_seen: &HashMap<String, Instant>,
    now: Instant,
    timeout: Duration,
) -> Vec<String> {
    room.members
        .iter()
        .filter(|m| !m.is_host)
        .filter(|m| {
            last_seen
                .get(&m.id)
                .is_some_and(|seen| now.saturating_duration_since(*seen) > timeout)
        })
        .map(|m| m.id.clone())
        .collect()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Beacon {
    room_code: String,
    host_nickname: String,
    tcp_port: u16,
}

/// Where SyncRoomManager sends notifications for the frontend. Abstracted
/// behind a trait (rather than taking `tauri::AppHandle` directly) so the
/// networking logic in this module can be exercised in `cargo test` without
/// standing up a full Tauri runtime/webview — tests use a no-op sink and
/// assert on `SyncRoomManager`'s own state instead.
pub trait SyncEventSink: Send + Sync + 'static {
    fn room_updated(&self, room: &RoomState);
    fn playback_updated(&self, state: &SyncPlaybackState);
    fn room_left(&self);
    fn control_requested(&self, request: &SyncControlRequest);
}

impl SyncEventSink for AppHandle {
    fn room_updated(&self, room: &RoomState) {
        let _ = self.emit("sync-room-updated", room);
    }
    fn playback_updated(&self, state: &SyncPlaybackState) {
        let _ = self.emit("sync-playback-remote", state);
    }
    fn room_left(&self) {
        let _ = self.emit("sync-room-left", ());
    }
    fn control_requested(&self, request: &SyncControlRequest) {
        let _ = self.emit("sync-control-remote", request);
    }
}

struct HostSession {
    accept_task: tauri::async_runtime::JoinHandle<()>,
    beacon_task: tauri::async_runtime::JoinHandle<()>,
    /// The libp2p rendezvous+relay event loop (see `p2p_sync.rs`), started
    /// alongside the LAN beacon so a guest on a different network can find
    /// this room through the public DHT while a same-LAN guest still gets
    /// the faster UDP beacon path. `None` if the P2P swarm failed to start
    /// (e.g. no usable transport) — LAN hosting still works without it.
    p2p_task: Option<tauri::async_runtime::JoinHandle<()>>,
    /// Asks the P2P host loop to publish a final `Leave` on the room's
    /// broadcast topic before exiting, so internet guests learn the room
    /// closed instead of silently waiting forever (the MQTT transport has
    /// no connection-level EOF between host and guest like TCP does).
    p2p_shutdown: Option<oneshot::Sender<()>>,
    /// Sends the host's heartbeat to every guest and evicts silent members.
    liveness_task: tauri::async_runtime::JoinHandle<()>,
    /// The TCP port this instance is listening on. Real guests never need
    /// this directly (they learn it from the UDP beacon); it exists so
    /// `SyncRoomManager::host_port` can hand it to tests that connect over
    /// loopback without depending on broadcast delivery.
    port: u16,
}

struct GuestSession {
    reader_task: tauri::async_runtime::JoinHandle<()>,
    /// Our member id, stamped on the `Control` requests we send.
    user_id: String,
    /// Messages for the host (today: `Control`), drained by `writer_task`
    /// (TCP) or the guest loop (P2P).
    outbox: mpsc::UnboundedSender<WireMessage>,
    /// TCP only: sends this guest's heartbeats and outbox messages and owns
    /// the stream's write half for the whole session. Dropping a split TCP stream's write half
    /// immediately shuts down that direction (sends FIN), which the host
    /// reads as a disconnect — so aborting this task on leave is also what
    /// closes the connection.
    ///
    /// `None` for a P2P session (`p2p_sync.rs`): there `reader_task` owns
    /// the MQTT client and sends heartbeats itself.
    writer_task: Option<tauri::async_runtime::JoinHandle<()>>,
    /// P2P only: asks the guest loop to publish `Leave` to the host and
    /// exit on its own (instead of being aborted mid-flight), so the host
    /// drops this member from the room right away.
    shutdown: Option<oneshot::Sender<()>>,
}

pub struct SyncRoomManager {
    state: Mutex<Option<RoomState>>,
    host: Mutex<Option<HostSession>>,
    guest: Mutex<Option<GuestSession>>,
    /// Registered senders for every connected guest, keyed by member id —
    /// used by `broadcast_to_peers` to fan out `State`/`Playback` updates.
    /// Lives here rather than inside `HostSession` because it's transport-
    /// agnostic: both the TCP `peer_task` and `p2p_sync.rs`'s host loop
    /// register into the same map regardless of which (or how many)
    /// transports are currently hosting, so a broadcast reaches every
    /// connected guest — LAN and internet alike — through one call.
    peers: Mutex<HashMap<String, mpsc::UnboundedSender<WireMessage>>>,
    /// Host side: when each member was last heard from (join, heartbeat, or
    /// any other message), for evicting guests that vanished without a
    /// `Leave` (crash, network drop, sleep).
    last_seen: Mutex<HashMap<String, Instant>>,
    /// Bumped on every create/join/leave. Background tasks capture the value
    /// they were started under and stop touching shared state once it moves
    /// on, so a dying session's loop can never clobber a newer one.
    session_gen: AtomicU64,
    pub(crate) liveness: LivenessConfig,
    /// Whether `create_room` also hosts over the internet (MQTT) transport.
    /// Only turned off by tests that must not depend on public brokers.
    internet_enabled: bool,
}

impl Default for SyncRoomManager {
    fn default() -> Self {
        Self::new()
    }
}

impl SyncRoomManager {
    pub fn new() -> Self {
        Self::with_options(LivenessConfig::default(), true)
    }

    pub fn with_options(liveness: LivenessConfig, internet_enabled: bool) -> Self {
        Self {
            state: Mutex::new(None),
            host: Mutex::new(None),
            guest: Mutex::new(None),
            peers: Mutex::new(HashMap::new()),
            last_seen: Mutex::new(HashMap::new()),
            session_gen: AtomicU64::new(0),
            liveness,
            internet_enabled,
        }
    }

    /// Starts a new session generation and returns it.
    pub(crate) fn begin_session(&self) -> u64 {
        self.session_gen.fetch_add(1, Ordering::SeqCst) + 1
    }

    pub(crate) fn is_current_session(&self, generation: u64) -> bool {
        self.session_gen.load(Ordering::SeqCst) == generation
    }

    pub fn get_room_state(&self) -> Option<RoomState> {
        self.state.lock().clone()
    }

    /// Test/diagnostic accessor: the TCP port this instance is hosting on,
    /// if any. Real guests never need this — they learn it from the UDP
    /// beacon — but tests use it to connect directly over loopback without
    /// depending on broadcast delivery, which isn't guaranteed in every
    /// network namespace (containers, CI).
    pub fn host_port(&self) -> Option<u16> {
        self.host.lock().as_ref().map(|h| h.port)
    }

    /// `pub(crate)`: called by both the TCP `peer_task` below and by
    /// `p2p_sync.rs`'s host loop when a peer's `Join` arrives — the
    /// membership/capacity logic is transport-agnostic.
    pub(crate) fn add_member(&self, member_id: String, nickname: String) -> Result<RoomState, &'static str> {
        let mut guard = self.state.lock();
        let room = guard.as_mut().ok_or("Room closed")?;
        if room.members.len() >= MAX_MEMBERS {
            return Err("Room is full");
        }
        self.last_seen.lock().insert(member_id.clone(), Instant::now());
        room.members.push(RoomMember {
            id: member_id,
            nickname,
            is_host: false,
            joined_at_ms: now_ms(),
        });
        Ok(room.clone())
    }

    /// Whether `member_id` is currently in the room. The internet transport
    /// uses it to treat a re-sent `Join` (guests retry until they hear back)
    /// as the same member instead of adding a duplicate.
    pub(crate) fn has_member(&self, member_id: &str) -> bool {
        self.state
            .lock()
            .as_ref()
            .is_some_and(|r| r.members.iter().any(|m| m.id == member_id))
    }

    /// Returns the updated room only if `member_id` was actually a member, so
    /// a departure noticed twice (e.g. eviction, then the TCP task ending)
    /// is announced once.
    pub(crate) fn remove_member(&self, member_id: &str) -> Option<RoomState> {
        let mut guard = self.state.lock();
        let room = guard.as_mut()?;
        let before = room.members.len();
        room.members.retain(|m| m.id != member_id);
        self.last_seen.lock().remove(member_id);
        (room.members.len() != before).then(|| room.clone())
    }

    /// Records a sign of life from a current member. Ignored for ids that
    /// aren't members (e.g. already evicted).
    pub(crate) fn touch_member(&self, member_id: &str) {
        if let Some(seen) = self.last_seen.lock().get_mut(member_id) {
            *seen = Instant::now();
        }
    }

    /// Removes every member silent for longer than the liveness timeout and
    /// returns the updated room if anyone was removed.
    pub(crate) fn evict_stale_members(&self) -> Option<RoomState> {
        let stale = {
            let guard = self.state.lock();
            let room = guard.as_ref()?;
            stale_members(room, &self.last_seen.lock(), Instant::now(), self.liveness.timeout)
        };
        let mut updated = None;
        for id in stale {
            log::info!("Listen Together: evicting silent member {id}");
            // Dropping the sender ends that guest's TCP connection too.
            self.unregister_peer(&id);
            if let Some(room) = self.remove_member(&id) {
                updated = Some(room);
            }
        }
        updated
    }

    /// `pub(crate)`: `p2p_sync.rs`'s host loop registers each joined libp2p
    /// peer here too, under the same `peers` map the TCP path uses — so
    /// `broadcast_to_peers` below fans out to LAN and internet guests
    /// identically without either transport knowing about the other.
    pub(crate) fn register_peer(&self, member_id: String, tx: mpsc::UnboundedSender<WireMessage>) {
        self.peers.lock().insert(member_id, tx);
    }

    pub(crate) fn unregister_peer(&self, member_id: &str) {
        self.peers.lock().remove(member_id);
    }

    pub(crate) fn broadcast_to_peers(&self, msg: &WireMessage) {
        let peers = self.peers.lock();
        for tx in peers.values() {
            let _ = tx.send(msg.clone());
        }
    }

    /// Attaches the libp2p host event loop's task handle to the current
    /// host session, if one exists, so `leave_room` can abort it alongside
    /// the LAN accept/beacon tasks. A no-op if this instance isn't hosting
    /// (e.g. `create_room` failed before this ran) or already left.
    pub(crate) fn attach_p2p_host_task(
        &self,
        task: tauri::async_runtime::JoinHandle<()>,
        shutdown: oneshot::Sender<()>,
    ) {
        if let Some(host) = self.host.lock().as_mut() {
            host.p2p_task = Some(task);
            host.p2p_shutdown = Some(shutdown);
        }
    }

    /// Records that this instance is now a guest of a room reached via
    /// libp2p, mirroring what `connect_to_host` does for a TCP guest
    /// session. `reader_task` owns the swarm and must be aborted (by
    /// `leave_room`) to actually disconnect.
    pub(crate) fn set_p2p_guest_session(
        &self,
        reader_task: tauri::async_runtime::JoinHandle<()>,
        shutdown: oneshot::Sender<()>,
        user_id: String,
        outbox: mpsc::UnboundedSender<WireMessage>,
    ) {
        *self.guest.lock() = Some(GuestSession {
            reader_task,
            user_id,
            outbox,
            writer_task: None,
            shutdown: Some(shutdown),
        });
    }

    /// Host side: a guest's `Control` arrived. `member_id` is whoever the
    /// transport says sent it; non-members and invalid requests are dropped.
    pub(crate) fn handle_guest_control(
        &self,
        member_id: &str,
        action: SyncControl,
        sink: &Arc<dyn SyncEventSink>,
    ) {
        if !action.is_valid() {
            return;
        }
        let from = {
            let guard = self.state.lock();
            let Some(room) = guard.as_ref().filter(|r| r.is_host) else {
                return;
            };
            match room.members.iter().find(|m| m.id == member_id) {
                Some(m) => m.nickname.clone(),
                None => return,
            }
        };
        self.touch_member(member_id);
        sink.control_requested(&SyncControlRequest { from, action });
    }

    #[cfg(test)]
    pub(crate) fn set_local_room(&self, room: RoomState) {
        *self.state.lock() = Some(room);
    }

    /// Applies a `State` push received from the host (guest side) and
    /// returns the resulting local view, mirroring the TCP
    /// `guest_reader_loop`'s handling of `WireMessage::State`. Also used for
    /// the initial state handed back in the `Join` response, since the
    /// semantics (store + return the local view) are identical. `None` (and
    /// nothing stored) if `generation` is no longer the current session.
    pub(crate) fn apply_remote_room_update(
        &self,
        wire: RoomStateWire,
        current_user_id: &str,
        generation: u64,
    ) -> Option<RoomState> {
        let mut guard = self.state.lock();
        if !self.is_current_session(generation) {
            return None;
        }
        let local = wire.into_local_view(false, current_user_id.to_string());
        *guard = Some(local.clone());
        Some(local)
    }

    /// Applies a `Playback` push received from the host (guest side).
    /// Returns false (and stores nothing) for a stale session.
    pub(crate) fn apply_remote_playback(&self, state: SyncPlaybackState, generation: u64) -> bool {
        let mut guard = self.state.lock();
        if !self.is_current_session(generation) {
            return false;
        }
        if let Some(r) = guard.as_mut() {
            r.playback_state = Some(state);
        }
        true
    }

    /// Clears guest-side state after the connection to the host is lost, but
    /// only if `generation` is still the current session. Returns whether it
    /// did, i.e. whether the caller should tell the frontend the room is gone.
    pub(crate) fn clear_guest_if_current(&self, generation: u64) -> bool {
        let mut state = self.state.lock();
        if !self.is_current_session(generation) {
            return false;
        }
        *state = None;
        self.session_gen.fetch_add(1, Ordering::SeqCst);
        if let Some(guest) = self.guest.lock().take() {
            if let Some(task) = guest.writer_task {
                task.abort();
            }
        }
        true
    }
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

/// 10 chars from a 33-char alphabet is ~50 bits of entropy. 6 chars (~30
/// bits) was fine when the room code's only reach was a Wi-Fi broadcast
/// domain; now that `p2p_sync.rs` makes the same code look-up-able from a
/// globally queryable DHT, brute-forcing it needs to be "practically
/// impossible", not just "impractical on a LAN". Same alphabet (no
/// visually-confusable chars) keeps it just as easy to read aloud or type.
pub fn generate_room_code() -> String {
    use rand::Rng;
    const CHARS: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let mut rng = rand::rng();
    let code: String = (0..10)
        .map(|_| CHARS[rng.random_range(0..CHARS.len())] as char)
        .collect();
    format!("YTMD-{}", code)
}

pub(crate) fn generate_user_id() -> String {
    use rand::Rng;
    let n: u64 = rand::rng().random();
    format!("user-{:x}", n & 0xFFFF_FFFF)
}

// ---------------------------------------------------------------------
// Host side
// ---------------------------------------------------------------------

pub async fn create_room(
    manager: &Arc<SyncRoomManager>,
    sink: Arc<dyn SyncEventSink>,
    nickname: String,
) -> Result<RoomState, String> {
    if manager.state.lock().is_some() {
        return Err("Already in a room. Leave the current room first.".to_string());
    }

    let listener = TcpListener::bind("0.0.0.0:0")
        .await
        .map_err(|e| format!("Failed to start sync server: {e}"))?;
    let tcp_port = listener
        .local_addr()
        .map_err(|e| e.to_string())?
        .port();

    let user_id = generate_user_id();
    let room_code = generate_room_code();
    let host_member = RoomMember {
        id: user_id.clone(),
        nickname: nickname.clone(),
        is_host: true,
        joined_at_ms: now_ms(),
    };

    let room = RoomState {
        room_code: room_code.clone(),
        is_host: true,
        current_user_id: user_id,
        members: vec![host_member],
        playback_state: None,
    };
    let generation = manager.begin_session();
    *manager.state.lock() = Some(room.clone());
    manager.peers.lock().clear(); // defensive: leave_room already clears this, but never start with stale entries
    manager.last_seen.lock().clear();

    let accept_manager = manager.clone();
    let accept_sink = sink.clone();
    let accept_task = tauri::async_runtime::spawn(accept_loop(listener, accept_manager, accept_sink));

    let beacon_task = tauri::async_runtime::spawn(beacon_loop(room_code.clone(), nickname, tcp_port));

    let liveness_task =
        tauri::async_runtime::spawn(host_liveness_loop(manager.clone(), sink.clone(), generation));

    *manager.host.lock() = Some(HostSession {
        accept_task,
        beacon_task,
        p2p_task: None,
        p2p_shutdown: None,
        liveness_task,
        port: tcp_port,
    });

    // Announce on a public MQTT broker alongside the LAN beacon (not instead
    // of it) so a same-network guest still gets the near-instant UDP path,
    // while a guest on a different network can still find this room. Best
    // effort: if no broker is reachable, LAN hosting still works without it.
    if manager.internet_enabled {
        match crate::p2p_sync::host_provide(manager.clone(), sink.clone(), room_code).await {
            Ok((task, shutdown)) => manager.attach_p2p_host_task(task, shutdown),
            Err(e) => log::warn!("Listen Together: internet (P2P) hosting unavailable: {e}"),
        }
    }

    // Every window (the injected YTM page in particular, whose sync plugin
    // gates host broadcasting on it) learns about the new room right away,
    // not only once the first guest joins.
    sink.room_updated(&room);
    Ok(room)
}

async fn accept_loop(listener: TcpListener, manager: Arc<SyncRoomManager>, sink: Arc<dyn SyncEventSink>) {
    while let Ok((stream, _)) = listener.accept().await {
        let m = manager.clone();
        let s = sink.clone();
        tokio::spawn(async move {
            peer_task(stream, m, s).await;
        });
    }
}

async fn peer_task(stream: TcpStream, manager: Arc<SyncRoomManager>, sink: Arc<dyn SyncEventSink>) {
    let (read_half, mut write_half) = stream.into_split();
    let mut reader = BufReader::new(read_half);
    let mut line = String::new();

    let n = match tokio::time::timeout(JOIN_HANDSHAKE_TIMEOUT, read_line_capped(&mut reader, &mut line)).await {
        Ok(Ok(n)) => n,
        _ => return,
    };
    if n == 0 {
        return;
    }

    let (member_id, nickname) = match serde_json::from_str::<WireMessage>(line.trim()) {
        Ok(WireMessage::Join { user_id, nickname }) => (user_id, nickname),
        _ => return,
    };

    let room = match manager.add_member(member_id.clone(), nickname) {
        Ok(r) => r,
        Err(_) => return, // room full or already closed — drop the connection
    };

    let (tx, mut rx) = mpsc::unbounded_channel::<WireMessage>();
    manager.register_peer(member_id.clone(), tx);

    sink.room_updated(&room);
    manager.broadcast_to_peers(&WireMessage::State {
        room: RoomStateWire::from(&room),
    });

    loop {
        line.clear();
        tokio::select! {
            read_res = read_line_capped(&mut reader, &mut line) => {
                match read_res {
                    Ok(0) | Err(_) => break,
                    // Any line proves the guest is alive. Only `Control`
                    // carries anything more; unknown lines are ignored so
                    // newer guests don't break this host.
                    Ok(_) => {
                        manager.touch_member(&member_id);
                        if let Ok(WireMessage::Control { action, .. }) = serde_json::from_str::<WireMessage>(line.trim()) {
                            manager.handle_guest_control(&member_id, action, &sink);
                        }
                    }
                }
            }
            msg = rx.recv() => {
                match msg {
                    Some(m) => {
                        if let Ok(mut json) = serde_json::to_string(&m) {
                            json.push('\n');
                            if write_half.write_all(json.as_bytes()).await.is_err() {
                                break;
                            }
                        }
                    }
                    None => break, // host is shutting down / left the room
                }
            }
        }
    }

    manager.unregister_peer(&member_id);
    if let Some(room) = manager.remove_member(&member_id) {
        sink.room_updated(&room);
        manager.broadcast_to_peers(&WireMessage::State {
            room: RoomStateWire::from(&room),
        });
    }
}

/// Host side: every heartbeat interval, pings every guest (so they know the
/// host is alive) and evicts members silent past the liveness timeout (so a
/// guest that crashed or lost its network doesn't linger in the list).
async fn host_liveness_loop(manager: Arc<SyncRoomManager>, sink: Arc<dyn SyncEventSink>, generation: u64) {
    let mut ticker = tokio::time::interval(manager.liveness.heartbeat_interval);
    ticker.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
    loop {
        ticker.tick().await;
        if !manager.is_current_session(generation) {
            return;
        }
        let Some(host_id) = manager.state.lock().as_ref().map(|r| r.current_user_id.clone()) else {
            return;
        };
        manager.broadcast_to_peers(&WireMessage::Heartbeat { user_id: host_id });
        if let Some(room) = manager.evict_stale_members() {
            sink.room_updated(&room);
            manager.broadcast_to_peers(&WireMessage::State {
                room: RoomStateWire::from(&room),
            });
        }
    }
}

async fn beacon_loop(room_code: String, host_nickname: String, tcp_port: u16) {
    let sock = match UdpSocket::bind("0.0.0.0:0").await {
        Ok(s) => s,
        Err(_) => return,
    };
    if sock.set_broadcast(true).is_err() {
        return;
    }

    let beacon = Beacon {
        room_code,
        host_nickname,
        tcp_port,
    };
    let payload = match serde_json::to_vec(&beacon) {
        Ok(p) => p,
        Err(_) => return,
    };

    loop {
        let _ = sock
            .send_to(&payload, ("255.255.255.255", DISCOVERY_UDP_PORT))
            .await;
        tokio::time::sleep(BEACON_INTERVAL).await;
    }
}

/// Broadcasts a playback update to every connected guest. Safe to call even
/// when this instance isn't hosting a room (or the room has no guests yet) —
/// it just updates local state and becomes a no-op for the network part.
pub fn broadcast_playback(manager: &Arc<SyncRoomManager>, state: SyncPlaybackState) {
    {
        let mut guard = manager.state.lock();
        if let Some(room) = guard.as_mut() {
            room.playback_state = Some(state.clone());
        }
    }
    manager.broadcast_to_peers(&WireMessage::Playback { state });
}

// ---------------------------------------------------------------------
// Guest side
// ---------------------------------------------------------------------

pub async fn join_room(
    manager: &Arc<SyncRoomManager>,
    sink: Arc<dyn SyncEventSink>,
    code: String,
    nickname: String,
) -> Result<RoomState, String> {
    if manager.state.lock().is_some() {
        return Err("Already in a room. Leave the current room first.".to_string());
    }

    let clean_code = code.trim().to_uppercase();
    if clean_code.is_empty() {
        return Err("Room code is required.".to_string());
    }

    // Try the fast path first: a LAN beacon reply means the host is on this
    // same network, so we can skip the DHT entirely. Only fall back to the
    // (much slower — DHT lookup, possibly NAT hole-punching or relay) P2P
    // path once LAN discovery has definitively failed.
    match discover_host(&clean_code).await {
        Ok(host_addr) => connect_to_host(manager, sink, host_addr, nickname).await,
        Err(_lan_err) => {
            crate::p2p_sync::join_room(manager, sink, clean_code, nickname).await
        }
    }
}

/// The actual TCP join handshake, split out from `join_room` so it can be
/// exercised directly in tests against a loopback address without depending
/// on UDP broadcast delivery (not guaranteed in every network namespace).
async fn connect_to_host(
    manager: &Arc<SyncRoomManager>,
    sink: Arc<dyn SyncEventSink>,
    host_addr: SocketAddr,
    nickname: String,
) -> Result<RoomState, String> {
    let stream = tokio::time::timeout(JOIN_HANDSHAKE_TIMEOUT, TcpStream::connect(host_addr))
        .await
        .map_err(|_| "Timed out connecting to host.".to_string())?
        .map_err(|e| format!("Failed to connect to host: {e}"))?;

    let user_id = generate_user_id();
    let (read_half, mut write_half) = stream.into_split();
    let mut reader = BufReader::new(read_half);

    let join_msg = WireMessage::Join {
        user_id: user_id.clone(),
        nickname,
    };
    let mut join_json = serde_json::to_string(&join_msg).map_err(|e| e.to_string())?;
    join_json.push('\n');
    write_half
        .write_all(join_json.as_bytes())
        .await
        .map_err(|e| format!("Failed to send join request: {e}"))?;

    let mut line = String::new();
    let n = tokio::time::timeout(JOIN_HANDSHAKE_TIMEOUT, read_line_capped(&mut reader, &mut line))
        .await
        .map_err(|_| "Timed out waiting for host confirmation.".to_string())?
        .map_err(|e| format!("Connection to host failed: {e}"))?;
    if n == 0 {
        return Err("Host closed the connection (room may be full or closed).".to_string());
    }

    let initial: WireMessage =
        serde_json::from_str(line.trim()).map_err(|_| "Invalid response from host.".to_string())?;
    let initial_wire = match initial {
        WireMessage::State { room } => room,
        _ => return Err("Unexpected response from host.".to_string()),
    };

    let generation = manager.begin_session();
    let Some(local_room) = manager.apply_remote_room_update(initial_wire, &user_id, generation) else {
        return Err("Left the room while joining.".to_string());
    };

    // The guest's injected YTM page only applies remote playback while it
    // knows it's in a room; the initial state arrives as this handshake
    // reply, not as a later push, so without this it never found out.
    sink.room_updated(&local_room);

    let m = manager.clone();
    let s = sink.clone();
    let uid = user_id.clone();
    let reader_task = tauri::async_runtime::spawn(async move {
        guest_reader_loop(reader, m, s, uid, generation).await;
    });
    let (outbox, outbox_rx) = mpsc::unbounded_channel();
    let writer_task = tauri::async_runtime::spawn(guest_writer_loop(
        write_half,
        user_id.clone(),
        manager.liveness.heartbeat_interval,
        outbox_rx,
    ));

    *manager.guest.lock() = Some(GuestSession {
        reader_task,
        user_id,
        outbox,
        writer_task: Some(writer_task),
        shutdown: None,
    });

    Ok(local_room)
}

/// TCP guest side: pings the host every interval and forwards the outbox
/// (`Control` requests). Owns the write half, so when this task ends
/// (aborted on leave, or a write fails) the connection's sending side closes
/// and the host sees the guest go.
async fn guest_writer_loop(
    mut write_half: tokio::net::tcp::OwnedWriteHalf,
    user_id: String,
    interval: Duration,
    mut outbox: mpsc::UnboundedReceiver<WireMessage>,
) {
    let mut ticker = tokio::time::interval(interval);
    ticker.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
    ticker.tick().await; // immediate; the Join just proved we're alive
    loop {
        let msg = tokio::select! {
            _ = ticker.tick() => WireMessage::Heartbeat { user_id: user_id.clone() },
            next = outbox.recv() => match next {
                Some(msg) => msg,
                None => return,
            },
        };
        let Ok(mut line) = serde_json::to_string(&msg) else {
            continue;
        };
        line.push('\n');
        if write_half.write_all(line.as_bytes()).await.is_err() {
            return;
        }
    }
}

async fn guest_reader_loop(
    mut reader: BufReader<OwnedReadHalf>,
    manager: Arc<SyncRoomManager>,
    sink: Arc<dyn SyncEventSink>,
    my_id: String,
    generation: u64,
) {
    let silence_limit = manager.liveness.timeout;
    let mut line = String::new();
    loop {
        line.clear();
        // The host pings every heartbeat interval, so a read that waits past
        // the liveness timeout means the host is gone even though TCP never
        // saw a FIN (host machine asleep, network dropped, process frozen).
        match tokio::time::timeout(silence_limit, read_line_capped(&mut reader, &mut line)).await {
            Err(_) => {
                log::info!("Listen Together: host silent for {silence_limit:?}, leaving room");
                break;
            }
            Ok(Ok(0)) | Ok(Err(_)) => break,
            Ok(Ok(_)) => {
                let Ok(msg) = serde_json::from_str::<WireMessage>(line.trim()) else {
                    continue;
                };
                match msg {
                    WireMessage::State { room } => {
                        match manager.apply_remote_room_update(room, &my_id, generation) {
                            Some(local) => sink.room_updated(&local),
                            None => return, // a newer session owns the state now
                        }
                    }
                    WireMessage::Playback { state } => {
                        if !manager.apply_remote_playback(state.clone(), generation) {
                            return;
                        }
                        sink.playback_updated(&state);
                    }
                    WireMessage::Heartbeat { .. } => {} // only proves liveness; the read above already counted it
                    WireMessage::Join { .. } | WireMessage::Leave { .. } | WireMessage::Control { .. } => {} // host-bound only
                    WireMessage::Ack => {} // Ack only exists on the internet transport
                }
            }
        }
    }

    if manager.clear_guest_if_current(generation) {
        sink.room_left();
    }
}

async fn discover_host(room_code: &str) -> Result<SocketAddr, String> {
    discover_host_on_port(DISCOVERY_UDP_PORT, room_code, DISCOVERY_TIMEOUT).await
}

async fn discover_host_on_port(
    discovery_port: u16,
    room_code: &str,
    timeout_budget: Duration,
) -> Result<SocketAddr, String> {
    let sock = UdpSocket::bind(("0.0.0.0", discovery_port)).await.map_err(|_| {
        format!(
            "Couldn't listen for the host on port {discovery_port} — another YTMD instance on \
             this device may already be listening. Only one device (this one) can search for a \
             room at a time."
        )
    })?;

    let deadline = Instant::now() + timeout_budget;
    let mut buf = [0u8; 512];

    loop {
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            return Err(
                "Room not found on this network. Make sure both devices are on the same Wi-Fi \
                 and the host has the room open."
                    .to_string(),
            );
        }

        let recv = tokio::time::timeout(remaining, sock.recv_from(&mut buf)).await;
        let (n, src) = match recv {
            Ok(Ok(v)) => v,
            _ => {
                return Err(
                    "Room not found on this network. Make sure both devices are on the same \
                     Wi-Fi and the host has the room open."
                        .to_string(),
                )
            }
        };

        if let Ok(beacon) = serde_json::from_slice::<Beacon>(&buf[..n]) {
            if beacon.room_code.eq_ignore_ascii_case(room_code) {
                return Ok(SocketAddr::new(src.ip(), beacon.tcp_port));
            }
        }
    }
}

/// Guest side: asks the host to carry out `action` for the whole room.
pub fn send_control(manager: &Arc<SyncRoomManager>, action: SyncControl) -> Result<(), String> {
    if !action.is_valid() {
        return Err("Invalid playback request.".to_string());
    }
    let guard = manager.guest.lock();
    let guest = guard.as_ref().ok_or("Not listening together as a guest.")?;
    guest
        .outbox
        .send(WireMessage::Control { user_id: guest.user_id.clone(), action })
        .map_err(|_| "Connection to the host is closed.".to_string())
}

// ---------------------------------------------------------------------
// Leaving
// ---------------------------------------------------------------------

pub fn leave_room(manager: &Arc<SyncRoomManager>) {
    // Retire the session first so any background loop still mid-message
    // stops touching shared state from here on.
    manager.begin_session();
    if let Some(host) = manager.host.lock().take() {
        host.accept_task.abort();
        host.beacon_task.abort();
        host.liveness_task.abort();
        match (host.p2p_shutdown, host.p2p_task) {
            // The loop publishes its farewell and exits on its own.
            (Some(shutdown), Some(task)) => {
                if shutdown.send(()).is_err() {
                    task.abort();
                }
            }
            (_, Some(task)) => task.abort(),
            _ => {}
        }
        // Dropping every registered peer's sender closes their mpsc
        // channel; each peer_task's/P2P host loop's per-peer forwarder sees
        // the channel end and exits on its own, closing that connection
        // cleanly (TCP: peer_task's select! sees `rx.recv() == None`; P2P:
        // aborting `p2p_task` above already tore the whole swarm down).
        manager.peers.lock().clear();
    }
    if let Some(guest) = manager.guest.lock().take() {
        if let Some(task) = guest.writer_task {
            task.abort();
        }
        match guest.shutdown {
            Some(shutdown) => {
                if shutdown.send(()).is_err() {
                    guest.reader_task.abort();
                }
            }
            None => guest.reader_task.abort(),
        }
    }
    manager.last_seen.lock().clear();
    *manager.state.lock() = None;
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::Ipv4Addr;

    struct NoopSink;
    impl SyncEventSink for NoopSink {
        fn room_updated(&self, _room: &RoomState) {}
        fn playback_updated(&self, _state: &SyncPlaybackState) {}
        fn room_left(&self) {}
        fn control_requested(&self, _request: &SyncControlRequest) {}
    }

    fn noop_sink() -> Arc<dyn SyncEventSink> {
        Arc::new(NoopSink)
    }

    /// Default liveness, LAN only: loopback tests must not depend on
    /// reaching a public MQTT broker.
    fn local_manager() -> Arc<SyncRoomManager> {
        Arc::new(SyncRoomManager::with_options(LivenessConfig::default(), false))
    }

    async fn wait_until<F: Fn() -> bool>(cond: F, timeout: Duration) -> bool {
        let deadline = Instant::now() + timeout;
        loop {
            if cond() {
                return true;
            }
            if Instant::now() >= deadline {
                return false;
            }
            tokio::time::sleep(Duration::from_millis(10)).await;
        }
    }

    #[test]
    fn test_generate_room_code_format() {
        let code = generate_room_code();
        assert!(code.starts_with("YTMD-"));
        assert_eq!(code.len(), 15);
        assert!(code[5..].chars().all(|c| c.is_ascii_uppercase() || c.is_ascii_digit()));
    }

    #[test]
    fn test_generate_room_code_is_random() {
        let a = generate_room_code();
        let b = generate_room_code();
        // Not a hard guarantee, but with a ~5-bit-per-char, 6-char code the
        // odds of an accidental collision across two calls are negligible;
        // a real collision here would indicate the RNG isn't being used.
        assert_ne!(a, b);
    }

    #[test]
    fn test_wire_message_roundtrip() {
        let msg = WireMessage::Join {
            user_id: "user-1".to_string(),
            nickname: "Kacper".to_string(),
        };
        let json = serde_json::to_string(&msg).unwrap();
        let back: WireMessage = serde_json::from_str(&json).unwrap();
        match back {
            WireMessage::Join { user_id, nickname } => {
                assert_eq!(user_id, "user-1");
                assert_eq!(nickname, "Kacper");
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn test_add_member_enforces_capacity() {
        let manager = SyncRoomManager::new();
        *manager.state.lock() = Some(RoomState {
            room_code: "YTMD-TEST01".to_string(),
            is_host: true,
            current_user_id: "host".to_string(),
            members: vec![RoomMember {
                id: "host".to_string(),
                nickname: "Host".to_string(),
                is_host: true,
                joined_at_ms: 0,
            }],
            playback_state: None,
        });

        for i in 0..(MAX_MEMBERS - 1) {
            assert!(manager.add_member(format!("guest-{i}"), "G".to_string()).is_ok());
        }
        // Room is now full (MAX_MEMBERS members including host).
        let result = manager.add_member("one-too-many".to_string(), "G".to_string());
        assert!(result.is_err());
    }

    #[test]
    fn test_remove_member_updates_state() {
        let manager = SyncRoomManager::new();
        *manager.state.lock() = Some(RoomState {
            room_code: "YTMD-TEST02".to_string(),
            is_host: true,
            current_user_id: "host".to_string(),
            members: vec![
                RoomMember { id: "host".to_string(), nickname: "Host".to_string(), is_host: true, joined_at_ms: 0 },
                RoomMember { id: "guest-1".to_string(), nickname: "Guest".to_string(), is_host: false, joined_at_ms: 1 },
            ],
            playback_state: None,
        });

        let updated = manager.remove_member("guest-1").unwrap();
        assert_eq!(updated.members.len(), 1);
        assert_eq!(updated.members[0].id, "host");

        // A departure noticed twice (eviction, then the TCP task ending) is
        // only announced once.
        assert!(manager.remove_member("guest-1").is_none());
    }

    fn room_with(members: &[(&str, bool)]) -> RoomState {
        RoomState {
            room_code: "YTMD-TEST03".to_string(),
            is_host: true,
            current_user_id: "host".to_string(),
            members: members
                .iter()
                .map(|(id, is_host)| RoomMember {
                    id: id.to_string(),
                    nickname: id.to_string(),
                    is_host: *is_host,
                    joined_at_ms: 0,
                })
                .collect(),
            playback_state: None,
        }
    }

    #[test]
    fn test_stale_members_skips_host_and_recent() {
        let room = room_with(&[("host", true), ("fresh", false), ("silent", false), ("untracked", false)]);
        let now = Instant::now() + Duration::from_secs(60);
        let mut seen = HashMap::new();
        seen.insert("host".to_string(), now - Duration::from_secs(50));
        seen.insert("fresh".to_string(), now - Duration::from_secs(2));
        seen.insert("silent".to_string(), now - Duration::from_secs(20));
        assert_eq!(stale_members(&room, &seen, now, Duration::from_secs(15)), vec!["silent".to_string()]);
    }

    #[test]
    fn test_stale_session_cannot_touch_newer_state() {
        let manager = local_manager();
        let old = manager.begin_session();
        let current = manager.begin_session();
        manager.set_local_room(room_with(&[("host", true)]));
        let wire = RoomStateWire::from(&room_with(&[("host", true), ("x", false)]));

        assert!(manager.apply_remote_room_update(wire.clone(), "x", old).is_none());
        assert!(!manager.clear_guest_if_current(old));
        assert_eq!(manager.get_room_state().unwrap().members.len(), 1, "stale loop must not overwrite");

        assert!(manager.apply_remote_room_update(wire, "x", current).is_some());
        assert!(manager.clear_guest_if_current(current));
        assert!(manager.get_room_state().is_none());
    }

    #[tokio::test]
    async fn test_discover_host_on_port_matches_room_code() {
        let test_port = 47900;
        let beacon = Beacon {
            room_code: "YTMD-ABC123".to_string(),
            host_nickname: "Host".to_string(),
            tcp_port: 5555,
        };
        let payload = serde_json::to_vec(&beacon).unwrap();

        let sender_task = tokio::spawn(async move {
            tokio::time::sleep(Duration::from_millis(100)).await;
            let sock = UdpSocket::bind("0.0.0.0:0").await.unwrap();
            sock.send_to(&payload, (Ipv4Addr::LOCALHOST, test_port))
                .await
                .unwrap();
        });

        let result = discover_host_on_port(test_port, "ytmd-abc123", Duration::from_secs(2)).await;
        sender_task.await.unwrap();

        let addr = result.expect("expected to discover the host");
        assert_eq!(addr.port(), 5555);
        assert_eq!(addr.ip(), Ipv4Addr::LOCALHOST);
    }

    #[tokio::test]
    async fn test_discover_host_on_port_times_out_when_no_match() {
        let test_port = 47901;
        let result = discover_host_on_port(test_port, "YTMD-NOBODY", Duration::from_millis(300)).await;
        assert!(result.is_err());
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn test_end_to_end_host_and_guest_over_loopback() {
        let host_manager = local_manager();
        let guest_manager = local_manager();

        let host_room = create_room(&host_manager, noop_sink(), "Host".to_string())
            .await
            .expect("create_room should succeed");
        assert!(host_room.is_host);
        assert_eq!(host_room.members.len(), 1);

        let port = host_manager.host_port().expect("host should be listening");
        let addr = SocketAddr::new(Ipv4Addr::LOCALHOST.into(), port);

        let guest_room = connect_to_host(&guest_manager, noop_sink(), addr, "Guest".to_string())
            .await
            .expect("guest should be able to join");

        assert!(!guest_room.is_host);
        assert_eq!(guest_room.room_code, host_room.room_code);
        assert_eq!(guest_room.members.len(), 2);

        let host_sees_two = wait_until(
            || host_manager.get_room_state().map(|r| r.members.len()).unwrap_or(0) == 2,
            Duration::from_secs(2),
        )
        .await;
        assert!(host_sees_two, "host should see the guest join");

        let playback = SyncPlaybackState {
            video_id: "dQw4w9WgXcQ".to_string(),
            title: "Never Gonna Give You Up".to_string(),
            artist: "Rick Astley".to_string(),
            current_time_secs: 12.5,
            is_playing: true,
            timestamp_ms: now_ms(),
        };
        broadcast_playback(&host_manager, playback.clone());

        let guest_got_playback = wait_until(
            || {
                guest_manager
                    .get_room_state()
                    .and_then(|r| r.playback_state)
                    .map(|p| p.video_id == "dQw4w9WgXcQ")
                    .unwrap_or(false)
            },
            Duration::from_secs(2),
        )
        .await;
        assert!(guest_got_playback, "guest should receive the host's playback broadcast");

        leave_room(&guest_manager);
        assert!(guest_manager.get_room_state().is_none());

        let host_sees_departure = wait_until(
            || host_manager.get_room_state().map(|r| r.members.len()).unwrap_or(0) == 1,
            Duration::from_secs(2),
        )
        .await;
        assert!(host_sees_departure, "host should see the guest leave");

        leave_room(&host_manager);
        assert!(host_manager.get_room_state().is_none());
    }

    #[derive(Default)]
    struct RecordingSink {
        room_updates: Mutex<Vec<RoomState>>,
        playback_updates: Mutex<Vec<SyncPlaybackState>>,
        controls: Mutex<Vec<(String, SyncControl)>>,
        left: std::sync::atomic::AtomicUsize,
    }
    impl SyncEventSink for RecordingSink {
        fn room_updated(&self, room: &RoomState) {
            self.room_updates.lock().push(room.clone());
        }
        fn playback_updated(&self, state: &SyncPlaybackState) {
            self.playback_updates.lock().push(state.clone());
        }
        fn room_left(&self) {
            self.left.fetch_add(1, Ordering::SeqCst);
        }
        fn control_requested(&self, request: &SyncControlRequest) {
            self.controls.lock().push((request.from.clone(), request.action.clone()));
        }
    }

    /// Guests used to have no way to act for the room: a skip on a guest
    /// just got undone by the next host broadcast. Now it travels to the
    /// host, tagged with the guest's nickname.
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn test_guest_control_reaches_host_page() {
        let host_manager = local_manager();
        let guest_manager = local_manager();
        let host_sink = Arc::new(RecordingSink::default());
        create_room(&host_manager, host_sink.clone(), "Host".to_string()).await.unwrap();

        assert!(send_control(&guest_manager, SyncControl::Next).is_err(), "not in a room yet");

        let port = host_manager.host_port().unwrap();
        let addr = SocketAddr::new(Ipv4Addr::LOCALHOST.into(), port);
        connect_to_host(&guest_manager, noop_sink(), addr, "Ola".to_string()).await.unwrap();

        send_control(&guest_manager, SyncControl::Next).unwrap();
        send_control(&guest_manager, SyncControl::SetPlaying { playing: false }).unwrap();
        send_control(&guest_manager, SyncControl::PlayVideo { video_id: "dQw4w9WgXcQ".into() }).unwrap();
        assert!(
            send_control(&guest_manager, SyncControl::PlayVideo { video_id: "javascript:x".into() }).is_err(),
            "malformed ids never leave the guest"
        );

        let got_all = wait_until(|| host_sink.controls.lock().len() == 3, Duration::from_secs(2)).await;
        assert!(got_all, "host should receive every control");
        let controls = host_sink.controls.lock().clone();
        assert_eq!(
            controls,
            vec![
                ("Ola".to_string(), SyncControl::Next),
                ("Ola".to_string(), SyncControl::SetPlaying { playing: false }),
                ("Ola".to_string(), SyncControl::PlayVideo { video_id: "dQw4w9WgXcQ".into() }),
            ]
        );

        leave_room(&guest_manager);
        leave_room(&host_manager);
    }

    #[test]
    fn test_host_ignores_control_from_non_members_and_bad_ids() {
        let manager = local_manager();
        manager.set_local_room(room_with(&[("host", true), ("g1", false)]));
        let sink = Arc::new(RecordingSink::default());
        let dyn_sink: Arc<dyn SyncEventSink> = sink.clone();

        manager.handle_guest_control("stranger", SyncControl::Next, &dyn_sink);
        manager.handle_guest_control("g1", SyncControl::PlayVideo { video_id: "../../etc".into() }, &dyn_sink);
        assert!(sink.controls.lock().is_empty());

        manager.handle_guest_control("g1", SyncControl::Previous, &dyn_sink);
        assert_eq!(sink.controls.lock().len(), 1);
    }

    #[test]
    fn test_control_wire_format() {
        let msg = WireMessage::Control {
            user_id: "user-1".into(),
            action: SyncControl::SetPlaying { playing: true },
        };
        let json = serde_json::to_value(&msg).unwrap();
        assert_eq!(
            json,
            serde_json::json!({ "type": "Control", "user_id": "user-1", "action": { "kind": "set_playing", "playing": true } })
        );
        let back: WireMessage = serde_json::from_value(json).unwrap();
        assert!(matches!(back, WireMessage::Control { action: SyncControl::SetPlaying { playing: true }, .. }));
    }

    /// Millisecond-scale liveness so eviction/silence tests finish fast.
    const FAST_LIVENESS: LivenessConfig = LivenessConfig {
        heartbeat_interval: Duration::from_millis(50),
        timeout: Duration::from_millis(250),
    };

    fn fast_manager() -> Arc<SyncRoomManager> {
        Arc::new(SyncRoomManager::with_options(FAST_LIVENESS, false))
    }

    async fn write_line(stream: &mut TcpStream, msg: &WireMessage) {
        let mut json = serde_json::to_string(msg).unwrap();
        json.push('\n');
        stream.write_all(json.as_bytes()).await.unwrap();
    }

    /// A guest that goes quiet (crash, sleep, cable pulled — no FIN) is
    /// dropped from the room, announced, and disconnected.
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn test_host_evicts_guest_that_stops_heartbeating() {
        let host_manager = fast_manager();
        let host_sink = Arc::new(RecordingSink::default());
        create_room(&host_manager, host_sink.clone(), "Host".to_string()).await.unwrap();
        let port = host_manager.host_port().unwrap();

        // Raw client: joins, then never sends another byte.
        let mut raw = TcpStream::connect((Ipv4Addr::LOCALHOST, port)).await.unwrap();
        write_line(&mut raw, &WireMessage::Join { user_id: "user-silent".into(), nickname: "Ghost".into() }).await;
        let joined = wait_until(
            || host_manager.get_room_state().map(|r| r.members.len()).unwrap_or(0) == 2,
            Duration::from_secs(2),
        )
        .await;
        assert!(joined);

        let evicted = wait_until(
            || host_manager.get_room_state().map(|r| r.members.len()).unwrap_or(0) == 1,
            Duration::from_secs(2),
        )
        .await;
        assert!(evicted, "silent guest should be evicted");
        assert_eq!(host_sink.room_updates.lock().last().unwrap().members.len(), 1);

        // Its connection is closed: reading drains host lines, then EOF.
        let mut reader = BufReader::new(raw);
        let closed = tokio::time::timeout(Duration::from_secs(2), async {
            let mut line = String::new();
            loop {
                line.clear();
                if reader.read_line(&mut line).await.unwrap_or(0) == 0 {
                    return;
                }
            }
        })
        .await;
        assert!(closed.is_ok(), "evicted guest's socket should be closed by the host");

        leave_room(&host_manager);
    }

    /// Heartbeats keep a healthy guest in the room well past the timeout.
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn test_heartbeats_keep_idle_guest_in_room() {
        let host_manager = fast_manager();
        let guest_manager = fast_manager();
        let guest_sink = Arc::new(RecordingSink::default());
        create_room(&host_manager, noop_sink(), "Host".to_string()).await.unwrap();
        let addr = SocketAddr::new(Ipv4Addr::LOCALHOST.into(), host_manager.host_port().unwrap());
        connect_to_host(&guest_manager, guest_sink.clone(), addr, "Guest".to_string()).await.unwrap();

        // No playback traffic at all for 4× the timeout.
        tokio::time::sleep(FAST_LIVENESS.timeout * 4).await;

        assert_eq!(host_manager.get_room_state().unwrap().members.len(), 2);
        assert!(guest_manager.get_room_state().is_some());
        assert_eq!(guest_sink.left.load(Ordering::SeqCst), 0);

        leave_room(&guest_manager);
        leave_room(&host_manager);
    }

    /// A host that goes quiet without closing the socket (frozen, asleep,
    /// network gone) makes the guest leave instead of hanging forever.
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn test_guest_leaves_when_host_goes_silent() {
        let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).await.unwrap();
        let addr = listener.local_addr().unwrap();
        let fake_host = tokio::spawn(async move {
            let (stream, _) = listener.accept().await.unwrap();
            let (read_half, mut write_half) = stream.into_split();
            let mut reader = BufReader::new(read_half);
            let mut line = String::new();
            reader.read_line(&mut line).await.unwrap();
            let room = room_with(&[("host", true), ("guest", false)]);
            let mut reply = serde_json::to_string(&WireMessage::State { room: RoomStateWire::from(&room) }).unwrap();
            reply.push('\n');
            write_half.write_all(reply.as_bytes()).await.unwrap();
            // Then silence, with the connection held open.
            tokio::time::sleep(Duration::from_secs(5)).await;
            drop((reader, write_half));
        });

        let guest_manager = fast_manager();
        let guest_sink = Arc::new(RecordingSink::default());
        connect_to_host(&guest_manager, guest_sink.clone(), addr, "Guest".to_string()).await.unwrap();

        let left = wait_until(|| guest_sink.left.load(Ordering::SeqCst) == 1, Duration::from_secs(2)).await;
        assert!(left, "guest should give up on a silent host");
        assert!(guest_manager.get_room_state().is_none());
        fake_host.abort();
    }

    /// Regression: the injected YTM page gates sync on `sync-room-updated`.
    /// Neither the host (on create) nor the guest (on join) used to emit
    /// it, so a 1:1 room never synced anything.
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn test_create_and_join_notify_frontend_of_room_state() {
        let host_manager = local_manager();
        let guest_manager = local_manager();
        let host_sink = Arc::new(RecordingSink::default());
        let guest_sink = Arc::new(RecordingSink::default());

        let host_room = create_room(&host_manager, host_sink.clone(), "Host".to_string())
            .await
            .expect("create_room should succeed");
        {
            let updates = host_sink.room_updates.lock();
            assert!(
                updates.iter().any(|r| r.room_code == host_room.room_code && r.is_host),
                "host frontend must hear about the room it just created"
            );
        }

        let port = host_manager.host_port().expect("host should be listening");
        let addr = SocketAddr::new(Ipv4Addr::LOCALHOST.into(), port);
        connect_to_host(&guest_manager, guest_sink.clone(), addr, "Guest".to_string())
            .await
            .expect("guest should be able to join");
        {
            let updates = guest_sink.room_updates.lock();
            assert_eq!(updates.len(), 1, "guest frontend must hear about the room it joined");
            assert!(!updates[0].is_host);
            assert_eq!(updates[0].room_code, host_room.room_code);
        }

        let host_saw_guest = wait_until(
            || host_manager.get_room_state().map(|r| r.members.len()).unwrap_or(0) == 2,
            Duration::from_secs(2),
        )
        .await;
        assert!(host_saw_guest);

        broadcast_playback(
            &host_manager,
            SyncPlaybackState {
                video_id: "dQw4w9WgXcQ".to_string(),
                title: "T".to_string(),
                artist: "A".to_string(),
                current_time_secs: 1.0,
                is_playing: true,
                timestamp_ms: now_ms(),
            },
        );
        let delivered = wait_until(|| !guest_sink.playback_updates.lock().is_empty(), Duration::from_secs(2)).await;
        assert!(delivered, "guest frontend must receive host playback");

        leave_room(&guest_manager);
        leave_room(&host_manager);
    }

    #[tokio::test]
    async fn test_read_line_capped_bounds_memory_on_unterminated_line() {
        // Regression test: a peer that never sends `\n` (hostile or just
        // buggy) must not be able to grow `read_line`'s buffer without
        // bound. Write well over MAX_LINE_LEN with no newline and confirm
        // the read still returns (capped), instead of blocking forever
        // waiting for a terminator that never arrives.
        use tokio::io::AsyncWriteExt;

        let (mut writer, reader) = tokio::io::duplex(1024 * 1024);
        let mut buf_reader = BufReader::new(reader);

        let write_task = tokio::spawn(async move {
            let chunk = vec![b'a'; 8192];
            for _ in 0..16 {
                // 128KB, no newline, more than double MAX_LINE_LEN (64KB)
                let _ = writer.write_all(&chunk).await;
            }
            // Keep the writer open past the cap so the duplex doesn't look
            // like a clean EOF before the cap kicks in.
            tokio::time::sleep(Duration::from_millis(200)).await;
        });

        let mut line = String::new();
        let result = tokio::time::timeout(
            Duration::from_secs(2),
            read_line_capped(&mut buf_reader, &mut line),
        )
        .await;

        assert!(result.is_ok(), "read_line_capped must not block forever on an unterminated line");
        let n = result.unwrap().expect("capped read should succeed");
        assert!(n as u64 <= MAX_LINE_LEN, "must never read more than MAX_LINE_LEN bytes in one call");
        assert!(!line.ends_with('\n'), "a capped read has no terminator");

        write_task.abort();
    }

    #[test]
    fn test_wire_message_state_roundtrip_preserves_playback() {
        let room = RoomState {
            room_code: "YTMD-XYZ789".to_string(),
            is_host: true,
            current_user_id: "host".to_string(),
            members: vec![],
            playback_state: Some(SyncPlaybackState {
                video_id: "abc".to_string(),
                title: "T".to_string(),
                artist: "A".to_string(),
                current_time_secs: 1.0,
                is_playing: true,
                timestamp_ms: 123,
            }),
        };
        let wire = RoomStateWire::from(&room);
        let msg = WireMessage::State { room: wire };
        let json = serde_json::to_string(&msg).unwrap();
        let back: WireMessage = serde_json::from_str(&json).unwrap();
        match back {
            WireMessage::State { room: wire } => {
                let local = wire.into_local_view(false, "guest".to_string());
                assert_eq!(local.room_code, "YTMD-XYZ789");
                assert!(!local.is_host);
                assert_eq!(local.current_user_id, "guest");
                assert_eq!(local.playback_state.unwrap().video_id, "abc");
            }
            _ => panic!("wrong variant"),
        }
    }
}
