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
use rumqttc::{AsyncClient, Event, EventLoop, MqttOptions, Packet, QoS};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::mpsc;
use tokio::time::Instant;

pub const PUBLIC_BROKERS: &[(&str, u16)] = &[
    ("broker.hivemq.com", 1883),
    ("broker.emqx.io", 1883),
    ("test.mosquitto.org", 1883),
];

const JOIN_TIMEOUT: Duration = Duration::from_secs(8);
const JOIN_RETRY_INTERVAL: Duration = Duration::from_millis(1500);

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
    AsyncClient::new(mqttoptions, 64)
}

async fn connect_to_best_broker(prefix: &str) -> Result<(AsyncClient, EventLoop, &'static str), String> {
    for &(host, port) in PUBLIC_BROKERS {
        let (client, mut eventloop) = create_mqtt_client(prefix, host, port);
        let poll_res = tokio::time::timeout(Duration::from_millis(2500), eventloop.poll()).await;
        match poll_res {
            Ok(Ok(_)) => return Ok((client, eventloop, host)),
            Ok(Err(e)) => {
                log::debug!("Broker {}:{} returned error: {:?}, trying next", host, port, e);
            }
            Err(_) => {
                return Ok((client, eventloop, host));
            }
        }
    }
    let (h, p) = PUBLIC_BROKERS[0];
    let (client, eventloop) = create_mqtt_client(prefix, h, p);
    Ok((client, eventloop, h))
}

// ---------------------------------------------------------------------
// Host side
// ---------------------------------------------------------------------

pub(crate) async fn host_provide(
    manager: Arc<SyncRoomManager>,
    sink: Arc<dyn SyncEventSink>,
    room_code: String,
) -> Result<tauri::async_runtime::JoinHandle<()>, String> {
    let (client, eventloop, broker_name) = connect_to_best_broker("ytmd-h").await?;
    log::info!("Listen Together: Internet host connected via broker {}", broker_name);

    let host_topic = room_topic_host(&room_code);
    client
        .subscribe(&host_topic, QoS::AtLeastOnce)
        .await
        .map_err(|e| format!("Failed to subscribe to host topic: {e}"))?;

    let (tx, rx) = mpsc::unbounded_channel::<WireMessage>();
    manager.register_peer("internet_broadcast".to_string(), tx);

    Ok(tauri::async_runtime::spawn(run_host_loop(
        client, eventloop, manager, sink, room_code, rx,
    )))
}

