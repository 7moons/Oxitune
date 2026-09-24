//! "Listen Together" rooms: membership, roles, moderation, and the LAN
//! transport.
//!
//! The host is the single source of truth: it keeps the room state, checks
//! every guest request against the sender's role, and pushes the result to
//! everyone. Two transports carry the same `WireMessage`s, both sealed
//! end-to-end with a key derived from the room code (`sync_crypto.rs`):
//!
//!   1. LAN: the host binds an ephemeral TCP listener and broadcasts a UDP
//!      beacon (the room's topic id, never the code, plus the TCP port); a
//!      guest that knows the code matches the id and connects directly.
//!      Messages are newline-delimited, one sealed message per line.
//!   2. Internet: `p2p_sync.rs`, over public MQTT brokers, for peers on
//!      different networks. Tried after LAN discovery fails.
//!
//! Room features built on top (join approval, vote skip, reactions, the
//! shared queue, host handoff) live in `features.rs`. When the host leaves,
//! it hands the room to a successor, who starts hosting the same code while
//! everyone else reconnects to it; if the host vanishes, the successor takes
//! over once the old host can't be reached.

mod features;
pub(crate) use features::votes_needed;

pub use features::{parse_video_id, REACTIONS};
pub(crate) use features::pick_successor;

use crate::sync_crypto::{client_hash, RoomCipher};
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::net::SocketAddr;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::tcp::{OwnedReadHalf, OwnedWriteHalf};
use tokio::net::{TcpListener, TcpStream, UdpSocket};
use tokio::sync::{mpsc, oneshot, watch};
use tokio::time::Instant;

const DISCOVERY_UDP_PORT: u16 = 47863;
const DISCOVERY_TIMEOUT: Duration = Duration::from_millis(2500);
const BEACON_INTERVAL: Duration = Duration::from_secs(2);
const MAX_MEMBERS: usize = 16;
const JOIN_HANDSHAKE_TIMEOUT: Duration = Duration::from_secs(5);
/// How long a guest waits for the host to let it in (join approval).
pub(crate) const APPROVAL_TIMEOUT: Duration = Duration::from_secs(120);
/// First retry comes after this, giving a successor time to start hosting.
const RECONNECT_FIRST_DELAY: Duration = Duration::from_secs(1);
const RECONNECT_RETRY: Duration = Duration::from_secs(2);
/// Hard cap on a single wire-protocol line. Without this, a peer that never
/// sends `\n` can grow `read_line`'s buffer without bound (memory exhaustion
/// from one malformed/hostile LAN connection). Generous for our messages.
const MAX_LINE_LEN: u64 = 64 * 1024;

/// Sent in every `Join`. The host turns away guests below it with
/// `RejectReason::Outdated`: before 2 a `Join` carried no `client_id`, so a
/// kicked guest could come straight back.
pub(crate) const PROTOCOL_VERSION: u32 = 2;
const MAX_NICKNAME_CHARS: usize = 32;
/// `user_id` in the `Leave` a host sends when it ends the room for everyone.
/// Guests never get this id (theirs come from `generate_user_id`, always
/// `user-…`), so it can't collide.
pub(crate) const HOST_CLOSED_USER_ID: &str = "__host__";

/// i18n keys (`src/ui/i18n.ts`) for errors the sync window explains.
pub(crate) const ERR_NOT_FOUND: &str = "sync.error.notFound";
pub(crate) const ERR_BANNED: &str = "sync.error.banned";
const ERR_NOT_IN_ROOM: &str = "sync.error.notInRoom";
const ERR_NOT_HOST: &str = "sync.error.notHost";
const ERR_NOT_ALLOWED: &str = "sync.error.notAllowed";
const ERR_NO_SUCH_MEMBER: &str = "sync.error.noSuchMember";
const ERR_HOST_GONE: &str = "sync.error.hostGone";

/// `read_line`, but capped at `MAX_LINE_LEN` bytes. If the peer never sends a
/// newline within the cap, this returns once the limit is hit (as if EOF),
/// leaving `buf` without a trailing `\n` so decoding rejects it and the
/// connection gets dropped.
async fn read_line_capped<R: tokio::io::AsyncBufRead + Unpin>(
    reader: &mut R,
    buf: &mut String,
) -> std::io::Result<usize> {
    use tokio::io::AsyncReadExt;
    (&mut *reader).take(MAX_LINE_LEN).read_line(buf).await
}

/// What a member may do in the room. Only the host's copy counts: it checks
/// every guest request against it, so a guest editing its own view gains
/// nothing.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MemberRole {
    Host,
    /// Controls playback and removes DJs and listeners.
    Moderator,
    /// Controls playback: skip, pause, pick songs, add to the shared queue.
    /// What every guest was before roles existed, hence the default for a
    /// peer that sends none.
    #[default]
    Dj,
    /// Listens, reacts and votes to skip.
    Listener,
}

impl MemberRole {
    fn rank(self) -> u8 {
        match self {
            MemberRole::Host => 3,
            MemberRole::Moderator => 2,
            MemberRole::Dj => 1,
            MemberRole::Listener => 0,
        }
    }

    pub fn can_control(self) -> bool {
        self != MemberRole::Listener
    }

    pub fn can_moderate(self) -> bool {
        self.rank() >= MemberRole::Moderator.rank()
    }

    /// Host removes anyone else; a moderator removes DJs and listeners.
    pub fn can_kick(self, target: MemberRole) -> bool {
        self.can_moderate() && self.rank() > target.rank()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoomMember {
    pub id: String,
    pub nickname: String,
    pub is_host: bool,
    pub joined_at_ms: u64,
    #[serde(default)]
    pub role: MemberRole,
    /// `client_hash` of the member's install: lets a new host give a
    /// returning member back their role without learning their secret id.
    #[serde(default)]
    pub client_hash: String,
}

/// Someone the host removed. Keyed by the install's `client_hash` (not its
/// per-join member id), so rejoining under a new id doesn't work.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BannedMember {
    pub client_hash: String,
    pub nickname: String,
}

/// Someone waiting for the host to let them in.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PendingMember {
    pub user_id: String,
    pub nickname: String,
}

/// A song in the room's shared queue.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct QueueItem {
    pub id: String,
    pub video_id: String,
    pub title: String,
    pub artist: String,
    pub added_by: String,
    pub added_by_id: String,
}

/// Why the host turned a `Join` away. Carried to the guest in `Rejected`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RejectReason {
    Banned,
    Full,
    Outdated,
    Closed,
    /// The host declined a join that needed approval.
    Denied,
}

impl RejectReason {
    /// The i18n key the sync window shows for it (`src/ui/i18n.ts`).
    pub(crate) fn message_key(self) -> String {
        match self {
            RejectReason::Banned => ERR_BANNED,
            RejectReason::Full => "sync.error.full",
            RejectReason::Outdated => "sync.error.outdated",
            RejectReason::Closed => ERR_NOT_FOUND,
            RejectReason::Denied => "sync.error.denied",
        }
        .to_string()
    }
}

/// Why this instance is no longer in a room, sent with `sync-room-left`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum LeaveReason {
    /// We left ourselves.
    Left,
    /// The host ended the room for everyone.
    Closed,
    /// The host (or a moderator) removed us.
    Kicked,
    /// The host went away and nobody could be reached for
    /// `LivenessConfig::reconnect_for`.
    Lost,
}

#[derive(Debug, Clone, Serialize)]
pub struct RoomLeftPayload {
    pub reason: LeaveReason,
}

/// A guest's join request as the host sees it, whichever transport it came
/// over.
#[derive(Debug, Clone)]
pub(crate) struct JoinRequest {
    pub user_id: String,
    pub nickname: String,
    pub client_id: String,
    pub protocol: u32,
}

#[derive(Debug, Clone)]
pub(crate) struct Admission {
    pub room: RoomState,
    /// This guest's previous member id, if its install was already in.
    pub replaced: Option<String>,
}

pub(crate) enum JoinDecision {
    Admitted(Box<Admission>),
    /// Waiting for the host's approval. `new` is false for a re-sent `Join`
    /// from someone already waiting.
    Pending { new: bool },
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
/// `current_user_id` are perspective-relative, and `banned`/`pending`/
/// `reconnecting` are local only, so none of those go over the wire (see
/// `RoomStateWire`).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoomState {
    pub room_code: String,
    pub is_host: bool,
    pub current_user_id: String,
    pub members: Vec<RoomMember>,
    pub playback_state: Option<SyncPlaybackState>,
    /// The role a new guest gets.
    #[serde(default)]
    pub default_role: MemberRole,
    /// New guests wait for the host to let them in.
    #[serde(default)]
    pub require_approval: bool,
    #[serde(default)]
    pub queue: Vec<QueueItem>,
    /// Member ids voting to skip the current song.
    #[serde(default)]
    pub skip_votes: Vec<String>,
    /// Host only: who can't come back.
    #[serde(default)]
    pub banned: Vec<BannedMember>,
    /// Host only: who is waiting to be let in.
    #[serde(default)]
    pub pending: Vec<PendingMember>,
    /// Guest only: the host is gone and we're getting back in (or taking
    /// over). Playback keeps going meanwhile.
    #[serde(default)]
    pub reconnecting: bool,
}

impl RoomState {
    pub(crate) fn member(&self, member_id: &str) -> Option<&RoomMember> {
        self.members.iter().find(|m| m.id == member_id)
    }

    fn my_role(&self) -> Option<MemberRole> {
        self.member(&self.current_user_id).map(|m| m.role)
    }
}

/// The objective, shared part of room state that actually goes over the
/// network.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub(crate) struct RoomStateWire {
    room_code: String,
    members: Vec<RoomMember>,
    playback_state: Option<SyncPlaybackState>,
    #[serde(default)]
    default_role: MemberRole,
    #[serde(default)]
    require_approval: bool,
    #[serde(default)]
    queue: Vec<QueueItem>,
    #[serde(default)]
    skip_votes: Vec<String>,
}

impl From<&RoomState> for RoomStateWire {
    fn from(r: &RoomState) -> Self {
        RoomStateWire {
            room_code: r.room_code.clone(),
            members: r.members.clone(),
            playback_state: r.playback_state.clone(),
            default_role: r.default_role,
            require_approval: r.require_approval,
            queue: r.queue.clone(),
            skip_votes: r.skip_votes.clone(),
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
            default_role: self.default_role,
            require_approval: self.require_approval,
            queue: self.queue,
            skip_votes: self.skip_votes,
            banned: Vec::new(),
            pending: Vec::new(),
            reconnecting: false,
        }
    }
}

/// Shared verbatim between the LAN TCP transport (this file) and the MQTT
/// transport (`p2p_sync.rs`). `Ack` exists only for the MQTT side. Peers
/// skip messages they can't parse, so adding variants is compatible.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub(crate) enum WireMessage {
    /// `client_id` is stable per install (see `load_or_create_client_id`);
    /// both fields are missing from pre-2 guests, which the host rejects.
    Join {
        user_id: String,
        nickname: String,
        #[serde(default)]
        client_id: String,
        #[serde(default)]
        protocol: u32,
    },
    State { room: RoomStateWire },
    Playback { state: SyncPlaybackState },
    /// Guest -> host: leaving. Host -> room with `HOST_CLOSED_USER_ID`: the
    /// room is over.
    Leave { user_id: String },
    Ack,
    /// Liveness ping, both directions, every
    /// `LivenessConfig::heartbeat_interval`.
    Heartbeat { user_id: String },
    /// Guest -> host: a playback request for the whole room.
    Control { user_id: String, action: SyncControl },
    /// Host -> the guest whose `Join` was turned away.
    Rejected { user_id: String, reason: RejectReason },
    /// Host -> a guest whose `Join` waits for approval.
    Pending { user_id: String },
    /// Host -> room: `user_id` was removed and banned. Sent to everyone (the
    /// removed guest's connection may be the MQTT broadcast topic); only
    /// that guest acts on it.
    Kicked { user_id: String },
    /// Guest -> host: a moderator's request. The host checks the role.
    Moderate { user_id: String, action: Moderation },
    /// Guest -> host: vote to skip the current song.
    VoteSkip { user_id: String },
    /// Guest -> host: an emoji reaction, one of `REACTIONS`.
    Reaction { user_id: String, emoji: String },
    /// Host -> room: show a reaction.
    ReactionShown { from: String, emoji: String },
    /// Guest -> host: shared queue edits. `next` puts the song first (YTM's
    /// "Play next"), otherwise it goes to the end ("Add to queue").
    QueueAdd {
        user_id: String,
        video_id: String,
        title: String,
        artist: String,
        #[serde(default)]
        next: bool,
    },
    QueueRemove { user_id: String, item_id: String },
    QueuePlay { user_id: String, item_id: String },
    /// Guest -> host: put a queued song at position `to_index`.
    QueueMove { user_id: String, item_id: String, to_index: usize },
    /// Host -> room: the host is leaving and `new_host_id` takes over the
    /// same code. Carries what the new host needs to keep the room as it
    /// was: bans and approvals by `client_hash`, never by secret id.
    HostHandoff {
        new_host_id: String,
        room: RoomStateWire,
        #[serde(default)]
        banned: Vec<BannedMember>,
        #[serde(default)]
        approved: Vec<String>,
    },
}

