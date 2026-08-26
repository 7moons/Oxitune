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
//! This only works for devices on the same local network (Wi-Fi/LAN) — there
//! is no public relay server, so it cannot bridge two different networks
//! behind separate NATs. That's an intentional scope boundary, not an
//! oversight: bridging arbitrary networks needs infrastructure this project
//! doesn't run or control.

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::tcp::OwnedReadHalf;
use tokio::net::{TcpListener, TcpStream, UdpSocket};
use tokio::sync::mpsc;
use tokio::time::Instant;

const DISCOVERY_UDP_PORT: u16 = 47863;
const DISCOVERY_TIMEOUT: Duration = Duration::from_millis(2500);
const BEACON_INTERVAL: Duration = Duration::from_secs(2);
const MAX_MEMBERS: usize = 16;
const JOIN_HANDSHAKE_TIMEOUT: Duration = Duration::from_secs(5);

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
    /// The TCP port this instance is listening on. Real guests never need
    /// this directly (they learn it from the UDP beacon); it exists so
    /// `SyncRoomManager::host_port` can hand it to tests that connect over
    /// loopback without depending on broadcast delivery.
    port: u16,
}

struct GuestSession {
    reader_task: tauri::async_runtime::JoinHandle<()>,
    /// Kept alive for the duration of the session. Dropping a split TCP
    /// stream's write half immediately shuts down that direction (sends
    /// FIN), which the host reads as EOF and treats as a disconnect — so
    /// this must not be dropped until the guest actually leaves.
    ///
    /// `None` for a P2P session (`p2p_sync.rs`): there `reader_task` owns
    /// the whole libp2p swarm itself, so aborting it already tears down the
    /// connection — no separate handle needs keeping alive.
    _write_half: Option<tokio::net::tcp::OwnedWriteHalf>,
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
}

impl Default for SyncRoomManager {
    fn default() -> Self {
        Self::new()
    }
}

impl SyncRoomManager {
    pub fn new() -> Self {
        Self {
            state: Mutex::new(None),
            host: Mutex::new(None),
            guest: Mutex::new(None),
            peers: Mutex::new(HashMap::new()),
        }
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
        room.members.push(RoomMember {
            id: member_id,
            nickname,
            is_host: false,
            joined_at_ms: now_ms(),
        });
        Ok(room.clone())
    }

