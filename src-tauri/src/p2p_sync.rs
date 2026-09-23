//! Internet "Listen Together" networking using public, zero-maintenance,
//! free MQTT pub/sub infrastructure (with multiple broker fallback).
//!
//! Two peers on different networks/NATs (e.g. Warsaw and Kraków) cannot
//! discover each other via LAN UDP broadcast. Instead:
//!
//!   1. Both peers connect to a well-known, free public MQTT broker
//!      (e.g., `broker.hivemq.com` with fallback to `broker.emqx.io` or `test.mosquitto.org`).
//!   2. Topics are scoped per room:
//!      - `ytmd/v1/rooms/{CODE}/host` (for guest -> host Join / Leave / Ping)
//!      - `ytmd/v1/rooms/{CODE}/broadcast` (for host -> all guests State / Playback)
//!      - `ytmd/v1/rooms/{CODE}/guest/{USER_ID}` (for direct responses to a specific guest)
//!   3. The exact same `WireMessage` JSON vocabulary is exchanged with zero server hosting costs,
//!      no accounts and no maintenance.
//!
//! The host is present on every broker it can reach, and a guest tries all
//! of them at once and keeps the first that answers with the room. Host and
//! guest used to each pick "the first broker that answers within 2s", in
//! order: a TLS handshake to HiveMQ alone takes ~1.2s from Poland, so a
//! slightly slower guest (other country, first-use root-cert loading on
//! Windows) settled on a different broker than the host and never found the
//! room.

use crate::sync_room::{
    generate_user_id, JoinRequest, LeaveReason, RejectReason, RoomState, RoomStateWire, SyncEventSink,
    SyncRoomManager, WireMessage, PROTOCOL_VERSION,
};
use rumqttc::{AsyncClient, ConnectReturnCode, Event, EventLoop, MqttOptions, Packet, QoS, Transport};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{mpsc, oneshot, watch};
use tokio::time::Instant;

/// TLS, never plaintext MQTT (1883): the payload is room codes, nicknames,
/// and now-playing title/artist, and this traffic transits a public broker
/// over the open internet. Each port is that broker's TLS listener with a
/// publicly-trusted certificate: test.mosquitto.org's 8883 is signed by its
/// own private CA, which rustls (rightly) rejects, so it's 8886 there.
pub const PUBLIC_BROKERS: &[(&str, u16)] = &[
    ("broker.hivemq.com", 8883),
    ("broker.emqx.io", 8883),
    ("test.mosquitto.org", 8886),
];

/// Per-broker time budgets. Brokers are tried in parallel, so these don't
/// add up: a guest's worst case is `connect + join_window`. `join_window`
/// also covers the host still connecting to that broker when the guest's
/// `Join` arrives (host connects in the background).
#[derive(Debug, Clone, Copy)]
pub(crate) struct BrokerTimeouts {
    pub connect: Duration,
    pub join_window: Duration,
}

const BROKER_TIMEOUTS: BrokerTimeouts = BrokerTimeouts {
    connect: Duration::from_secs(6),
    join_window: Duration::from_secs(6),
};
const JOIN_RETRY_INTERVAL: Duration = Duration::from_millis(1000);
/// How long a leaving peer keeps driving its MQTT event loop so the final
/// `Leave` publish actually reaches the broker before the task exits.
const LEAVE_FLUSH_TIMEOUT: Duration = Duration::from_millis(1500);
/// `user_id` a host puts in the `Leave` it publishes on the broadcast topic
/// when it closes the room. Guests never get this id (theirs come from
/// `generate_user_id`, always `user-…`), so it can't collide.
pub(crate) const HOST_CLOSED_USER_ID: &str = "__host__";

/// Publishes `payload` and keeps polling `eventloop` until the broker
/// acknowledges it (or `LEAVE_FLUSH_TIMEOUT` passes). `publish` alone only
/// queues the packet for the event loop; without polling it after, a task
/// that exits right away never actually sends it.
async fn publish_and_flush(client: &AsyncClient, eventloop: &mut EventLoop, topic: &str, payload: Vec<u8>) {
    if client.try_publish(topic, QoS::AtLeastOnce, false, payload).is_err() {
        return;
    }
    let _ = tokio::time::timeout(LEAVE_FLUSH_TIMEOUT, async {
        loop {
            match eventloop.poll().await {
                Ok(Event::Incoming(Packet::PubAck(_))) | Err(_) => break,
                Ok(_) => {}
            }
        }
    })
    .await;
    let _ = client.try_disconnect();
}

