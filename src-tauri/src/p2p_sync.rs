//! Internet "Listen Together" networking over libp2p — the fallback
//! transport `sync_room.rs` reaches for once its LAN UDP-beacon discovery
//! comes up empty. See `plan.md` at the repo root for the full design
//! rationale; this module implements it.
//!
//! Two peers on different networks/NATs have no shared broadcast domain, so
//! there's nothing to beacon on. Instead:
//!
//!   1. Both sides derive the same DHT key from the room code
//!      (`sha256("ytmd-room-v1:" + CODE)`) and join the public IPFS
//!      Kademlia DHT via its well-known bootstrap nodes — free, unauthenticated,
//!      infrastructure this project doesn't run or pay for.
//!   2. The host calls `start_providing(key)`; the guest calls
//!      `get_providers(key)` and dials whichever peer comes back.
//!   3. `identify` + `autonat` + `dcutr` + `relay::client` are wired in so
//!      libp2p can attempt direct NAT hole-punching, falling back to a
//!      relayed connection through any DHT peer that turns out to support
//!      circuit-relay-v2 — we never run or hardcode our own relay server.
//!   4. Once connected, the exact same `WireMessage` JSON vocabulary
//!      `sync_room.rs` already uses over raw TCP travels instead over a
//!      libp2p request-response protocol (`/ytmd/sync/1.0.0`).
//!
//! Honesty note (matches `plan.md`'s testing section): only the DHT
//! rendezvous + protocol logic is exercised here in `cargo test`, using two
//! local swarms on loopback. Real hole-punching between two different NATs
//! cannot be verified in an automated/sandboxed environment — it needs two
//! physical devices on two different networks. Don't take a green test suite
//! here as proof that cross-NAT joining works; it proves the DHT rendezvous
//! and wire protocol are correct, nothing about real-world NAT traversal.

use crate::sync_room::{
    generate_user_id, RoomState, RoomStateWire, SyncEventSink, SyncRoomManager, WireMessage,
};
use futures::stream::{SelectAll, StreamExt};
use libp2p::{
    autonat, dcutr, identify, kad, multiaddr::Protocol, noise, relay, request_response,
    swarm::{NetworkBehaviour, Swarm, SwarmEvent},
    tcp, yamux, Multiaddr, PeerId, StreamProtocol,
};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::pin::Pin;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::mpsc;
use tokio::time::Instant;
use tokio_stream::wrappers::UnboundedReceiverStream;

/// Namespace prefix for the DHT key, so an unrelated public-DHT record never
/// collides with a YTMD room code, and so the derivation can change in a
/// future `ytmd-room-v2:` without touching v1 clients.
const DHT_NAMESPACE: &str = "ytmd-room-v1:";
const SYNC_PROTOCOL: &str = "/ytmd/sync/1.0.0";
const IDENTIFY_PROTOCOL: &str = "/ytmd/id/1.0.0";

/// The public IPFS/libp2p bootstrap nodes — the same fixed addresses every
/// IPFS and libp2p client on the network bootstraps from. Free, unowned by
/// us, and has been stable infrastructure for the whole ecosystem for years.
const BOOTSTRAP_PEERS: &[&str] = &[
    "/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
    "/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa",
    "/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb",
    "/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt",
];

/// Overall budget for a guest's join attempt: DHT bootstrap, get_providers,
/// dial (possibly via hole-punch/relay), and the Join handshake, combined.
/// Much longer than the LAN path's 4s because none of those steps are
/// instant on a public DHT — see `plan.md`'s "Kolejność prób" section.
const P2P_JOIN_TIMEOUT: Duration = Duration::from_secs(20);
const REQUEST_TIMEOUT: Duration = Duration::from_secs(10);
/// How often the host re-announces itself as a provider in the DHT. Provider
/// records expire on other nodes after a while; without periodic
/// re-providing, a long-lived room would silently vanish from the DHT out
/// from under still-active hosts.
const PROVIDE_REPUBLISH_INTERVAL: Duration = Duration::from_secs(4 * 60);

/// A per-peer outbound message stream in the host loop, tagged with the
/// `PeerId` it forwards to. See `run_host_loop`'s `outbox_streams`.
type PeerOutboxStream = Pin<Box<dyn futures::Stream<Item = (PeerId, WireMessage)> + Send>>;

