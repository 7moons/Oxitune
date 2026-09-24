//! Phone remote: an axum HTTP + WebSocket server on the LAN.
//!
//! Pairing: the QR code's `/?t=<token>` is swapped once for an HttpOnly,
//! SameSite=Strict cookie and a redirect to `/`, so the token leaves the
//! address bar. Every request must carry that cookie (or `?t=`), and a
//! `Host` that is an IP literal or `localhost` on our port: a DNS-rebinding
//! page always sends its own domain name there. The token lives in
//! `~/.oscilla/remote_token` so a saved phone bookmark survives restarts;
//! "Revoke paired phones" in Settings replaces it and drops every open
//! connection.
//!
//! The phone app (`remote.html`, built into `dist-remote/`) talks the
//! protocol in `protocol.rs` / `schemas/remote_v1.json` over `/ws`. Actions
//! on the YTM page go out as `remote-action` events and come back through
//! the `remote_reply` bridge command; the page reports what it shows
//! (volume, like state, queue, ...) through `remote_publish` while a phone
//! is connected.

pub mod protocol;

use axum::body::Body;
use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::{Request, State};
use axum::http::{header, HeaderMap, HeaderValue, Method, StatusCode, Uri};
use axum::middleware::{self, Next};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use local_ip_address::{list_afinet_netifas, local_ip};
use parking_lot::{Mutex, RwLock};
use protocol::*;
use qrcode::render::svg;
use qrcode::QrCode;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::future::Future;
use std::net::{IpAddr, SocketAddr};
use std::path::{Path, PathBuf};
use std::pin::Pin;
use std::sync::atomic::{AtomicU16, AtomicU32, AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Listener, Manager};
use tokio::sync::{broadcast, mpsc, oneshot, watch};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteInfo {
    pub ip: String,
    pub port: u16,
    pub url: String,
    pub qr_svg: String,
}

const COOKIE_NAME: &str = "ytmd_remote";
const TOKEN_LEN: usize = 32;
/// Request bodies: the phone app only ever sends GETs and WS frames.
const MAX_BODY_BYTES: usize = 16 * 1024;
/// A phone message bigger than this is dropped.
const MAX_WS_MESSAGE_BYTES: usize = 16 * 1024;
/// In-flight HTTP requests (a WS session releases its slot once upgraded).
const MAX_CONCURRENT_REQUESTS: usize = 32;
/// Open phone connections.
const MAX_CLIENTS: usize = 8;
const REQUEST_TIMEOUT: Duration = Duration::from_secs(10);
/// How long a page action may take to answer (search, queue edits).
const PAGE_REPLY_TIMEOUT: Duration = Duration::from_secs(8);
const WS_PING_EVERY: Duration = Duration::from_secs(20);
/// Phone messages per second a session may send (bursts up to twice that);
/// the rest are dropped. A person tapping buttons never gets near it.
const WS_MESSAGES_PER_SEC: u32 = 20;
/// Wrong or missing tokens per address before it is refused for a while.
const MAX_AUTH_FAILURES: u32 = 20;
const AUTH_FAILURE_WINDOW: Duration = Duration::from_secs(60);

/// Token bucket for one phone session.
struct MessageBudget {
    tokens: f64,
    last: std::time::Instant,
}

impl MessageBudget {
    fn new() -> Self {
        Self { tokens: f64::from(WS_MESSAGES_PER_SEC * 2), last: std::time::Instant::now() }
    }

    fn take_at(&mut self, now: std::time::Instant) -> bool {
        let refill = now.saturating_duration_since(self.last).as_secs_f64() * f64::from(WS_MESSAGES_PER_SEC);
        self.tokens = (self.tokens + refill).min(f64::from(WS_MESSAGES_PER_SEC * 2));
        self.last = now;
        if self.tokens >= 1.0 {
            self.tokens -= 1.0;
            true
        } else {
            false
        }
    }
}

/// Failed pairing attempts per client address (someone guessing tokens, or
/// a page in a browser on the LAN poking at the port).
#[derive(Default)]
struct AuthLimiter {
    failures: Mutex<HashMap<IpAddr, (std::time::Instant, u32)>>,
}

impl AuthLimiter {
    fn blocked_at(&self, ip: IpAddr, now: std::time::Instant) -> bool {
        self.failures
            .lock()
            .get(&ip)
            .is_some_and(|(since, n)| *n >= MAX_AUTH_FAILURES && now.saturating_duration_since(*since) < AUTH_FAILURE_WINDOW)
    }

    fn record_failure_at(&self, ip: IpAddr, now: std::time::Instant) {
        let mut failures = self.failures.lock();
        if failures.len() > 1024 {
            failures.retain(|_, (since, _)| now.saturating_duration_since(*since) < AUTH_FAILURE_WINDOW);
        }
        let entry = failures.entry(ip).or_insert((now, 0));
        if now.saturating_duration_since(entry.0) >= AUTH_FAILURE_WINDOW {
            *entry = (now, 0);
        }
        entry.1 += 1;
    }
}

fn looks_like_virtual_adapter(name: &str) -> bool {
    let name = name.to_lowercase();
    [
        "vpn", "zerotier", "tailscale", "wireguard", "nord", "proton", "openvpn", "tap", "tun",
        "ppp", "virtual", "hyper-v", "vmware", "virtualbox", "docker", "teredo", "isatap",
        "loopback",
    ]
    .iter()
    .any(|kw| name.contains(kw))
}

/// The `local_ip_address` crate picks its address from whichever interface owns the
/// system's default route. VPN and mesh-networking clients (ZeroTier, Tailscale, etc.)
/// commonly install their own default route, so on a machine running one of those the
/// "default route" interface is the VPN tunnel, not the physical LAN/Wi-Fi adapter —
/// producing a QR/URL a phone on the same Wi-Fi can never actually reach. Prefer a real
/// private-LAN address on a non-VPN-looking adapter first, falling back to the OS's
/// default-route pick only if nothing better is found.
pub fn get_local_ip() -> String {
    if let Ok(interfaces) = list_afinet_netifas() {
        let mut candidates: Vec<_> = interfaces
            .into_iter()
            .filter_map(|(name, ip)| match ip {
                IpAddr::V4(v4) if v4.is_private() && !looks_like_virtual_adapter(&name) => Some(v4),
                _ => None,
            })
            .collect();

        // 192.168.x.x is almost always a home/office router subnet and is rarely used
        // by VPNs, so prefer it; 10.x.x.x is common for both LANs and VPNs, so it comes
        // after; 172.16-31.x.x is the least common of the three.
        candidates.sort_by_key(|ip| match ip.octets()[0] {
            192 => 0,
            10 => 1,
            _ => 2,
        });

        if let Some(ip) = candidates.into_iter().next() {
            return ip.to_string();
        }
    }

    local_ip()
        .map(|ip| ip.to_string())
        .unwrap_or_else(|_| "127.0.0.1".to_string())
}

/// Random URL-safe pairing token. The server binds 0.0.0.0 so phones on the
/// same Wi-Fi can reach it; without a secret, any website open in the
/// user's browser could blind-send it commands (local-network CSRF).
pub fn generate_token() -> String {
    use rand::Rng;
    const CHARS: &[u8] = b"abcdefghijklmnopqrstuvwxyz0123456789";
    let mut rng = rand::rng();
    (0..TOKEN_LEN)
        .map(|_| CHARS[rng.random_range(0..CHARS.len())] as char)
        .collect()
}

