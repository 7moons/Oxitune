//! Listen Together invites: `oscilla://join/<code>` deep links (and `ytmd://` from before the rename) and the
//! "Listen along" button on the host's Discord status.
//!
//! The room code is also the room's encryption key (`sync_crypto.rs`), so the
//! public landing page gets it only after `#`, which browsers never send to
//! the server. Following a link fills in the code in the Listen Together
//! window; the user still presses Join, so a link can't pull anyone into a
//! room by itself.

use parking_lot::Mutex;
use tauri::{AppHandle, Emitter, Manager};

/// Public landing page (GitHub Pages, `docs/join/index.html`).
pub const INVITE_PAGE: &str = "https://kayzedd.github.io/Oscilla/join/";

/// A current (protocol 3) room code; see `sync_crypto::parse_room_code`.
pub fn is_valid_room_code(code: &str) -> bool {
    crate::sync_crypto::parse_room_code(code).is_ok_and(|c| c == code)
}

/// The room code in an `oscilla://join/<code>` (or `ytmd://join/<code>`) link, or `None` for anything
/// else (the OS hands us whatever argv holds, so every part is checked).
pub fn parse_join_link(url: &str) -> Option<String> {
    let url = url.trim();
    // `ytmd://` from before the rename still works.
    let rest = url.strip_prefix("oscilla://join/").or_else(|| url.strip_prefix("ytmd://join/"))?;
    let code = rest.trim_end_matches('/').to_ascii_uppercase();
    if code.len() > 64 || !code.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-') {
        return None;
    }
    crate::sync_crypto::parse_room_code(&code).ok()
}

pub fn invite_url(code: &str) -> String {
    format!("{INVITE_PAGE}#{code}")
}

/// Discord party id for a room: stable per room, not the code itself.
pub fn party_id(code: &str) -> String {
    let digest = ring::digest::digest(&ring::digest::SHA256, format!("ytmd-party:{code}").as_bytes());
    digest.as_ref()[..16].iter().map(|b| format!("{b:02x}")).collect()
}

/// What the host's Discord status adds while an invite is on.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DiscordInvite {
    pub url: String,
    pub party_id: String,
    pub members: usize,
    pub max_members: usize,
}

/// Which room the host chose to show on Discord. Keyed by room code, so the
/// choice never carries over to a later room.
#[derive(Default)]
pub struct InviteState {
    published_code: Mutex<Option<String>>,
    pending_join: Mutex<Option<String>>,
}

impl InviteState {
    pub fn set_published(&self, code: Option<String>) {
        *self.published_code.lock() = code;
    }

    pub fn is_published(&self, code: &str) -> bool {
        self.published_code.lock().as_deref() == Some(code)
    }

    /// The invite to show, when we host the room the invite was turned on for.
    pub fn current(&self, room: Option<&crate::sync_room::RoomState>) -> Option<DiscordInvite> {
        let room = room?;
        if !room.is_host || !self.is_published(&room.room_code) {
            return None;
        }
        Some(DiscordInvite {
            url: invite_url(&room.room_code),
            party_id: party_id(&room.room_code),
            members: room.members.len(),
            max_members: crate::sync_room::MAX_MEMBERS,
        })
    }

    pub fn take_pending_join(&self) -> Option<String> {
        self.pending_join.lock().take()
    }
}

/// Handles deep-link URLs (at launch or from a second launch): remembers the
/// code for a Listen Together window that isn't loaded yet, tells one that
/// is, and brings the window up.
pub fn handle_urls<'a>(app: &AppHandle, urls: impl IntoIterator<Item = &'a str>) {
    let Some(code) = urls.into_iter().find_map(parse_join_link) else {
        return;
    };
    if let Some(state) = app.try_state::<std::sync::Arc<crate::AppState>>() {
        *state.invites.pending_join.lock() = Some(code.clone());
    }
    let _ = app.emit("sync-join-link", &code);
    // A window created now reads the code with `take_pending_join_code`.
    crate::windows::show(app, "sync");
}

#[cfg(test)]
mod tests {
    use super::*;