/// Derives the DHT key both sides look up/provide under for a given room
/// code. `pub(crate)` so tests in this module and `sync_room.rs` can both
/// reach it if needed.
pub(crate) fn room_dht_key(room_code: &str) -> kad::RecordKey {
    let mut hasher = Sha256::new();
    hasher.update(DHT_NAMESPACE.as_bytes());
    hasher.update(room_code.trim().to_uppercase().as_bytes());
    kad::RecordKey::new(&hasher.finalize().to_vec())
}

#[derive(NetworkBehaviour)]
struct P2pBehaviour {
    identify: identify::Behaviour,
    kad: kad::Behaviour<kad::store::MemoryStore>,
    autonat: autonat::Behaviour,
    dcutr: dcutr::Behaviour,
    relay_client: relay::client::Behaviour,
    sync: request_response::json::Behaviour<WireMessage, WireMessage>,
}

/// Builds a fresh swarm with an ephemeral Ed25519 identity — generated here,
/// held only in memory for the lifetime of this session, never written to
/// disk. There is intentionally no account, no persistent PeerId across
/// sessions, and no registration step.
fn build_swarm() -> Result<Swarm<P2pBehaviour>, String> {
    let mut swarm = libp2p::SwarmBuilder::with_new_identity()
        .with_tokio()
        .with_tcp(
            tcp::Config::default(),
            noise::Config::new,
            yamux::Config::default,
        )
        .map_err(|e| format!("Failed to configure P2P TCP transport: {e}"))?
        .with_quic()
        .with_dns()
        .map_err(|e| format!("Failed to configure P2P DNS resolution: {e}"))?
        .with_relay_client(noise::Config::new, yamux::Config::default)
        .map_err(|e| format!("Failed to configure P2P relay client: {e}"))?
        .with_behaviour(|key, relay_client| {
            let peer_id = PeerId::from(key.public());
            let identify = identify::Behaviour::new(identify::Config::new(
                IDENTIFY_PROTOCOL.to_string(),
                key.public(),
            ));
            let kad = kad::Behaviour::new(peer_id, kad::store::MemoryStore::new(peer_id));
            let autonat = autonat::Behaviour::new(peer_id, autonat::Config::default());
            let dcutr = dcutr::Behaviour::new(peer_id);
            let sync = request_response::json::Behaviour::<WireMessage, WireMessage>::new(
                [(
                    StreamProtocol::new(SYNC_PROTOCOL),
                    request_response::ProtocolSupport::Full,
                )],
                request_response::Config::default().with_request_timeout(REQUEST_TIMEOUT),
            );
            P2pBehaviour {
                identify,
                kad,
                autonat,
                dcutr,
                relay_client,
                sync,
            }
        })
        .map_err(|e| format!("Failed to assemble P2P swarm behaviour: {e}"))?
        .build();

    // Listen for direct inbound connections (works if reachable — public IP,
    // port-forwarded, or UPnP) and so dcutr has a local listener to
    // coordinate a hole-punched direct connection through.
    let _ = swarm.listen_on(
        "/ip4/0.0.0.0/tcp/0"
            .parse::<Multiaddr>()
            .expect("valid multiaddr literal"),
    );
    let _ = swarm.listen_on(
        "/ip4/0.0.0.0/udp/0/quic-v1"
            .parse::<Multiaddr>()
            .expect("valid multiaddr literal"),
    );

    Ok(swarm)
}

fn extract_peer_id(addr: &Multiaddr) -> Option<PeerId> {
    addr.iter().find_map(|p| match p {
        Protocol::P2p(peer_id) => Some(peer_id),
        _ => None,
    })
}

/// Dials each bootstrap node and seeds the Kademlia routing table with it,
/// then kicks off a `bootstrap()` query to fill in the rest of the table
/// from there. This is all local/queued work — none of it blocks on the
/// dial actually succeeding, since that happens later as the swarm is
/// polled.
fn bootstrap_dht(swarm: &mut Swarm<P2pBehaviour>) {
    for addr in BOOTSTRAP_PEERS {
        let Ok(multiaddr) = addr.parse::<Multiaddr>() else {
            continue;
        };
        if let Some(peer_id) = extract_peer_id(&multiaddr) {
            swarm.behaviour_mut().kad.add_address(&peer_id, multiaddr.clone());
        }
        let _ = swarm.dial(multiaddr);
    }
    let _ = swarm.behaviour_mut().kad.bootstrap();
}