fn is_well_formed_token(token: &str) -> bool {
    token.len() == TOKEN_LEN && token.bytes().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit())
}

/// The saved token, or a new one written there (owner-only on unix).
pub fn load_or_create_token(path: &Path) -> String {
    if let Ok(saved) = std::fs::read_to_string(path) {
        let saved = saved.trim();
        if is_well_formed_token(saved) {
            return saved.to_string();
        }
    }
    let token = generate_token();
    if let Err(e) = write_token(path, &token) {
        log::warn!("[Oscilla Remote] Couldn't save the pairing token: {e}");
    }
    token
}

fn write_token(path: &Path, token: &str) -> std::io::Result<()> {
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir)?;
    }
    crate::secure_fs::write_private(path, token.as_bytes())
}

fn constant_time_eq(a: &str, b: &str) -> bool {
    let (a, b) = (a.as_bytes(), b.as_bytes());
    if a.len() != b.len() {
        return false;
    }
    let mut diff: u8 = 0;
    for (x, y) in a.iter().zip(b.iter()) {
        diff |= x ^ y;
    }
    diff == 0
}

fn query_param(query: Option<&str>, key: &str) -> Option<String> {
    url::form_urlencoded::parse(query?.as_bytes())
        .find(|(k, _)| k == key)
        .map(|(_, v)| v.into_owned())
}

fn cookie_value(headers: &HeaderMap, name: &str) -> Option<String> {
    headers
        .get_all(header::COOKIE)
        .iter()
        .filter_map(|v| v.to_str().ok())
        .flat_map(|v| v.split(';'))
        .filter_map(|pair| pair.trim().split_once('='))
        .find(|(k, _)| *k == name)
        .map(|(_, v)| v.to_string())
}

/// Whether `host` (a `Host` header) is one this server answers to: an IP
/// literal or `localhost`, on our port. A DNS-rebinding attack reaches us
/// under the attacker's own domain name, which this refuses. IP literals
/// keep working when DHCP hands the PC a new LAN address.
pub fn host_allowed(host: &str, port: u16) -> bool {
    let (name, host_port) = if let Some(rest) = host.strip_prefix('[') {
        // [v6]:port
        match rest.split_once("]:") {
            Some((v6, p)) => (v6, p),
            None => return false,
        }
    } else {
        match host.rsplit_once(':') {
            Some(pair) => pair,
            None => return false,
        }
    };
    if host_port.parse::<u16>().ok() != Some(port) {
        return false;
    }
    name.eq_ignore_ascii_case("localhost") || name.parse::<IpAddr>().is_ok()
}

pub fn generate_qr_svg(url: &str) -> String {
    if let Ok(code) = QrCode::new(url.as_bytes()) {
        code.render::<svg::Color>()
            .min_dimensions(200, 200)
            .dark_color(svg::Color("#000000"))
            .light_color(svg::Color("#ffffff"))
            .build()
    } else {
        "<svg></svg>".to_string()
    }
}

pub const REMOTE_OFF_ERROR: &str = "Remote is turned off";

/// Pure decision behind `RemoteServerStatus::serving_port`.
pub fn remote_availability(enabled: bool, bound_port: Option<u16>) -> Result<u16, String> {
    match (enabled, bound_port) {
        (false, _) => Err(REMOTE_OFF_ERROR.to_string()),
        (true, Some(port)) => Ok(port),
        (true, None) => Err("Remote server isn't running (its port may be in use by another app)".to_string()),
    }
}

pub fn get_remote_info(port: u16, token: &str) -> RemoteInfo {
    let ip = get_local_ip();
    let url = format!("http://{}:{}/?t={}", ip, port, token);
    let qr_svg = generate_qr_svg(&url);
    RemoteInfo { ip, port, url, qr_svg }
}

fn now_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}

/// What the YTM page reports about its player while a phone is connected
/// (`remote_publish` with kind `state`).
#[derive(Debug, Clone, Default, Deserialize)]
pub struct PageState {
    #[serde(default)]
    pub playing: bool,
    #[serde(default)]
    pub position_secs: f64,
    #[serde(default)]
    pub sampled_at_ms: u64,
    #[serde(default = "full_volume")]
    pub volume: f64,
    #[serde(default)]
    pub muted: bool,
    #[serde(default)]
    pub like: LikeStatus,
    #[serde(default)]
    pub shuffle: bool,
    #[serde(default)]
    pub repeat: RepeatMode,
    #[serde(default)]
    pub accent: Option<Accent>,
}

fn full_volume() -> f64 {
    1.0
}

#[derive(Default)]
struct Snapshot {
    track: Option<crate::discord_rpc::TrackPayload>,
    page: Option<PageState>,
    page_queue: Option<QueueView>,
    room: Option<RoomView>,
    room_queue: Option<QueueView>,
    lyrics: Value,
}

impl Snapshot {
    fn player_state(&self, now: u64) -> PlayerState {
        let track = self.track.as_ref().filter(|t| !t.title.trim().is_empty());
        let page = self.page.clone().unwrap_or(PageState { volume: 1.0, ..PageState::default() });
        // The newer of the two position readings wins.
        let (position_secs, sampled_at_ms, playing) = match track {
            Some(t) if t.sampled_at_ms.unwrap_or(0) > page.sampled_at_ms => {
                (t.current_time_secs as f64, t.sampled_at_ms.unwrap_or(now), t.is_playing)
            }
            _ if page.sampled_at_ms > 0 => (page.position_secs, page.sampled_at_ms, page.playing),
            Some(t) => (t.current_time_secs as f64, now, t.is_playing),
            None => (0.0, now, false),
        };
        PlayerState {
            track: track.map(|t| TrackView {
                title: t.title.clone(),
                artist: t.artist.clone(),
                album: t.album.clone(),
                cover_url: t.cover_url.clone(),
                duration_secs: t.duration_secs as f64,
                video_id: t.video_id.clone(),
            }),
            playing,
            position_secs: position_secs.max(0.0),
            sampled_at_ms,
            server_time_ms: now,
            volume: page.volume.clamp(0.0, 1.0),
            muted: page.muted,
            like: page.like,
            shuffle: page.shuffle,
            repeat: page.repeat,
            accent: page.accent,
        }
    }

    fn queue(&self) -> Option<QueueView> {
        if self.room.is_some() {
            self.room_queue.clone()
        } else {
            self.page_queue.clone()
        }
    }

    /// Everything a phone needs right after connecting.
    fn messages(&self, now: u64) -> Vec<ServerMsg> {
        let mut out = vec![ServerMsg::Hello { version: PROTOCOL_VERSION }, ServerMsg::State(self.player_state(now))];
        out.push(ServerMsg::Queue(self.queue().unwrap_or(QueueView { items: vec![], shared: false })));
        out.push(ServerMsg::Lyrics { lyrics: self.lyrics.clone() });
        out.push(ServerMsg::Room { room: self.room.clone() });
        out
    }
}

type PageReply = Result<Value, String>;

/// Fan-out to every connected phone, plus the page request/reply plumbing.
pub struct RemoteHub {
    tx: broadcast::Sender<Arc<str>>,
    snapshot: Mutex<Snapshot>,
    pending: Mutex<HashMap<u32, oneshot::Sender<PageReply>>>,
    next_request: AtomicU32,
    clients: AtomicUsize,
}