/// What a guest asks the host to do. The host's page carries it out and its
/// regular `Playback` broadcast then brings every guest along.
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
            SyncControl::PlayVideo { video_id } => is_video_id(video_id),
            _ => true,
        }
    }
}

pub(crate) fn is_video_id(id: &str) -> bool {
    id.len() == 11 && id.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
}

/// What a moderator guest asks the host to do to another member.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum Moderation {
    Kick { member_id: String },
}

/// Why the host's page is asked to act, for the toast it shows.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum ControlSource {
    /// `from` asked directly.
    Member,
    /// Most of the room voted to skip.
    Vote,
    /// A song `from` added to the shared queue, played now.
    Queue { title: String },
}

/// A request as handed to the host's page.
#[derive(Debug, Clone, Serialize)]
pub struct SyncControlRequest {
    pub from: String,
    pub action: SyncControl,
    pub source: ControlSource,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReactionPayload {
    pub from: String,
    pub emoji: String,
}

/// How often peers ping each other and how long silence is tolerated before
/// a member is evicted (host side) or the host is considered gone (guest
/// side). Configurable so tests can run the same logic in milliseconds.
#[derive(Debug, Clone, Copy)]
pub struct LivenessConfig {
    pub heartbeat_interval: Duration,
    pub timeout: Duration,
    /// After losing the host, how long to keep trying to get back in.
    pub reconnect_for: Duration,
}

impl Default for LivenessConfig {
    fn default() -> Self {
        Self {
            heartbeat_interval: Duration::from_secs(5),
            timeout: Duration::from_secs(15),
            reconnect_for: Duration::from_secs(45),
        }
    }
}

/// Members (never the host) whose last sign of life is older than `timeout`.
/// A member with no `last_seen` entry is treated as just seen: every add
/// records one, so a missing entry only means a racing removal.
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

/// The LAN beacon: the room's topic id (see `RoomCipher`), never its code.
#[derive(Debug, Clone, Serialize, Deserialize)]
struct Beacon {
    topic_id: String,
    tcp_port: u16,
}

/// Where SyncRoomManager sends notifications for the frontend. A trait (not
/// `tauri::AppHandle` directly) so tests run without a Tauri runtime.
pub trait SyncEventSink: Send + Sync + 'static {
    fn room_updated(&self, room: &RoomState);
    fn playback_updated(&self, state: &SyncPlaybackState);
    fn room_left(&self, reason: LeaveReason);
    fn control_requested(&self, request: &SyncControlRequest);
    fn reaction(&self, reaction: &ReactionPayload);
    /// Our join waits for the host's approval.
    fn join_pending(&self);
}

impl SyncEventSink for AppHandle {
    fn room_updated(&self, room: &RoomState) {
        let _ = self.emit("sync-room-updated", room);
    }
    fn playback_updated(&self, state: &SyncPlaybackState) {
        let _ = self.emit("sync-playback-remote", state);
    }
    fn room_left(&self, reason: LeaveReason) {
        let _ = self.emit("sync-room-left", RoomLeftPayload { reason });
    }
    fn control_requested(&self, request: &SyncControlRequest) {
        let _ = self.emit("sync-control-remote", request);
    }
    fn reaction(&self, reaction: &ReactionPayload) {
        let _ = self.emit("sync-reaction", reaction);
    }
    fn join_pending(&self) {
        let _ = self.emit("sync-join-pending", ());
    }
}

struct HostSession {
    accept_task: tauri::async_runtime::JoinHandle<()>,
    beacon_task: tauri::async_runtime::JoinHandle<()>,
    /// Flipped to `true` when hosting stops: every internet (MQTT) host loop
    /// sends what's still queued for it (a final `Leave` or `HostHandoff`)
    /// and exits. A loop still connecting just gives up. `None` when
    /// internet hosting is off.
    internet_shutdown: Option<watch::Sender<bool>>,
    /// Sends the host's heartbeat to every guest and evicts silent members.
    liveness_task: tauri::async_runtime::JoinHandle<()>,
    /// The TCP port this instance is listening on (tests connect to it
    /// directly instead of relying on broadcast delivery).
    port: u16,
}

struct GuestSession {
    reader_task: tauri::async_runtime::JoinHandle<()>,
    /// Our member id, stamped on the requests we send.
    user_id: String,
    /// Messages for the host, drained by `writer_task` (TCP) or the guest
    /// loop (MQTT).
    outbox: mpsc::UnboundedSender<WireMessage>,
    /// TCP only: owns the stream's write half, so aborting it on leave is
    /// also what closes the connection.
    writer_task: Option<tauri::async_runtime::JoinHandle<()>>,
    /// MQTT only: asks the guest loop to publish `Leave` and exit on its own.
    shutdown: Option<oneshot::Sender<()>>,
}

/// A join waiting for approval. `waiter` is set by the TCP transport, whose
/// connection waits for the decision; MQTT guests just keep listening.
struct PendingJoin {
    join: JoinRequest,
    since: Instant,
    waiter: Option<oneshot::Sender<Result<Admission, RejectReason>>>,
}

/// Host-only bookkeeping that never leaves this process (except approvals,
/// by hash, in a handoff).
#[derive(Default)]
struct HostBook {
    /// Installs let in before (by `client_hash`): they skip approval.
    approved: HashSet<String>,
    /// Roles by `client_hash`, so a member who reconnects gets theirs back.
    known_roles: HashMap<String, MemberRole>,
    pending: HashMap<String, PendingJoin>,
    /// The song the current skip votes are for.
    vote_video: Option<String>,
    last_reaction: HashMap<String, Instant>,
    next_queue_id: u64,
}

pub struct SyncRoomManager {
    state: Mutex<Option<RoomState>>,
    host: Mutex<Option<HostSession>>,
    guest: Mutex<Option<GuestSession>>,
    /// Senders for every connected guest (TCP) and every broker loop
    /// (MQTT), used by `broadcast_to_peers`.
    peers: Mutex<HashMap<String, mpsc::UnboundedSender<WireMessage>>>,
    /// Host side: when each member was last heard from.
    last_seen: Mutex<HashMap<String, Instant>>,
    /// Bumped on every create/join/leave. Background tasks capture the value
    /// they were started under and stop touching shared state once it moves
    /// on, so a dying session's loop can never clobber a newer one.
    session_gen: AtomicU64,
    /// Bumped only by an explicit leave, so a reconnect running in the
    /// background knows to stop.
    leave_epoch: AtomicU64,
    pub(crate) liveness: LivenessConfig,
    /// Whether rooms also use the internet (MQTT) transport. Only turned off
    /// by tests that must not depend on public brokers.
    internet_enabled: bool,
    /// Our install-wide id, sent in every `Join`.
    client_id: String,
    host_book: Mutex<HostBook>,
}

impl Default for SyncRoomManager {
    fn default() -> Self {
        Self::new()
    }
}

/// This install's identity in rooms, stored next to the config
/// (`~/.ytmd/sync_client_id`) rather than in `config.json`, which every
/// window can rewrite through `save_config`. Created on first use; if the
/// file can't be written the id only lasts until restart.
pub fn load_or_create_client_id(path: &std::path::Path) -> String {
    if let Ok(existing) = std::fs::read_to_string(path) {
        let id = existing.trim();
        if is_valid_client_id(id) {
            return id.to_string();
        }
    }
    use rand::Rng;
    let bytes: [u8; 16] = rand::rng().random();
    let id: String = bytes.iter().map(|b| format!("{b:02x}")).collect();
    if let Err(e) = std::fs::write(path, &id) {
        log::warn!("Listen Together: couldn't save client id to {}: {e}", path.display());
    }
    id
}

fn is_valid_client_id(id: &str) -> bool {
    (16..=64).contains(&id.len()) && id.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-')
}

fn clean_nickname(raw: &str) -> String {
    let name = clean_text(raw, MAX_NICKNAME_CHARS);
    if name.is_empty() {
        "?".to_string()
    } else {
        name
    }
}