/// Shared by both the host and guest loops: learns a peer's addresses (so
/// Kademlia can route to it) and, if we haven't already, opportunistically
/// asks any DHT peer that turns out to support circuit-relay-v2 to relay for
/// us — this is what lets a NAT'd host still be reachable, and what dcutr
/// then tries to upgrade to a direct connection. We don't hardcode any
/// specific "public relay" address (there is no small stable list of those
/// the way there is for DHT bootstrap nodes); we opportunistically use
/// whichever DHT peer happens to advertise relay support first.
fn handle_identify_info(
    swarm: &mut Swarm<P2pBehaviour>,
    peer_id: PeerId,
    info: identify::Info,
    nat_status: &autonat::NatStatus,
    relay_reserved: &mut bool,
) {
    for addr in &info.listen_addrs {
        swarm.behaviour_mut().kad.add_address(&peer_id, addr.clone());
    }

    if *relay_reserved || matches!(nat_status, autonat::NatStatus::Public(_)) {
        return;
    }
    if !info.protocols.contains(&relay::HOP_PROTOCOL_NAME) {
        return;
    }
    let Some(addr) = info.listen_addrs.first().cloned() else {
        return;
    };
    let with_peer = match addr.with_p2p(peer_id) {
        Ok(a) => a,
        Err(a) => a,
    };
    let circuit_addr = with_peer.with(Protocol::P2pCircuit);
    if swarm.listen_on(circuit_addr).is_ok() {
        *relay_reserved = true;
    }
}

// ---------------------------------------------------------------------
// Host side
// ---------------------------------------------------------------------

/// Starts announcing this room in the public DHT and returns the task handle
/// for the background event loop that keeps the announcement alive and
/// serves incoming joins. Called from `sync_room::create_room` right after
/// the LAN beacon starts — both run concurrently, not one-or-the-other.
pub(crate) async fn host_provide(
    manager: Arc<SyncRoomManager>,
    sink: Arc<dyn SyncEventSink>,
    room_code: String,
) -> Result<tauri::async_runtime::JoinHandle<()>, String> {
    let mut swarm = build_swarm()?;
    bootstrap_dht(&mut swarm);
    let key = room_dht_key(&room_code);
    let _ = swarm.behaviour_mut().kad.start_providing(key.clone());

    Ok(tauri::async_runtime::spawn(run_host_loop(
        swarm, manager, sink, key,
    )))
}