impl Default for RemoteHub {
    fn default() -> Self {
        Self {
            tx: broadcast::channel(64).0,
            snapshot: Mutex::new(Snapshot::default()),
            pending: Mutex::new(HashMap::new()),
            next_request: AtomicU32::new(1),
            clients: AtomicUsize::new(0),
        }
    }
}

impl RemoteHub {
    fn send(&self, msg: &ServerMsg) {
        if let Ok(text) = serde_json::to_string(msg) {
            let _ = self.tx.send(Arc::from(text));
        }
    }

    fn broadcast_state(&self) {
        let msg = ServerMsg::State(self.snapshot.lock().player_state(now_ms()));
        self.send(&msg);
    }

    fn broadcast_queue(&self) {
        let queue = self.snapshot.lock().queue().unwrap_or(QueueView { items: vec![], shared: false });
        self.send(&ServerMsg::Queue(queue));
    }

    pub fn client_count(&self) -> usize {
        self.clients.load(Ordering::SeqCst)
    }

    pub fn on_track(&self, track: crate::discord_rpc::TrackPayload) {
        self.snapshot.lock().track = Some(track);
        self.broadcast_state();
    }

    pub fn on_lyrics(&self, lyrics: Value) {
        self.snapshot.lock().lyrics = lyrics.clone();
        self.send(&ServerMsg::Lyrics { lyrics });
    }

    pub fn on_room(&self, room: Option<&crate::sync_room::RoomState>) {
        let view = room.map(room_view);
        let queue = room.map(|r| QueueView {
            shared: true,
            items: r
                .queue
                .iter()
                .map(|q| QueueEntry {
                    id: q.id.clone(),
                    video_id: q.video_id.clone(),
                    title: q.title.clone(),
                    artist: q.artist.clone(),
                    thumbnail: Some(format!("https://i.ytimg.com/vi/{}/default.jpg", q.video_id)),
                    current: false,
                })
                .collect(),
        });
        {
            let mut snap = self.snapshot.lock();
            snap.room = view.clone();
            snap.room_queue = queue;
        }
        self.send(&ServerMsg::Room { room: view });
        self.broadcast_queue();
    }

    pub fn on_reaction(&self, from: String, emoji: String) {
        self.send(&ServerMsg::Reaction { from, emoji });
    }

    /// `remote_publish` from the page.
    pub fn publish(&self, kind: &str, data: Value) -> Result<(), String> {
        match kind {
            "state" => {
                let state: PageState = serde_json::from_value(data).map_err(|e| e.to_string())?;
                self.snapshot.lock().page = Some(state);
                self.broadcast_state();
            }
            "queue" => {
                let items: Vec<QueueEntry> = serde_json::from_value(data).map_err(|e| e.to_string())?;
                self.snapshot.lock().page_queue = Some(QueueView { items, shared: false });
                self.broadcast_queue();
            }
            other => return Err(format!("Unknown remote_publish kind `{other}`")),
        }
        Ok(())
    }

    /// `remote_reply` from the page.
    pub fn resolve(&self, id: u32, reply: PageReply) {
        if let Some(tx) = self.pending.lock().remove(&id) {
            let _ = tx.send(reply);
        }
    }

    fn begin_request(&self) -> (u32, oneshot::Receiver<PageReply>) {
        let id = self.next_request.fetch_add(1, Ordering::Relaxed);
        let (tx, rx) = oneshot::channel();
        self.pending.lock().insert(id, tx);
        (id, rx)
    }

    async fn await_reply(&self, id: u32, rx: oneshot::Receiver<PageReply>) -> PageReply {
        match tokio::time::timeout(PAGE_REPLY_TIMEOUT, rx).await {
            Ok(Ok(reply)) => reply,
            _ => {
                self.pending.lock().remove(&id);
                Err("remote.error.timeout".into())
            }
        }
    }
}

fn room_view(room: &crate::sync_room::RoomState) -> RoomView {
    RoomView {
        is_host: room.is_host,
        me: room.current_user_id.clone(),
        members: room
            .members
            .iter()
            .map(|m| RoomMemberView {
                id: m.id.clone(),
                nickname: m.nickname.clone(),
                role: serde_json::to_value(m.role)
                    .ok()
                    .and_then(|v| v.as_str().map(str::to_string))
                    .unwrap_or_else(|| "dj".into()),
                is_host: m.is_host,
            })
            .collect(),
        skip_votes: room.skip_votes.clone(),
        votes_needed: crate::sync_room::votes_needed(room.members.len()),
    }
}

/// Whether the server is serving, its pairing token, and the phone hub.
/// `enabled` is fixed at startup (turning the remote on/off takes a
/// restart); the bound port is set once the listener binds, which can fail
/// (e.g. the port is taken).
pub struct RemoteServerStatus {
    enabled: bool,
    /// 0 = not bound (yet, or bind failed).
    bound_port: AtomicU16,
    token: RwLock<String>,
    token_path: Option<PathBuf>,
    /// Bumped when the token is replaced; open sessions close on it.
    token_generation: watch::Sender<u64>,
    pub hub: RemoteHub,
}

impl RemoteServerStatus {
    /// `token_path`: where the pairing token is kept; `None` keeps a fresh
    /// one in memory only (tests).
    pub fn new(enabled: bool, token_path: Option<PathBuf>) -> Self {
        let token = token_path.as_deref().map(load_or_create_token).unwrap_or_else(generate_token);
        Self {
            enabled,
            bound_port: AtomicU16::new(0),
            token: RwLock::new(token),
            token_path,
            token_generation: watch::channel(0).0,
            hub: RemoteHub::default(),
        }
    }

    fn mark_bound(&self, port: u16) {
        self.bound_port.store(port, Ordering::SeqCst);
    }

    /// The port the server is listening on, or why there isn't one.
    pub fn serving_port(&self) -> Result<u16, String> {
        let bound = match self.bound_port.load(Ordering::SeqCst) {
            0 => None,
            p => Some(p),
        };
        remote_availability(self.enabled, bound)
    }

    pub fn token(&self) -> String {
        self.token.read().clone()
    }

    fn token_matches(&self, candidate: &str) -> bool {
        constant_time_eq(candidate, &self.token.read())
    }

    /// Unpairs every phone: a new token (saved), and every open connection
    /// is closed.
    pub fn regenerate_token(&self) -> Result<String, String> {
        let token = generate_token();
        if let Some(path) = &self.token_path {
            write_token(path, &token).map_err(|e| e.to_string())?;
        }
        *self.token.write() = token.clone();
        self.token_generation.send_modify(|g| *g += 1);
        Ok(token)
    }
}

type BoxFuture<T> = Pin<Box<dyn Future<Output = T> + Send>>;

/// Carries out phone messages. The app's implementation talks to the page
/// and Listen Together; tests plug in their own.
pub trait RemoteActions: Send + Sync + 'static {
    /// `Ok(Some(msg))` answers the phone with `msg` instead of a plain
    /// `result`.
    fn handle(&self, msg: ClientMsg) -> BoxFuture<Result<Option<ServerMsg>, String>>;
    /// A phone connected or left; `count` is how many are connected now.
    fn clients_changed(&self, _count: usize) {}
}

struct ServerCtx {
    status: Arc<RemoteServerStatus>,
    port: u16,
    actions: Arc<dyn RemoteActions>,
    auth_limiter: AuthLimiter,
}

