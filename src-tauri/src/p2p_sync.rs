//! Internet "Listen Together" networking over free public MQTT brokers.
//!
//! Two peers on different networks/NATs can't find each other with the LAN
//! beacon, so both connect out to public brokers and exchange the same
//! `WireMessage`s as the LAN transport over per-room topics:
//!
//!   - `ytmd/v2/{TOPIC_ID}/host`: guests -> host
//!   - `ytmd/v2/{TOPIC_ID}/broadcast`: host -> every guest
//!   - `ytmd/v2/{TOPIC_ID}/guest/{USER_ID}`: host -> one guest
//!
//! `TOPIC_ID` is derived from the room code and every payload is sealed with
//! the room key (`sync_crypto.rs`), so the brokers see neither the code nor
//! what's playing.
//!
//! The host is present on every broker it can reach, and a guest tries all
//! of them at once and keeps the first that answers with the room. Host and
//! guest used to each pick "the first broker that answers within 2s", in
//! order: a TLS handshake to HiveMQ alone takes ~1.2s from Poland, so a
//! slightly slower guest (other country, first-use root-cert loading on
//! Windows) settled on a different broker than the host and never found the
//! room.

use crate::sync_crypto::RoomCipher;
use crate::sync_room::{
    generate_user_id, guest_ended, apply_host_message, GuestEnd, JoinDecision, JoinRequest, LeaveReason,
    RejectReason, RoomState, RoomStateWire, SyncEventSink, SyncRoomManager, WireMessage, APPROVAL_TIMEOUT,
    ERR_NOT_FOUND, PROTOCOL_VERSION,
};
use rumqttc::{AsyncClient, ConnectReturnCode, Event, EventLoop, MqttOptions, Packet, QoS, Transport};
use serde::Serialize;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{mpsc, oneshot, watch};
use tokio::time::Instant;

/// TLS, never plaintext MQTT (1883). Each port is that broker's TLS listener
/// with a publicly-trusted certificate: test.mosquitto.org's 8883 is signed
/// by its own private CA, which rustls (rightly) rejects, so it's 8886 there.
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
/// How long a stopping peer keeps driving its MQTT event loop so its last
/// publishes actually reach the broker before the task exits.
const FLUSH_TIMEOUT: Duration = Duration::from_millis(1500);

/// Keeps polling `eventloop` until the broker acknowledged `publishes`
/// messages (or `FLUSH_TIMEOUT` passes), then disconnects. `try_publish`
/// only queues a packet; a task that exits right after never sends it.
async fn flush_and_disconnect(client: &AsyncClient, eventloop: &mut EventLoop, publishes: usize) {
    let mut acked = 0;
    let _ = tokio::time::timeout(FLUSH_TIMEOUT, async {
        while acked < publishes {
            match eventloop.poll().await {
                Ok(Event::Incoming(Packet::PubAck(_))) => acked += 1,
                Err(_) => break,
                Ok(_) => {}
            }
        }
    })
    .await;
    let _ = client.try_disconnect();
}

pub(crate) fn room_topic_host(topic_id: &str) -> String {
    format!("ytmd/v2/{topic_id}/host")
}

pub(crate) fn room_topic_broadcast(topic_id: &str) -> String {
    format!("ytmd/v2/{topic_id}/broadcast")
}