async fn run_host_loop(
    mut swarm: Swarm<P2pBehaviour>,
    manager: Arc<SyncRoomManager>,
    sink: Arc<dyn SyncEventSink>,
    provide_key: kad::RecordKey,
) {
    // Each joined P2P guest gets its own (member_id -> mpsc) pair registered
    // with `manager.register_peer`, exactly like the TCP path's `peer_task`
    // does — `manager.broadcast_to_peers` already fans out to both transports
    // via that shared map without either one knowing the other exists. We
    // read all of those receivers here, tagged with the libp2p PeerId they
    // correspond to, so a broadcast can be forwarded as an outbound request
    // to the right peer.
    let mut outbox_streams: SelectAll<PeerOutboxStream> = SelectAll::new();
    let mut peer_to_member: HashMap<PeerId, String> = HashMap::new();
    let mut nat_status = autonat::NatStatus::Unknown;
    let mut relay_reserved = false;

    let mut republish = tokio::time::interval(PROVIDE_REPUBLISH_INTERVAL);
    republish.tick().await; // consume the immediate first tick; we already provided once above

    loop {
        tokio::select! {
            event = swarm.select_next_some() => match event {
                SwarmEvent::Behaviour(P2pBehaviourEvent::Sync(request_response::Event::Message {
                    peer,
                    message: request_response::Message::Request { request, channel, .. },
                    ..
                })) => match request {
                    WireMessage::Join { user_id, nickname } => {
                        match manager.add_member(user_id.clone(), nickname) {
                            Ok(room) => {
                                let (tx, rx) = mpsc::unbounded_channel::<WireMessage>();
                                manager.register_peer(user_id.clone(), tx);
                                peer_to_member.insert(peer, user_id.clone());
                                outbox_streams.push(Box::pin(
                                    UnboundedReceiverStream::new(rx).map(move |m| (peer, m)),
                                ));
                                let _ = swarm.behaviour_mut().sync.send_response(
                                    channel,
                                    WireMessage::State { room: RoomStateWire::from(&room) },
                                );
                                sink.room_updated(&room);
                                manager.broadcast_to_peers(&WireMessage::State {
                                    room: RoomStateWire::from(&room),
                                });
                            }
                            Err(_) => {
                                // Room full or already closed — decline; the
                                // guest sees this as an unexpected response
                                // and reports a clear error instead of hanging.
                                let _ = swarm.behaviour_mut().sync.send_response(channel, WireMessage::Ack);
                            }
                        }
                    }
                    // The host is the only playback source today; a guest
                    // never legitimately sends these. Acknowledge and ignore,
                    // same as the TCP peer_task does for any unrecognised
                    // guest traffic.
                    WireMessage::State { .. } | WireMessage::Playback { .. } | WireMessage::Ack => {
                        let _ = swarm.behaviour_mut().sync.send_response(channel, WireMessage::Ack);
                    }
                },
                SwarmEvent::Behaviour(P2pBehaviourEvent::Identify(identify::Event::Received { peer_id, info, .. })) => {
                    handle_identify_info(&mut swarm, peer_id, info, &nat_status, &mut relay_reserved);
                }
                SwarmEvent::Behaviour(P2pBehaviourEvent::Autonat(autonat::Event::StatusChanged { new, .. })) => {
                    nat_status = new;
                }
                SwarmEvent::ConnectionClosed { peer_id, .. } => {
                    if let Some(member_id) = peer_to_member.remove(&peer_id) {
                        manager.unregister_peer(&member_id);
                        if let Some(room) = manager.remove_member(&member_id) {
                            sink.room_updated(&room);
                            manager.broadcast_to_peers(&WireMessage::State {
                                room: RoomStateWire::from(&room),
                            });
                        }
                    }
                }
                _ => {}
            },
            Some((peer_id, msg)) = outbox_streams.next(), if !outbox_streams.is_empty() => {
                let _ = swarm.behaviour_mut().sync.send_request(&peer_id, msg);
            }
            _ = republish.tick() => {
                let _ = swarm.behaviour_mut().kad.start_providing(provide_key.clone());
            }
        }
    }
}

// ---------------------------------------------------------------------
// Guest side
// ---------------------------------------------------------------------

fn not_found_err() -> String {
    "Nie znaleziono pokoju — sprawdź kod, upewnij się że host ma otwarty pokój, i że oboje macie \
     połączenie z internetem."
        .to_string()
}