/// Trimmed, control characters dropped, at most `max` chars.
pub(crate) fn clean_text(raw: &str, max: usize) -> String {
    raw.trim().chars().filter(|c| !c.is_control()).take(max).collect()
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
            leave_epoch: AtomicU64::new(0),
            liveness,
            internet_enabled,
            client_id: generate_user_id(),
            host_book: Mutex::new(HostBook::default()),
        }
    }

    /// The app passes its persisted id (`load_or_create_client_id`); without
    /// it every run is a new identity and bans don't outlive a restart.
    pub fn with_client_id(mut self, client_id: String) -> Self {
        self.client_id = client_id;
        self
    }

    pub(crate) fn client_id(&self) -> &str {
        &self.client_id
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

    /// Test/diagnostic accessor: the TCP port this instance is hosting on.
    pub fn host_port(&self) -> Option<u16> {
        self.host.lock().as_ref().map(|h| h.port)
    }

    /// Host side: a guest's `Join`, from either transport. Banned installs
    /// and old clients are turned away; with approval on, installs not let
    /// in before wait in `pending` until the host decides.
    ///
    /// A guest whose install is already in the room (it crashed or lost its
    /// network and came back before eviction) replaces its old entry, whose
    /// id comes back in `Admission::replaced` so the caller can drop that
    /// connection.
    pub(crate) fn admit_member(&self, join: JoinRequest) -> Result<JoinDecision, RejectReason> {
        if join.protocol < PROTOCOL_VERSION || join.client_id.is_empty() {
            return Err(RejectReason::Outdated);
        }
        let hash = client_hash(&join.client_id);
        let mut guard = self.state.lock();
        let room = guard.as_mut().filter(|r| r.is_host).ok_or(RejectReason::Closed)?;
        if room.banned.iter().any(|b| b.client_hash == hash) {
            return Err(RejectReason::Banned);
        }
        let mut book = self.host_book.lock();
        if room.require_approval && !book.approved.contains(&hash) {
            if book.pending.contains_key(&join.user_id) {
                return Ok(JoinDecision::Pending { new: false });
            }
            if book.pending.len() >= MAX_MEMBERS {
                return Err(RejectReason::Full);
            }
            room.pending.push(PendingMember {
                user_id: join.user_id.clone(),
                nickname: clean_nickname(&join.nickname),
            });
            book.pending.insert(
                join.user_id.clone(),
                PendingJoin { join, since: Instant::now(), waiter: None },
            );
            return Ok(JoinDecision::Pending { new: true });
        }
        self.admit_locked(room, &mut book, join, hash).map(|a| JoinDecision::Admitted(Box::new(a)))
    }

    fn admit_locked(
        &self,
        room: &mut RoomState,
        book: &mut HostBook,
        join: JoinRequest,
        hash: String,
    ) -> Result<Admission, RejectReason> {
        let replaced = room
            .members
            .iter()
            .find(|m| !m.is_host && m.client_hash == hash && m.id != join.user_id)
            .map(|m| m.id.clone());
        if let Some(old) = &replaced {
            room.members.retain(|m| &m.id != old);
            room.skip_votes.retain(|v| v != old);
            self.last_seen.lock().remove(old);
        }
        if room.members.iter().any(|m| m.id == join.user_id) {
            return Ok(Admission { room: room.clone(), replaced });
        }
        if room.members.len() >= MAX_MEMBERS {
            return Err(RejectReason::Full);
        }
        let role = match book.known_roles.get(&hash) {
            Some(MemberRole::Host) | None => room.default_role,
            Some(role) => *role,
        };
        book.approved.insert(hash.clone());
        self.last_seen.lock().insert(join.user_id.clone(), Instant::now());
        room.members.push(RoomMember {
            id: join.user_id,
            nickname: clean_nickname(&join.nickname),
            is_host: false,
            joined_at_ms: now_ms(),
            role,
            client_hash: hash,
        });
        Ok(Admission { room: room.clone(), replaced })
    }

    /// Whether `member_id` is currently in the room.
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
        room.skip_votes.retain(|v| v != member_id);
        self.last_seen.lock().remove(member_id);
        (room.members.len() != before).then(|| room.clone())
    }

    /// Records a sign of life from a current member.
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

    pub(crate) fn register_peer(&self, key: String, tx: mpsc::UnboundedSender<WireMessage>) {
        self.peers.lock().insert(key, tx);
    }

    pub(crate) fn unregister_peer(&self, key: &str) {
        self.peers.lock().remove(key);
    }

    pub(crate) fn broadcast_to_peers(&self, msg: &WireMessage) {
        let peers = self.peers.lock();
        for tx in peers.values() {
            let _ = tx.send(msg.clone());
        }
    }

    /// Records that this instance is now a guest of a room reached over the
    /// internet transport.
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

    /// Host side: every request a guest can send, from either transport.
    /// `member_id` is whoever the transport says sent it.
    pub(crate) fn handle_guest_message(&self, member_id: &str, msg: WireMessage, sink: &Arc<dyn SyncEventSink>) {
        self.touch_member(member_id);
        let result = match msg {
            WireMessage::Control { action, .. } => {
                self.handle_guest_control(member_id, action, sink);
                Ok(())
            }
            WireMessage::Moderate { action: Moderation::Kick { member_id: target }, .. } => {
                self.kick(member_id, &target, sink)
            }
            WireMessage::VoteSkip { .. } => self.vote_skip(member_id, sink),
            WireMessage::Reaction { emoji, .. } => self.react(member_id, &emoji, sink),
            WireMessage::QueueAdd { video_id, title, artist, next, .. } => {
                self.queue_add(member_id, &video_id, &title, &artist, next, sink)
            }
            WireMessage::QueueRemove { item_id, .. } => self.queue_remove(member_id, &item_id, sink),
            WireMessage::QueuePlay { item_id, .. } => self.queue_play(member_id, &item_id, sink),
            _ => Ok(()),
        };
        if let Err(e) = result {
            log::debug!("Listen Together: refused request from {member_id}: {e}");
        }
    }

    /// Host side: a guest's `Control`. Non-members, listeners and invalid
    /// requests are dropped.
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
            match room.member(member_id) {
                Some(m) if m.role.can_control() => m.nickname.clone(),
                _ => return,
            }
        };
        sink.control_requested(&SyncControlRequest { from, action, source: ControlSource::Member });
    }

    /// Host side: removes `target_id` on behalf of `actor_id` (the host
    /// itself or a moderator) and bans its install from coming back.
    pub(crate) fn kick(&self, actor_id: &str, target_id: &str, sink: &Arc<dyn SyncEventSink>) -> Result<(), String> {
        let banned = {
            let mut guard = self.state.lock();
            let room = guard.as_mut().filter(|r| r.is_host).ok_or(ERR_NOT_HOST)?;
            let actor = room.member(actor_id).ok_or(ERR_NOT_ALLOWED)?;
            let target = room.member(target_id).ok_or(ERR_NO_SUCH_MEMBER)?;
            if !actor.role.can_kick(target.role) {
                return Err(ERR_NOT_ALLOWED.into());
            }
            let ban = BannedMember { client_hash: target.client_hash.clone(), nickname: target.nickname.clone() };
            if !room.banned.contains(&ban) {
                room.banned.push(ban.clone());
            }
            let mut book = self.host_book.lock();
            book.approved.remove(&ban.client_hash);
            book.known_roles.remove(&ban.client_hash);
            ban
        };
        log::info!("Listen Together: {} removed from the room by {actor_id}", banned.nickname);
        // Queued before the peer's sender is dropped below, so its TCP
        // connection still delivers it before closing.
        self.broadcast_to_peers(&WireMessage::Kicked { user_id: target_id.to_string() });
        self.unregister_peer(target_id);
        if let Some(room) = self.remove_member(target_id) {
            self.announce_room(&room, sink);
        }
        Ok(())
    }

    pub(crate) fn set_member_role(
        &self,
        target_id: &str,
        role: MemberRole,
        sink: &Arc<dyn SyncEventSink>,
    ) -> Result<(), String> {
        if role == MemberRole::Host {
            return Err(ERR_NOT_ALLOWED.into());
        }
        let room = {
            let mut guard = self.state.lock();
            let room = guard.as_mut().filter(|r| r.is_host).ok_or(ERR_NOT_HOST)?;
            let target = room
                .members
                .iter_mut()
                .find(|m| m.id == target_id)
                .ok_or(ERR_NO_SUCH_MEMBER)?;
            if target.is_host {
                return Err(ERR_NOT_ALLOWED.into());
            }
            target.role = role;
            self.host_book.lock().known_roles.insert(target.client_hash.clone(), role);
            room.clone()
        };
        self.announce_room(&room, sink);
        Ok(())
    }

    pub(crate) fn set_default_role(&self, role: MemberRole, sink: &Arc<dyn SyncEventSink>) -> Result<(), String> {
        if role == MemberRole::Host {
            return Err(ERR_NOT_ALLOWED.into());
        }
        self.update_host_room(sink, |room| {
            room.default_role = role;
            Ok(())
        })
    }

    pub(crate) fn unban(&self, client_hash: &str, sink: &Arc<dyn SyncEventSink>) -> Result<(), String> {
        self.update_host_room(sink, |room| {
            room.banned.retain(|b| b.client_hash != client_hash);
            Ok(())
        })
    }

    /// Host side: applies `change` to the room and announces it.
    pub(crate) fn update_host_room(
        &self,
        sink: &Arc<dyn SyncEventSink>,
        change: impl FnOnce(&mut RoomState) -> Result<(), String>,
    ) -> Result<(), String> {
        let room = {
            let mut guard = self.state.lock();
            let room = guard.as_mut().filter(|r| r.is_host).ok_or(ERR_NOT_HOST)?;
            change(room)?;
            room.clone()
        };
        self.announce_room(&room, sink);
        Ok(())
    }

    /// Host side: tells this app's windows and every guest the new state.
    pub(crate) fn announce_room(&self, room: &RoomState, sink: &Arc<dyn SyncEventSink>) {
        sink.room_updated(room);
        self.broadcast_to_peers(&WireMessage::State { room: RoomStateWire::from(room) });
    }

    #[cfg(test)]
    pub(crate) fn set_local_room(&self, room: RoomState) {
        *self.state.lock() = Some(room);
    }

    /// Applies a `State` push received from the host (guest side) and
    /// returns the resulting local view. `None` (and nothing stored) if
    /// `generation` is no longer the current session.
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

    /// Guest side: the connection to the host ended. If `generation` is
    /// still current, retires the guest session (keeping the room state for
    /// a reconnect) and returns the last room we knew.
    fn end_guest_session(&self, generation: u64) -> Option<RoomState> {
        let state = self.state.lock();
        if !self.is_current_session(generation) {
            return None;
        }
        self.session_gen.fetch_add(1, Ordering::SeqCst);
        if let Some(guest) = self.guest.lock().take() {
            if let Some(task) = guest.writer_task {
                task.abort();
            }
        }
        state.clone()
    }

    /// Ends a reconnect that failed, unless the user left meanwhile.
    fn give_up(&self, sink: &Arc<dyn SyncEventSink>, epoch: u64, reason: LeaveReason) {
        if self.leave_epoch.load(Ordering::SeqCst) != epoch {
            return;
        }
        self.begin_session();
        *self.state.lock() = None;
        sink.room_left(reason);
    }
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

/// 10 chars from a 32-char alphabet is ~50 bits of entropy, and the code is
/// also the room's encryption secret (see `sync_crypto.rs`). No visually
/// confusable chars, so it's easy to read aloud or type.
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
    let user_id = generate_user_id();
    let room = RoomState {
        room_code: generate_room_code(),
        is_host: true,
        current_user_id: user_id.clone(),
        members: vec![RoomMember {
            id: user_id,
            nickname: clean_nickname(&nickname),
            is_host: true,
            joined_at_ms: now_ms(),
            role: MemberRole::Host,
            client_hash: client_hash(manager.client_id()),
        }],
        playback_state: None,
        default_role: MemberRole::Dj,
        require_approval: false,
        queue: Vec::new(),
        skip_votes: Vec::new(),
        banned: Vec::new(),
        pending: Vec::new(),
        reconnecting: false,
    };
    start_hosting(manager, sink, room, HostBook::default()).await
}

/// Starts serving `room` (a new one, or one taken over in a handoff) over
/// LAN and, when enabled, every internet broker.
async fn start_hosting(
    manager: &Arc<SyncRoomManager>,
    sink: Arc<dyn SyncEventSink>,
    room: RoomState,
    book: HostBook,
) -> Result<RoomState, String> {
    let listener = TcpListener::bind("0.0.0.0:0")
        .await
        .map_err(|e| format!("Failed to start sync server: {e}"))?;
    let tcp_port = listener.local_addr().map_err(|e| e.to_string())?.port();
    let cipher = Arc::new(RoomCipher::new(&room.room_code));

    let generation = manager.begin_session();
    *manager.state.lock() = Some(room.clone());
    manager.peers.lock().clear();
    manager.last_seen.lock().clear();
    *manager.host_book.lock() = book;

    let accept_task =
        tauri::async_runtime::spawn(accept_loop(listener, manager.clone(), sink.clone(), cipher.clone()));
    let beacon_task = tauri::async_runtime::spawn(beacon_loop(cipher.topic_id().to_string(), tcp_port));
    let liveness_task =
        tauri::async_runtime::spawn(host_liveness_loop(manager.clone(), sink.clone(), generation));
    // Also host on every public MQTT broker, each in the background: a guest
    // joins through whichever it reaches first. LAN hosting works without.
    let internet_shutdown = manager.internet_enabled.then(|| {
        let (tx, rx) = watch::channel(false);
        crate::p2p_sync::host_on_all_brokers(manager.clone(), sink.clone(), cipher.clone(), generation, rx);
        tx
    });

    *manager.host.lock() = Some(HostSession {
        accept_task,
        beacon_task,
        internet_shutdown,
        liveness_task,
        port: tcp_port,
    });

    // Every window (the injected YTM page in particular, whose sync plugin
    // gates host broadcasting on it) learns about the room right away.
    sink.room_updated(&room);
    Ok(room)
}

async fn accept_loop(
    listener: TcpListener,
    manager: Arc<SyncRoomManager>,
    sink: Arc<dyn SyncEventSink>,
    cipher: Arc<RoomCipher>,
) {
    while let Ok((stream, _)) = listener.accept().await {
        tokio::spawn(peer_task(stream, manager.clone(), sink.clone(), cipher.clone()));
    }
}

async fn write_sealed(write_half: &mut OwnedWriteHalf, cipher: &RoomCipher, msg: &WireMessage) -> bool {
    match cipher.seal_line(msg) {
        Some(line) => write_half.write_all(line.as_bytes()).await.is_ok(),
        None => false,
    }
}

async fn peer_task(stream: TcpStream, manager: Arc<SyncRoomManager>, sink: Arc<dyn SyncEventSink>, cipher: Arc<RoomCipher>) {
    let (read_half, mut write_half) = stream.into_split();
    let mut reader = BufReader::new(read_half);
    let mut line = String::new();

    match tokio::time::timeout(JOIN_HANDSHAKE_TIMEOUT, read_line_capped(&mut reader, &mut line)).await {
        Ok(Ok(n)) if n > 0 => {}
        _ => return,
    }
    let join = match cipher.open_line(&line) {
        Some(WireMessage::Join { user_id, nickname, client_id, protocol }) => {
            JoinRequest { user_id, nickname, client_id, protocol }
        }
        _ => return, // not our room's key, or not a join
    };
    let member_id = join.user_id.clone();

    let admission = match manager.admit_member(join) {
        Ok(JoinDecision::Admitted(a)) => *a,
        Ok(JoinDecision::Pending { .. }) => {
            if let Some(room) = manager.get_room_state() {
                sink.room_updated(&room);
            }
            if !write_sealed(&mut write_half, &cipher, &WireMessage::Pending { user_id: member_id.clone() }).await {
                manager.drop_pending(&member_id, &sink);
                return;
            }
            let Some(decision) = manager.approval_waiter(&member_id) else {
                return;
            };
            match tokio::time::timeout(APPROVAL_TIMEOUT, decision).await {
                Ok(Ok(Ok(a))) => a,
                Ok(Ok(Err(reason))) => {
                    let _ = write_sealed(&mut write_half, &cipher, &WireMessage::Rejected { user_id: member_id, reason }).await;
                    return;
                }
                _ => {
                    manager.drop_pending(&member_id, &sink);
                    return;
                }
            }
        }
        Err(reason) => {
            // Tell the guest why before dropping the connection.
            let _ = write_sealed(&mut write_half, &cipher, &WireMessage::Rejected { user_id: member_id, reason }).await;
            return;
        }
    };
    if let Some(old) = &admission.replaced {
        manager.unregister_peer(old);
    }

    let (tx, mut rx) = mpsc::unbounded_channel::<WireMessage>();
    manager.register_peer(member_id.clone(), tx);
    // The current room, not the admission snapshot: approval may have been
    // a while ago.
    if let Some(room) = manager.get_room_state() {
        manager.announce_room(&room, &sink);
    }

    loop {
        line.clear();
        tokio::select! {
            read_res = read_line_capped(&mut reader, &mut line) => {
                match read_res {
                    Ok(0) | Err(_) => break,
                    // Any line proves the guest is alive; lines we can't
                    // open or parse are ignored so newer guests don't break
                    // this host.
                    Ok(_) => {
                        manager.touch_member(&member_id);
                        if let Some(msg) = cipher.open_line(&line) {
                            manager.handle_guest_message(&member_id, msg, &sink);
                        }
                    }
                }
            }
            msg = rx.recv() => {
                match msg {
                    Some(m) => {
                        if !write_sealed(&mut write_half, &cipher, &m).await {
                            break;
                        }
                    }
                    None => break, // hosting stopped, or this guest was removed
                }
            }
        }
    }

    manager.unregister_peer(&member_id);
    if let Some(room) = manager.remove_member(&member_id) {
        manager.announce_room(&room, &sink);
    }
}

/// Host side: every heartbeat interval, pings every guest, evicts members
/// silent past the liveness timeout and drops joins nobody approved in time.
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
            manager.announce_room(&room, &sink);
        }
        if let Some(room) = manager.expire_pending() {
            sink.room_updated(&room);
        }
    }
}