    const C: &str = "OSC-ABCDEFGHJKLMNPQRSTUVWXYZ23";

    #[test]
    fn test_parse_join_link_accepts_only_room_codes() {
        assert_eq!(parse_join_link(&format!("ytmd://join/{C}")), Some(C.into()));
        assert_eq!(parse_join_link(&format!("ytmd://join/{}/", C.to_lowercase())), Some(C.into()));
        assert_eq!(parse_join_link(&format!("oscilla://join/{C}")).as_deref(), Some(C));
        assert_eq!(parse_join_link(&format!("ytmd://join/{C}")).as_deref(), Some(C), "the old scheme still works");
        assert_eq!(parse_join_link(&format!("https://join/{C}")), None);
        assert_eq!(parse_join_link("ytmd://join/OSC-ABC"), None);
        // Old 10-character codes (protocol 2) aren't joinable any more.
        assert_eq!(parse_join_link("ytmd://join/OSC-ABCDEFGH23"), None);
        // I, O, 0 and 1 are never in a code.
        assert_eq!(parse_join_link("ytmd://join/OSC-ABCDEFGHJKLMNPQRSTUVWXYI0"), None);
        assert_eq!(parse_join_link(&format!("ytmd://join/{C}?x=1")), None);
        assert_eq!(parse_join_link(&format!("https://evil.example/join/{C}")), None);
        assert_eq!(parse_join_link("--flag"), None);
    }

    #[test]
    fn test_generated_codes_are_valid() {
        for _ in 0..50 {
            assert!(is_valid_room_code(&crate::sync_room::generate_room_code()));
        }
    }

    #[test]
    fn test_invite_url_keeps_the_code_after_the_hash() {
        let url = invite_url("OSC-ABCDEFGHJKLMNPQRSTUVWXYZ23");
        let (page, fragment) = url.split_once('#').unwrap();
        assert!(page.starts_with("https://"));
        assert!(!page.contains("OSC-"), "the code must never be in the part sent to the server");
        assert_eq!(fragment, "OSC-ABCDEFGHJKLMNPQRSTUVWXYZ23");
    }

    #[test]
    fn test_party_id_is_stable_and_does_not_contain_the_code() {
        let a = party_id("OSC-ABCDEFGHJKLMNPQRSTUVWXYZ23");
        assert_eq!(a, party_id("OSC-ABCDEFGHJKLMNPQRSTUVWXYZ23"));
        assert_ne!(a, party_id("OSC-ABCDEFGHJKLMNPQRSTUVWXYZ24"));
        assert_eq!(a.len(), 32);
        assert!(!a.to_uppercase().contains("ABCDEFGHJKLMNPQRSTUVWXYZ23"));
    }

    fn room(code: &str, is_host: bool) -> crate::sync_room::RoomState {
        serde_json::from_value(serde_json::json!({
            "room_code": code,
            "is_host": is_host,
            "current_user_id": "user-1",
            "members": [],
            "playback_state": null
        }))
        .unwrap()
    }

    #[test]
    fn test_invite_only_for_the_hosted_room_it_was_turned_on_for() {
        let s = InviteState::default();
        assert_eq!(s.current(Some(&room("OSC-ABCDEFGHJKLMNPQRSTUVWXYZ23", true))), None);

        s.set_published(Some("OSC-ABCDEFGHJKLMNPQRSTUVWXYZ23".into()));
        let invite = s.current(Some(&room("OSC-ABCDEFGHJKLMNPQRSTUVWXYZ23", true))).unwrap();
        assert_eq!(invite.url, invite_url("OSC-ABCDEFGHJKLMNPQRSTUVWXYZ23"));
        assert_eq!(invite.max_members, crate::sync_room::MAX_MEMBERS);

        assert_eq!(s.current(Some(&room("OSC-ABCDEFGHJKLMNPQRSTUVWXYZ23", false))), None, "guests never publish");
        assert_eq!(s.current(Some(&room("OSC-ZZZZZZZZZZZZZZZZZZZZZZZZZZ", true))), None, "a later room starts off");
        assert_eq!(s.current(None), None);
    }
}