/// The P2P fallback for `sync_room::join_room`, tried once LAN beacon
/// discovery has already failed. Looks the room up in the public DHT, dials
/// whichever provider peer is found, and performs the Join handshake over
/// the libp2p request-response protocol.
pub(crate) async fn join_room(
    manager: &Arc<SyncRoomManager>,
    sink: Arc<dyn SyncEventSink>,
    room_code: String,
    nickname: String,
) -> Result<RoomState, String> {
    let mut swarm = build_swarm()?;
    let local_peer_id = *swarm.local_peer_id();
    bootstrap_dht(&mut swarm);

    let key = room_dht_key(&room_code);
    let user_id = generate_user_id();
    let deadline = Instant::now() + P2P_JOIN_TIMEOUT;

    let mut get_providers_query: Option<kad::QueryId> = None;
    let mut target_peer: Option<PeerId> = None;
    let mut join_request: Option<request_response::OutboundRequestId> = None;
    let mut nat_status = autonat::NatStatus::Unknown;
    let mut relay_reserved = false;

    loop {
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            return Err(not_found_err());
        }
        let event = match tokio::time::timeout(remaining, swarm.select_next_some()).await {
            Ok(ev) => ev,
            Err(_) => return Err(not_found_err()),
        };

        match event {
            SwarmEvent::Behaviour(P2pBehaviourEvent::Identify(identify::Event::Received { peer_id, info, .. })) => {
                handle_identify_info(&mut swarm, peer_id, info, &nat_status, &mut relay_reserved);
                if get_providers_query.is_none() {
                    get_providers_query = Some(swarm.behaviour_mut().kad.get_providers(key.clone()));
                }
            }
            SwarmEvent::Behaviour(P2pBehaviourEvent::Autonat(autonat::Event::StatusChanged { new, .. })) => {
                nat_status = new;
            }
            SwarmEvent::Behaviour(P2pBehaviourEvent::Kad(kad::Event::OutboundQueryProgressed {
                id,
                result: kad::QueryResult::GetProviders(Ok(kad::GetProvidersOk::FoundProviders { providers, .. })),
                ..
            })) => {
                if Some(id) == get_providers_query && target_peer.is_none() {
                    if let Some(p) = providers.into_iter().find(|p| *p != local_peer_id) {
                        target_peer = Some(p);
                        let _ = swarm.dial(p);
                    }
                }
            }
            SwarmEvent::Behaviour(P2pBehaviourEvent::Kad(kad::Event::OutboundQueryProgressed {
                id,
                result: kad::QueryResult::GetProviders(Err(_)),
                ..
            })) => {
                if Some(id) == get_providers_query && target_peer.is_none() {
                    return Err(not_found_err());
                }
            }
            SwarmEvent::ConnectionEstablished { peer_id, .. } => {
                if Some(peer_id) == target_peer && join_request.is_none() {
                    let req = swarm.behaviour_mut().sync.send_request(
                        &peer_id,
                        WireMessage::Join {
                            user_id: user_id.clone(),
                            nickname: nickname.clone(),
                        },
                    );
                    join_request = Some(req);
                }
            }
            SwarmEvent::OutgoingConnectionError { peer_id: Some(peer_id), .. } => {
                if Some(peer_id) == target_peer && join_request.is_none() {
                    return Err(
                        "Nie udało się połączyć z hostem przez internet (prawdopodobnie NAT/firewall \
                         zablokował bezpośrednie i przekazywane połączenie)."
                            .to_string(),
                    );
                }
            }
            SwarmEvent::Behaviour(P2pBehaviourEvent::Sync(request_response::Event::Message {
                message: request_response::Message::Response { request_id, response },
                ..
            })) => {
                if Some(request_id) == join_request {
                    match response {
                        WireMessage::State { room } => {
                            let local_room = manager.apply_remote_room_update(room, &user_id);
                            let host_peer = target_peer.expect("target_peer set before join_request");
                            let reader_task = tauri::async_runtime::spawn(run_guest_loop(
                                swarm,
                                manager.clone(),
                                sink,
                                user_id,
                                host_peer,
                            ));
                            manager.set_p2p_guest_session(reader_task);
                            return Ok(local_room);
                        }
                        _ => return Err("Unexpected response from host.".to_string()),
                    }
                }
            }
            SwarmEvent::Behaviour(P2pBehaviourEvent::Sync(request_response::Event::OutboundFailure {
                request_id,
                error,
                ..
            })) if Some(request_id) == join_request => {
                return Err(format!("Failed to join room via internet: {error}"));
            }
            _ => {}
        }
    }
}