async fn beacon_loop(topic_id: String, tcp_port: u16) {
    let sock = match UdpSocket::bind("0.0.0.0:0").await {
        Ok(s) => s,
        Err(_) => return,
    };
    if sock.set_broadcast(true).is_err() {
        return;
    }
    let Ok(payload) = serde_json::to_vec(&Beacon { topic_id, tcp_port }) else {
        return;
    };
    loop {
        let _ = sock.send_to(&payload, ("255.255.255.255", DISCOVERY_UDP_PORT)).await;
        tokio::time::sleep(BEACON_INTERVAL).await;
    }
}

/// Host side: shares the host's playback with every guest. A new song also
/// clears the skip votes, which were for the old one.
pub fn broadcast_playback(manager: &Arc<SyncRoomManager>, sink: &Arc<dyn SyncEventSink>, state: SyncPlaybackState) {
    let votes_cleared = {
        let mut guard = manager.state.lock();
        let Some(room) = guard.as_mut() else {
            return;
        };
        let mut book = manager.host_book.lock();
        let stale_votes = room.is_host
            && book.vote_video.as_deref().is_some_and(|v| v != state.video_id);
        room.playback_state = Some(state.clone());
        if stale_votes {
            book.vote_video = None;
            room.skip_votes.clear();
        }
        stale_votes.then(|| room.clone())
    };
    manager.broadcast_to_peers(&WireMessage::Playback { state });
    if let Some(room) = votes_cleared {
        manager.announce_room(&room, sink);
    }
}

/// Stops hosting. Whatever was broadcast just before (a `HostHandoff`, or
/// the `Leave` that ends the room) still reaches every guest: TCP peers
/// drain their queue before closing, and each broker loop publishes its
/// queue before exiting.
fn stop_hosting(manager: &Arc<SyncRoomManager>) {
    if let Some(host) = manager.host.lock().take() {
        host.accept_task.abort();
        host.beacon_task.abort();
        host.liveness_task.abort();
        if let Some(shutdown) = host.internet_shutdown {
            let _ = shutdown.send(true);
        }
        manager.peers.lock().clear();
        *manager.host_book.lock() = HostBook::default();
    }
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
    if code.trim().is_empty() {
        return Err("sync.error.codeRequired".to_string());
    }
    join_inner(manager, sink, &code, &nickname).await
}

/// Finds the room (LAN first, then the internet) and joins it. Also used to
/// get back in after a handoff or a lost host, while the old room state is
/// still shown.
async fn join_inner(
    manager: &Arc<SyncRoomManager>,
    sink: Arc<dyn SyncEventSink>,
    code: &str,
    nickname: &str,
) -> Result<RoomState, String> {
    let cipher = Arc::new(RoomCipher::new(code));
    match discover_host(cipher.topic_id()).await {
        Ok(host_addr) => connect_to_host(manager, sink, host_addr, nickname.to_string(), cipher).await,
        Err(_) if manager.internet_enabled => {
            crate::p2p_sync::join_room(manager, sink, cipher, nickname.to_string()).await
        }
        Err(_) => Err(ERR_NOT_FOUND.to_string()),
    }
}