pub(crate) fn room_topic_host(room_code: &str) -> String {
    format!("ytmd/v1/rooms/{}/host", room_code.trim().to_uppercase())
}

pub(crate) fn room_topic_broadcast(room_code: &str) -> String {
    format!("ytmd/v1/rooms/{}/broadcast", room_code.trim().to_uppercase())
}

pub(crate) fn room_topic_guest(room_code: &str, user_id: &str) -> String {
    format!(
        "ytmd/v1/rooms/{}/guest/{}",
        room_code.trim().to_uppercase(),
        user_id.trim()
    )
}

fn create_mqtt_client(prefix: &str, host: &str, port: u16) -> (AsyncClient, EventLoop) {
    let client_id = format!("{}-{}-{}", prefix, std::process::id(), rand::random::<u32>());
    let mut mqttoptions = MqttOptions::new(client_id, host, port);
    mqttoptions.set_keep_alive(Duration::from_secs(15));
    mqttoptions.set_clean_session(true);
    mqttoptions.set_transport(Transport::tls_with_default_config());
    AsyncClient::new(mqttoptions, 64)
}

/// Connects to one broker and waits for a successful ConnAck. A timeout is a
/// failure: counting "no answer yet" as connected used to let the host and a
/// guest settle on different brokers and never see each other.
async fn connect_broker(
    prefix: &str,
    host: &str,
    port: u16,
    timeout: Duration,
) -> Result<(AsyncClient, EventLoop), String> {
    let (client, mut eventloop) = create_mqtt_client(prefix, host, port);
    let handshake = tokio::time::timeout(timeout, async {
        loop {
            match eventloop.poll().await {
                Ok(Event::Incoming(Packet::ConnAck(ack))) => {
                    return if ack.code == ConnectReturnCode::Success {
                        Ok(())
                    } else {
                        Err(format!("connection refused ({:?})", ack.code))
                    };
                }
                Ok(_) => {}
                Err(e) => return Err(e.to_string()),
            }
        }
    })
    .await;
    match handshake {
        Ok(Ok(())) => Ok((client, eventloop)),
        Ok(Err(e)) => Err(format!("{host}:{port}: {e}")),
        Err(_) => Err(format!("{host}:{port}: no answer within {timeout:?}")),
    }
}

// ---------------------------------------------------------------------
// Host side
// ---------------------------------------------------------------------

/// Resolves once hosting should stop (`true` sent, or the sender gone).
/// Wraps `wait_for` so its non-`Send` guard never lives in a select! output.
async fn stopped(shutdown: &mut watch::Receiver<bool>) {
    let _ = shutdown.wait_for(|stop| *stop).await;
}

/// Starts hosting `room_code` on every broker in `PUBLIC_BROKERS`, each in
/// its own background task. Every task that connects registers its own
/// entry in the manager's peer map, so each broadcast goes out on every
/// broker. `shutdown` flipping to `true` makes each task say goodbye to its
/// guests and exit (or give up connecting).
pub(crate) fn host_on_all_brokers(
    manager: Arc<SyncRoomManager>,
    sink: Arc<dyn SyncEventSink>,
    room_code: String,
    generation: u64,
    shutdown: watch::Receiver<bool>,
) {
    for &(broker, port) in PUBLIC_BROKERS {
        tauri::async_runtime::spawn(host_on_broker(
            manager.clone(),
            sink.clone(),
            room_code.clone(),
            generation,
            shutdown.clone(),
            broker,
            port,
            BROKER_TIMEOUTS.connect,
        ));
    }
}