/// Runs after a successful Join handshake: keeps the swarm alive, applies
/// `State`/`Playback` pushes from the host, and clears guest state if the
/// host disconnects. Aborted (not gracefully stopped) by `leave_room` — same
/// pattern the TCP `guest_reader_loop`'s task uses.
async fn run_guest_loop(
    mut swarm: Swarm<P2pBehaviour>,
    manager: Arc<SyncRoomManager>,
    sink: Arc<dyn SyncEventSink>,
    user_id: String,
    host_peer: PeerId,
) {
    loop {
        match swarm.select_next_some().await {
            SwarmEvent::Behaviour(P2pBehaviourEvent::Sync(request_response::Event::Message {
                message: request_response::Message::Request { request, channel, .. },
                ..
            })) => {
                match request {
                    WireMessage::State { room } => {
                        let local = manager.apply_remote_room_update(room, &user_id);
                        sink.room_updated(&local);
                    }
                    WireMessage::Playback { state } => {
                        manager.apply_remote_playback(state.clone());
                        sink.playback_updated(&state);
                    }
                    WireMessage::Join { .. } | WireMessage::Ack => {} // guests never receive these
                }
                let _ = swarm.behaviour_mut().sync.send_response(channel, WireMessage::Ack);
            }
            SwarmEvent::Behaviour(P2pBehaviourEvent::Identify(identify::Event::Received { peer_id, info, .. })) => {
                for addr in &info.listen_addrs {
                    swarm.behaviour_mut().kad.add_address(&peer_id, addr.clone());
                }
            }
            SwarmEvent::ConnectionClosed { peer_id, .. } if peer_id == host_peer => {
                manager.clear_guest();
                sink.room_left();
                return;
            }
            _ => {}
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sync_room::{RoomMember, SyncPlaybackState};

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
            tokio::time::sleep(Duration::from_millis(20)).await;
        }
    }

    #[test]
    fn test_room_dht_key_is_deterministic_and_case_insensitive() {
        let a = room_dht_key("YTMD-ABCDEFGHJK");
        let b = room_dht_key("ytmd-abcdefghjk");
        let c = room_dht_key(" YTMD-ABCDEFGHJK ");
        assert_eq!(a, b);
        assert_eq!(a, c);
    }

    #[test]
    fn test_room_dht_key_differs_per_room_code() {
        let a = room_dht_key("YTMD-AAAAAAAAAA");
        let b = room_dht_key("YTMD-BBBBBBBBBB");
        assert_ne!(a, b);
    }

    #[test]
    fn test_bootstrap_peer_addresses_parse_and_carry_a_peer_id() {
        for addr in BOOTSTRAP_PEERS {
            let multiaddr: Multiaddr = addr.parse().expect("bootstrap address must be a valid multiaddr");
            assert!(
                extract_peer_id(&multiaddr).is_some(),
                "bootstrap address must carry a /p2p/<peer-id> suffix: {addr}"
            );
        }
    }

    /// The only piece of this module fully exercisable without a real,
    /// reachable public DHT: two swarms on loopback, one of them wired with
    /// the *other* as its sole "bootstrap" peer instead of the real public
    /// bootstrap list. This proves the rendezvous (start_providing /
    /// get_providers), dial, and Join/State/Playback request-response
    /// handshake are wired correctly end-to-end. It proves nothing about
    /// real NAT traversal — see the module doc comment.
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn test_end_to_end_host_and_guest_over_local_dht() {
        let host_manager = Arc::new(SyncRoomManager::new());
        let guest_manager = Arc::new(SyncRoomManager::new());
        let room_code = "YTMD-LOCALTEST".to_string();

        // Seed room state the way sync_room::create_room would, without
        // pulling in the LAN transport for this test.
        let host_user_id = "host-user".to_string();
        host_manager.set_local_room(RoomState {
            room_code: room_code.clone(),
            is_host: true,
            current_user_id: host_user_id.clone(),
            members: vec![RoomMember {
                id: host_user_id.clone(),
                nickname: "Host".to_string(),
                is_host: true,
                joined_at_ms: 0,
            }],
            playback_state: None,
        });

        let mut host_swarm = build_swarm().expect("host swarm should build");
        // Kademlia defaults to auto-detected Client mode (no confirmed public
        // reachability), in which a node makes outbound DHT queries/provides
        // but doesn't answer inbound ones itself — correct and NAT-safe in
        // production, where a real surrounding DHT of server-mode peers
        // mediates every lookup. This test's "DHT" is just these two nodes
        // with no such mediator, so both must explicitly act as servers for
        // each other or every request comes back "protocol not supported".
        host_swarm.behaviour_mut().kad.set_mode(Some(kad::Mode::Server));
        let host_peer_id = *host_swarm.local_peer_id();

        // Get the host swarm listening on loopback before the guest tries to
        // use it as a "bootstrap" peer.
        let host_listen_addr = loop {
            if let SwarmEvent::NewListenAddr { address, .. } = host_swarm.select_next_some().await {
                if address.iter().any(|p| matches!(p, Protocol::Ip4(ip) if ip.is_loopback())) {
                    break address;
                }
            }
        };
        let host_dial_addr = host_listen_addr.with(Protocol::P2p(host_peer_id));

        let key = room_dht_key(&room_code);
        let _ = host_swarm.behaviour_mut().kad.start_providing(key.clone());

        let host_task = tauri::async_runtime::spawn(run_host_loop(
            host_swarm,
            host_manager.clone(),
            noop_sink(),
            key.clone(),
        ));

        let mut guest_swarm = build_swarm().expect("guest swarm should build");
        guest_swarm.behaviour_mut().kad.set_mode(Some(kad::Mode::Server));
        let guest_local_peer_id = *guest_swarm.local_peer_id();
        guest_swarm
            .behaviour_mut()
            .kad
            .add_address(&host_peer_id, host_dial_addr.clone());
        let _ = guest_swarm.dial(host_dial_addr);

        let user_id = generate_user_id();
        let nickname = "Guest".to_string();
        let mut target_peer: Option<PeerId> = None;
        let mut join_request: Option<request_response::OutboundRequestId> = None;
        let mut get_providers_query: Option<kad::QueryId> = None;

        let local_room = loop {
            let event = tokio::time::timeout(Duration::from_secs(10), guest_swarm.select_next_some())
                .await
                .expect("guest join handshake should not time out");
            match event {
                // Mirrors production `join_room`: only issue the DHT lookup
                // once identify has completed on the connection. Racing
                // ahead and calling `get_providers` right on
                // `ConnectionEstablished` — before the peer is registered as
                // ready in the routing table — makes the query's one and
                // only candidate fail instantly, ending the whole query with
                // zero results instead of retrying.
                SwarmEvent::Behaviour(P2pBehaviourEvent::Identify(identify::Event::Received {
                    peer_id,
                    ..
                })) if peer_id == host_peer_id && get_providers_query.is_none() => {
                    get_providers_query = Some(guest_swarm.behaviour_mut().kad.get_providers(key.clone()));
                }
                SwarmEvent::Behaviour(P2pBehaviourEvent::Kad(kad::Event::OutboundQueryProgressed {
                    id,
                    result: kad::QueryResult::GetProviders(Ok(kad::GetProvidersOk::FoundProviders { providers, .. })),
                    ..
                })) => {
                    if Some(id) == get_providers_query && target_peer.is_none() {
                        if let Some(p) = providers.into_iter().find(|p| *p != guest_local_peer_id) {
                            assert_eq!(p, host_peer_id, "the only provider in this 2-node test must be the host");
                            target_peer = Some(p);
                            let req = guest_swarm.behaviour_mut().sync.send_request(
                                &p,
                                WireMessage::Join {
                                    user_id: user_id.clone(),
                                    nickname: nickname.clone(),
                                },
                            );
                            join_request = Some(req);
                        }
                    }
                }
                SwarmEvent::Behaviour(P2pBehaviourEvent::Sync(request_response::Event::Message {
                    message: request_response::Message::Response { request_id, response },
                    ..
                })) if Some(request_id) == join_request => match response {
                    WireMessage::State { room } => {
                        break guest_manager.apply_remote_room_update(room, &user_id);
                    }
                    other => panic!("unexpected join response: {other:?}"),
                },
                _ => {}
            }
        };

        assert!(!local_room.is_host);
        assert_eq!(local_room.room_code, room_code);
        assert_eq!(local_room.members.len(), 2, "host should now see host+guest");

        let host_peer_for_guest_loop = target_peer.expect("target_peer set once join succeeded");
        let guest_task = tauri::async_runtime::spawn(run_guest_loop(
            guest_swarm,
            guest_manager.clone(),
            noop_sink(),
            user_id,
            host_peer_for_guest_loop,
        ));

        let host_sees_two = wait_until(
            || host_manager.get_room_state().map(|r| r.members.len()).unwrap_or(0) == 2,
            Duration::from_secs(5),
        )
        .await;
        assert!(host_sees_two, "host should observe the guest's membership");

        let playback = SyncPlaybackState {
            video_id: "dQw4w9WgXcQ".to_string(),
            title: "Never Gonna Give You Up".to_string(),
            artist: "Rick Astley".to_string(),
            current_time_secs: 12.5,
            is_playing: true,
            timestamp_ms: 0,
        };
        crate::sync_room::broadcast_playback(&host_manager, playback.clone());

        let guest_got_playback = wait_until(
            || {
                guest_manager
                    .get_room_state()
                    .and_then(|r| r.playback_state)
                    .map(|p| p.video_id == "dQw4w9WgXcQ")
                    .unwrap_or(false)
            },
            Duration::from_secs(5),
        )
        .await;
        assert!(guest_got_playback, "guest should receive the host's playback broadcast over libp2p");

        guest_task.abort();
        host_task.abort();
    }
}