fn security_headers(res: &mut Response, host: &str) {
    let h = res.headers_mut();
    h.insert(header::X_CONTENT_TYPE_OPTIONS, HeaderValue::from_static("nosniff"));
    h.insert(header::REFERRER_POLICY, HeaderValue::from_static("no-referrer"));
    h.insert(header::X_FRAME_OPTIONS, HeaderValue::from_static("DENY"));
    let csp = format!(
        "default-src 'self'; img-src 'self' https: data: blob:; style-src 'self' 'unsafe-inline'; \
         font-src 'self' data:; connect-src 'self' ws://{host}; manifest-src 'self'; frame-ancestors 'none'; base-uri 'none'"
    );
    if let Ok(v) = HeaderValue::from_str(&csp) {
        h.insert(header::CONTENT_SECURITY_POLICY, v);
    }
}

fn forbidden() -> Response {
    let body = "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'>\
        <title>Oscilla</title><body style='font:16px Roboto,Arial,sans-serif;background:#030303;color:#fff;padding:16px'>\
        <p>Scan the QR code in Oscilla again (menu → Phone remote).</p>\
        <p style='color:#aaa'>Zeskanuj ponownie kod QR w Oscilla (menu → Pilot w telefonie).</p>";
    (StatusCode::FORBIDDEN, [(header::CONTENT_TYPE, "text/html; charset=utf-8")], body).into_response()
}

/// Paths a phone fetches without credentials (the manifest request omits
/// cookies); none of them reveal or control anything.
fn is_public_path(path: &str) -> bool {
    matches!(path, "/manifest.webmanifest" | "/remote-icon.png")
}

/// Host check, token-for-cookie exchange and the auth gate, in that order.
async fn guard(State(ctx): State<Arc<ServerCtx>>, req: Request, next: Next) -> Response {
    let host = req
        .headers()
        .get(header::HOST)
        .and_then(|v| v.to_str().ok())
        .unwrap_or_default()
        .to_string();
    if !host_allowed(&host, ctx.port) {
        return (StatusCode::MISDIRECTED_REQUEST, "Unknown host").into_response();
    }
    let client_ip = req
        .extensions()
        .get::<axum::extract::ConnectInfo<SocketAddr>>()
        .map(|c| c.0.ip());
    let now = std::time::Instant::now();
    if client_ip.is_some_and(|ip| ctx.auth_limiter.blocked_at(ip, now)) {
        return (StatusCode::TOO_MANY_REQUESTS, "Too many attempts").into_response();
    }
    let refuse = |ctx: &ServerCtx| {
        if let Some(ip) = client_ip {
            ctx.auth_limiter.record_failure_at(ip, now);
        }
        forbidden()
    };

    let path = req.uri().path().to_string();
    if is_public_path(&path) {
        let mut res = next.run(req).await;
        security_headers(&mut res, &host);
        return res;
    }

    if let Some(t) = query_param(req.uri().query(), "t") {
        if !ctx.status.token_matches(&t) {
            return refuse(&ctx);
        }
        let cookie = format!("{COOKIE_NAME}={t}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000");
        let location = if path.is_empty() { "/".to_string() } else { path };
        let mut res = Response::builder()
            .status(StatusCode::SEE_OTHER)
            .header(header::LOCATION, location)
            .header(header::SET_COOKIE, cookie)
            .header(header::CACHE_CONTROL, "no-store")
            .body(Body::empty())
            .unwrap_or_default();
        security_headers(&mut res, &host);
        return res;
    }

    let authed = cookie_value(req.headers(), COOKIE_NAME).is_some_and(|c| ctx.status.token_matches(&c));
    if !authed {
        return refuse(&ctx);
    }

    // A WebSocket from another page would carry that page's Origin.
    if let Some(origin) = req.headers().get(header::ORIGIN).and_then(|v| v.to_str().ok()) {
        if origin != format!("http://{host}") {
            return (StatusCode::FORBIDDEN, "Cross-origin request").into_response();
        }
    }

    let mut res = next.run(req).await;
    security_headers(&mut res, &host);
    res
}

#[derive(rust_embed::RustEmbed)]
#[folder = "../dist-remote/"]
#[allow_missing = true]
struct RemoteAssets;

const NOT_BUILT_PAGE: &str = "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'>\
    <title>Oscilla</title><body style='font:16px Roboto,Arial,sans-serif;background:#030303;color:#fff;padding:16px'>\
    <p>The phone remote wasn't built into this copy of Oscilla (run <code>bun run build</code>).</p>";

fn embedded(path: &str) -> Option<Response> {
    let file = RemoteAssets::get(path)?;
    let mime = file.metadata.mimetype().to_string();
    let cache = if path.starts_with("assets/") { "public, max-age=31536000, immutable" } else { "no-cache" };
    Some(
        Response::builder()
            .header(header::CONTENT_TYPE, mime)
            .header(header::CACHE_CONTROL, cache)
            .body(Body::from(file.data.into_owned()))
            .unwrap_or_default(),
    )
}

async fn static_files(method: Method, uri: Uri) -> Response {
    if method != Method::GET && method != Method::HEAD {
        return StatusCode::NOT_FOUND.into_response();
    }
    let path = uri.path().trim_start_matches('/');
    if path.is_empty() || path == "index.html" || path == "remote.html" {
        return embedded("remote.html").unwrap_or_else(|| {
            ([(header::CONTENT_TYPE, "text/html; charset=utf-8")], NOT_BUILT_PAGE).into_response()
        });
    }
    // Only the phone app's own files; `..` can't escape an embedded set.
    embedded(path).unwrap_or_else(|| StatusCode::NOT_FOUND.into_response())
}

async fn ws_upgrade(State(ctx): State<Arc<ServerCtx>>, ws: WebSocketUpgrade) -> Response {
    let hub = &ctx.status.hub;
    if hub.clients.fetch_add(1, Ordering::SeqCst) >= MAX_CLIENTS {
        hub.clients.fetch_sub(1, Ordering::SeqCst);
        return (StatusCode::SERVICE_UNAVAILABLE, "Too many phones connected").into_response();
    }
    ctx.actions.clients_changed(hub.client_count());
    ws.max_message_size(MAX_WS_MESSAGE_BYTES)
        .on_upgrade(move |socket| async move {
            ws_session(socket, ctx.clone()).await;
            let hub = &ctx.status.hub;
            hub.clients.fetch_sub(1, Ordering::SeqCst);
            ctx.actions.clients_changed(hub.client_count());
        })
        .into_response()
}

async fn ws_session(mut socket: WebSocket, ctx: Arc<ServerCtx>) {
    let hub = &ctx.status.hub;
    let mut events = hub.tx.subscribe();
    let mut token_gen = ctx.status.token_generation.subscribe();
    token_gen.borrow_and_update();
    let (reply_tx, mut replies) = mpsc::channel::<ServerMsg>(32);

    let initial = hub.snapshot.lock().messages(now_ms());
    for msg in initial {
        if send_msg(&mut socket, &msg).await.is_err() {
            return;
        }
    }

    let mut ping = tokio::time::interval(WS_PING_EVERY);
    ping.tick().await;
    let mut budget = MessageBudget::new();
    loop {
        tokio::select! {
            event = events.recv() => match event {
                Ok(text) => {
                    if socket.send(Message::Text(text.as_ref().into())).await.is_err() {
                        return;
                    }
                }
                Err(broadcast::error::RecvError::Lagged(_)) => {
                    let catch_up = hub.snapshot.lock().messages(now_ms());
                    for msg in catch_up {
                        if send_msg(&mut socket, &msg).await.is_err() {
                            return;
                        }
                    }
                }
                Err(broadcast::error::RecvError::Closed) => return,
            },
            Some(reply) = replies.recv() => {
                if send_msg(&mut socket, &reply).await.is_err() {
                    return;
                }
            }
            incoming = socket.recv() => match incoming {
                Some(Ok(Message::Text(text))) => {
                    if budget.take_at(std::time::Instant::now()) {
                        handle_incoming(&ctx, text.as_str(), &reply_tx);
                    } else {
                        log::debug!("[Oscilla Remote] Dropping a phone message over the rate limit");
                    }
                }
                Some(Ok(Message::Close(_))) | None | Some(Err(_)) => return,
                Some(Ok(_)) => {}
            },
            _ = token_gen.changed() => {
                let _ = socket.send(Message::Close(None)).await;
                return;
            }
            _ = ping.tick() => {
                if socket.send(Message::Ping(Vec::new().into())).await.is_err() {
                    return;
                }
            }
        }
    }
}