    pub(crate) fn remove_member(&self, member_id: &str) -> Option<RoomState> {
        let mut guard = self.state.lock();
        let room = guard.as_mut()?;
        room.members.retain(|m| m.id != member_id);
        Some(room.clone())
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
    pub(crate) fn attach_p2p_host_task(&self, task: tauri::async_runtime::JoinHandle<()>) {
        if let Some(host) = self.host.lock().as_mut() {
            host.p2p_task = Some(task);
        }
    }

    /// Records that this instance is now a guest of a room reached via
    /// libp2p, mirroring what `connect_to_host` does for a TCP guest
    /// session. `reader_task` owns the swarm and must be aborted (by
    /// `leave_room`) to actually disconnect.
    pub(crate) fn set_p2p_guest_session(&self, reader_task: tauri::async_runtime::JoinHandle<()>) {
        *self.guest.lock() = Some(GuestSession {
            reader_task,
            _write_half: None,
        });
    }

    #[cfg(test)]
    pub(crate) fn set_local_room(&self, room: RoomState) {
        *self.state.lock() = Some(room);
    }

    /// Applies a `State` push received from the host (guest side) and
    /// returns the resulting local view, mirroring the TCP
    /// `guest_reader_loop`'s handling of `WireMessage::State`. Also used for
    /// the initial state handed back in the `Join` response, since the
    /// semantics (store + return the local view) are identical.
    pub(crate) fn apply_remote_room_update(&self, wire: RoomStateWire, current_user_id: &str) -> RoomState {
        let local = wire.into_local_view(false, current_user_id.to_string());
        *self.state.lock() = Some(local.clone());
        local
    }

    /// Applies a `Playback` push received from the host (guest side),
    /// mirroring the TCP `guest_reader_loop`'s handling of
    /// `WireMessage::Playback`.
    pub(crate) fn apply_remote_playback(&self, state: SyncPlaybackState) {
        if let Some(r) = self.state.lock().as_mut() {
            r.playback_state = Some(state);
        }
    }

    /// Clears guest-side state after the connection to the host drops.
    #[allow(dead_code)]
    pub(crate) fn clear_guest(&self) {
        *self.state.lock() = None;
        *self.guest.lock() = None;
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
    *manager.state.lock() = Some(room.clone());
    manager.peers.lock().clear(); // defensive: leave_room already clears this, but never start with stale entries

    let accept_manager = manager.clone();
    let accept_sink = sink.clone();
    let accept_task = tauri::async_runtime::spawn(accept_loop(listener, accept_manager, accept_sink));

    let beacon_task = tauri::async_runtime::spawn(beacon_loop(room_code.clone(), nickname, tcp_port));

    *manager.host.lock() = Some(HostSession {
        accept_task,
        beacon_task,
        p2p_task: None,
        port: tcp_port,
    });

    // Announce in the public DHT alongside the LAN beacon (not instead of
    // it) so a same-network guest still gets the near-instant UDP path,
    // while a guest on a different network can still find this room. Best
    // effort: if the P2P swarm can't start (e.g. no usable transport on
    // this platform), LAN hosting still works fine without it.
    match crate::p2p_sync::host_provide(manager.clone(), sink, room_code).await {
        Ok(task) => manager.attach_p2p_host_task(task),
        Err(e) => log::warn!("Listen Together: internet (P2P) hosting unavailable: {e}"),
    }

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

    let n = match tokio::time::timeout(JOIN_HANDSHAKE_TIMEOUT, reader.read_line(&mut line)).await {
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
            read_res = reader.read_line(&mut line) => {
                match read_res {
                    Ok(0) | Err(_) => break,
                    // Guests don't send further protocol messages today
                    // (only the host is a playback source); anything they
                    // send here is silently ignored rather than erroring,
                    // so a future guest-originated message type can be
                    // added without breaking older peers.
                    Ok(_) => {}
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
    let n = tokio::time::timeout(JOIN_HANDSHAKE_TIMEOUT, reader.read_line(&mut line))
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

    let local_room = initial_wire.into_local_view(false, user_id.clone());
    *manager.state.lock() = Some(local_room.clone());

    let m = manager.clone();
    let s = sink.clone();
    let uid = user_id;
    let reader_task = tauri::async_runtime::spawn(async move {
        guest_reader_loop(reader, m, s, uid).await;
    });

    *manager.guest.lock() = Some(GuestSession {
        reader_task,
        _write_half: Some(write_half),
    });

    Ok(local_room)
}

async fn guest_reader_loop(
    mut reader: BufReader<OwnedReadHalf>,
    manager: Arc<SyncRoomManager>,
    sink: Arc<dyn SyncEventSink>,
    my_id: String,
) {
    let mut line = String::new();
    loop {
        line.clear();
        match reader.read_line(&mut line).await {
            Ok(0) | Err(_) => break,
            Ok(_) => {
                let Ok(msg) = serde_json::from_str::<WireMessage>(line.trim()) else {
                    continue;
                };
                match msg {
                    WireMessage::State { room } => {
                        let local = room.into_local_view(false, my_id.clone());
                        *manager.state.lock() = Some(local.clone());
                        sink.room_updated(&local);
                    }
                    WireMessage::Playback { state } => {
                        if let Some(r) = manager.state.lock().as_mut() {
                            r.playback_state = Some(state.clone());
                        }
                        sink.playback_updated(&state);
                    }
                    WireMessage::Join { .. } | WireMessage::Leave { .. } => {} // guests never receive Join / Leave
                    WireMessage::Ack => {} // Ack only exists on the internet transport
                }
            }
        }
    }

    *manager.state.lock() = None;
    *manager.guest.lock() = None;
    sink.room_left();
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

// ---------------------------------------------------------------------
// Leaving
// ---------------------------------------------------------------------

pub fn leave_room(manager: &Arc<SyncRoomManager>) {
    if let Some(host) = manager.host.lock().take() {
        host.accept_task.abort();
        host.beacon_task.abort();
        if let Some(p2p_task) = host.p2p_task {
            p2p_task.abort();
        }
        // Dropping every registered peer's sender closes their mpsc
        // channel; each peer_task's/P2P host loop's per-peer forwarder sees
        // the channel end and exits on its own, closing that connection
        // cleanly (TCP: peer_task's select! sees `rx.recv() == None`; P2P:
        // aborting `p2p_task` above already tore the whole swarm down).
        manager.peers.lock().clear();
    }
    if let Some(guest) = manager.guest.lock().take() {
        guest.reader_task.abort();
    }
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
    }

    fn noop_sink() -> Arc<dyn SyncEventSink> {
        Arc::new(NoopSink)
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
        let host_manager = Arc::new(SyncRoomManager::new());
        let guest_manager = Arc::new(SyncRoomManager::new());

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