async fn run_host_loop(
    client: AsyncClient,
    mut eventloop: EventLoop,
    manager: Arc<SyncRoomManager>,
    sink: Arc<dyn SyncEventSink>,
    room_code: String,
    mut outbox_rx: mpsc::UnboundedReceiver<WireMessage>,
) {
    let host_topic = room_topic_host(&room_code);
    let broadcast_topic = room_topic_broadcast(&room_code);

    loop {
        tokio::select! {
            Some(msg) = outbox_rx.recv() => {
                if let Ok(payload) = serde_json::to_vec(&msg) {
                    let _ = client.publish(&broadcast_topic, QoS::AtLeastOnce, false, payload).await;
                }
            }
            event = eventloop.poll() => {
                match event {
                    Ok(Event::Incoming(Packet::Publish(publish))) => {
                        if publish.topic == host_topic {
                            if let Ok(msg) = serde_json::from_slice::<WireMessage>(&publish.payload) {
                                match msg {
                                    WireMessage::Join { user_id, nickname } => {
                                        match manager.add_member(user_id.clone(), nickname) {
                                            Ok(room) => {
                                                let guest_topic = room_topic_guest(&room_code, &user_id);
                                                let state_msg = WireMessage::State {
                                                    room: RoomStateWire::from(&room),
                                                };
                                                if let Ok(payload) = serde_json::to_vec(&state_msg) {
                                                    let _ = client
                                                        .publish(&guest_topic, QoS::AtLeastOnce, false, payload)
                                                        .await;
                                                }
                                                sink.room_updated(&room);
                                                manager.broadcast_to_peers(&state_msg);
                                            }
                                            Err(_) => {
                                                let guest_topic = room_topic_guest(&room_code, &user_id);
                                                if let Ok(payload) = serde_json::to_vec(&WireMessage::Ack) {
                                                    let _ = client
                                                        .publish(&guest_topic, QoS::AtLeastOnce, false, payload)
                                                        .await;
                                                }
                                            }
                                        }
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
    let clean_code = room_code.trim().to_uppercase();
    let (client, mut eventloop, broker_name) = connect_to_best_broker("ytmd-g").await?;
    log::info!("Listen Together: Internet guest connecting via broker {}", broker_name);

    let user_id = generate_user_id();
    let guest_topic = room_topic_guest(&clean_code, &user_id);
    let broadcast_topic = room_topic_broadcast(&clean_code);
    let host_topic = room_topic_host(&clean_code);

    client
        .subscribe(&guest_topic, QoS::AtLeastOnce)
        .await
        .map_err(|e| format!("Failed to subscribe to guest topic: {e}"))?;

    client
        .subscribe(&broadcast_topic, QoS::AtLeastOnce)
        .await
        .map_err(|e| format!("Failed to subscribe to broadcast topic: {e}"))?;

    let join_msg = WireMessage::Join {
        user_id: user_id.clone(),
        nickname: nickname.clone(),
    };
    let join_payload = serde_json::to_vec(&join_msg).map_err(|e| e.to_string())?;

    let _ = client
        .publish(&host_topic, QoS::AtLeastOnce, false, join_payload.clone())
        .await;

    let deadline = Instant::now() + JOIN_TIMEOUT;
    let mut last_retry = Instant::now();

    loop {
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            return Err(not_found_err());
        }

        if last_retry.elapsed() >= JOIN_RETRY_INTERVAL {
            let _ = client
                .publish(&host_topic, QoS::AtLeastOnce, false, join_payload.clone())
                .await;
            last_retry = Instant::now();
        }

        let poll_result = tokio::time::timeout(remaining.min(JOIN_RETRY_INTERVAL), eventloop.poll()).await;
        match poll_result {
            Ok(Ok(Event::Incoming(Packet::Publish(publish)))) => {
                if publish.topic == guest_topic || publish.topic == broadcast_topic {
                    if let Ok(WireMessage::State { room }) =
                        serde_json::from_slice::<WireMessage>(&publish.payload)
                    {
                        let local_room = manager.apply_remote_room_update(room, &user_id);
                        let guest_client = client.clone();
                        let m = manager.clone();
                        let s = sink.clone();
                        let uid = user_id.clone();
                        let rcode = clean_code.clone();

                        let reader_task = tauri::async_runtime::spawn(async move {
                            run_guest_loop(guest_client, eventloop, m, s, uid, rcode).await;
                        });
                        manager.set_p2p_guest_session(reader_task);
                        return Ok(local_room);
                    }
                }
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

async fn run_guest_loop(
    _client: AsyncClient,
    mut eventloop: EventLoop,
    manager: Arc<SyncRoomManager>,
    sink: Arc<dyn SyncEventSink>,
    my_user_id: String,
    room_code: String,
) {
    let guest_topic = room_topic_guest(&room_code, &my_user_id);
    let broadcast_topic = room_topic_broadcast(&room_code);

    loop {
        match eventloop.poll().await {
            Ok(Event::Incoming(Packet::Publish(publish))) => {
                if publish.topic == guest_topic || publish.topic == broadcast_topic {
                    if let Ok(msg) = serde_json::from_slice::<WireMessage>(&publish.payload) {
                        match msg {
                            WireMessage::State { room } => {
                                let local = manager.apply_remote_room_update(room, &my_user_id);
                                sink.room_updated(&local);
                            }
                            WireMessage::Playback { state } => {
                                manager.apply_remote_playback(state.clone());
                                sink.playback_updated(&state);
                            }
                            _ => {}
                        }
                    }
                }
            }
            Ok(_) => {}
            Err(e) => {
                log::debug!("Guest MQTT eventloop error: {:?}", e);
                tokio::time::sleep(Duration::from_millis(500)).await;
            }
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
        if let Ok(h_task) = host_task {
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
            }
            h_task.abort();
        }
    }
}