#[allow(clippy::too_many_arguments)]
async fn host_on_broker(
    manager: Arc<SyncRoomManager>,
    sink: Arc<dyn SyncEventSink>,
    room_code: String,
    generation: u64,
    mut shutdown: watch::Receiver<bool>,
    broker: &'static str,
    port: u16,
    connect_timeout: Duration,
) {
    let connected = tokio::select! {
        res = connect_broker("ytmd-h", broker, port, connect_timeout) => res,
        _ = stopped(&mut shutdown) => return,
    };
    let (client, eventloop) = match connected {
        Ok(c) => c,
        Err(e) => {
            log::warn!("Listen Together: not hosting over {e}");
            return;
        }
    };
    if *shutdown.borrow() || !manager.is_current_session(generation) {
        let _ = client.try_disconnect();
        return;
    }
    if client.try_subscribe(room_topic_host(&room_code), QoS::AtLeastOnce).is_err() {
        return;
    }
    log::info!("Listen Together: hosting over the internet via {broker}");

    // Keyed by session and broker, so a loop from an older room can never
    // replace (or remove) a newer room's entry.
    let peer_key = format!("internet:{generation}:{broker}");
    let (tx, rx) = mpsc::unbounded_channel::<WireMessage>();
    manager.register_peer(peer_key.clone(), tx);
    run_host_loop(client, eventloop, &manager, &sink, &room_code, rx, shutdown).await;
    manager.unregister_peer(&peer_key);
}

