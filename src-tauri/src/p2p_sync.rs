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
//!      no accounts, no maintenance, and 100% reliable connectivity across NATs, firewalls, and ISPs.

use crate::sync_room::{
    generate_user_id, RoomState, RoomStateWire, SyncEventSink, SyncRoomManager, WireMessage,
};
use rumqttc::{AsyncClient, ConnectReturnCode, Event, EventLoop, MqttOptions, Packet, QoS, Transport};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{mpsc, oneshot};
use tokio::time::Instant;

/// TLS (8883), not plaintext MQTT (1883): the payload is room codes,
/// nicknames, and now-playing title/artist, and this traffic transits a
/// public broker over the open internet — anyone on-path (public Wi-Fi, a
/// transit ISP, or the broker operator itself) could otherwise read or
/// tamper with it. All three brokers below serve anonymous TLS on 8883
/// with a publicly-trusted cert, so this costs nothing in reliability.
pub const PUBLIC_BROKERS: &[(&str, u16)] = &[
    ("broker.hivemq.com", 8883),
    ("broker.emqx.io", 8883),
    ("test.mosquitto.org", 8883),
];

/// Per-broker time budgets. Host and guest both walk `PUBLIC_BROKERS` in
/// order and only count a broker once it actually answers (ConnAck), so they
/// land on the same one whenever the first reachable broker is reachable for
/// both. A guest that finds no host on one broker moves on to the next;
/// worst case 3 × (2s + 3s) = 15s before "room not found".
#[derive(Debug, Clone, Copy)]
pub(crate) struct BrokerTimeouts {
    pub connect: Duration,
    pub join_window: Duration,
}