pub(crate) fn room_topic_guest(topic_id: &str, user_id: &str) -> String {
    format!("ytmd/v2/{topic_id}/guest/{}", user_id.trim())
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
// Connection test
// ---------------------------------------------------------------------

/// One broker's result in the sync window's connection test.
#[derive(Debug, Clone, Serialize)]
pub struct BrokerProbe {
    pub broker: String,
    pub reachable: bool,
    /// Time to a completed TLS + MQTT handshake.
    pub millis: u64,
    pub error: Option<String>,
}

/// Connects to every broker at once, the way a join does, and reports each.
pub async fn probe_brokers() -> Vec<BrokerProbe> {
    probe(PUBLIC_BROKERS, BROKER_TIMEOUTS.connect).await
}

async fn probe(brokers: &[(&'static str, u16)], timeout: Duration) -> Vec<BrokerProbe> {
    let probes = brokers.iter().map(|&(host, port)| async move {
        let started = Instant::now();
        let result = connect_broker("ytmd-t", host, port, timeout).await;
        let millis = started.elapsed().as_millis() as u64;
        match result {
            Ok((client, _eventloop)) => {
                let _ = client.try_disconnect();
                BrokerProbe { broker: host.to_string(), reachable: true, millis, error: None }
            }
            Err(e) => BrokerProbe { broker: host.to_string(), reachable: false, millis, error: Some(e) },
        }
    });
    futures_join_all(probes).await
}

/// Runs `futures` concurrently and returns their outputs in order.
async fn futures_join_all<F: std::future::Future + Send + 'static>(futures: impl Iterator<Item = F>) -> Vec<F::Output>
where
    F::Output: Send + 'static,
{
    let handles: Vec<_> = futures.map(tokio::spawn).collect();
    let mut out = Vec::with_capacity(handles.len());
    for h in handles {
        if let Ok(v) = h.await {
            out.push(v);
        }
    }
    out
}

// ---------------------------------------------------------------------
// Host side
// ---------------------------------------------------------------------

/// Resolves once hosting should stop (`true` sent, or the sender gone).
/// Wraps `wait_for` so its non-`Send` guard never lives in a select! output.
async fn stopped(shutdown: &mut watch::Receiver<bool>) {
    let _ = shutdown.wait_for(|stop| *stop).await;
}

/// Starts hosting the room on every broker in `PUBLIC_BROKERS`, each in its
/// own background task. Every task that connects registers its own entry in
/// the manager's peer map, so each broadcast goes out on every broker.
pub(crate) fn host_on_all_brokers(
    manager: Arc<SyncRoomManager>,
    sink: Arc<dyn SyncEventSink>,
    cipher: Arc<RoomCipher>,
    generation: u64,
    shutdown: watch::Receiver<bool>,
) {
    for &(broker, port) in PUBLIC_BROKERS {
        tauri::async_runtime::spawn(host_on_broker(
            manager.clone(),
            sink.clone(),
            cipher.clone(),
            generation,
            shutdown.clone(),
            broker,
            port,
        ));
    }
}

async fn host_on_broker(
    manager: Arc<SyncRoomManager>,
    sink: Arc<dyn SyncEventSink>,
    cipher: Arc<RoomCipher>,
    generation: u64,
    mut shutdown: watch::Receiver<bool>,
    broker: &'static str,
    port: u16,
) {
    let connected = tokio::select! {
        res = connect_broker("ytmd-h", broker, port, BROKER_TIMEOUTS.connect) => res,
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
    if client.try_subscribe(room_topic_host(cipher.topic_id()), QoS::AtLeastOnce).is_err() {
        return;
    }
    log::info!("Listen Together: hosting over the internet via {broker}");

    // Keyed by session and broker, so a loop from an older room can never
    // replace (or remove) a newer room's entry.
    let peer_key = format!("internet:{generation}:{broker}");
    let (tx, rx) = mpsc::unbounded_channel::<WireMessage>();
    manager.register_peer(peer_key.clone(), tx);
    run_host_loop(client, eventloop, &manager, &sink, &cipher, rx, shutdown).await;
    manager.unregister_peer(&peer_key);
}

async fn run_host_loop(
    client: AsyncClient,
    mut eventloop: EventLoop,
    manager: &Arc<SyncRoomManager>,
    sink: &Arc<dyn SyncEventSink>,
    cipher: &RoomCipher,
    mut outbox_rx: mpsc::UnboundedReceiver<WireMessage>,
    mut shutdown: watch::Receiver<bool>,
) {
    let host_topic = room_topic_host(cipher.topic_id());
    let broadcast_topic = room_topic_broadcast(cipher.topic_id());
    // `try_publish`, not `publish().await`: the request queue is drained by
    // `eventloop.poll()` in this same loop, so awaiting room in a full queue
    // here could never make progress.
    let publish = |topic: &str, msg: &WireMessage| match cipher.seal_msg(msg) {
        Some(payload) => client.try_publish(topic, QoS::AtLeastOnce, false, payload).is_ok(),
        None => false,
    };
    let reply = |user_id: &str, msg: &WireMessage| {
        publish(&room_topic_guest(cipher.topic_id(), user_id), msg);
    };

    loop {
        tokio::select! {
            _ = stopped(&mut shutdown) => {
                // Whatever was broadcast just before stopping (the room's
                // `Leave`, or a `HostHandoff`) must still go out.
                let mut sent = 0;
                while let Ok(msg) = outbox_rx.try_recv() {
                    if publish(&broadcast_topic, &msg) {
                        sent += 1;
                    }
                }
                flush_and_disconnect(&client, &mut eventloop, sent).await;
                return;
            }
            Some(msg) = outbox_rx.recv() => {
                publish(&broadcast_topic, &msg);
            }
            event = eventloop.poll() => {
                match event {
                    Ok(Event::Incoming(Packet::Publish(incoming))) if incoming.topic == host_topic => {
                        let Some(msg) = cipher.open_msg(&incoming.payload) else {
                            continue;
                        };
                        match msg {
                            // Guests re-send `Join` until they hear back, on
                            // every broker at once; a repeat from a current
                            // member just gets the state again.
                            WireMessage::Join { user_id, .. } if manager.has_member(&user_id) => {
                                manager.touch_member(&user_id);
                                if let Some(room) = manager.get_room_state() {
                                    reply(&user_id, &WireMessage::State { room: RoomStateWire::from(&room) });
                                }
                            }
                            WireMessage::Join { user_id, nickname, client_id, protocol } => {
                                let join = JoinRequest { user_id: user_id.clone(), nickname, client_id, protocol };
                                match manager.admit_member(join) {
                                    Ok(JoinDecision::Admitted(admission)) => {
                                        if let Some(old) = &admission.replaced {
                                            manager.unregister_peer(old);
                                        }
                                        reply(&user_id, &WireMessage::State { room: RoomStateWire::from(&admission.room) });
                                        manager.announce_room(&admission.room, sink);
                                    }
                                    Ok(JoinDecision::Pending { new }) => {
                                        if new {
                                            if let Some(room) = manager.get_room_state() {
                                                sink.room_updated(&room);
                                            }
                                        }
                                        reply(&user_id, &WireMessage::Pending { user_id: user_id.clone() });
                                    }
                                    Err(reason) => reply(&user_id, &WireMessage::Rejected { user_id: user_id.clone(), reason }),
                                }
                            }
                            WireMessage::Heartbeat { user_id } => manager.touch_member(&user_id),
                            WireMessage::Leave { user_id } => {
                                manager.drop_pending(&user_id, sink);
                                if let Some(room) = manager.remove_member(&user_id) {
                                    manager.announce_room(&room, sink);
                                }
                            }
                            other => {
                                if let Some(sender) = sender_of(&other) {
                                    let sender = sender.to_string();
                                    manager.handle_guest_message(&sender, other, sink);
                                }
                            }
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

/// Who sent a guest -> host request (the MQTT transport has no connection
/// identity, so the message says).
fn sender_of(msg: &WireMessage) -> Option<&str> {
    match msg {
        WireMessage::Control { user_id, .. }
        | WireMessage::Moderate { user_id, .. }
        | WireMessage::VoteSkip { user_id }
        | WireMessage::Reaction { user_id, .. }
        | WireMessage::QueueAdd { user_id, .. }
        | WireMessage::QueueRemove { user_id, .. }
        | WireMessage::QueuePlay { user_id, .. } => Some(user_id),
        _ => None,
    }
}

// ---------------------------------------------------------------------
// Guest side
// ---------------------------------------------------------------------

/// No broker answered at all: this network blocks outgoing MQTT over TLS
/// (school/office firewalls often allow only web ports), or there's no
/// internet. Different advice than "check the code", so a different message.
fn unreachable_err() -> String {
    "sync.error.noInternet".to_string()
}

pub(crate) async fn join_room(
    manager: &Arc<SyncRoomManager>,
    sink: Arc<dyn SyncEventSink>,
    cipher: Arc<RoomCipher>,
    nickname: String,
) -> Result<RoomState, String> {
    join_room_via(manager, sink, cipher, nickname, PUBLIC_BROKERS, BROKER_TIMEOUTS).await
}

/// How one broker's join attempt ended.
enum Attempt {
    Joined(Box<(AsyncClient, EventLoop, RoomStateWire)>),
    Rejected(RejectReason),
    /// Broker reachable, but no host answered for this room.
    NoRoom,
    Unreachable,
}

/// Tries every broker at once and keeps the first that lets us in. Our
/// `Join` carries one member id on every broker, so the host (present on
/// all of them) adds us once whichever arrives first.
async fn join_room_via(
    manager: &Arc<SyncRoomManager>,
    sink: Arc<dyn SyncEventSink>,
    cipher: Arc<RoomCipher>,
    nickname: String,
    brokers: &[(&'static str, u16)],
    timeouts: BrokerTimeouts,
) -> Result<RoomState, String> {
    let user_id = generate_user_id();
    let join = WireMessage::Join {
        user_id: user_id.clone(),
        nickname,
        client_id: manager.client_id().to_string(),
        protocol: PROTOCOL_VERSION,
    };
    let join_payload = cipher.seal_msg(&join).ok_or("encryption failed")?;

    let mut attempts = tokio::task::JoinSet::new();
    for &(host, port) in brokers {
        attempts.spawn(attempt_join(
            host,
            port,
            timeouts,
            cipher.clone(),
            user_id.clone(),
            join_payload.clone(),
            sink.clone(),
        ));
    }

    let mut any_reachable = false;
    while let Some(result) = attempts.join_next().await {
        match result {
            Ok(Attempt::Joined(joined)) => {
                let (client, eventloop, room) = *joined;
                // The other attempts' connections close as they're dropped.
                attempts.abort_all();
                return start_guest_session(manager, sink, client, eventloop, room, cipher, &user_id);
            }
            Ok(Attempt::Rejected(reason)) => {
                attempts.abort_all();
                return Err(reason.message_key());
            }
            Ok(Attempt::NoRoom) => any_reachable = true,
            Ok(Attempt::Unreachable) | Err(_) => {}
        }
    }
    Err(if any_reachable { ERR_NOT_FOUND.to_string() } else { unreachable_err() })
}

/// One broker's join handshake: publish `Join` (re-sent every
/// `JOIN_RETRY_INTERVAL`) and wait up to `join_window` for a `State` that
/// lists us, or a `Rejected` addressed to us. A `Pending` reply (the host
/// must approve us) extends the wait to `APPROVAL_TIMEOUT`.
async fn attempt_join(
    host: &'static str,
    port: u16,
    timeouts: BrokerTimeouts,
    cipher: Arc<RoomCipher>,
    user_id: String,
    join_payload: Vec<u8>,
    sink: Arc<dyn SyncEventSink>,
) -> Attempt {
    let (client, mut eventloop) = match connect_broker("ytmd-g", host, port, timeouts.connect).await {
        Ok(connected) => connected,
        Err(e) => {
            log::info!("Listen Together: broker unavailable: {e}");
            return Attempt::Unreachable;
        }
    };
    log::info!("Listen Together: looking for room via broker {host}");

    let guest_topic = room_topic_guest(cipher.topic_id(), &user_id);
    let broadcast_topic = room_topic_broadcast(cipher.topic_id());
    let host_topic = room_topic_host(cipher.topic_id());
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

    let mut deadline = Instant::now() + timeouts.join_window;
    let mut waiting_for_approval = false;
    let mut last_join = Instant::now();
    loop {
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            let _ = client.try_disconnect();
            return if waiting_for_approval { Attempt::Rejected(RejectReason::Denied) } else { Attempt::NoRoom };
        }
        if last_join.elapsed() >= JOIN_RETRY_INTERVAL {
            let _ = client.try_publish(&host_topic, QoS::AtLeastOnce, false, join_payload.clone());
            last_join = Instant::now();
        }

        match tokio::time::timeout(remaining.min(JOIN_RETRY_INTERVAL), eventloop.poll()).await {
            Ok(Ok(Event::Incoming(Packet::Publish(publish))))
                if publish.topic == guest_topic || publish.topic == broadcast_topic =>
            {
                match cipher.open_msg(&publish.payload) {
                    // A broadcast `State` from another guest's join can
                    // arrive before ours is processed; only a state that
                    // lists us means we're in.
                    Some(WireMessage::State { room }) if room.has_member(&user_id) => {
                        return Attempt::Joined(Box::new((client, eventloop, room)));
                    }
                    Some(WireMessage::Rejected { user_id: to, reason }) if to == user_id => {
                        let _ = client.try_disconnect();
                        return Attempt::Rejected(reason);
                    }
                    Some(WireMessage::Pending { user_id: to }) if to == user_id && !waiting_for_approval => {
                        waiting_for_approval = true;
                        deadline = Instant::now() + APPROVAL_TIMEOUT;
                        sink.join_pending();
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
    cipher: Arc<RoomCipher>,
    user_id: &str,
) -> Result<RoomState, String> {
    let generation = manager.begin_session();
    let local_room = manager
        .apply_remote_room_update(room, user_id, generation)
        .ok_or("Left the room while joining.")?;
    // The injected page must learn it joined.
    sink.room_updated(&local_room);

    let m = manager.clone();
    let uid = user_id.to_string();
    let (shutdown_tx, shutdown_rx) = oneshot::channel();
    let (outbox, outbox_rx) = mpsc::unbounded_channel();
    let reader_task = tauri::async_runtime::spawn(async move {
        run_guest_loop(client, eventloop, m, sink, uid, cipher, shutdown_rx, outbox_rx, generation).await;
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
    cipher: Arc<RoomCipher>,
    mut shutdown_rx: oneshot::Receiver<()>,
    mut outbox_rx: mpsc::UnboundedReceiver<WireMessage>,
    generation: u64,
) {
    let guest_topic = room_topic_guest(cipher.topic_id(), &my_user_id);
    let broadcast_topic = room_topic_broadcast(cipher.topic_id());
    let host_topic = room_topic_host(cipher.topic_id());
    let heartbeat = cipher
        .seal_msg(&WireMessage::Heartbeat { user_id: my_user_id.clone() })
        .unwrap_or_default();
    let mut ticker = tokio::time::interval(manager.liveness.heartbeat_interval);
    ticker.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
    let mut last_heard = Instant::now();

    let end = loop {
        let event = tokio::select! {
            // `leave_room` already cleared local state; only tell the host.
            _ = &mut shutdown_rx => {
                if let Some(payload) = cipher.seal_msg(&WireMessage::Leave { user_id: my_user_id.clone() }) {
                    let sent = client.try_publish(&host_topic, QoS::AtLeastOnce, false, payload).is_ok();
                    flush_and_disconnect(&client, &mut eventloop, usize::from(sent)).await;
                }
                return;
            }
            _ = ticker.tick() => {
                // The host pings every interval; this much silence means it's
                // gone without a goodbye (crash, sleep, lost network).
                if last_heard.elapsed() > manager.liveness.timeout {
                    log::info!("Listen Together: host silent");
                    break GuestEnd::Left(LeaveReason::Lost);
                }
                let _ = client.try_publish(&host_topic, QoS::AtMostOnce, false, heartbeat.clone());
                continue;
            }
            Some(msg) = outbox_rx.recv() => {
                if let Some(payload) = cipher.seal_msg(&msg) {
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
                let Some(msg) = cipher.open_msg(&publish.payload) else {
                    continue;
                };
                last_heard = Instant::now();
                match apply_host_message(&manager, &sink, &my_user_id, generation, msg) {
                    None => {}
                    Some(None) => return,
                    Some(Some(end)) => break end,
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
    guest_ended(&manager, sink, generation, end);
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sync_crypto::client_hash;
    use crate::sync_room::{
        create_room, transfer_host, MemberRole, ReactionPayload, SyncControlRequest, SyncPlaybackState,
    };

    #[derive(Default)]
    struct RecordingSink {
        left: parking_lot::Mutex<Vec<LeaveReason>>,
        reactions: parking_lot::Mutex<Vec<(String, String)>>,
        pending: std::sync::atomic::AtomicUsize,
    }
    impl SyncEventSink for RecordingSink {
        fn room_updated(&self, _room: &RoomState) {}
        fn playback_updated(&self, _state: &SyncPlaybackState) {}
        fn room_left(&self, reason: LeaveReason) {
            self.left.lock().push(reason);
        }
        fn control_requested(&self, _request: &SyncControlRequest) {}
        fn reaction(&self, r: &ReactionPayload) {
            self.reactions.lock().push((r.from.clone(), r.emoji.clone()));
        }
        fn join_pending(&self) {
            self.pending.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
        }
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

    /// Polls `done` for up to 20s: public brokers are slow and uneven, so a
    /// fixed sleep either wastes time or flakes.
    async fn eventually(done: impl Fn() -> bool) -> bool {
        eventually_within(Duration::from_secs(20), done).await
    }

    async fn eventually_within(limit: Duration, done: impl Fn() -> bool) -> bool {
        let deadline = Instant::now() + limit;
        while !done() {
            if Instant::now() >= deadline {
                return false;
            }
            tokio::time::sleep(Duration::from_millis(50)).await;
        }
        true
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
    /// "room not found" (wrong code), within about one broker's budget.
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
        let cipher = Arc::new(RoomCipher::new("YTMD-NOPE"));

        let started = Instant::now();
        let res = join_room_via(&manager, noop_sink(), cipher, "G".into(), brokers, timeouts).await;
        assert_eq!(res.err(), Some(unreachable_err()));
        assert!(started.elapsed() < Duration::from_secs(6), "took {:?}", started.elapsed());
        assert!(manager.get_room_state().is_none());
        task.abort();
    }

    /// The connection test reports each broker, reachable or not.
    #[tokio::test]
    async fn test_probe_reports_every_broker() {
        let closed_port = {
            let l = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
            l.local_addr().unwrap().port()
        };
        let probes = probe(&[("127.0.0.1", closed_port), ("127.0.0.1", closed_port)], Duration::from_millis(500)).await;
        assert_eq!(probes.len(), 2);
        assert!(probes.iter().all(|p| !p.reachable && p.error.is_some()));
    }

    #[test]
    fn test_topics_carry_the_derived_id_not_the_code() {
        let cipher = RoomCipher::new("YTMD-ABCDEFGHJK");
        let id = cipher.topic_id();
        assert_eq!(room_topic_host(id), format!("ytmd/v2/{id}/host"));
        assert_eq!(room_topic_broadcast(id), format!("ytmd/v2/{id}/broadcast"));
        assert_eq!(room_topic_guest(id, "user-1234"), format!("ytmd/v2/{id}/guest/user-1234"));
        assert!(!room_topic_host(id).contains("ABCDEFGHJK"));
    }

    #[test]
    fn test_public_brokers_use_tls_listeners() {
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

    /// Internet-only managers (no LAN shortcut can hide a broken MQTT path)
    /// would need a LAN switch; these use the real app configuration, so a
    /// guest may also come in over LAN on the same machine. Both paths share
    /// the host logic under test.
    fn internet_manager(install: &str) -> Arc<SyncRoomManager> {
        Arc::new(SyncRoomManager::new().with_client_id(install.to_string()))
    }

    async fn host(install: &str, sink: Arc<dyn SyncEventSink>) -> Option<(Arc<SyncRoomManager>, RoomState)> {
        let manager = internet_manager(install);
        let room = create_room(&manager, sink, "Host".into()).await.ok()?;
        // Give the broker loops a moment; guests retry anyway.
        tokio::time::sleep(Duration::from_millis(300)).await;
        Some((manager, room))
    }

    /// Needs the internet (public brokers); returns early without them.
    /// Join, playback, reactions, kick (guest learns why), banned rejoin,
    /// unban, and the host ending the room.
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn test_internet_join_kick_ban_and_close() {
        let host_sink = Arc::new(RecordingSink::default());
        let host_dyn: Arc<dyn SyncEventSink> = host_sink.clone();
        let Some((host_manager, room)) = host("host-install-1", host_dyn.clone()).await else {
            return;
        };
        let guest_manager = internet_manager("guest-install-1");
        let guest_sink = Arc::new(RecordingSink::default());
        let Ok(guest_room) =
            crate::sync_room::join_room(&guest_manager, guest_sink.clone(), room.room_code.clone(), "Guest".into()).await
        else {
            eprintln!("no public broker reachable, skipping");
            crate::sync_room::end_room(&host_manager);
            return;
        };
        assert_eq!(guest_room.members.len(), 2);
        assert_eq!(guest_room.members[1].role, MemberRole::Dj);
        let guest_id = guest_room.current_user_id.clone();

        crate::sync_room::broadcast_playback(
            &host_manager,
            &host_dyn,
            SyncPlaybackState {
                video_id: "dQw4w9WgXcQ".to_string(),
                title: "Test Track".to_string(),
                artist: "Test Artist".to_string(),
                current_time_secs: 42.0,
                is_playing: true,
                timestamp_ms: 2000,
            },
        );
        assert!(eventually(|| guest_manager.get_room_state().and_then(|r| r.playback_state).is_some()).await);

        let guest_dyn: Arc<dyn SyncEventSink> = guest_sink.clone();
        crate::sync_room::send_reaction(&guest_manager, &guest_dyn, "🔥").unwrap();
        assert!(eventually(|| !host_sink.reactions.lock().is_empty()).await);
        assert!(eventually(|| !guest_sink.reactions.lock().is_empty()).await, "the host echoes reactions to the room");

        crate::sync_room::kick_member(&host_manager, &host_dyn, &guest_id).unwrap();
        assert!(eventually(|| !guest_sink.left.lock().is_empty()).await);
        assert_eq!(guest_sink.left.lock().as_slice(), &[LeaveReason::Kicked]);
        assert!(guest_manager.get_room_state().is_none());

        let again =
            crate::sync_room::join_room(&guest_manager, guest_sink.clone(), room.room_code.clone(), "Guest".into()).await;
        assert_eq!(again.err().as_deref(), Some("sync.error.banned"));

        host_manager.unban(&client_hash("guest-install-1"), &host_dyn).unwrap();
        crate::sync_room::join_room(&guest_manager, guest_sink.clone(), room.room_code.clone(), "Guest".into())
            .await
            .expect("unbanned guest can come back");

        crate::sync_room::end_room(&host_manager);
        assert!(eventually(|| guest_manager.get_room_state().is_none()).await, "guest still in a closed room");
        assert_eq!(guest_sink.left.lock().last(), Some(&LeaveReason::Closed));
    }

    /// Needs the internet. With approval on, a guest waits until the host
    /// decides; a declined guest is told so.
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn test_internet_join_approval() {
        let host_sink: Arc<dyn SyncEventSink> = noop_sink();
        let Some((host_manager, room)) = host("host-install-2", host_sink.clone()).await else {
            return;
        };
        host_manager.set_require_approval(true, &host_sink).unwrap();

        let waiting = |m: &Arc<SyncRoomManager>| m.get_room_state().map_or(0, |r| r.pending.len());
        let guest = internet_manager("guest-install-2");
        let guest_sink = Arc::new(RecordingSink::default());
        let code = room.room_code.clone();
        let join = {
            let (guest, sink) = (guest.clone(), guest_sink.clone());
            tokio::spawn(async move { crate::sync_room::join_room(&guest, sink, code, "Knock".into()).await })
        };
        if !eventually(|| waiting(&host_manager) == 1).await {
            eprintln!("no public broker reachable, skipping");
            crate::sync_room::end_room(&host_manager);
            return;
        }
        assert!(
            eventually(|| guest_sink.pending.load(std::sync::atomic::Ordering::SeqCst) >= 1).await,
            "guest is told it waits"
        );
        let user_id = host_manager.get_room_state().unwrap().pending[0].user_id.clone();
        host_manager.decide_pending(&user_id, true, &host_sink).unwrap();
        let joined = join.await.unwrap().expect("approved guest gets in");
        assert_eq!(joined.members.len(), 2);

        let other = internet_manager("guest-install-3");
        let code = room.room_code.clone();
        let join = tokio::spawn(async move { crate::sync_room::join_room(&other, noop_sink(), code, "No".into()).await });
        assert!(eventually(|| waiting(&host_manager) == 1).await);
        let user_id = host_manager.get_room_state().unwrap().pending[0].user_id.clone();
        host_manager.decide_pending(&user_id, false, &host_sink).unwrap();
        assert_eq!(join.await.unwrap().err().as_deref(), Some("sync.error.denied"));

        crate::sync_room::end_room(&host_manager);
    }

    /// Needs the internet. The host hands the room to a guest: that guest
    /// hosts the same code, the other guest and the old host get back in
    /// under it, and roles survive.
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn test_internet_host_handoff() {
        let host_sink: Arc<dyn SyncEventSink> = noop_sink();
        let Some((old_host, room)) = host("host-install-4", host_sink.clone()).await else {
            return;
        };
        let heir = internet_manager("heir-install");
        let other = internet_manager("other-install");
        let Ok(heir_room) = crate::sync_room::join_room(&heir, noop_sink(), room.room_code.clone(), "Heir".into()).await
        else {
            eprintln!("no public broker reachable, skipping");
            crate::sync_room::end_room(&old_host);
            return;
        };
        let other_room = crate::sync_room::join_room(&other, noop_sink(), room.room_code.clone(), "Other".into())
            .await
            .unwrap();
        old_host.set_member_role(&other_room.current_user_id, MemberRole::Listener, &host_sink).unwrap();

        transfer_host(&old_host, host_sink.clone(), &heir_room.current_user_id).unwrap();

        // As long as a real reconnect may take (LivenessConfig::reconnect_for):
        // under a loaded test run every broker handshake is slow.
        let settled = eventually_within(Duration::from_secs(45), || {
            heir.get_room_state().is_some_and(|r| r.is_host && r.members.len() == 3)
                && other.get_room_state().is_some_and(|r| !r.reconnecting && r.members.len() == 3)
                && old_host.get_room_state().is_some_and(|r| !r.is_host && !r.reconnecting && r.members.len() == 3)
        })
        .await;
        assert!(settled, "everyone should be back in, under the new host");
        let new_room = heir.get_room_state().unwrap();
        assert_eq!(new_room.room_code, room.room_code);
        let other_now = new_room.members.iter().find(|m| m.nickname == "Other").unwrap();
        assert_eq!(other_now.role, MemberRole::Listener, "roles survive the handoff");

        crate::sync_room::end_room(&heir);
        crate::sync_room::leave_room(&other);
        crate::sync_room::leave_room(&old_host);
    }
}