async fn run_host_loop(
    client: AsyncClient,
    mut eventloop: EventLoop,
    manager: &Arc<SyncRoomManager>,
    sink: &Arc<dyn SyncEventSink>,
    room_code: &str,
    mut outbox_rx: mpsc::UnboundedReceiver<WireMessage>,
    mut shutdown: watch::Receiver<bool>,
) {
    let host_topic = room_topic_host(room_code);
    let broadcast_topic = room_topic_broadcast(room_code);
    let reply = |user_id: &str, msg: &WireMessage| {
        if let Ok(payload) = serde_json::to_vec(msg) {
            let _ = client.try_publish(room_topic_guest(room_code, user_id), QoS::AtLeastOnce, false, payload);
        }
    };

    loop {
        tokio::select! {
            _ = stopped(&mut shutdown) => {
                let closed = WireMessage::Leave { user_id: HOST_CLOSED_USER_ID.to_string() };
                if let Ok(payload) = serde_json::to_vec(&closed) {
                    publish_and_flush(&client, &mut eventloop, &broadcast_topic, payload).await;
                }
                return;
            }
            Some(msg) = outbox_rx.recv() => {
                // `try_publish`, not `publish().await`: the request queue is
                // drained by `eventloop.poll()` in this same loop, so awaiting
                // room in a full queue here could never make progress.
                if let Ok(payload) = serde_json::to_vec(&msg) {
                    let _ = client.try_publish(&broadcast_topic, QoS::AtLeastOnce, false, payload);
                }
            }
            event = eventloop.poll() => {
                match event {
                    Ok(Event::Incoming(Packet::Publish(publish))) if publish.topic == host_topic => {
                        let Ok(msg) = serde_json::from_slice::<WireMessage>(&publish.payload) else {
                            continue;
                        };
                        match msg {
                            // Guests re-send `Join` until they hear back, on
                            // every broker at once; a repeat from a current
                            // member just gets the state again instead of a
                            // duplicate entry.
                            WireMessage::Join { user_id, .. } if manager.has_member(&user_id) => {
                                manager.touch_member(&user_id);
                                if let Some(room) = manager.get_room_state() {
                                    reply(&user_id, &WireMessage::State { room: RoomStateWire::from(&room) });
                                }
                            }
                            WireMessage::Join { user_id, nickname, client_id, protocol } => {
                                let join = JoinRequest { user_id: user_id.clone(), nickname, client_id, protocol };
                                match manager.admit_member(join) {
                                    Ok(admission) => {
                                        if let Some(old) = &admission.replaced {
                                            manager.unregister_peer(old);
                                        }
                                        reply(&user_id, &WireMessage::State { room: RoomStateWire::from(&admission.room) });
                                        manager.announce_room(&admission.room, sink);
                                    }
                                    Err(reason) => reply(&user_id, &WireMessage::Rejected { user_id: user_id.clone(), reason }),
                                }
                            }
                            WireMessage::Heartbeat { user_id } => manager.touch_member(&user_id),
                            WireMessage::Control { user_id, action } => {
                                manager.handle_guest_control(&user_id, action, sink);
                            }
                            WireMessage::Moderate { user_id, action } => {
                                manager.handle_guest_moderation(&user_id, action, sink);
                            }
                            WireMessage::Leave { user_id } => {
                                manager.unregister_peer(&user_id);
                                if let Some(room) = manager.remove_member(&user_id) {
                                    manager.announce_room(&room, sink);
                                }
                            }
                            _ => {}
                        }
                    }
                    Ok(_) => {}
                    Err(e) => {
                        log::debug!("Host MQTT eventloop error: {:?}", e);
                        tokio::time::sleep(Duration::from_millis(500)).await;
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------
// Guest side
// ---------------------------------------------------------------------

/// i18n keys (`src/ui/i18n.ts`) the sync window shows for a failed join.
fn not_found_err() -> String {
    "sync.error.notFound".to_string()
}

/// No broker answered at all: this network blocks outgoing MQTT over TLS
/// (school/office firewalls often allow only web ports), or there's no
/// internet. Different advice than "check the code", so a different message.
fn unreachable_err() -> String {
    "sync.error.noInternet".to_string()
}

pub(crate) async fn join_room(
    manager: &Arc<SyncRoomManager>,
    sink: Arc<dyn SyncEventSink>,
    room_code: String,
    nickname: String,
) -> Result<RoomState, String> {
    join_room_via(manager, sink, room_code, nickname, PUBLIC_BROKERS, BROKER_TIMEOUTS).await
}

/// How one broker's join attempt ended.
enum Attempt {
    Joined {
        client: AsyncClient,
        eventloop: Box<EventLoop>,
        room: RoomStateWire,
    },
    Rejected(RejectReason),
    /// Broker reachable, but no host answered for this code.
    NoRoom,
    Unreachable,
}

/// Tries every broker at once and keeps the first that lets us in. Our
/// `Join` carries one member id on every broker, so the host (present on
/// all of them) adds us once whichever arrives first.
async fn join_room_via(
    manager: &Arc<SyncRoomManager>,
    sink: Arc<dyn SyncEventSink>,
    room_code: String,
    nickname: String,
    brokers: &[(&'static str, u16)],
    timeouts: BrokerTimeouts,
) -> Result<RoomState, String> {
    let clean_code = room_code.trim().to_uppercase();
    let user_id = generate_user_id();
    let join = WireMessage::Join {
        user_id: user_id.clone(),
        nickname,
        client_id: manager.client_id().to_string(),
        protocol: PROTOCOL_VERSION,
    };
    let join_payload = serde_json::to_vec(&join).map_err(|e| e.to_string())?;

    let mut attempts = tokio::task::JoinSet::new();
    for &(host, port) in brokers {
        attempts.spawn(attempt_join(
            host,
            port,
            timeouts,
            clean_code.clone(),
            user_id.clone(),
            join_payload.clone(),
        ));
    }

    let mut any_reachable = false;
    while let Some(result) = attempts.join_next().await {
        match result {
            Ok(Attempt::Joined { client, eventloop, room }) => {
                // The other attempts' connections close as they're dropped.
                attempts.abort_all();
                return start_guest_session(manager, sink, client, *eventloop, room, &clean_code, &user_id);
            }
            Ok(Attempt::Rejected(reason)) => {
                attempts.abort_all();
                return Err(reason.message_key());
            }
            Ok(Attempt::NoRoom) => any_reachable = true,
            Ok(Attempt::Unreachable) | Err(_) => {}
        }
    }
    Err(if any_reachable { not_found_err() } else { unreachable_err() })
}

/// One broker's join handshake: publish `Join` (re-sent every
/// `JOIN_RETRY_INTERVAL`) and wait up to `join_window` for a `State` that
/// lists us, or a `Rejected` addressed to us.
async fn attempt_join(
    host: &'static str,
    port: u16,
    timeouts: BrokerTimeouts,
    code: String,
    user_id: String,
    join_payload: Vec<u8>,
) -> Attempt {
    let (client, mut eventloop) = match connect_broker("ytmd-g", host, port, timeouts.connect).await {
        Ok(connected) => connected,
        Err(e) => {
            log::info!("Listen Together: broker unavailable: {e}");
            return Attempt::Unreachable;
        }
    };
    log::info!("Listen Together: looking for room via broker {host}");

    let guest_topic = room_topic_guest(&code, &user_id);
    let broadcast_topic = room_topic_broadcast(&code);
    let host_topic = room_topic_host(&code);
    // The broker handles one connection's packets in order, so both
    // subscriptions are in place before it sees the Join.
    let queued = client.try_subscribe(&guest_topic, QoS::AtLeastOnce).is_ok()
        && client.try_subscribe(&broadcast_topic, QoS::AtLeastOnce).is_ok()
        && client
            .try_publish(&host_topic, QoS::AtLeastOnce, false, join_payload.clone())
            .is_ok();
    if !queued {
        return Attempt::NoRoom;
    }

    let deadline = Instant::now() + timeouts.join_window;
    let mut last_join = Instant::now();
    loop {
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            let _ = client.try_disconnect();
            return Attempt::NoRoom;
        }
        if last_join.elapsed() >= JOIN_RETRY_INTERVAL {
            let _ = client.try_publish(&host_topic, QoS::AtLeastOnce, false, join_payload.clone());
            last_join = Instant::now();
        }

        match tokio::time::timeout(remaining.min(JOIN_RETRY_INTERVAL), eventloop.poll()).await {
            Ok(Ok(Event::Incoming(Packet::Publish(publish))))
                if publish.topic == guest_topic || publish.topic == broadcast_topic =>
            {
                match serde_json::from_slice::<WireMessage>(&publish.payload) {
                    // A broadcast `State` from another guest's join can
                    // arrive before ours is processed; only a state that
                    // lists us means we're in.
                    Ok(WireMessage::State { room }) if room.has_member(&user_id) => {
                        return Attempt::Joined { client, eventloop: Box::new(eventloop), room };
                    }
                    Ok(WireMessage::Rejected { user_id: to, reason }) if to == user_id => {
                        let _ = client.try_disconnect();
                        return Attempt::Rejected(reason);
                    }
                    _ => {}
                }
            }
            Ok(Ok(_)) | Err(_) => {}
            Ok(Err(e)) => {
                log::debug!("Guest MQTT join poll error: {:?}", e);
                tokio::time::sleep(Duration::from_millis(200)).await;
            }
        }
    }
}

fn start_guest_session(
    manager: &Arc<SyncRoomManager>,
    sink: Arc<dyn SyncEventSink>,
    client: AsyncClient,
    eventloop: EventLoop,
    room: RoomStateWire,
    code: &str,
    user_id: &str,
) -> Result<RoomState, String> {
    let generation = manager.begin_session();
    let local_room = manager
        .apply_remote_room_update(room, user_id, generation)
        .ok_or("Left the room while joining.")?;
    // See `connect_to_host`: the injected page must learn it joined.
    sink.room_updated(&local_room);

    let m = manager.clone();
    let uid = user_id.to_string();
    let rcode = code.to_string();
    let (shutdown_tx, shutdown_rx) = oneshot::channel();
    let (outbox, outbox_rx) = mpsc::unbounded_channel();
    let reader_task = tauri::async_runtime::spawn(async move {
        run_guest_loop(client, eventloop, m, sink, uid, rcode, shutdown_rx, outbox_rx, generation).await;
    });
    manager.set_p2p_guest_session(reader_task, shutdown_tx, user_id.to_string(), outbox);
    Ok(local_room)
}

#[allow(clippy::too_many_arguments)]
async fn run_guest_loop(
    client: AsyncClient,
    mut eventloop: EventLoop,
    manager: Arc<SyncRoomManager>,
    sink: Arc<dyn SyncEventSink>,
    my_user_id: String,
    room_code: String,
    mut shutdown_rx: oneshot::Receiver<()>,
    mut outbox_rx: mpsc::UnboundedReceiver<WireMessage>,
    generation: u64,
) {
    let guest_topic = room_topic_guest(&room_code, &my_user_id);
    let broadcast_topic = room_topic_broadcast(&room_code);
    let host_topic = room_topic_host(&room_code);
    let heartbeat = serde_json::to_vec(&WireMessage::Heartbeat { user_id: my_user_id.clone() }).unwrap_or_default();
    let mut ticker = tokio::time::interval(manager.liveness.heartbeat_interval);
    ticker.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
    let mut last_heard = Instant::now();

    let reason = loop {
        let event = tokio::select! {
            // `leave_room` already cleared local state; only tell the host.
            _ = &mut shutdown_rx => {
                let leave = WireMessage::Leave { user_id: my_user_id.clone() };
                if let Ok(payload) = serde_json::to_vec(&leave) {
                    publish_and_flush(&client, &mut eventloop, &host_topic, payload).await;
                }
                return;
            }
            _ = ticker.tick() => {
                // The host pings every interval; this much silence means it's
                // gone without a goodbye (crash, sleep, lost network).
                if last_heard.elapsed() > manager.liveness.timeout {
                    log::info!("Listen Together: host silent, leaving room");
                    break LeaveReason::Lost;
                }
                let _ = client.try_publish(&host_topic, QoS::AtMostOnce, false, heartbeat.clone());
                continue;
            }
            Some(msg) = outbox_rx.recv() => {
                if let Ok(payload) = serde_json::to_vec(&msg) {
                    let _ = client.try_publish(&host_topic, QoS::AtLeastOnce, false, payload);
                }
                continue;
            }
            event = eventloop.poll() => event,
        };
        match event {
            Ok(Event::Incoming(Packet::Publish(publish))) => {
                if publish.topic != guest_topic && publish.topic != broadcast_topic {
                    continue;
                }
                last_heard = Instant::now();
                let Ok(msg) = serde_json::from_slice::<WireMessage>(&publish.payload) else {
                    continue;
                };
                match msg {
                    WireMessage::Kicked { user_id } if user_id == my_user_id => break LeaveReason::Kicked,
                    // The host dropped us (e.g. evicted after a network
                    // blip): its broadcasts keep arriving, but we're no
                    // longer a member, so stop acting like one.
                    WireMessage::State { room } if !room.has_member(&my_user_id) => break LeaveReason::Lost,
                    WireMessage::State { room } => match manager.apply_remote_room_update(room, &my_user_id, generation) {
                        Some(local) => sink.room_updated(&local),
                        None => return, // a newer session owns the state now
                    },
                    WireMessage::Playback { state } => {
                        if !manager.apply_remote_playback(state.clone(), generation) {
                            return;
                        }
                        sink.playback_updated(&state);
                    }
                    WireMessage::Leave { user_id } if user_id == HOST_CLOSED_USER_ID => break LeaveReason::Closed,
                    _ => {}
                }
            }
            Ok(_) => {}
            Err(e) => {
                log::debug!("Guest MQTT eventloop error: {:?}", e);
                tokio::time::sleep(Duration::from_millis(500)).await;
            }
        }
    };

    let _ = client.try_disconnect();
    if manager.clear_guest_if_current(generation) {
        sink.room_left(reason);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sync_room::{MemberRole, RoomMember, SyncControlRequest, SyncPlaybackState};

    #[derive(Default)]
    struct RecordingSink {
        left: parking_lot::Mutex<Vec<LeaveReason>>,
    }
    impl SyncEventSink for RecordingSink {
        fn room_updated(&self, _room: &RoomState) {}
        fn playback_updated(&self, _state: &SyncPlaybackState) {}
        fn room_left(&self, reason: LeaveReason) {
            self.left.lock().push(reason);
        }
        fn control_requested(&self, _request: &SyncControlRequest) {}
    }
    fn noop_sink() -> Arc<dyn SyncEventSink> {
        Arc::new(RecordingSink::default())
    }

    /// Accepts TCP connections and never answers: a broker that's up at the
    /// socket level but never completes the TLS/MQTT handshake.
    async fn silent_listener() -> (u16, tokio::task::JoinHandle<()>) {
        let listener = tokio::net::TcpListener::bind(("127.0.0.1", 0)).await.unwrap();
        let port = listener.local_addr().unwrap().port();
        let task = tokio::spawn(async move {
            let mut held = Vec::new();
            while let Ok((stream, _)) = listener.accept().await {
                held.push(stream);
            }
        });
        (port, task)
    }

    /// Regression: a handshake that timed out used to count as "connected".
    #[tokio::test]
    async fn test_unanswered_broker_is_not_treated_as_connected() {
        let (port, task) = silent_listener().await;
        let res = connect_broker("ytmd-test", "127.0.0.1", port, Duration::from_millis(300)).await;
        assert!(res.is_err(), "no ConnAck must mean not connected");
        task.abort();
    }

    /// With no broker answering, the guest says so (network problem), not
    /// "room not found" (wrong code), and gives up within one broker's
    /// budget, since brokers are tried in parallel.
    #[tokio::test]
    async fn test_guest_join_with_no_reachable_broker_reports_network_problem() {
        let (silent_port, task) = silent_listener().await;
        let closed_port = {
            let l = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
            l.local_addr().unwrap().port()
        };
        let brokers: &[(&'static str, u16)] = &[("127.0.0.1", silent_port), ("127.0.0.1", closed_port)];
        let timeouts = BrokerTimeouts {
            connect: Duration::from_millis(1500),
            join_window: Duration::from_millis(300),
        };
        let manager = Arc::new(SyncRoomManager::new());

        let started = Instant::now();
        let res = join_room_via(&manager, noop_sink(), "YTMD-NOPE".into(), "G".into(), brokers, timeouts).await;
        assert_eq!(res.err(), Some(unreachable_err()));
        // In parallel: ~one connect budget, not the sum over brokers. Loose
        // bound: first-use TLS setup (loading native root certs) alone took
        // seconds on CI runners.
        assert!(started.elapsed() < Duration::from_secs(6), "took {:?}", started.elapsed());
        assert!(manager.get_room_state().is_none());
        task.abort();
    }

    #[test]
    fn test_room_topics_are_deterministic_and_case_insensitive() {
        let h1 = room_topic_host("YTMD-ABCDEFGHJK");
        let h2 = room_topic_host("ytmd-abcdefghjk");
        assert_eq!(h1, "ytmd/v1/rooms/YTMD-ABCDEFGHJK/host");
        assert_eq!(h1, h2);

        let b1 = room_topic_broadcast("YTMD-ABCDEFGHJK");
        assert_eq!(b1, "ytmd/v1/rooms/YTMD-ABCDEFGHJK/broadcast");

        let g1 = room_topic_guest("YTMD-ABCDEFGHJK", "user-1234");
        assert_eq!(g1, "ytmd/v1/rooms/YTMD-ABCDEFGHJK/guest/user-1234");
    }

    #[test]
    fn test_public_brokers_use_tls_listeners() {
        // Room codes, nicknames, and now-playing metadata cross these
        // brokers over the open internet: never the plaintext port, and
        // create_mqtt_client must actually select a TLS transport.
        assert!(!PUBLIC_BROKERS.is_empty());
        for (host, port) in PUBLIC_BROKERS {
            assert_ne!(*port, 1883, "{host} must use its TLS port, not plaintext 1883");
        }
        // Regression: test.mosquitto.org's 8883 uses a private CA that rustls
        // rejects, so that broker never worked; 8886 is its Let's Encrypt one.
        assert!(PUBLIC_BROKERS.contains(&("test.mosquitto.org", 8886)));

        let (client, eventloop) = create_mqtt_client("test", PUBLIC_BROKERS[0].0, PUBLIC_BROKERS[0].1);
        assert!(
            matches!(eventloop.mqtt_options.transport(), rumqttc::Transport::Tls(_)),
            "create_mqtt_client must configure a TLS transport, not plaintext TCP"
        );
        drop(client);
    }

    #[test]
    fn test_join_carries_client_id_and_protocol() {
        let join = WireMessage::Join {
            user_id: "user-abc".to_string(),
            nickname: "Guest".to_string(),
            client_id: "c0ffee".to_string(),
            protocol: PROTOCOL_VERSION,
        };
        let bytes = serde_json::to_vec(&join).expect("serialize join");
        match serde_json::from_slice(&bytes).expect("deserialize join") {
            WireMessage::Join { user_id, nickname, client_id, protocol } => {
                assert_eq!((user_id.as_str(), nickname.as_str(), client_id.as_str()), ("user-abc", "Guest", "c0ffee"));
                assert_eq!(protocol, PROTOCOL_VERSION);
            }
            _ => panic!("Expected Join variant"),
        }
        // A pre-2 guest's Join still parses (then gets rejected as outdated).
        let old: WireMessage = serde_json::from_str(r#"{"type":"Join","user_id":"u","nickname":"n"}"#).unwrap();
        assert!(matches!(old, WireMessage::Join { protocol: 0, ref client_id, .. } if client_id.is_empty()));
    }

    /// Polls done for up to 8s: public brokers are slow and uneven, so a
    /// fixed sleep either wastes time or flakes.
    async fn eventually(done: impl Fn() -> bool) {
        let deadline = Instant::now() + Duration::from_secs(8);
        while !done() && Instant::now() < deadline {
            tokio::time::sleep(Duration::from_millis(50)).await;
        }
    }

    /// Needs the internet (public brokers); returns early without them.
    /// Covers the whole internet path: join via any broker, playback, kick
    /// (guest learns why), banned rejoin, and the host closing the room.
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn test_internet_join_kick_and_ban() {
        let room_code = format!("YTMD-TEST-{}", rand::random::<u32>());
        let host_manager = Arc::new(SyncRoomManager::new());
        let guest_manager = Arc::new(SyncRoomManager::new().with_client_id("guest-install-1".into()));
        let host_sink: Arc<dyn SyncEventSink> = Arc::new(RecordingSink::default());
        let guest_sink = Arc::new(RecordingSink::default());

        let generation = host_manager.begin_session();
        host_manager.set_local_room(RoomState {
            room_code: room_code.clone(),
            is_host: true,
            current_user_id: "host-user-1".to_string(),
            members: vec![RoomMember {
                id: "host-user-1".to_string(),
                nickname: "Host".to_string(),
                is_host: true,
                joined_at_ms: 1000,
                role: MemberRole::Host,
            }],
            playback_state: None,
            default_role: MemberRole::Dj,
            banned: Vec::new(),
        });
        let (shutdown_tx, shutdown_rx) = watch::channel(false);
        host_on_all_brokers(host_manager.clone(), host_sink.clone(), room_code.clone(), generation, shutdown_rx);

        let Ok(guest_room) = join_room(&guest_manager, guest_sink.clone(), room_code.clone(), "Guest".into()).await else {
            eprintln!("no public broker reachable, skipping");
            let _ = shutdown_tx.send(true);
            return;
        };
        assert_eq!(guest_room.members.len(), 2);
        assert_eq!(guest_room.members[1].role, MemberRole::Dj);
        let guest_id = guest_room.current_user_id.clone();

        host_manager.broadcast_to_peers(&WireMessage::Playback {
            state: SyncPlaybackState {
                video_id: "dQw4w9WgXcQ".to_string(),
                title: "Test Track".to_string(),
                artist: "Test Artist".to_string(),
                current_time_secs: 42.0,
                is_playing: true,
                timestamp_ms: 2000,
            },
        });
        let delivered = || guest_manager.get_room_state().and_then(|r| r.playback_state).is_some();
        eventually(delivered).await;
        let got = guest_manager.get_room_state().and_then(|r| r.playback_state).map(|p| p.video_id);
        assert_eq!(got.as_deref(), Some("dQw4w9WgXcQ"));

        host_manager.kick("host-user-1", &guest_id, &host_sink).unwrap();
        eventually(|| !guest_sink.left.lock().is_empty()).await;
        assert_eq!(guest_sink.left.lock().as_slice(), &[LeaveReason::Kicked]);
        assert!(guest_manager.get_room_state().is_none());

        let again = join_room(&guest_manager, guest_sink.clone(), room_code.clone(), "Guest".into()).await;
        assert_eq!(again.err().as_deref(), Some("sync.error.banned"));

        host_manager.unban("guest-install-1", &host_sink).unwrap();
        join_room(&guest_manager, guest_sink.clone(), room_code, "Guest".into())
            .await
            .expect("unbanned guest can come back");

        // Host closing the room must reach the internet guest too.
        let _ = shutdown_tx.send(true);
        eventually(|| guest_manager.get_room_state().is_none()).await;
        assert!(guest_manager.get_room_state().is_none(), "guest still thinks it's in a closed room");
        assert_eq!(guest_sink.left.lock().last(), Some(&LeaveReason::Closed));
    }
}