async fn send_msg(socket: &mut WebSocket, msg: &ServerMsg) -> Result<(), axum::Error> {
    let text = serde_json::to_string(msg).unwrap_or_default();
    socket.send(Message::Text(text.into())).await
}

fn handle_incoming(ctx: &Arc<ServerCtx>, text: &str, reply_tx: &mpsc::Sender<ServerMsg>) {
    let msg: ClientMsg = match serde_json::from_str(text) {
        Ok(m) => m,
        Err(e) => {
            log::debug!("[Oscilla Remote] Ignoring a malformed phone message: {e}");
            return;
        }
    };
    let id = msg.id();
    let actions = ctx.actions.clone();
    let reply_tx = reply_tx.clone();
    // Page round trips (search, queue edits) take a while; the session keeps
    // streaming meanwhile.
    tokio::spawn(async move {
        let outcome = actions.handle(msg).await;
        let reply = match (outcome, id) {
            (Ok(Some(msg)), _) => Some(msg),
            (Ok(None), Some(id)) => Some(ServerMsg::Result { id, ok: true, error: None }),
            (Err(error), Some(id)) => Some(ServerMsg::Result { id, ok: false, error: Some(error) }),
            (_, None) => None,
        };
        if let Some(reply) = reply {
            let _ = reply_tx.send(reply).await;
        }
    });
}

fn router(ctx: Arc<ServerCtx>) -> Router {
    use tower::limit::ConcurrencyLimitLayer;
    use tower_http::limit::RequestBodyLimitLayer;
    use tower_http::timeout::TimeoutLayer;

    Router::new()
        .route("/ws", get(ws_upgrade))
        .fallback(static_files)
        .layer(middleware::from_fn_with_state(ctx.clone(), guard))
        .layer(RequestBodyLimitLayer::new(MAX_BODY_BYTES))
        .layer(TimeoutLayer::with_status_code(StatusCode::REQUEST_TIMEOUT, REQUEST_TIMEOUT))
        .layer(ConcurrencyLimitLayer::new(MAX_CONCURRENT_REQUESTS))
        .with_state(ctx)
}

/// The page action a phone message becomes (`remote-action` event payload).
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
enum PageAction {
    Command { command: &'static str },
    Seek { position_secs: f64 },
    Volume { volume: f64 },
    QueueJump { item_id: String },
    QueueMove { item_id: String, to_index: usize },
    QueueRemove { item_id: String },
    Search { query: String },
    Play { video_id: String },
    Enqueue { video_id: String, next: bool },
}

#[derive(Clone, Serialize)]
struct PageActionEvent {
    id: Option<u32>,
    action: PageAction,
}

/// The app's `RemoteActions`: YTM page actions go out as `remote-action`
/// events; Listen Together actions go straight to the room, whose host
/// rules then apply as for any other guest request.
struct AppActions {
    app: AppHandle,
    status: Arc<RemoteServerStatus>,
}

impl AppActions {
    fn fire(&self, action: PageAction) -> Result<Option<ServerMsg>, String> {
        self.app
            .emit("remote-action", PageActionEvent { id: None, action })
            .map_err(|e| e.to_string())?;
        Ok(None)
    }

    async fn request(app: &AppHandle, status: &RemoteServerStatus, action: PageAction) -> PageReply {
        let hub = &status.hub;
        let (id, rx) = hub.begin_request();
        if let Err(e) = app.emit("remote-action", PageActionEvent { id: Some(id), action }) {
            hub.resolve(id, Err(e.to_string()));
        }
        hub.await_reply(id, rx).await
    }

    fn state(&self) -> Arc<crate::AppState> {
        self.app.state::<Arc<crate::AppState>>().inner().clone()
    }

    fn sink(&self) -> Arc<dyn crate::sync_room::SyncEventSink> {
        Arc::new(self.app.clone())
    }
}

impl RemoteActions for AppActions {
    fn handle(&self, msg: ClientMsg) -> BoxFuture<Result<Option<ServerMsg>, String>> {
        let state = self.state();
        let in_room = state.sync_room.get_room_state().is_some();
        let app = self.app.clone();
        let status = self.status.clone();
        let sink = self.sink();

        let now: Result<Option<ServerMsg>, String> = match msg {
            ClientMsg::Cmd { command, .. } => self.fire(PageAction::Command { command: command.as_page_command() }),
            ClientMsg::Seek { position_secs, .. } => {
                if !position_secs.is_finite() || position_secs < 0.0 {
                    return Box::pin(async { Err("remote.error.invalid".to_string()) });
                }
                self.fire(PageAction::Seek { position_secs })
            }
            ClientMsg::Volume { volume, .. } => {
                if !volume.is_finite() {
                    return Box::pin(async { Err("remote.error.invalid".to_string()) });
                }
                self.fire(PageAction::Volume { volume: volume.clamp(0.0, 1.0) })
            }
            ClientMsg::Play { video_id, .. } => {
                if !crate::sync_room::is_video_id(&video_id) {
                    return Box::pin(async { Err("remote.error.invalid".to_string()) });
                }
                self.fire(PageAction::Play { video_id })
            }
            ClientMsg::React { emoji, .. } => {
                if !in_room {
                    Err("remote.error.noRoom".into())
                } else if emoji.is_empty() || emoji.chars().count() > MAX_EMOJI_CHARS {
                    Err("remote.error.invalid".into())
                } else {
                    crate::sync_room::send_reaction(&state.sync_room, &sink, &emoji).map(|_| None)
                }
            }
            ClientMsg::VoteSkip { .. } => {
                if in_room {
                    crate::sync_room::vote_skip(&state.sync_room, &sink).map(|_| None)
                } else {
                    Err("remote.error.noRoom".into())
                }
            }
            ClientMsg::QueueJump { item_id, .. } if in_room => {
                crate::sync_room::queue_play(&state.sync_room, &sink, &item_id).map(|_| None)
            }
            ClientMsg::QueueRemove { item_id, .. } if in_room => {
                crate::sync_room::queue_remove(&state.sync_room, &sink, &item_id).map(|_| None)
            }
            ClientMsg::QueueMove { item_id, to_index, .. } if in_room => {
                crate::sync_room::queue_move(&state.sync_room, &sink, &item_id, to_index).map(|_| None)
            }
            ClientMsg::Enqueue { video_id, next, .. } => {
                if !crate::sync_room::is_video_id(&video_id) {
                    return Box::pin(async { Err("remote.error.invalid".to_string()) });
                }
                if in_room {
                    return Box::pin(async move {
                        crate::commands::add_to_sync_queue(app, &state, &video_id, next).await.map(|_| None)
                    });
                }
                return Box::pin(async move {
                    Self::request(&app, &status, PageAction::Enqueue { video_id, next }).await.map(|_| None)
                });
            }
            ClientMsg::QueueJump { item_id, .. } => {
                return Box::pin(async move {
                    Self::request(&app, &status, PageAction::QueueJump { item_id }).await.map(|_| None)
                });
            }
            ClientMsg::QueueRemove { item_id, .. } => {
                return Box::pin(async move {
                    Self::request(&app, &status, PageAction::QueueRemove { item_id }).await.map(|_| None)
                });
            }
            ClientMsg::QueueMove { item_id, to_index, .. } => {
                return Box::pin(async move {
                    Self::request(&app, &status, PageAction::QueueMove { item_id, to_index }).await.map(|_| None)
                });
            }
            ClientMsg::Search { id, query } => {
                let query: String = query.trim().chars().take(MAX_QUERY_CHARS).collect();
                if query.is_empty() {
                    return Box::pin(async move { Ok(Some(ServerMsg::SearchResults { id, results: vec![] })) });
                }
                return Box::pin(async move {
                    let data = Self::request(&app, &status, PageAction::Search { query }).await?;
                    let results: Vec<SearchResult> = serde_json::from_value(data).map_err(|e| e.to_string())?;
                    Ok(Some(ServerMsg::SearchResults { id, results }))
                });
            }
        };
        Box::pin(async move { now })
    }