const BROKER_TIMEOUTS: BrokerTimeouts = BrokerTimeouts {
    connect: Duration::from_secs(2),
    join_window: Duration::from_secs(3),
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

/// The first broker in `brokers` order that completes a handshake.
async fn connect_first_broker(
    prefix: &str,
    brokers: &[(&'static str, u16)],
    timeout: Duration,
) -> Result<(AsyncClient, EventLoop, &'static str), String> {
    let mut errors = Vec::new();
    for &(host, port) in brokers {
        match connect_broker(prefix, host, port, timeout).await {
            Ok((client, eventloop)) => return Ok((client, eventloop, host)),
            Err(e) => {
                log::debug!("Listen Together: broker unavailable: {e}");
                errors.push(e);
            }
        }
    }
    Err(format!("no public broker reachable ({})", errors.join("; ")))
}

// ---------------------------------------------------------------------
// Host side
// ---------------------------------------------------------------------

pub(crate) async fn host_provide(
    manager: Arc<SyncRoomManager>,
    sink: Arc<dyn SyncEventSink>,
    room_code: String,
) -> Result<(tauri::async_runtime::JoinHandle<()>, oneshot::Sender<()>), String> {
    let (client, eventloop, broker_name) =
        connect_first_broker("ytmd-h", PUBLIC_BROKERS, BROKER_TIMEOUTS.connect).await?;
    log::info!("Listen Together: Internet host connected via broker {}", broker_name);

    let host_topic = room_topic_host(&room_code);
    client
        .subscribe(&host_topic, QoS::AtLeastOnce)
        .await
        .map_err(|e| format!("Failed to subscribe to host topic: {e}"))?;

    let (tx, rx) = mpsc::unbounded_channel::<WireMessage>();
    manager.register_peer("internet_broadcast".to_string(), tx);

    let (shutdown_tx, shutdown_rx) = oneshot::channel();
    let task = tauri::async_runtime::spawn(run_host_loop(
        client, eventloop, manager, sink, room_code, rx, shutdown_rx,
    ));
    Ok((task, shutdown_tx))
}

async fn run_host_loop(
    client: AsyncClient,
    mut eventloop: EventLoop,
    manager: Arc<SyncRoomManager>,
    sink: Arc<dyn SyncEventSink>,
    room_code: String,
    mut outbox_rx: mpsc::UnboundedReceiver<WireMessage>,
    mut shutdown_rx: oneshot::Receiver<()>,
) {
    let host_topic = room_topic_host(&room_code);
    let broadcast_topic = room_topic_broadcast(&room_code);

    loop {
        tokio::select! {
            _ = &mut shutdown_rx => {
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
                    Ok(Event::Incoming(Packet::Publish(publish))) => {
                        if publish.topic == host_topic {
                            if let Ok(msg) = serde_json::from_slice::<WireMessage>(&publish.payload) {
                                match msg {
                                    // Guests re-send `Join` until they hear
                                    // back; a repeat from a current member
                                    // just gets the state again instead of a
                                    // duplicate entry.
                                    WireMessage::Join { user_id, .. } if manager.has_member(&user_id) => {
                                        manager.touch_member(&user_id);
                                        if let Some(room) = manager.get_room_state() {
                                            let state_msg = WireMessage::State { room: RoomStateWire::from(&room) };
                                            if let Ok(payload) = serde_json::to_vec(&state_msg) {
                                                let guest_topic = room_topic_guest(&room_code, &user_id);
                                                let _ = client.try_publish(&guest_topic, QoS::AtLeastOnce, false, payload);
                                            }
                                        }
                                    }
                                    WireMessage::Join { user_id, nickname } => {
                                        match manager.add_member(user_id.clone(), nickname) {
                                            Ok(room) => {
                                                let guest_topic = room_topic_guest(&room_code, &user_id);
                                                let state_msg = WireMessage::State {
                                                    room: RoomStateWire::from(&room),
                                                };
                                                if let Ok(payload) = serde_json::to_vec(&state_msg) {
                                                    let _ = client.try_publish(&guest_topic, QoS::AtLeastOnce, false, payload);
                                                }
                                                sink.room_updated(&room);
                                                manager.broadcast_to_peers(&state_msg);
                                            }
                                            Err(_) => {
                                                let guest_topic = room_topic_guest(&room_code, &user_id);
                                                if let Ok(payload) = serde_json::to_vec(&WireMessage::Ack) {
                                                    let _ = client.try_publish(&guest_topic, QoS::AtLeastOnce, false, payload);
                                                }
                                            }
                                        }
                                    }
                                    WireMessage::Heartbeat { user_id } => manager.touch_member(&user_id),
                                    WireMessage::Control { user_id, action } => {
                                        manager.handle_guest_control(&user_id, action, &sink);
                                    }
                                    WireMessage::Leave { user_id } => {
                                        manager.unregister_peer(&user_id);
                                        if let Some(room) = manager.remove_member(&user_id) {
                                            sink.room_updated(&room);
                                            manager.broadcast_to_peers(&WireMessage::State {
                                                room: RoomStateWire::from(&room),
                                            });
                                        }
                                    }
                                    _ => {}
                                }
                            }
                        }
                    }
                    Err(e) => {
                        log::debug!("Host MQTT eventloop error: {:?}", e);
                        tokio::time::sleep(Duration::from_millis(500)).await;
                    }
                    _ => {}
                }
            }
        }
    }
}

// ---------------------------------------------------------------------
// Guest side
// ---------------------------------------------------------------------

fn not_found_err() -> String {
    "Nie znaleziono pokoju — sprawdź kod, upewnij się że host ma otwarty pokój, i że oboje macie połączenie z internetem.".to_string()
}

pub(crate) async fn join_room(
    manager: &Arc<SyncRoomManager>,
    sink: Arc<dyn SyncEventSink>,
    room_code: String,
    nickname: String,
) -> Result<RoomState, String> {
    join_room_via(manager, sink, room_code, nickname, PUBLIC_BROKERS, BROKER_TIMEOUTS).await
}

/// Walks `brokers` in the same order the host does, trying the join
/// handshake on each broker that answers, until one produces the room.
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

    for &(host, port) in brokers {
        let (client, eventloop) = match connect_broker("ytmd-g", host, port, timeouts.connect).await {
            Ok(connected) => connected,
            Err(e) => {
                log::debug!("Listen Together: broker unavailable: {e}");
                continue;
            }
        };
        log::info!("Listen Together: Internet guest looking for room via broker {host}");
        if let Some(room) = try_join_on_broker(
            manager,
            &sink,
            client,
            eventloop,
            &clean_code,
            &user_id,
            &nickname,
            timeouts.join_window,
        )
        .await
        {
            return Ok(room);
        }
    }
    Err(not_found_err())
}

/// One broker's join attempt: publish `Join` (re-sent every
/// `JOIN_RETRY_INTERVAL`) and wait up to `window` for a `State` that lists
/// us. On success, hands the connection to `run_guest_loop` and returns the
/// room; otherwise disconnects and returns `None`.
#[allow(clippy::too_many_arguments)]
async fn try_join_on_broker(
    manager: &Arc<SyncRoomManager>,
    sink: &Arc<dyn SyncEventSink>,
    client: AsyncClient,
    mut eventloop: EventLoop,
    clean_code: &str,
    user_id: &str,
    nickname: &str,
    window: Duration,
) -> Option<RoomState> {
    let guest_topic = room_topic_guest(clean_code, user_id);
    let broadcast_topic = room_topic_broadcast(clean_code);
    let host_topic = room_topic_host(clean_code);

    let join_msg = WireMessage::Join {
        user_id: user_id.to_string(),
        nickname: nickname.to_string(),
    };
    let join_payload = serde_json::to_vec(&join_msg).ok()?;
    // The broker handles one connection's packets in order, so both
    // subscriptions are in place before it sees the Join.
    let queued = client.try_subscribe(&guest_topic, QoS::AtLeastOnce).is_ok()
        && client.try_subscribe(&broadcast_topic, QoS::AtLeastOnce).is_ok()
        && client
            .try_publish(&host_topic, QoS::AtLeastOnce, false, join_payload.clone())
            .is_ok();
    if !queued {
        return None;
    }

    let deadline = Instant::now() + window;
    let mut last_join = Instant::now();

    loop {
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            let _ = client.try_disconnect();
            return None;
        }

        if last_join.elapsed() >= JOIN_RETRY_INTERVAL {
            let _ = client.try_publish(&host_topic, QoS::AtLeastOnce, false, join_payload.clone());
            last_join = Instant::now();
        }

        let poll_result = tokio::time::timeout(remaining.min(JOIN_RETRY_INTERVAL), eventloop.poll()).await;
        match poll_result {
            Ok(Ok(Event::Incoming(Packet::Publish(publish)))) => {
                if publish.topic != guest_topic && publish.topic != broadcast_topic {
                    continue;
                }
                // A broadcast `State` from another guest's join can arrive
                // before ours is processed; only a state that lists us means
                // we're in.
                let Ok(WireMessage::State { room }) = serde_json::from_slice::<WireMessage>(&publish.payload) else {
                    continue;
                };
                if !room.has_member(user_id) {
                    continue;
                }
                let generation = manager.begin_session();
                let local_room = manager.apply_remote_room_update(room, user_id, generation)?;
                // See `connect_to_host`: the injected page must learn it joined.
                sink.room_updated(&local_room);

                let m = manager.clone();
                let s = sink.clone();
                let uid = user_id.to_string();
                let rcode = clean_code.to_string();
                let (shutdown_tx, shutdown_rx) = oneshot::channel();
                let (outbox, outbox_rx) = mpsc::unbounded_channel();
                let reader_task = tauri::async_runtime::spawn(async move {
                    run_guest_loop(client, eventloop, m, s, uid, rcode, shutdown_rx, outbox_rx, generation).await;
                });
                manager.set_p2p_guest_session(reader_task, shutdown_tx, user_id.to_string(), outbox);
                return Some(local_room);
            }
            Ok(Ok(_)) => {}
            Ok(Err(e)) => {
                log::debug!("Guest MQTT join poll error: {:?}", e);
                tokio::time::sleep(Duration::from_millis(200)).await;
            }
            Err(_) => {}
        }
    }
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

    loop {
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
                    break;
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
                    // The host dropped us (e.g. evicted after a network
                    // blip): its broadcasts keep arriving, but we're no
                    // longer a member, so stop acting like one.
                    WireMessage::State { room } if !room.has_member(&my_user_id) => break,
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
                    WireMessage::Leave { user_id } if user_id == HOST_CLOSED_USER_ID => break,
                    _ => {}
                }
            }
            Ok(_) => {}
            Err(e) => {
                log::debug!("Guest MQTT eventloop error: {:?}", e);
                tokio::time::sleep(Duration::from_millis(500)).await;
            }
        }
    }

    let _ = client.try_disconnect();
    if manager.clear_guest_if_current(generation) {
        sink.room_left();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sync_room::{RoomMember, SyncControlRequest, SyncPlaybackState};

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

    /// Regression: a handshake that timed out used to count as "connected",
    /// so host and guest could each settle on a different broker.
    #[tokio::test]
    async fn test_unanswered_broker_is_not_treated_as_connected() {
        let (port, task) = silent_listener().await;
        let res = connect_broker("ytmd-test", "127.0.0.1", port, Duration::from_millis(300)).await;
        assert!(res.is_err(), "no ConnAck must mean not connected");

        let none = connect_first_broker("ytmd-test", &[("127.0.0.1", port)], Duration::from_millis(300)).await;
        assert!(none.is_err());
        task.abort();
    }

    /// A guest walks every broker and gives up with the usual message
    /// within the summed per-broker budgets.
    #[tokio::test]
    async fn test_guest_join_tries_each_broker_then_reports_not_found() {
        let (silent_port, task) = silent_listener().await;
        let closed_port = {
            let l = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
            l.local_addr().unwrap().port()
        };
        let brokers: &[(&'static str, u16)] = &[("127.0.0.1", silent_port), ("127.0.0.1", closed_port)];
        let timeouts = BrokerTimeouts {
            connect: Duration::from_millis(300),
            join_window: Duration::from_millis(300),
        };
        let manager = Arc::new(SyncRoomManager::new());

        let started = Instant::now();
        let res = join_room_via(&manager, noop_sink(), "YTMD-NOPE".into(), "G".into(), brokers, timeouts).await;
        assert_eq!(res.err(), Some(not_found_err()));
        // Guards that the injected per-broker timeouts are honored rather
        // than the ~15s production budget. Not a tight bound: first-use TLS
        // setup (loading native root certs) alone took seconds on CI runners.
        assert!(started.elapsed() < Duration::from_secs(8), "took {:?}", started.elapsed());
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
    fn test_public_brokers_list_not_empty() {
        assert!(!PUBLIC_BROKERS.is_empty());
        for (host, port) in PUBLIC_BROKERS {
            assert!(!host.is_empty());
            assert!(*port > 0);
        }
    }

    #[test]
    fn test_public_brokers_use_tls_port_not_plaintext() {
        // Regression guard: room codes, nicknames, and now-playing metadata
        // cross these brokers over the open internet. Port 1883 is
        // unauthenticated plaintext MQTT — anyone on-path can read or
        // tamper with it. Every broker here must be the TLS listener (8883),
        // and create_mqtt_client must actually select a TLS transport.
        for (host, port) in PUBLIC_BROKERS {
            assert_eq!(*port, 8883, "{host} must use the TLS port, not plaintext 1883");
        }

        let (client, eventloop) = create_mqtt_client("test", PUBLIC_BROKERS[0].0, PUBLIC_BROKERS[0].1);
        assert!(
            matches!(eventloop.mqtt_options.transport(), rumqttc::Transport::Tls(_)),
            "create_mqtt_client must configure a TLS transport, not plaintext TCP"
        );
        drop(client);
    }

    #[test]
    fn test_wire_message_serialization_for_mqtt() {
        let join = WireMessage::Join {
            user_id: "user-abc".to_string(),
            nickname: "Guest".to_string(),
        };
        let bytes = serde_json::to_vec(&join).expect("serialize join");
        let de: WireMessage = serde_json::from_slice(&bytes).expect("deserialize join");
        match de {
            WireMessage::Join { user_id, nickname } => {
                assert_eq!(user_id, "user-abc");
                assert_eq!(nickname, "Guest");
            }
            _ => panic!("Expected Join variant"),
        }
    }

    #[tokio::test]
    async fn test_p2p_host_and_guest_exchange_over_network() {
        // Run an end-to-end check with a unique room code
        let room_code = format!("YTMD-TEST-{}", rand::random::<u32>());
        let host_manager = Arc::new(SyncRoomManager::new());
        let guest_manager = Arc::new(SyncRoomManager::new());

        let host_user_id = "host-user-1".to_string();
        let initial_room = RoomState {
            room_code: room_code.clone(),
            is_host: true,
            current_user_id: host_user_id.clone(),
            members: vec![RoomMember {
                id: host_user_id.clone(),
                nickname: "Host".to_string(),
                is_host: true,
                joined_at_ms: 1000,
            }],
            playback_state: None,
        };
        host_manager.set_local_room(initial_room);

        // Start host
        let host_task = host_provide(host_manager.clone(), noop_sink(), room_code.clone()).await;
        if let Ok((h_task, h_shutdown)) = host_task {
            // Join as guest
            tokio::time::sleep(Duration::from_millis(500)).await;
            let join_res = join_room(&guest_manager, noop_sink(), room_code.clone(), "Guest".to_string()).await;
            if let Ok(guest_room) = join_res {
                assert_eq!(guest_room.room_code, room_code);
                assert_eq!(guest_room.members.len(), 2);
                assert_eq!(guest_room.members[1].nickname, "Guest");

                // Test playback broadcast
                let playback = SyncPlaybackState {
                    video_id: "test1234".to_string(),
                    title: "Test Track".to_string(),
                    artist: "Test Artist".to_string(),
                    current_time_secs: 42.0,
                    is_playing: true,
                    timestamp_ms: 2000,
                };
                host_manager.broadcast_to_peers(&WireMessage::Playback {
                    state: playback.clone(),
                });

                // Give it a moment to receive broadcast
                tokio::time::sleep(Duration::from_millis(600)).await;
                let guest_state = guest_manager.get_room_state();
                if let Some(gs) = guest_state {
                    if let Some(ps) = gs.playback_state {
                        assert_eq!(ps.video_id, "test1234");
                        assert_eq!(ps.title, "Test Track");
                    }
                }

                // Host closing the room must reach the internet guest too.
                let _ = h_shutdown.send(());
                tokio::time::sleep(Duration::from_millis(1500)).await;
                assert!(guest_manager.get_room_state().is_none(), "guest still thinks it's in a closed room");
                return;
            }
            h_task.abort();
        }
    }
}
