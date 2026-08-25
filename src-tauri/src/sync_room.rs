use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoomState {
    pub room_code: String,
    pub is_host: bool,
    pub current_user_id: String,
    pub members: Vec<RoomMember>,
    pub playback_state: Option<SyncPlaybackState>,
}

pub struct SyncRoomManager {
    current_room: Mutex<Option<RoomState>>,
}

impl SyncRoomManager {
    pub fn new() -> Self {
        Self {
            current_room: Mutex::new(None),
        }
    }

    pub fn create_room(&self, nickname: String) -> RoomState {
        let code = generate_room_code();
        let user_id = format!("user-{}", now_ms() % 100000);

        let host_member = RoomMember {
            id: user_id.clone(),
            nickname,
            is_host: true,
            joined_at_ms: now_ms(),
        };

        let state = RoomState {
            room_code: code,
            is_host: true,
            current_user_id: user_id,
            members: vec![host_member],
            playback_state: None,
        };

        *self.current_room.lock() = Some(state.clone());
        state
    }

    pub fn join_room(&self, code: String, nickname: String) -> RoomState {
        let clean_code = code.trim().to_uppercase();
        let user_id = format!("user-{}", now_ms() % 100000);

        let guest_member = RoomMember {
            id: user_id.clone(),
            nickname,
            is_host: false,
            joined_at_ms: now_ms(),
        };

        let state = RoomState {
            room_code: clean_code,
            is_host: false,
            current_user_id: user_id,
            members: vec![
                RoomMember {
                    id: "host-1".to_string(),
                    nickname: "Host".to_string(),
                    is_host: true,
                    joined_at_ms: now_ms() - 10000,
                },
                guest_member,
            ],
            playback_state: None,
        };

        *self.current_room.lock() = Some(state.clone());
        state
    }

    pub fn leave_room(&self) {
        *self.current_room.lock() = None;
    }

    pub fn get_room_state(&self) -> Option<RoomState> {
        self.current_room.lock().clone()
    }

    pub fn update_playback_state(&self, state: SyncPlaybackState) {
        if let Some(ref mut room) = *self.current_room.lock() {
            room.playback_state = Some(state);
        }
    }
}

pub fn generate_room_code() -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    let mut hasher = DefaultHasher::new();
    now_ms().hash(&mut hasher);
    let hash = hasher.finish();

    let chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let mut code = String::with_capacity(6);
    let mut val = hash;

    for _ in 0..6 {
        let idx = (val % (chars.len() as u64)) as usize;
        code.push(chars.chars().nth(idx).unwrap_or('A'));
        val /= chars.len() as u64;
    }

    format!("YTMD-{}", code)
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_room_code() {
        let code = generate_room_code();
        assert!(code.starts_with("YTMD-"));
        assert_eq!(code.len(), 11); // "YTMD-" (5) + 6 chars
    }

    #[test]
    fn test_sync_room_lifecycle() {
        let manager = SyncRoomManager::new();
        assert!(manager.get_room_state().is_none());

        let room = manager.create_room("Kacper".to_string());
        assert!(room.is_host);
        assert_eq!(room.members.len(), 1);
        assert_eq!(room.members[0].nickname, "Kacper");

        manager.update_playback_state(SyncPlaybackState {
            video_id: "dQw4w9WgXcQ".to_string(),
            title: "Never Gonna Give You Up".to_string(),
            artist: "Rick Astley".to_string(),
            current_time_secs: 42.5,
            is_playing: true,
            timestamp_ms: now_ms(),
        });

        let updated = manager.get_room_state().unwrap();
        assert!(updated.playback_state.is_some());
        assert_eq!(updated.playback_state.unwrap().video_id, "dQw4w9WgXcQ");

        manager.leave_room();
        assert!(manager.get_room_state().is_none());
    }
}