    fn clients_changed(&self, count: usize) {
        let _ = self.app.emit("remote-clients", count);
    }
}

/// Mirrors app events into the phone hub.
fn follow_app_events(app: &AppHandle, status: &Arc<RemoteServerStatus>) {
    let s = status.clone();
    app.listen("track-changed", move |e| {
        if let Ok(track) = serde_json::from_str(e.payload()) {
            s.hub.on_track(track);
        }
    });
    let s = status.clone();
    app.listen("lyrics-changed", move |e| {
        if let Ok(lyrics) = serde_json::from_str::<Value>(e.payload()) {
            s.hub.on_lyrics(lyrics);
        }
    });
    let s = status.clone();
    app.listen("sync-room-updated", move |e| {
        if let Ok(room) = serde_json::from_str::<crate::sync_room::RoomState>(e.payload()) {
            s.hub.on_room(Some(&room));
        }
    });
    let s = status.clone();
    app.listen("sync-room-left", move |_| s.hub.on_room(None));
    let s = status.clone();
    app.listen("sync-reaction", move |e| {
        if let Ok(r) = serde_json::from_str::<crate::sync_room::ReactionPayload>(e.payload()) {
            s.hub.on_reaction(r.from, r.emoji);
        }
    });
}

async fn serve(listener: tokio::net::TcpListener, ctx: Arc<ServerCtx>) {
    let app = router(ctx).into_make_service_with_connect_info::<SocketAddr>();
    if let Err(e) = axum::serve(listener, app).await {
        log::warn!("[Oscilla Remote] Server stopped: {e}");
    }
}

/// The address the remote listens on: this PC's private LAN address for
/// `lan` (so VPN, Docker and public interfaces don't expose it; loopback if
/// there is none), every interface for `all`.
pub fn bind_address(bind: &str, port: u16) -> SocketAddr {
    if bind == "all" {
        return SocketAddr::from(([0, 0, 0, 0], port));
    }
    let ip = get_local_ip().parse::<IpAddr>().unwrap_or(IpAddr::from([127, 0, 0, 1]));
    SocketAddr::new(ip, port)
}

pub fn start_remote_server(app_handle: AppHandle, port: u16, bind: &str, status: Arc<RemoteServerStatus>) {
    follow_app_events(&app_handle, &status);
    if let Some(state) = app_handle.try_state::<Arc<crate::AppState>>() {
        status.hub.on_room(state.sync_room.get_room_state().as_ref());
    }
    let actions: Arc<dyn RemoteActions> = Arc::new(AppActions { app: app_handle, status: status.clone() });

    let addr = bind_address(bind, port);
    tauri::async_runtime::spawn(async move {
        let listener = match tokio::net::TcpListener::bind(addr).await {
            Ok(l) => {
                log::info!("[Oscilla Remote] Server listening on http://{addr}");
                status.mark_bound(port);
                l
            }
            Err(e) => {
                log::warn!("[Oscilla Remote] Failed to bind port {port}: {e}");
                return;
            }
        };
        serve(listener, Arc::new(ServerCtx { status, port, actions, auth_limiter: AuthLimiter::default() })).await;
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::{SinkExt, StreamExt};
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    #[test]
    fn test_get_local_ip_returns_valid_ip() {
        assert!(!get_local_ip().is_empty());
    }

    #[test]
    fn test_generate_qr_svg() {
        let svg = generate_qr_svg("http://192.168.1.100:9863");
        assert!(svg.contains("<svg") && svg.contains("</svg>"));
    }

    #[test]
    fn test_remote_availability() {
        assert_eq!(remote_availability(false, None), Err(REMOTE_OFF_ERROR.to_string()));
        assert_eq!(remote_availability(false, Some(9863)), Err(REMOTE_OFF_ERROR.to_string()));
        assert_eq!(remote_availability(true, Some(9863)), Ok(9863));
        assert!(remote_availability(true, None).unwrap_err().contains("isn't running"));
    }

    #[test]
    fn test_remote_status_reports_bound_port() {
        let status = RemoteServerStatus::new(true, None);
        assert!(status.serving_port().is_err());
        status.mark_bound(9870);
        assert_eq!(status.serving_port(), Ok(9870));
        assert_eq!(RemoteServerStatus::new(false, None).serving_port(), Err(REMOTE_OFF_ERROR.to_string()));
    }

    #[test]
    fn test_get_remote_info() {
        let info = get_remote_info(9863, "test-token");
        assert_eq!(info.port, 9863);
        assert!(info.url.contains("9863") && info.url.contains("t=test-token"));
    }

    #[test]
    fn test_generate_token_is_random_and_long_enough() {
        let (a, b) = (generate_token(), generate_token());
        assert!(is_well_formed_token(&a) && is_well_formed_token(&b));
        assert_ne!(a, b, "two generated tokens collided — RNG is broken");
    }

    #[test]
    fn test_message_budget_allows_bursts_then_limits() {
        let mut budget = MessageBudget::new();
        let t0 = std::time::Instant::now();
        let burst = (0..100).filter(|_| budget.take_at(t0)).count();
        assert_eq!(burst, (WS_MESSAGES_PER_SEC * 2) as usize);
        assert!(!budget.take_at(t0));
        assert!(budget.take_at(t0 + Duration::from_millis(100)), "refills over time");
    }

    #[test]
    fn test_auth_limiter_blocks_after_repeated_failures_then_forgets() {
        let limiter = AuthLimiter::default();
        let ip: IpAddr = "192.168.1.50".parse().unwrap();
        let other: IpAddr = "192.168.1.51".parse().unwrap();
        let t0 = std::time::Instant::now();
        for _ in 0..MAX_AUTH_FAILURES {
            assert!(!limiter.blocked_at(ip, t0));
            limiter.record_failure_at(ip, t0);
        }
        assert!(limiter.blocked_at(ip, t0));
        assert!(!limiter.blocked_at(other, t0), "per address");
        assert!(!limiter.blocked_at(ip, t0 + AUTH_FAILURE_WINDOW), "the block expires");
    }

    #[test]
    fn test_bind_address_defaults_to_the_lan_address() {
        assert_eq!(bind_address("all", 9863), SocketAddr::from(([0, 0, 0, 0], 9863)));
        let lan = bind_address("lan", 9863);
        assert!(!lan.ip().is_unspecified(), "lan mode never listens on every interface");
        assert_eq!(lan.port(), 9863);
    }

    #[test]
    fn test_constant_time_eq() {
        assert!(constant_time_eq("abc123", "abc123"));
        assert!(!constant_time_eq("abc123", "abc124"));
        assert!(!constant_time_eq("abc123", "abc12"));
        assert!(constant_time_eq("", ""));
    }

    #[test]
    fn test_token_is_kept_across_restarts_and_owner_only() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("remote_token");
        let first = load_or_create_token(&path);
        assert!(is_well_formed_token(&first));
        assert_eq!(load_or_create_token(&path), first, "a restart must keep the paired phones working");

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mode = std::fs::metadata(&path).unwrap().permissions().mode() & 0o777;
            assert_eq!(mode, 0o600);
        }

        std::fs::write(&path, "garbage").unwrap();
        let replaced = load_or_create_token(&path);
        assert!(is_well_formed_token(&replaced) && replaced != first);
    }

    #[test]
    fn test_regenerate_replaces_and_saves_the_token() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("remote_token");
        let status = RemoteServerStatus::new(true, Some(path.clone()));
        let old = status.token();
        let generation = status.token_generation.subscribe();
        let new = status.regenerate_token().unwrap();
        assert_ne!(old, new);
        assert!(!status.token_matches(&old));
        assert!(status.token_matches(&new));
        assert_eq!(std::fs::read_to_string(&path).unwrap(), new);
        assert!(generation.has_changed().unwrap(), "open sessions must be told to close");
    }