/// The TCP join handshake, split out so tests can connect over loopback
/// without depending on UDP broadcast delivery.
async fn connect_to_host(
    manager: &Arc<SyncRoomManager>,
    sink: Arc<dyn SyncEventSink>,
    host_addr: SocketAddr,
    nickname: String,
    cipher: Arc<RoomCipher>,
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
        client_id: manager.client_id().to_string(),
        protocol: PROTOCOL_VERSION,
    };
    if !write_sealed(&mut write_half, &cipher, &join_msg).await {
        return Err("Failed to send join request.".to_string());
    }

    let mut wait = JOIN_HANDSHAKE_TIMEOUT;
    let initial_wire = loop {
        let mut line = String::new();
        let n = tokio::time::timeout(wait, read_line_capped(&mut reader, &mut line))
            .await
            .map_err(|_| "Timed out waiting for host confirmation.".to_string())?
            .map_err(|e| format!("Connection to host failed: {e}"))?;
        if n == 0 {
            return Err("Host closed the connection (room may be full or closed).".to_string());
        }
        match cipher.open_line(&line) {
            Some(WireMessage::State { room }) => break room,
            Some(WireMessage::Rejected { reason, .. }) => return Err(reason.message_key()),
            Some(WireMessage::Pending { .. }) => {
                sink.join_pending();
                wait = APPROVAL_TIMEOUT;
            }
            _ => return Err("Unexpected response from host.".to_string()),
        }
    };

    let generation = manager.begin_session();
    let Some(local_room) = manager.apply_remote_room_update(initial_wire, &user_id, generation) else {
        return Err("Left the room while joining.".to_string());
    };
    // The guest's injected YTM page only applies remote playback while it
    // knows it's in a room.
    sink.room_updated(&local_room);

    let reader_task = tauri::async_runtime::spawn(guest_reader_loop(
        reader,
        manager.clone(),
        sink.clone(),
        user_id.clone(),
        generation,
        cipher.clone(),
    ));
    let (outbox, outbox_rx) = mpsc::unbounded_channel();
    let writer_task = tauri::async_runtime::spawn(guest_writer_loop(
        write_half,
        user_id.clone(),
        manager.liveness.heartbeat_interval,
        outbox_rx,
        cipher,
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

/// TCP guest side: pings the host every interval and forwards the outbox.
/// Owns the write half, so when this task ends the connection's sending side
/// closes and the host sees the guest go.
async fn guest_writer_loop(
    mut write_half: OwnedWriteHalf,
    user_id: String,
    interval: Duration,
    mut outbox: mpsc::UnboundedReceiver<WireMessage>,
    cipher: Arc<RoomCipher>,
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
        if !write_sealed(&mut write_half, &cipher, &msg).await {
            return;
        }
    }
}

/// How a guest's connection to the host ended.
pub(crate) enum GuestEnd {
    Left(LeaveReason),
    Handoff {
        new_host_id: String,
        room: Box<RoomStateWire>,
        banned: Vec<BannedMember>,
        approved: Vec<String>,
    },
}

/// Guest side, both transports: what a host message means for us. `None`
/// to keep listening, `Some` when the connection is over.
pub(crate) fn apply_host_message(
    manager: &SyncRoomManager,
    sink: &Arc<dyn SyncEventSink>,
    my_id: &str,
    generation: u64,
    msg: WireMessage,
) -> Option<Option<GuestEnd>> {
    match msg {
        // The host dropped us (e.g. evicted after a network blip): its
        // broadcasts may keep arriving, but we're no longer a member.
        WireMessage::State { room } if !room.has_member(my_id) => Some(Some(GuestEnd::Left(LeaveReason::Lost))),
        WireMessage::State { room } => match manager.apply_remote_room_update(room, my_id, generation) {
            Some(local) => {
                sink.room_updated(&local);
                None
            }
            None => Some(None), // a newer session owns the state now
        },
        WireMessage::Playback { state } => {
            if !manager.apply_remote_playback(state.clone(), generation) {
                return Some(None);
            }
            sink.playback_updated(&state);
            None
        }
        WireMessage::ReactionShown { from, emoji } => {
            sink.reaction(&ReactionPayload { from, emoji });
            None
        }
        WireMessage::Kicked { user_id } if user_id == my_id => Some(Some(GuestEnd::Left(LeaveReason::Kicked))),
        WireMessage::Leave { user_id } if user_id == HOST_CLOSED_USER_ID => {
            Some(Some(GuestEnd::Left(LeaveReason::Closed)))
        }
        WireMessage::HostHandoff { new_host_id, room, banned, approved } => {
            Some(Some(GuestEnd::Handoff { new_host_id, room: Box::new(room), banned, approved }))
        }
        _ => None,
    }
}

async fn guest_reader_loop(
    mut reader: BufReader<OwnedReadHalf>,
    manager: Arc<SyncRoomManager>,
    sink: Arc<dyn SyncEventSink>,
    my_id: String,
    generation: u64,
    cipher: Arc<RoomCipher>,
) {
    let silence_limit = manager.liveness.timeout;
    let mut line = String::new();
    let end = loop {
        line.clear();
        // The host pings every heartbeat interval, so a read that waits past
        // the liveness timeout means the host is gone even though TCP never
        // saw a FIN (host machine asleep, network dropped, process frozen).
        match tokio::time::timeout(silence_limit, read_line_capped(&mut reader, &mut line)).await {
            Err(_) => {
                log::info!("Listen Together: host silent for {silence_limit:?}");
                break GuestEnd::Left(LeaveReason::Lost);
            }
            // The host ending the room says so first (`Leave`); a bare EOF
            // is a crash or a lost network.
            Ok(Ok(0)) | Ok(Err(_)) => break GuestEnd::Left(LeaveReason::Lost),
            Ok(Ok(_)) => {
                let Some(msg) = cipher.open_line(&line) else {
                    continue;
                };
                match apply_host_message(&manager, &sink, &my_id, generation, msg) {
                    None => {}
                    Some(None) => return,
                    Some(Some(end)) => break end,
                }
            }
        }
    };
    guest_ended(&manager, sink, generation, end);
}

/// Guest side, both transports: the connection to the host is over. Kicked
/// or closed: we're out. Handed to us: we host the room now. Handed to
/// someone else, or the host vanished: get back in (the vanished host's
/// successor takes over if nobody answers).
pub(crate) fn guest_ended(manager: &Arc<SyncRoomManager>, sink: Arc<dyn SyncEventSink>, generation: u64, end: GuestEnd) {
    let Some(last_room) = manager.end_guest_session(generation) else {
        return;
    };
    let me = last_room.current_user_id.clone();
    match end {
        GuestEnd::Left(reason @ (LeaveReason::Kicked | LeaveReason::Closed | LeaveReason::Left)) => {
            *manager.state.lock() = None;
            sink.room_left(reason);
        }
        GuestEnd::Handoff { new_host_id, room, banned, approved } if new_host_id == me => {
            let m = manager.clone();
            tauri::async_runtime::spawn(async move {
                let epoch = m.leave_epoch.load(Ordering::SeqCst);
                if let Err(e) = resume_room(&m, sink.clone(), *room, banned, approved, &me).await {
                    log::warn!("Listen Together: couldn't take over as host: {e}");
                    m.give_up(&sink, epoch, LeaveReason::Lost);
                }
            });
        }
        GuestEnd::Handoff { .. } => {
            tauri::async_runtime::spawn(reconnect(manager.clone(), sink, last_room, false));
        }
        GuestEnd::Left(LeaveReason::Lost) => {
            let take_over = pick_successor(&last_room.members).as_deref() == Some(me.as_str());
            tauri::async_runtime::spawn(reconnect(manager.clone(), sink, last_room, take_over));
        }
    }
}

/// Gets back into `last_room` under whoever hosts it now. With `take_over`
/// (we're the lost host's successor), starts hosting it ourselves once the
/// room can't be found, but only after the internet itself was reachable: a
/// guest whose own network dropped must not start a second copy of a room
/// that's still running.
async fn reconnect(manager: Arc<SyncRoomManager>, sink: Arc<dyn SyncEventSink>, last_room: RoomState, take_over: bool) {
    let epoch = manager.leave_epoch.load(Ordering::SeqCst);
    let code = last_room.room_code.clone();
    let nickname = last_room
        .member(&last_room.current_user_id)
        .map(|m| m.nickname.clone())
        .unwrap_or_else(|| "?".to_string());
    let shown = {
        let mut guard = manager.state.lock();
        guard.as_mut().map(|r| {
            r.reconnecting = true;
            r.clone()
        })
    };
    if let Some(room) = shown {
        sink.room_updated(&room);
    }

    tokio::time::sleep(RECONNECT_FIRST_DELAY).await;
    let deadline = Instant::now() + manager.liveness.reconnect_for;
    loop {
        if manager.leave_epoch.load(Ordering::SeqCst) != epoch {
            return;
        }
        match join_inner(&manager, sink.clone(), &code, &nickname).await {
            Ok(_) => {
                if manager.leave_epoch.load(Ordering::SeqCst) != epoch {
                    leave_room(&manager);
                }
                return;
            }
            Err(e) if e == ERR_BANNED => return manager.give_up(&sink, epoch, LeaveReason::Kicked),
            Err(e) if e == ERR_NOT_FOUND && take_over => {
                log::info!("Listen Together: host gone, taking over the room");
                let snapshot = RoomStateWire::from(&last_room);
                let approved = last_room.members.iter().map(|m| m.client_hash.clone()).collect();
                if manager.leave_epoch.load(Ordering::SeqCst) != epoch {
                    return;
                }
                if resume_room(&manager, sink.clone(), snapshot, Vec::new(), approved, &last_room.current_user_id)
                    .await
                    .is_err()
                {
                    manager.give_up(&sink, epoch, LeaveReason::Lost);
                }
                return;
            }
            Err(e) => log::info!("Listen Together: reconnect attempt failed: {e}"),
        }
        if Instant::now() >= deadline {
            return manager.give_up(&sink, epoch, LeaveReason::Lost);
        }
        tokio::time::sleep(RECONNECT_RETRY).await;
    }
}

/// Starts hosting a room handed to us: same code, queue and settings, the
/// old host's bans and approvals; everyone else reconnects and gets their
/// role back by `client_hash`.
async fn resume_room(
    manager: &Arc<SyncRoomManager>,
    sink: Arc<dyn SyncEventSink>,
    snapshot: RoomStateWire,
    banned: Vec<BannedMember>,
    approved: Vec<String>,
    my_id: &str,
) -> Result<RoomState, String> {
    let me = snapshot.members.iter().find(|m| m.id == my_id).ok_or(ERR_HOST_GONE)?;
    let mut book = HostBook::default();
    for m in snapshot.members.iter().filter(|m| m.id != my_id && !m.client_hash.is_empty()) {
        if !m.is_host {
            book.known_roles.insert(m.client_hash.clone(), m.role);
        }
        book.approved.insert(m.client_hash.clone());
    }
    book.approved.extend(approved);
    book.next_queue_id = features::next_queue_id(&snapshot.queue);
    let room = RoomState {
        room_code: snapshot.room_code.clone(),
        is_host: true,
        current_user_id: my_id.to_string(),
        members: vec![RoomMember {
            id: my_id.to_string(),
            nickname: me.nickname.clone(),
            is_host: true,
            joined_at_ms: me.joined_at_ms,
            role: MemberRole::Host,
            client_hash: client_hash(manager.client_id()),
        }],
        playback_state: snapshot.playback_state,
        default_role: snapshot.default_role,
        require_approval: snapshot.require_approval,
        queue: snapshot.queue,
        skip_votes: Vec::new(),
        banned,
        pending: Vec::new(),
        reconnecting: false,
    };
    start_hosting(manager, sink, room, book).await
}

async fn discover_host(topic_id: &str) -> Result<SocketAddr, String> {
    discover_host_on_port(DISCOVERY_UDP_PORT, topic_id, DISCOVERY_TIMEOUT).await
}

async fn discover_host_on_port(
    discovery_port: u16,
    topic_id: &str,
    timeout_budget: Duration,
) -> Result<SocketAddr, String> {
    let sock = UdpSocket::bind(("0.0.0.0", discovery_port)).await.map_err(|_| {
        format!("Couldn't listen for the host on port {discovery_port}: another YTMD may be searching already.")
    })?;
    let deadline = Instant::now() + timeout_budget;
    let mut buf = [0u8; 512];
    loop {
        let remaining = deadline.saturating_duration_since(Instant::now());
        let Ok(Ok((n, src))) = tokio::time::timeout(remaining, sock.recv_from(&mut buf)).await else {
            return Err("Room not found on this network.".to_string());
        };
        if let Ok(beacon) = serde_json::from_slice::<Beacon>(&buf[..n]) {
            if beacon.topic_id == topic_id {
                return Ok(SocketAddr::new(src.ip(), beacon.tcp_port));
            }
        }
    }
}

// ---------------------------------------------------------------------
// Local actions (commands): act as the host, or ask the host as a guest
// ---------------------------------------------------------------------

/// Runs `as_host` with our member id when we host, or sends `as_guest`'s
/// message to the host when we're a guest.
fn act_or_ask(
    manager: &Arc<SyncRoomManager>,
    as_host: impl FnOnce(&str) -> Result<(), String>,
    as_guest: impl FnOnce(String) -> WireMessage,
) -> Result<(), String> {
    let (is_host, my_id) = {
        let guard = manager.state.lock();
        let room = guard.as_ref().filter(|r| !r.reconnecting).ok_or(ERR_NOT_IN_ROOM)?;
        (room.is_host, room.current_user_id.clone())
    };
    if is_host {
        return as_host(&my_id);
    }
    let guard = manager.guest.lock();
    let guest = guard.as_ref().ok_or(ERR_NOT_IN_ROOM)?;
    guest
        .outbox
        .send(as_guest(guest.user_id.clone()))
        .map_err(|_| ERR_HOST_GONE.to_string())
}

/// Guest side: asks the host to carry out `action` for the whole room.
pub fn send_control(manager: &Arc<SyncRoomManager>, action: SyncControl) -> Result<(), String> {
    if !action.is_valid() {
        return Err("Invalid playback request.".to_string());
    }
    let guard = manager.guest.lock();
    let guest = guard.as_ref().ok_or(ERR_NOT_IN_ROOM)?;
    guest
        .outbox
        .send(WireMessage::Control { user_id: guest.user_id.clone(), action })
        .map_err(|_| ERR_HOST_GONE.to_string())
}

/// Removes `member_id` from the room and bans it: directly when hosting,
/// through the host when we're a moderator guest.
pub fn kick_member(manager: &Arc<SyncRoomManager>, sink: &Arc<dyn SyncEventSink>, member_id: &str) -> Result<(), String> {
    {
        // The host re-checks; this only spares a pointless round trip.
        let guard = manager.state.lock();
        let room = guard.as_ref().ok_or(ERR_NOT_IN_ROOM)?;
        let target = room.member(member_id).ok_or(ERR_NO_SUCH_MEMBER)?;
        if !room.my_role().is_some_and(|r| r.can_kick(target.role)) {
            return Err(ERR_NOT_ALLOWED.into());
        }
    }
    act_or_ask(
        manager,
        |me| manager.kick(me, member_id, sink),
        |user_id| WireMessage::Moderate { user_id, action: Moderation::Kick { member_id: member_id.to_string() } },
    )
}

pub fn vote_skip(manager: &Arc<SyncRoomManager>, sink: &Arc<dyn SyncEventSink>) -> Result<(), String> {
    act_or_ask(manager, |me| manager.vote_skip(me, sink), |user_id| WireMessage::VoteSkip { user_id })
}

pub fn send_reaction(manager: &Arc<SyncRoomManager>, sink: &Arc<dyn SyncEventSink>, emoji: &str) -> Result<(), String> {
    if !REACTIONS.contains(&emoji) {
        return Err(ERR_NOT_ALLOWED.into());
    }
    act_or_ask(
        manager,
        |me| manager.react(me, emoji, sink),
        |user_id| WireMessage::Reaction { user_id, emoji: emoji.to_string() },
    )
}

pub fn queue_add(
    manager: &Arc<SyncRoomManager>,
    sink: &Arc<dyn SyncEventSink>,
    video_id: &str,
    title: &str,
    artist: &str,
    next: bool,
) -> Result<(), String> {
    act_or_ask(
        manager,
        |me| manager.queue_add(me, video_id, title, artist, next, sink),
        |user_id| WireMessage::QueueAdd {
            user_id,
            video_id: video_id.to_string(),
            title: title.to_string(),
            artist: artist.to_string(),
            next,
        },
    )
}

pub fn queue_remove(manager: &Arc<SyncRoomManager>, sink: &Arc<dyn SyncEventSink>, item_id: &str) -> Result<(), String> {
    act_or_ask(
        manager,
        |me| manager.queue_remove(me, item_id, sink),
        |user_id| WireMessage::QueueRemove { user_id, item_id: item_id.to_string() },
    )
}

pub fn queue_play(manager: &Arc<SyncRoomManager>, sink: &Arc<dyn SyncEventSink>, item_id: &str) -> Result<(), String> {
    act_or_ask(
        manager,
        |me| manager.queue_play(me, item_id, sink),
        |user_id| WireMessage::QueuePlay { user_id, item_id: item_id.to_string() },
    )
}

pub fn queue_move(
    manager: &Arc<SyncRoomManager>,
    sink: &Arc<dyn SyncEventSink>,
    item_id: &str,
    to_index: usize,
) -> Result<(), String> {
    act_or_ask(
        manager,
        |me| manager.queue_move(me, item_id, to_index, sink),
        |user_id| WireMessage::QueueMove { user_id, item_id: item_id.to_string(), to_index },
    )
}

/// Host side: the host's page asks for the next queued song as the current
/// one ends. `None` when the queue is empty (YTM's own autoplay continues).
pub fn queue_take_next(manager: &Arc<SyncRoomManager>, sink: &Arc<dyn SyncEventSink>) -> Option<QueueItem> {
    manager.queue_take_next(sink)
}

/// Host: gives the room to `member_id` and rejoins it as a guest.
pub fn transfer_host(manager: &Arc<SyncRoomManager>, sink: Arc<dyn SyncEventSink>, member_id: &str) -> Result<(), String> {
    let handoff = manager.handoff_message(Some(member_id))?;
    let last_room = manager.get_room_state().ok_or(ERR_NOT_IN_ROOM)?;
    manager.broadcast_to_peers(&handoff);
    stop_hosting(manager);
    // We're a guest of our old room now; the new host needs a moment to
    // start, which `reconnect` waits for.
    let mut as_guest = last_room;
    as_guest.is_host = false;
    as_guest.banned.clear();
    as_guest.pending.clear();
    *manager.state.lock() = Some(as_guest.clone());
    manager.begin_session();
    tauri::async_runtime::spawn(reconnect(manager.clone(), sink, as_guest, false));
    Ok(())
}

// ---------------------------------------------------------------------
// Leaving
// ---------------------------------------------------------------------

/// Leaves the room. A host with guests hands the room to the best-placed
/// member instead of ending it for everyone (see `end_room` for that).
pub fn leave_room(manager: &Arc<SyncRoomManager>) {
    manager.leave_epoch.fetch_add(1, Ordering::SeqCst);
    if manager.host.lock().is_some() {
        match manager.handoff_message(None) {
            Ok(handoff) => manager.broadcast_to_peers(&handoff),
            Err(_) => manager.broadcast_to_peers(&WireMessage::Leave { user_id: HOST_CLOSED_USER_ID.to_string() }),
        }
    }
    shut_down(manager);
}

/// Host: ends the room for everyone.
pub fn end_room(manager: &Arc<SyncRoomManager>) {
    manager.leave_epoch.fetch_add(1, Ordering::SeqCst);
    manager.broadcast_to_peers(&WireMessage::Leave { user_id: HOST_CLOSED_USER_ID.to_string() });
    shut_down(manager);
}

fn shut_down(manager: &Arc<SyncRoomManager>) {
    // Retire the session first so any background loop still mid-message
    // stops touching shared state from here on.
    manager.begin_session();
    stop_hosting(manager);
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
    use std::sync::atomic::AtomicUsize;

    #[derive(Default)]
    struct RecordingSink {
        room_updates: Mutex<Vec<RoomState>>,
        playback_updates: Mutex<Vec<SyncPlaybackState>>,
        controls: Mutex<Vec<SyncControlRequest>>,
        reactions: Mutex<Vec<ReactionPayload>>,
        left: Mutex<Vec<LeaveReason>>,
        pending: AtomicUsize,
    }
    impl SyncEventSink for RecordingSink {
        fn room_updated(&self, room: &RoomState) {
            self.room_updates.lock().push(room.clone());
        }
        fn playback_updated(&self, state: &SyncPlaybackState) {
            self.playback_updates.lock().push(state.clone());
        }
        fn room_left(&self, reason: LeaveReason) {
            self.left.lock().push(reason);
        }
        fn control_requested(&self, request: &SyncControlRequest) {
            self.controls.lock().push(request.clone());
        }
        fn reaction(&self, reaction: &ReactionPayload) {
            self.reactions.lock().push(reaction.clone());
        }
        fn join_pending(&self) {
            self.pending.fetch_add(1, Ordering::SeqCst);
        }
    }

    fn recording() -> (Arc<RecordingSink>, Arc<dyn SyncEventSink>) {
        let sink = Arc::new(RecordingSink::default());
        let dyn_sink: Arc<dyn SyncEventSink> = sink.clone();
        (sink, dyn_sink)
    }

    fn noop_sink() -> Arc<dyn SyncEventSink> {
        Arc::new(RecordingSink::default())
    }

    /// LAN only: loopback tests must not depend on public MQTT brokers.
    fn local_manager() -> Arc<SyncRoomManager> {
        Arc::new(SyncRoomManager::with_options(LivenessConfig::default(), false))
    }

    fn local_install(install: &str) -> Arc<SyncRoomManager> {
        Arc::new(SyncRoomManager::with_options(LivenessConfig::default(), false).with_client_id(install.into()))
    }

    /// Millisecond-scale liveness so eviction/silence tests finish fast.
    const FAST_LIVENESS: LivenessConfig = LivenessConfig {
        heartbeat_interval: Duration::from_millis(50),
        timeout: Duration::from_millis(250),
        reconnect_for: Duration::from_millis(500),
    };

    fn fast_manager() -> Arc<SyncRoomManager> {
        Arc::new(SyncRoomManager::with_options(FAST_LIVENESS, false))
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

    fn join_req(user_id: &str, client_id: &str) -> JoinRequest {
        JoinRequest {
            user_id: user_id.to_string(),
            nickname: user_id.to_string(),
            client_id: client_id.to_string(),
            protocol: PROTOCOL_VERSION,
        }
    }

    fn admit(manager: &SyncRoomManager, user_id: &str, client_id: &str) -> Admission {
        match manager.admit_member(join_req(user_id, client_id)) {
            Ok(JoinDecision::Admitted(a)) => *a,
            Ok(JoinDecision::Pending { .. }) => panic!("{user_id} unexpectedly waits for approval"),
            Err(e) => panic!("{user_id} rejected: {e:?}"),
        }
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
                    role: if *is_host { MemberRole::Host } else { MemberRole::Dj },
                    client_hash: client_hash(&format!("install-of-{id}")),
                })
                .collect(),
            playback_state: None,
            default_role: MemberRole::Dj,
            require_approval: false,
            queue: Vec::new(),
            skip_votes: Vec::new(),
            banned: Vec::new(),
            pending: Vec::new(),
            reconnecting: false,
        }
    }

    fn hosting(members: &[(&str, bool)]) -> Arc<SyncRoomManager> {
        let manager = local_manager();
        manager.set_local_room(room_with(members));
        manager
    }

    fn playing(video_id: &str) -> SyncPlaybackState {
        SyncPlaybackState {
            video_id: video_id.to_string(),
            title: "T".to_string(),
            artist: "A".to_string(),
            current_time_secs: 1.0,
            is_playing: true,
            timestamp_ms: now_ms(),
        }
    }

    /// Joins `host`'s room over loopback TCP with the room's real key.
    async fn lan_join(
        guest: &Arc<SyncRoomManager>,
        sink: Arc<dyn SyncEventSink>,
        host: &Arc<SyncRoomManager>,
        nickname: &str,
    ) -> Result<RoomState, String> {
        let code = host.get_room_state().expect("host has a room").room_code;
        let addr = SocketAddr::new(Ipv4Addr::LOCALHOST.into(), host.host_port().expect("host listens"));
        connect_to_host(guest, sink, addr, nickname.to_string(), Arc::new(RoomCipher::new(&code))).await
    }

    // --- Basics ---------------------------------------------------------

    #[test]
    fn test_generate_room_code_format() {
        let code = generate_room_code();
        assert!(code.starts_with("YTMD-"));
        assert_eq!(code.len(), 15);
        assert!(code[5..].chars().all(|c| c.is_ascii_uppercase() || c.is_ascii_digit()));
        assert_ne!(generate_room_code(), code);
    }

    #[test]
    fn test_wire_message_roundtrip() {
        let msg = WireMessage::Join {
            user_id: "user-1".to_string(),
            nickname: "Kacper".to_string(),
            client_id: "install-1".to_string(),
            protocol: PROTOCOL_VERSION,
        };
        let json = serde_json::to_string(&msg).unwrap();
        match serde_json::from_str(&json).unwrap() {
            WireMessage::Join { user_id, nickname, client_id, .. } => {
                assert_eq!((user_id.as_str(), nickname.as_str(), client_id.as_str()), ("user-1", "Kacper", "install-1"));
            }
            _ => panic!("wrong variant"),
        }
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
    }

    #[test]
    fn test_wire_state_roundtrip_keeps_shared_fields_and_drops_local_ones() {
        let mut room = room_with(&[("host", true)]);
        room.playback_state = Some(playing("abcdefghijk"));
        room.default_role = MemberRole::Listener;
        room.require_approval = true;
        room.queue.push(QueueItem {
            id: "q0".into(),
            video_id: "dQw4w9WgXcQ".into(),
            title: "Song".into(),
            artist: "Artist".into(),
            added_by: "host".into(),
            added_by_id: "host".into(),
        });
        room.banned.push(BannedMember { client_hash: "secret-ban".into(), nickname: "B".into() });
        room.pending.push(PendingMember { user_id: "secret-pending".into(), nickname: "P".into() });
        let json = serde_json::to_string(&WireMessage::State { room: RoomStateWire::from(&room) }).unwrap();
        assert!(!json.contains("secret-ban") && !json.contains("secret-pending"), "host-only lists stay home");
        let WireMessage::State { room: wire } = serde_json::from_str(&json).unwrap() else {
            panic!("wrong variant");
        };
        let local = wire.into_local_view(false, "guest".to_string());
        assert_eq!(local.current_user_id, "guest");
        assert_eq!(local.playback_state.unwrap().video_id, "abcdefghijk");
        assert_eq!(local.default_role, MemberRole::Listener);
        assert!(local.require_approval);
        assert_eq!(local.queue.len(), 1);
        assert!(local.banned.is_empty() && local.pending.is_empty());
    }

    #[test]
    fn test_client_id_persists_across_runs() {
        let dir = std::env::temp_dir().join(format!("ytmd-client-id-{}", rand::random::<u32>()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("sync_client_id");
        let first = load_or_create_client_id(&path);
        assert_eq!(first.len(), 32);
        assert_eq!(load_or_create_client_id(&path), first);
        std::fs::write(&path, "garbage!").unwrap();
        assert_ne!(load_or_create_client_id(&path), "garbage!", "an invalid file is replaced");
        let _ = std::fs::remove_dir_all(dir);
    }

    #[test]
    fn test_nicknames_are_trimmed_and_capped() {
        assert_eq!(clean_nickname("  Ola \n"), "Ola");
        assert_eq!(clean_nickname(&"x".repeat(100)).chars().count(), MAX_NICKNAME_CHARS);
        assert_eq!(clean_nickname("   "), "?");
    }

    #[tokio::test]
    async fn test_read_line_capped_bounds_memory_on_unterminated_line() {
        let (mut writer, reader) = tokio::io::duplex(1024 * 1024);
        let mut buf_reader = BufReader::new(reader);
        let write_task = tokio::spawn(async move {
            let chunk = vec![b'a'; 8192];
            for _ in 0..16 {
                let _ = writer.write_all(&chunk).await;
            }
            tokio::time::sleep(Duration::from_millis(200)).await;
        });
        let mut line = String::new();
        let result = tokio::time::timeout(Duration::from_secs(2), read_line_capped(&mut buf_reader, &mut line)).await;
        let n = result.expect("must not block forever").expect("capped read should succeed");
        assert!(n as u64 <= MAX_LINE_LEN);
        assert!(!line.ends_with('\n'));
        write_task.abort();
    }

    // --- Membership, roles, bans ---------------------------------------

    #[test]
    fn test_admit_member_enforces_capacity() {
        let manager = hosting(&[("host", true)]);
        for i in 0..(MAX_MEMBERS - 1) {
            admit(&manager, &format!("guest-{i}"), &format!("install-{i}"));
        }
        let result = manager.admit_member(join_req("one-too-many", "install-x"));
        assert!(matches!(result, Err(RejectReason::Full)));
    }

    #[test]
    fn test_remove_member_updates_state_once() {
        let manager = hosting(&[("host", true), ("guest-1", false)]);
        let updated = manager.remove_member("guest-1").unwrap();
        assert_eq!(updated.members.len(), 1);
        assert!(manager.remove_member("guest-1").is_none());
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
    fn test_role_permissions() {
        use MemberRole::*;
        assert!(Host.can_kick(Moderator) && Host.can_kick(Dj) && Host.can_kick(Listener));
        assert!(Moderator.can_kick(Dj) && Moderator.can_kick(Listener));
        assert!(!Moderator.can_kick(Moderator) && !Moderator.can_kick(Host));
        assert!(!Dj.can_kick(Listener) && !Listener.can_kick(Listener));
        assert!(Host.can_control() && Moderator.can_control() && Dj.can_control());
        assert!(!Listener.can_control());
        // A member from a host that predates roles defaults to the old behavior.
        let m: RoomMember = serde_json::from_str(r#"{"id":"a","nickname":"n","is_host":false,"joined_at_ms":0}"#).unwrap();
        assert_eq!(m.role, Dj);
    }

    /// The user-reported bug: a kicked guest could simply join again.
    #[test]
    fn test_kicked_install_cannot_rejoin_under_a_new_member_id() {
        let manager = hosting(&[("host", true)]);
        admit(&manager, "guest-a", "install-1");
        manager.kick("host", "guest-a", &noop_sink()).unwrap();
        let room = manager.get_room_state().unwrap();
        assert_eq!(room.members.len(), 1);
        assert_eq!(room.banned, vec![BannedMember { client_hash: client_hash("install-1"), nickname: "guest-a".into() }]);

        assert!(matches!(manager.admit_member(join_req("guest-b", "install-1")), Err(RejectReason::Banned)));
        admit(&manager, "guest-c", "install-2");

        manager.unban(&client_hash("install-1"), &noop_sink()).unwrap();
        admit(&manager, "guest-d", "install-1");
    }

    #[test]
    fn test_guests_without_client_id_are_turned_away_as_outdated() {
        let manager = hosting(&[("host", true)]);
        let mut old = join_req("old", "");
        old.protocol = 0;
        assert!(matches!(manager.admit_member(old), Err(RejectReason::Outdated)));
    }

    /// A guest whose app crashed and rejoined before eviction replaces its
    /// ghost instead of showing up twice.
    #[test]
    fn test_rejoin_from_same_install_replaces_old_entry() {
        let manager = hosting(&[("host", true)]);
        admit(&manager, "first", "install-1");
        let admission = admit(&manager, "second", "install-1");
        assert_eq!(admission.replaced.as_deref(), Some("first"));
        let ids: Vec<_> = admission.room.members.iter().map(|m| m.id.as_str()).collect();
        assert_eq!(ids, vec!["host", "second"]);
    }

    #[test]
    fn test_moderators_kick_below_them_only_and_roles_are_host_only() {
        let manager = hosting(&[("host", true)]);
        for (id, install) in [("mod", "i-mod"), ("mod2", "i-mod2"), ("dj", "i-dj")] {
            admit(&manager, id, install);
        }
        let sink = noop_sink();
        manager.set_member_role("mod", MemberRole::Moderator, &sink).unwrap();
        manager.set_member_role("mod2", MemberRole::Moderator, &sink).unwrap();
        assert!(manager.set_member_role("host", MemberRole::Listener, &sink).is_err());
        assert!(manager.set_member_role("dj", MemberRole::Host, &sink).is_err());

        assert!(manager.kick("dj", "mod", &sink).is_err(), "a DJ can't kick");
        assert!(manager.kick("mod", "mod2", &sink).is_err(), "a moderator can't kick a moderator");
        assert!(manager.kick("mod", "host", &sink).is_err());
        manager.kick("mod", "dj", &sink).unwrap();
        assert!(!manager.has_member("dj"));
    }

    /// Reconnecting (new member id, same install) gives a member their role
    /// back instead of the default.
    #[test]
    fn test_roles_survive_a_rejoin() {
        let manager = hosting(&[("host", true)]);
        admit(&manager, "a", "install-1");
        manager.set_member_role("a", MemberRole::Moderator, &noop_sink()).unwrap();
        manager.remove_member("a");
        let room = admit(&manager, "a-again", "install-1").room;
        assert_eq!(room.member("a-again").unwrap().role, MemberRole::Moderator);
    }

    #[test]
    fn test_new_members_get_the_default_role_and_listeners_cannot_control() {
        let manager = hosting(&[("host", true)]);
        let (sink, dyn_sink) = recording();
        manager.set_default_role(MemberRole::Listener, &dyn_sink).unwrap();
        let room = admit(&manager, "quiet", "install-1").room;
        assert_eq!(room.member("quiet").unwrap().role, MemberRole::Listener);

        manager.handle_guest_control("quiet", SyncControl::Next, &dyn_sink);
        assert!(sink.controls.lock().is_empty(), "a listener's skip must not reach the host page");

        manager.set_member_role("quiet", MemberRole::Dj, &dyn_sink).unwrap();
        manager.handle_guest_control("quiet", SyncControl::Next, &dyn_sink);
        assert_eq!(sink.controls.lock().len(), 1);
    }

    #[test]
    fn test_host_ignores_control_from_non_members_and_bad_ids() {
        let manager = hosting(&[("host", true), ("g1", false)]);
        let (sink, dyn_sink) = recording();
        manager.handle_guest_control("stranger", SyncControl::Next, &dyn_sink);
        manager.handle_guest_control("g1", SyncControl::PlayVideo { video_id: "../../etc".into() }, &dyn_sink);
        assert!(sink.controls.lock().is_empty());
        manager.handle_guest_control("g1", SyncControl::Previous, &dyn_sink);
        assert_eq!(sink.controls.lock()[0].source, ControlSource::Member);
    }

    // --- Join approval ---------------------------------------------------

    #[test]
    fn test_approval_holds_new_installs_until_the_host_decides() {
        let manager = hosting(&[("host", true)]);
        let (_sink, dyn_sink) = recording();
        manager.set_require_approval(true, &dyn_sink).unwrap();

        assert!(matches!(manager.admit_member(join_req("knock", "install-1")), Ok(JoinDecision::Pending { new: true })));
        assert!(matches!(manager.admit_member(join_req("knock", "install-1")), Ok(JoinDecision::Pending { new: false })));
        let room = manager.get_room_state().unwrap();
        assert_eq!(room.pending, vec![PendingMember { user_id: "knock".into(), nickname: "knock".into() }]);
        assert_eq!(room.members.len(), 1);

        manager.decide_pending("knock", true, &dyn_sink).unwrap();
        let room = manager.get_room_state().unwrap();
        assert!(room.pending.is_empty());
        assert!(room.member("knock").is_some());

        // Approved once: coming back (new member id) skips the wait.
        manager.remove_member("knock");
        admit(&manager, "knock-again", "install-1");

        assert!(matches!(manager.admit_member(join_req("nope", "install-2")), Ok(JoinDecision::Pending { .. })));
        manager.decide_pending("nope", false, &dyn_sink).unwrap();
        assert!(!manager.has_member("nope"));
        assert!(manager.decide_pending("nope", true, &dyn_sink).is_err(), "already decided");
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn test_lan_guest_waits_for_approval() {
        let host = local_manager();
        let (_host_sink, host_dyn) = recording();
        create_room(&host, host_dyn.clone(), "Host".into()).await.unwrap();
        host.set_require_approval(true, &host_dyn).unwrap();

        let guest = local_install("install-wait");
        let (guest_sink, guest_dyn) = recording();
        let join = {
            let (guest, host) = (guest.clone(), host.clone());
            tokio::spawn(async move { lan_join(&guest, guest_dyn, &host, "Knock").await })
        };
        assert!(wait_until(|| host.get_room_state().is_some_and(|r| r.pending.len() == 1), Duration::from_secs(2)).await);
        assert!(wait_until(|| guest_sink.pending.load(Ordering::SeqCst) == 1, Duration::from_secs(2)).await);
        let user_id = host.get_room_state().unwrap().pending[0].user_id.clone();
        host.decide_pending(&user_id, true, &host_dyn).unwrap();
        let room = join.await.unwrap().expect("approved guest gets in");
        assert_eq!(room.members.len(), 2);

        let denied = local_install("install-denied");
        let join = {
            let host = host.clone();
            tokio::spawn(async move { lan_join(&denied, noop_sink(), &host, "No").await })
        };
        assert!(wait_until(|| host.get_room_state().is_some_and(|r| r.pending.len() == 1), Duration::from_secs(2)).await);
        let user_id = host.get_room_state().unwrap().pending[0].user_id.clone();
        host.decide_pending(&user_id, false, &host_dyn).unwrap();
        assert_eq!(join.await.unwrap().err().as_deref(), Some("sync.error.denied"));

        leave_room(&guest);
        end_room(&host);
    }

    // --- Vote skip, reactions --------------------------------------------

    #[test]
    fn test_majority_vote_skips_and_a_new_song_resets_votes() {
        let manager = hosting(&[("host", true), ("a", false), ("b", false)]);
        let (sink, dyn_sink) = recording();
        broadcast_playback(&manager, &dyn_sink, playing("aaaaaaaaaaa"));

        manager.vote_skip("a", &dyn_sink).unwrap();
        manager.vote_skip("a", &dyn_sink).unwrap(); // counted once
        assert_eq!(manager.get_room_state().unwrap().skip_votes, vec!["a".to_string()]);
        assert!(sink.controls.lock().is_empty(), "1 of 3 is not a majority");

        broadcast_playback(&manager, &dyn_sink, playing("bbbbbbbbbbb"));
        assert!(manager.get_room_state().unwrap().skip_votes.is_empty(), "votes were for the old song");

        manager.vote_skip("a", &dyn_sink).unwrap();
        manager.vote_skip("b", &dyn_sink).unwrap();
        let controls = sink.controls.lock().clone();
        assert_eq!(controls.len(), 1);
        assert_eq!(controls[0].action, SyncControl::Next);
        assert_eq!(controls[0].source, ControlSource::Vote);
        assert!(manager.get_room_state().unwrap().skip_votes.is_empty());
        assert!(manager.vote_skip("stranger", &dyn_sink).is_err());
    }

    #[test]
    fn test_votes_needed_is_a_strict_majority() {
        assert_eq!(features::votes_needed(1), 1);
        assert_eq!(features::votes_needed(2), 2);
        assert_eq!(features::votes_needed(3), 2);
        assert_eq!(features::votes_needed(4), 3);
    }

    #[test]
    fn test_reactions_are_a_fixed_set_and_rate_limited() {
        let manager = hosting(&[("host", true), ("a", false)]);
        let (sink, dyn_sink) = recording();
        assert!(manager.react("a", "<script>", &dyn_sink).is_err());
        manager.react("a", "🔥", &dyn_sink).unwrap();
        assert!(manager.react("a", "👏", &dyn_sink).is_err(), "too soon after the last one");
        manager.react("host", "👏", &dyn_sink).unwrap();
        let got: Vec<_> = sink.reactions.lock().iter().map(|r| (r.from.clone(), r.emoji.clone())).collect();
        assert_eq!(got, vec![("a".into(), "🔥".into()), ("host".into(), "👏".into())]);
    }

    // --- Shared queue ----------------------------------------------------

    #[test]
    fn test_shared_queue_permissions_and_order() {
        let manager = hosting(&[("host", true), ("dj", false), ("dj2", false), ("mod", false), ("quiet", false)]);
        let (sink, dyn_sink) = recording();
        manager.set_member_role("mod", MemberRole::Moderator, &dyn_sink).unwrap();
        manager.set_member_role("quiet", MemberRole::Listener, &dyn_sink).unwrap();

        manager.queue_add("dj", "aaaaaaaaaaa", "  First ", "Artist", false, &dyn_sink).unwrap();
        manager.queue_add("dj2", "bbbbbbbbbbb", "", "", false, &dyn_sink).unwrap();
        manager.queue_add("dj", "ccccccccccc", "Third", "", false, &dyn_sink).unwrap();
        assert!(manager.queue_add("quiet", "ddddddddddd", "x", "", false, &dyn_sink).is_err(), "listeners only listen");
        assert!(manager.queue_add("dj", "javascript:", "x", "", false, &dyn_sink).is_err());

        let queue = manager.get_room_state().unwrap().queue;
        assert_eq!(queue.iter().map(|i| i.title.as_str()).collect::<Vec<_>>(), vec!["First", "bbbbbbbbbbb", "Third"]);
        assert_eq!(queue[0].added_by, "dj");

        assert!(manager.queue_remove("dj2", &queue[0].id, &dyn_sink).is_err(), "not theirs");
        manager.queue_remove("mod", &queue[1].id, &dyn_sink).unwrap();

        manager.queue_play("dj2", &queue[2].id, &dyn_sink).unwrap();
        let played = sink.controls.lock()[0].clone();
        assert_eq!(played.action, SyncControl::PlayVideo { video_id: "ccccccccccc".into() });
        assert_eq!(played.source, ControlSource::Queue { title: "Third".into() });
        assert_eq!(played.from, "dj");

        assert_eq!(manager.queue_take_next(&dyn_sink).map(|i| i.video_id).as_deref(), Some("aaaaaaaaaaa"));
        assert!(manager.queue_take_next(&dyn_sink).is_none());
    }

    #[test]
    fn test_dragging_reorders_the_queue_for_djs_only() {
        let manager = hosting(&[("host", true), ("dj", false), ("quiet", false)]);
        let sink = noop_sink();
        manager.set_member_role("quiet", MemberRole::Listener, &sink).unwrap();
        for (id, title) in [("aaaaaaaaaaa", "A"), ("bbbbbbbbbbb", "B"), ("ccccccccccc", "C")] {
            manager.queue_add("dj", id, title, "", false, &sink).unwrap();
        }
        let titles = || manager.get_room_state().unwrap().queue.iter().map(|i| i.title.clone()).collect::<Vec<_>>();
        let id_of = |title: &str| manager.get_room_state().unwrap().queue.iter().find(|i| i.title == title).unwrap().id.clone();

        manager.queue_move("dj", &id_of("C"), 0, &sink).unwrap();
        assert_eq!(titles(), vec!["C", "A", "B"]);
        manager.queue_move("host", &id_of("C"), 99, &sink).unwrap();
        assert_eq!(titles(), vec!["A", "B", "C"], "past the end means last");
        assert!(manager.queue_move("quiet", &id_of("A"), 2, &sink).is_err(), "listeners only listen");
        assert!(manager.queue_move("dj", "q-nope", 0, &sink).is_err());
        assert_eq!(titles(), vec!["A", "B", "C"]);
    }

    /// YTM's "Play next" lands at the front of the shared queue, "Add to
    /// queue" at the end, and the host takes from the front.
    #[test]
    fn test_play_next_goes_first() {
        let manager = hosting(&[("host", true), ("dj", false)]);
        let sink = noop_sink();
        manager.queue_add("dj", "aaaaaaaaaaa", "End", "", false, &sink).unwrap();
        manager.queue_add("dj", "bbbbbbbbbbb", "Next", "", true, &sink).unwrap();
        manager.queue_add("host", "ccccccccccc", "Last", "", false, &sink).unwrap();
        let order: Vec<_> = std::iter::from_fn(|| manager.queue_take_next(&sink)).map(|i| i.title).collect();
        assert_eq!(order, vec!["Next", "End", "Last"]);
    }

    #[test]
    fn test_play_next_flag_is_optional_on_the_wire() {
        let old: WireMessage =
            serde_json::from_str(r#"{"type":"QueueAdd","user_id":"u","video_id":"aaaaaaaaaaa","title":"t","artist":"a"}"#)
                .unwrap();
        assert!(matches!(old, WireMessage::QueueAdd { next: false, .. }));
    }

    #[test]
    fn test_parse_video_id_from_links() {
        let id = Some("dQw4w9WgXcQ".to_string());
        assert_eq!(parse_video_id("dQw4w9WgXcQ"), id);
        assert_eq!(parse_video_id("https://music.youtube.com/watch?v=dQw4w9WgXcQ&si=abc"), id);
        assert_eq!(parse_video_id("https://www.youtube.com/watch?list=x&v=dQw4w9WgXcQ"), id);
        assert_eq!(parse_video_id("youtu.be/dQw4w9WgXcQ?t=3"), id);
        assert_eq!(parse_video_id("https://youtube.com/shorts/dQw4w9WgXcQ"), id);
        assert_eq!(parse_video_id("https://evil.example/watch?v=dQw4w9WgXcQ"), None);
        assert_eq!(parse_video_id("https://music.youtube.com/playlist?list=PL123"), None);
        assert_eq!(parse_video_id("not a link"), None);
    }

    // --- Handoff and reconnect -------------------------------------------

    #[test]
    fn test_successor_is_highest_role_then_earliest() {
        let mut room = room_with(&[("host", true), ("late-dj", false), ("early-dj", false), ("mod", false)]);
        room.members[1].joined_at_ms = 20;
        room.members[2].joined_at_ms = 10;
        room.members[3].joined_at_ms = 30;
        room.members[3].role = MemberRole::Moderator;
        assert_eq!(pick_successor(&room.members).as_deref(), Some("mod"));
        room.members[3].role = MemberRole::Listener;
        assert_eq!(pick_successor(&room.members).as_deref(), Some("early-dj"));
        assert_eq!(pick_successor(&room.members[..1]), None, "the host alone has no successor");
    }

    /// A guest handed the room hosts the same code with the old host's
    /// bans, queue and approvals; returning members get their roles back.
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn test_handed_room_keeps_bans_queue_and_roles() {
        let old_host = hosting(&[("host", true), ("heir", false), ("mod", false)]);
        let sink = noop_sink();
        admit(&old_host, "banned", "install-banned");
        old_host.kick("host", "banned", &sink).unwrap();
        old_host.set_require_approval(true, &sink).unwrap();
        old_host.queue_add("heir", "aaaaaaaaaaa", "Song", "", false, &sink).unwrap();
        {
            let mut guard = old_host.state.lock();
            let room = guard.as_mut().unwrap();
            room.members[2].role = MemberRole::Moderator;
        }
        let WireMessage::HostHandoff { new_host_id, room, banned, approved } = old_host.handoff_message(Some("heir")).unwrap()
        else {
            panic!("expected a handoff");
        };
        assert_eq!(new_host_id, "heir");

        let heir = local_install("install-heir");
        let (heir_sink, heir_dyn) = recording();
        let generation = heir.begin_session();
        heir.apply_remote_room_update(room.clone(), "heir", generation).unwrap();
        guest_ended(&heir, heir_dyn, generation, GuestEnd::Handoff { new_host_id, room: Box::new(room), banned, approved });

        assert!(wait_until(|| heir.get_room_state().is_some_and(|r| r.is_host), Duration::from_secs(2)).await);
        let now = heir.get_room_state().unwrap();
        assert_eq!(now.room_code, "YTMD-TEST03");
        assert_eq!(now.members.len(), 1);
        assert_eq!(now.queue.len(), 1);
        assert_eq!(now.banned.len(), 1);
        assert!(heir_sink.left.lock().is_empty());

        assert!(matches!(heir.admit_member(join_req("banned-again", "install-banned")), Err(RejectReason::Banned)));
        // The old moderator skips approval and is a moderator again.
        let back = admit(&heir, "mod-again", "install-of-mod").room;
        assert_eq!(back.member("mod-again").unwrap().role, MemberRole::Moderator);
        // A stranger still has to knock.
        assert!(matches!(heir.admit_member(join_req("new", "install-new")), Ok(JoinDecision::Pending { .. })));
        end_room(&heir);
    }

    /// Fake host: answers the join with a room listing us (so we're its
    /// natural successor, or not), then goes silent.
    async fn vanishing_host(listed_first: bool) -> (SocketAddr, Arc<RoomCipher>, tokio::task::JoinHandle<()>) {
        let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).await.unwrap();
        let addr = listener.local_addr().unwrap();
        let mut room = room_with(&[("host", true), ("other", false)]);
        room.members[1].joined_at_ms = 50;
        room.room_code = generate_room_code();
        let cipher = Arc::new(RoomCipher::new(&room.room_code));
        let c = cipher.clone();
        let task = tokio::spawn(async move {
            let (stream, _) = listener.accept().await.unwrap();
            let (read_half, mut write_half) = stream.into_split();
            let mut reader = BufReader::new(read_half);
            let mut line = String::new();
            reader.read_line(&mut line).await.unwrap();
            let Some(WireMessage::Join { user_id, .. }) = c.open_line(&line) else {
                panic!("expected a sealed join");
            };
            let me = RoomMember {
                id: user_id,
                nickname: "Me".into(),
                is_host: false,
                joined_at_ms: if listed_first { 0 } else { 99 },
                role: MemberRole::Dj,
                client_hash: String::new(),
            };
            room.members.push(me);
            write_sealed(&mut write_half, &c, &WireMessage::State { room: RoomStateWire::from(&room) }).await;
            tokio::time::sleep(Duration::from_secs(10)).await;
            drop((reader, write_half));
        });
        (addr, cipher, task)
    }

    /// The host vanished and we're next in line: once the room can't be
    /// found, we host it ourselves under the same code.
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn test_successor_takes_over_a_vanished_host() {
        let (addr, cipher, fake) = vanishing_host(true).await;
        let guest = fast_manager();
        let (sink, dyn_sink) = recording();
        let joined = connect_to_host(&guest, dyn_sink, addr, "Me".into(), cipher).await.unwrap();

        assert!(wait_until(|| guest.get_room_state().is_some_and(|r| r.reconnecting), Duration::from_secs(2)).await);
        assert!(
            wait_until(|| guest.get_room_state().is_some_and(|r| r.is_host), Duration::from_secs(8)).await,
            "successor should take over"
        );
        let room = guest.get_room_state().unwrap();
        assert_eq!(room.room_code, joined.room_code);
        assert_eq!(room.current_user_id, joined.current_user_id);
        assert!(sink.left.lock().is_empty());
        end_room(&guest);
        fake.abort();
    }

    /// The host vanished and someone else is next in line: we keep trying
    /// to get back in, then give up with `Lost`.
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn test_non_successor_gives_up_when_nobody_takes_over() {
        let (addr, cipher, fake) = vanishing_host(false).await;
        let guest = fast_manager();
        let (sink, dyn_sink) = recording();
        connect_to_host(&guest, dyn_sink, addr, "Me".into(), cipher).await.unwrap();
        assert!(wait_until(|| !sink.left.lock().is_empty(), Duration::from_secs(10)).await);
        assert_eq!(sink.left.lock().as_slice(), &[LeaveReason::Lost]);
        assert!(guest.get_room_state().is_none());
        fake.abort();
    }

    /// Leaving while a reconnect runs stops it for good.
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn test_leaving_stops_a_reconnect() {
        let (addr, cipher, fake) = vanishing_host(true).await;
        let guest = fast_manager();
        let (sink, dyn_sink) = recording();
        connect_to_host(&guest, dyn_sink, addr, "Me".into(), cipher).await.unwrap();
        assert!(wait_until(|| guest.get_room_state().is_some_and(|r| r.reconnecting), Duration::from_secs(2)).await);
        leave_room(&guest);
        tokio::time::sleep(Duration::from_secs(4)).await;
        assert!(guest.get_room_state().is_none(), "must not take over after leaving");
        assert!(guest.host_port().is_none());
        assert!(sink.left.lock().is_empty());
        fake.abort();
    }

    // --- LAN transport ----------------------------------------------------

    #[tokio::test]
    async fn test_discover_matches_topic_id_only() {
        let test_port = 47900;
        let cipher = RoomCipher::new("YTMD-ABCDEFGHJK");
        let payload = serde_json::to_vec(&Beacon { topic_id: cipher.topic_id().to_string(), tcp_port: 5555 }).unwrap();
        let sender_task = tokio::spawn(async move {
            tokio::time::sleep(Duration::from_millis(100)).await;
            let sock = UdpSocket::bind("0.0.0.0:0").await.unwrap();
            sock.send_to(&payload, (Ipv4Addr::LOCALHOST, test_port)).await.unwrap();
        });
        let addr = discover_host_on_port(test_port, cipher.topic_id(), Duration::from_secs(2))
            .await
            .expect("expected to discover the host");
        sender_task.await.unwrap();
        assert_eq!(addr.port(), 5555);

        let miss = discover_host_on_port(47901, "someone-else", Duration::from_millis(300)).await;
        assert!(miss.is_err());
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn test_end_to_end_host_and_guest_over_loopback() {
        let host_manager = local_manager();
        let guest_manager = local_manager();
        let (host_sink, host_dyn) = recording();
        let (guest_sink, guest_dyn) = recording();

        let host_room = create_room(&host_manager, host_dyn.clone(), "Host".to_string()).await.unwrap();
        assert!(host_room.is_host);
        assert!(host_sink.room_updates.lock().iter().any(|r| r.room_code == host_room.room_code && r.is_host));

        let guest_room = lan_join(&guest_manager, guest_dyn, &host_manager, "Guest").await.unwrap();
        assert!(!guest_room.is_host);
        assert_eq!(guest_room.members.len(), 2);
        assert_eq!(guest_sink.room_updates.lock().len(), 1, "guest frontend must hear about the room it joined");

        broadcast_playback(&host_manager, &host_dyn, playing("dQw4w9WgXcQ"));
        assert!(wait_until(|| !guest_sink.playback_updates.lock().is_empty(), Duration::from_secs(2)).await);

        leave_room(&guest_manager);
        assert!(guest_manager.get_room_state().is_none());
        assert!(
            wait_until(|| host_manager.get_room_state().map_or(0, |r| r.members.len()) == 1, Duration::from_secs(2)).await,
            "host should see the guest leave"
        );
        end_room(&host_manager);
        assert!(host_manager.get_room_state().is_none());
    }

    /// Plaintext or wrong-key traffic gets nowhere: a join that isn't sealed
    /// with this room's key is dropped without an answer.
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn test_lan_host_ignores_unsealed_or_wrong_key_joins() {
        let host = local_manager();
        create_room(&host, noop_sink(), "Host".to_string()).await.unwrap();
        let port = host.host_port().unwrap();
        let join = WireMessage::Join {
            user_id: "user-x".into(),
            nickname: "X".into(),
            client_id: "install-x".into(),
            protocol: PROTOCOL_VERSION,
        };
        let plain = format!("{}\n", serde_json::to_string(&join).unwrap());
        let wrong_key = RoomCipher::new("YTMD-WRONGWRONG").seal_line(&join).unwrap();
        for line in [plain, wrong_key] {
            let mut raw = TcpStream::connect((Ipv4Addr::LOCALHOST, port)).await.unwrap();
            raw.write_all(line.as_bytes()).await.unwrap();
            let mut reader = BufReader::new(raw);
            let mut reply = String::new();
            let n = tokio::time::timeout(Duration::from_secs(2), reader.read_line(&mut reply)).await.unwrap().unwrap_or(0);
            assert_eq!(n, 0, "connection closed without a reply");
        }
        assert_eq!(host.get_room_state().unwrap().members.len(), 1);
        end_room(&host);
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn test_guest_requests_reach_the_host() {
        let host = local_manager();
        let (host_sink, host_dyn) = recording();
        create_room(&host, host_dyn.clone(), "Host".to_string()).await.unwrap();
        let guest = local_manager();
        let (guest_sink, guest_dyn) = recording();

        assert!(send_control(&guest, SyncControl::Next).is_err(), "not in a room yet");
        lan_join(&guest, guest_dyn.clone(), &host, "Ola").await.unwrap();

        send_control(&guest, SyncControl::Next).unwrap();
        send_control(&guest, SyncControl::PlayVideo { video_id: "dQw4w9WgXcQ".into() }).unwrap();
        assert!(send_control(&guest, SyncControl::PlayVideo { video_id: "javascript:x".into() }).is_err());
        send_reaction(&guest, &guest_dyn, "😂").unwrap();
        assert!(send_reaction(&guest, &guest_dyn, "free text").is_err());
        queue_add(&guest, &guest_dyn, "aaaaaaaaaaa", "Song", "Artist", false).unwrap();

        assert!(wait_until(|| host_sink.controls.lock().len() == 2, Duration::from_secs(2)).await);
        assert!(host_sink.controls.lock().iter().all(|c| c.from == "Ola"));
        assert!(wait_until(|| !host_sink.reactions.lock().is_empty(), Duration::from_secs(2)).await);
        assert!(wait_until(|| !guest_sink.reactions.lock().is_empty(), Duration::from_secs(2)).await, "echoed to the room");
        assert!(wait_until(|| guest.get_room_state().is_some_and(|r| r.queue.len() == 1), Duration::from_secs(2)).await);

        leave_room(&guest);
        end_room(&host);
    }

    /// Over the LAN: a kicked guest is told why and dropped, the same install
    /// can't get back in, and a moderator guest can kick too.
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn test_kick_over_lan_bans_the_install() {
        let host = local_manager();
        let (_host_sink, host_dyn) = recording();
        create_room(&host, host_dyn.clone(), "Host".to_string()).await.unwrap();

        let moderator = local_install("install-mod");
        let victim = local_install("install-victim");
        let mod_room = lan_join(&moderator, noop_sink(), &host, "Mod").await.unwrap();
        let (victim_sink, victim_dyn) = recording();
        let victim_room = lan_join(&victim, victim_dyn, &host, "Victim").await.unwrap();
        host.set_member_role(&mod_room.current_user_id, MemberRole::Moderator, &host_dyn).unwrap();

        let mod_sees_role = wait_until(
            || {
                moderator.get_room_state().is_some_and(|r| {
                    r.my_role() == Some(MemberRole::Moderator) && r.members.len() == 3
                })
            },
            Duration::from_secs(2),
        )
        .await;
        assert!(mod_sees_role);
        kick_member(&moderator, &noop_sink(), &victim_room.current_user_id).unwrap();

        assert!(wait_until(|| !victim_sink.left.lock().is_empty(), Duration::from_secs(2)).await);
        assert_eq!(victim_sink.left.lock().as_slice(), &[LeaveReason::Kicked]);
        assert!(victim.get_room_state().is_none());
        assert_eq!(host.get_room_state().unwrap().banned.len(), 1);

        let again = lan_join(&victim, noop_sink(), &host, "Victim again").await;
        assert_eq!(again.err().as_deref(), Some("sync.error.banned"));

        leave_room(&moderator);
        end_room(&host);
    }

    /// A guest that goes quiet (crash, sleep, cable pulled, no FIN) is
    /// dropped from the room, announced, and disconnected.
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn test_host_evicts_guest_that_stops_heartbeating() {
        let host = fast_manager();
        let (host_sink, host_dyn) = recording();
        let room = create_room(&host, host_dyn, "Host".to_string()).await.unwrap();
        let cipher = RoomCipher::new(&room.room_code);

        let mut raw = TcpStream::connect((Ipv4Addr::LOCALHOST, host.host_port().unwrap())).await.unwrap();
        let join = WireMessage::Join {
            user_id: "user-silent".into(),
            nickname: "Ghost".into(),
            client_id: "install-silent".into(),
            protocol: PROTOCOL_VERSION,
        };
        raw.write_all(cipher.seal_line(&join).unwrap().as_bytes()).await.unwrap();
        assert!(wait_until(|| host.get_room_state().map_or(0, |r| r.members.len()) == 2, Duration::from_secs(2)).await);
        assert!(
            wait_until(|| host.get_room_state().map_or(0, |r| r.members.len()) == 1, Duration::from_secs(2)).await,
            "silent guest should be evicted"
        );
        assert_eq!(host_sink.room_updates.lock().last().unwrap().members.len(), 1);

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
        end_room(&host);
    }

    /// Heartbeats keep a healthy guest in the room well past the timeout.
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn test_heartbeats_keep_idle_guest_in_room() {
        let host = fast_manager();
        let guest = fast_manager();
        let (guest_sink, guest_dyn) = recording();
        create_room(&host, noop_sink(), "Host".to_string()).await.unwrap();
        lan_join(&guest, guest_dyn, &host, "Guest").await.unwrap();

        tokio::time::sleep(FAST_LIVENESS.timeout * 4).await;

        assert_eq!(host.get_room_state().unwrap().members.len(), 2);
        assert!(guest.get_room_state().is_some_and(|r| !r.reconnecting));
        assert!(guest_sink.left.lock().is_empty());
        leave_room(&guest);
        end_room(&host);
    }

    /// The host ending the room reaches LAN guests as `Closed`, not a
    /// reconnect.
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn test_ending_the_room_closes_it_for_guests() {
        let host = local_manager();
        create_room(&host, noop_sink(), "Host".to_string()).await.unwrap();
        let guest = local_manager();
        let (guest_sink, guest_dyn) = recording();
        lan_join(&guest, guest_dyn, &host, "Guest").await.unwrap();
        end_room(&host);
        assert!(wait_until(|| !guest_sink.left.lock().is_empty(), Duration::from_secs(2)).await);
        assert_eq!(guest_sink.left.lock().as_slice(), &[LeaveReason::Closed]);
    }
}