    #[test]
    fn test_host_allowed_only_for_ip_literals_and_localhost_on_our_port() {
        assert!(host_allowed("192.168.1.20:9863", 9863));
        assert!(host_allowed("10.0.0.5:9863", 9863));
        assert!(host_allowed("localhost:9863", 9863));
        assert!(host_allowed("127.0.0.1:9863", 9863));
        assert!(host_allowed("[fe80::1]:9863", 9863));
        // DNS rebinding arrives under the attacker's name.
        assert!(!host_allowed("evil.example:9863", 9863));
        assert!(!host_allowed("192.168.1.20.nip.io:9863", 9863));
        assert!(!host_allowed("192.168.1.20:80", 9863));
        assert!(!host_allowed("192.168.1.20", 9863));
        assert!(!host_allowed("", 9863));
    }

    #[test]
    fn test_cookie_value_parsing() {
        let mut h = HeaderMap::new();
        h.insert(header::COOKIE, HeaderValue::from_static("a=1; ytmd_remote=abc; b=2"));
        assert_eq!(cookie_value(&h, COOKIE_NAME).as_deref(), Some("abc"));
        assert_eq!(cookie_value(&h, "missing"), None);
    }

    #[test]
    fn test_room_view_and_queue_from_room_state() {
        use crate::sync_room::{MemberRole, QueueItem, RoomMember, RoomState};
        let room = RoomState {
            room_code: "OSC-SECRET".into(),
            is_host: false,
            current_user_id: "m2".into(),
            members: vec![
                RoomMember { id: "m1".into(), nickname: "Host".into(), is_host: true, joined_at_ms: 1, role: MemberRole::Host, client_hash: "h".into() },
                RoomMember { id: "m2".into(), nickname: "Me".into(), is_host: false, joined_at_ms: 2, role: MemberRole::Listener, client_hash: "g".into() },
            ],
            playback_state: None,
            default_role: MemberRole::Dj,
            require_approval: false,
            queue: vec![QueueItem {
                id: "q1".into(),
                video_id: "aaaaaaaaaaa".into(),
                title: "Maniac".into(),
                artist: "Carpenter Brut".into(),
                added_by: "Host".into(),
                added_by_id: "m1".into(),
            }],
            skip_votes: vec!["m1".into()],
            banned: vec![],
            pending: vec![],
            reconnecting: false,
        };
        let hub = RemoteHub::default();
        hub.on_room(Some(&room));
        let snap = hub.snapshot.lock();
        let view = snap.room.clone().unwrap();
        assert_eq!(view.members[1].role, "listener");
        assert_eq!(view.votes_needed, 2);
        let text = serde_json::to_string(&view).unwrap();
        assert!(!text.contains("OSC-SECRET"), "the room code (also its key) never goes to phones");
        let queue = snap.queue().unwrap();
        assert!(queue.shared);
        assert_eq!(queue.items[0].id, "q1");
    }

    #[test]
    fn test_player_state_uses_the_newer_position_reading() {
        let hub = RemoteHub::default();
        hub.on_track(crate::discord_rpc::TrackPayload {
            title: "Maniac".into(),
            artist: "Carpenter Brut".into(),
            album: None,
            cover_url: None,
            duration_secs: 300,
            current_time_secs: 10,
            is_playing: true,
            video_id: Some("aaaaaaaaaaa".into()),
            sampled_at_ms: Some(1_000),
            playlist_id: None,
        });
        hub.publish("state", serde_json::json!({ "playing": false, "position_secs": 42.0, "sampled_at_ms": 2_000, "volume": 0.4, "like": "like", "repeat": "one" }))
            .unwrap();
        let state = hub.snapshot.lock().player_state(3_000);
        assert_eq!(state.position_secs, 42.0);
        assert_eq!(state.sampled_at_ms, 2_000);
        assert!(!state.playing);
        assert_eq!(state.like, LikeStatus::Like);
        assert_eq!(state.repeat, RepeatMode::One);
        assert_eq!(state.track.unwrap().title, "Maniac");
        assert!(hub.publish("bogus", Value::Null).is_err());
    }

    #[tokio::test]
    async fn test_page_request_times_out_cleanly_and_resolves() {
        let hub = RemoteHub::default();
        let (id, rx) = hub.begin_request();
        hub.resolve(id, Ok(serde_json::json!([1])));
        assert_eq!(hub.await_reply(id, rx).await, Ok(serde_json::json!([1])));
        hub.resolve(999, Ok(Value::Null)); // unknown id: ignored
        assert!(hub.pending.lock().is_empty());
    }

    // ---- a real server on a loopback port ----

    struct EchoActions;
    impl RemoteActions for EchoActions {
        fn handle(&self, msg: ClientMsg) -> BoxFuture<Result<Option<ServerMsg>, String>> {
            Box::pin(async move {
                match msg {
                    ClientMsg::Search { id, query } => Ok(Some(ServerMsg::SearchResults {
                        id,
                        results: vec![SearchResult { video_id: "aaaaaaaaaaa".into(), title: query, subtitle: String::new(), thumbnail: None }],
                    })),
                    ClientMsg::VoteSkip { .. } => Err("remote.error.noRoom".into()),
                    _ => Ok(None),
                }
            })
        }
    }

    async fn spawn_server() -> (u16, Arc<RemoteServerStatus>) {
        let listener = tokio::net::TcpListener::bind(("127.0.0.1", 0)).await.unwrap();
        let port = listener.local_addr().unwrap().port();
        let status = Arc::new(RemoteServerStatus::new(true, None));
        let ctx = Arc::new(ServerCtx { status: status.clone(), port, actions: Arc::new(EchoActions), auth_limiter: AuthLimiter::default() });
        tokio::spawn(serve(listener, ctx));
        (port, status)
    }

    /// One raw HTTP/1.1 request; returns (status, headers text, body).
    async fn http(port: u16, method: &str, path: &str, host: &str, extra: &str) -> (u16, String, String) {
        let mut s = tokio::net::TcpStream::connect(("127.0.0.1", port)).await.unwrap();
        let req = format!("{method} {path} HTTP/1.1\r\nHost: {host}\r\nConnection: close\r\nContent-Length: 0\r\n{extra}\r\n");
        s.write_all(req.as_bytes()).await.unwrap();
        let mut buf = Vec::new();
        s.read_to_end(&mut buf).await.unwrap();
        let text = String::from_utf8_lossy(&buf).to_string();
        let (head, body) = text.split_once("\r\n\r\n").unwrap_or((&text, ""));
        let status = head.split_whitespace().nth(1).and_then(|c| c.parse().ok()).unwrap_or(0);
        (status, head.to_string(), body.to_string())
    }

    #[tokio::test]
    async fn test_token_is_exchanged_for_a_strict_httponly_cookie() {
        let (port, status) = spawn_server().await;
        let host = format!("127.0.0.1:{port}");
        let (code, head, _) = http(port, "GET", &format!("/?t={}", status.token()), &host, "").await;
        assert_eq!(code, 303);
        let head = head.to_lowercase();
        assert!(head.contains("location: /\r\n"), "{head}");
        assert!(head.contains("set-cookie: ytmd_remote="));
        assert!(head.contains("httponly") && head.contains("samesite=strict"));

        let (code, _, _) = http(port, "GET", "/?t=wrongwrongwrongwrongwrongwrong12", &host, "").await;
        assert_eq!(code, 403);
        let (code, _, _) = http(port, "GET", "/", &host, "").await;
        assert_eq!(code, 403, "no cookie, no page");
        let cookie = format!("Cookie: {COOKIE_NAME}={}\r\n", status.token());
        let (code, head, _) = http(port, "GET", "/", &host, &cookie).await;
        assert_eq!(code, 200);
        assert!(head.to_lowercase().contains("content-security-policy"));
    }

    #[tokio::test]
    async fn test_foreign_host_is_refused_even_with_the_token() {
        let (port, status) = spawn_server().await;
        let cookie = format!("Cookie: {COOKIE_NAME}={}\r\n", status.token());
        let (code, _, _) = http(port, "GET", "/", &format!("attacker.example:{port}"), &cookie).await;
        assert_eq!(code, 421);
    }

    #[tokio::test]
    async fn test_old_invoke_endpoint_is_gone() {
        let (port, status) = spawn_server().await;
        let host = format!("127.0.0.1:{port}");
        let cookie = format!("Cookie: {COOKIE_NAME}={}\r\n", status.token());
        let (code, _, _) = http(port, "POST", "/api/invoke", &host, &cookie).await;
        assert_eq!(code, 404, "the LAN must not reach page or config commands");
        let (code, _, _) = http(port, "POST", "/api/command?cmd=next", &host, &cookie).await;
        assert_eq!(code, 404);
    }

    #[tokio::test]
    async fn test_manifest_needs_no_cookie() {
        let (port, _) = spawn_server().await;
        let (code, _, _) = http(port, "GET", "/manifest.webmanifest", &format!("127.0.0.1:{port}"), "").await;
        // 404 when the phone app isn't built (cargo test), never 403.
        assert!(code == 200 || code == 404, "{code}");
    }

    async fn ws_connect(
        port: u16,
        cookie: Option<&str>,
        origin: Option<&str>,
    ) -> Result<
        tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>>,
        tokio_tungstenite::tungstenite::Error,
    > {
        use tokio_tungstenite::tungstenite::client::IntoClientRequest;
        let mut req = format!("ws://127.0.0.1:{port}/ws").into_client_request().unwrap();
        if let Some(c) = cookie {
            req.headers_mut().insert(header::COOKIE, HeaderValue::from_str(&format!("{COOKIE_NAME}={c}")).unwrap());
        }
        if let Some(o) = origin {
            req.headers_mut().insert(header::ORIGIN, HeaderValue::from_str(o).unwrap());
        }
        tokio_tungstenite::connect_async(req).await.map(|(ws, _)| ws)
    }

    async fn next_json(
        ws: &mut tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>>,
    ) -> ServerMsg {
        loop {
            let msg = tokio::time::timeout(Duration::from_secs(3), ws.next()).await.unwrap().unwrap().unwrap();
            if let tokio_tungstenite::tungstenite::Message::Text(t) = msg {
                return serde_json::from_str(t.as_str()).unwrap();
            }
        }
    }

    #[tokio::test]
    async fn test_websocket_session_round_trip() {
        let (port, status) = spawn_server().await;
        assert!(ws_connect(port, None, None).await.is_err(), "no cookie, no socket");
        assert!(
            ws_connect(port, Some(&status.token()), Some("http://evil.example")).await.is_err(),
            "a socket opened by another site is refused"
        );

        let mut ws = ws_connect(port, Some(&status.token()), Some(&format!("http://127.0.0.1:{port}"))).await.unwrap();
        assert_eq!(next_json(&mut ws).await, ServerMsg::Hello { version: PROTOCOL_VERSION });
        assert!(matches!(next_json(&mut ws).await, ServerMsg::State(_)));
        assert!(matches!(next_json(&mut ws).await, ServerMsg::Queue(_)));
        assert!(matches!(next_json(&mut ws).await, ServerMsg::Lyrics { .. }));
        assert!(matches!(next_json(&mut ws).await, ServerMsg::Room { room: None }));
        assert_eq!(status.hub.client_count(), 1);

        let send = |v: Value| tokio_tungstenite::tungstenite::Message::Text(v.to_string().into());
        ws.send(send(serde_json::json!({ "type": "search", "id": 7, "query": "maniac" }))).await.unwrap();
        match next_json(&mut ws).await {
            ServerMsg::SearchResults { id, results } => {
                assert_eq!(id, 7);
                assert_eq!(results[0].title, "maniac");
            }
            other => panic!("{other:?}"),
        }
        ws.send(send(serde_json::json!({ "type": "vote_skip", "id": 8 }))).await.unwrap();
        assert_eq!(next_json(&mut ws).await, ServerMsg::Result { id: 8, ok: false, error: Some("remote.error.noRoom".into()) });
        ws.send(send(serde_json::json!({ "type": "cmd", "id": 9, "command": "next" }))).await.unwrap();
        assert_eq!(next_json(&mut ws).await, ServerMsg::Result { id: 9, ok: true, error: None });

        // Broadcasts reach the phone.
        status.hub.on_reaction("Kay".into(), "🔥".into());
        assert_eq!(next_json(&mut ws).await, ServerMsg::Reaction { from: "Kay".into(), emoji: "🔥".into() });

        // Revoking closes the session.
        status.regenerate_token().unwrap();
        let closed = tokio::time::timeout(Duration::from_secs(3), async {
            loop {
                match ws.next().await {
                    None | Some(Err(_)) | Some(Ok(tokio_tungstenite::tungstenite::Message::Close(_))) => break,
                    _ => {}
                }
            }
        })
        .await;
        assert!(closed.is_ok(), "revoking must drop open phones");
    }
}
