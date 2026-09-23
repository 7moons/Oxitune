//! End-to-end encryption for Listen Together.
//!
//! Everything a room sends (LAN TCP lines, the LAN beacon, MQTT payloads on
//! public brokers) is sealed with AES-256-GCM under a key derived from the
//! room code, and the MQTT topics and LAN beacon carry only an id derived
//! from the code, never the code itself. So the brokers' operators, and
//! anyone on the same Wi-Fi, see opaque bytes: only people who were given
//! the code can read or inject room traffic.
//!
//! The code has ~50 bits of entropy; PBKDF2 makes each guess of it cost
//! `PBKDF2_ITERATIONS` HMACs, so recovering it from a captured topic id or
//! ciphertext is out of reach for a casual attacker.

use crate::sync_room::WireMessage;
use base64::{engine::general_purpose::STANDARD, Engine};
use ring::aead::{Aad, LessSafeKey, Nonce, UnboundKey, AES_256_GCM, NONCE_LEN};
use ring::rand::{SecureRandom, SystemRandom};
use std::num::NonZeroU32;

const PBKDF2_ITERATIONS: u32 = 20_000;
const KDF_SALT: &[u8] = b"ytmd-listen-together-v2";
const AAD: &[u8] = b"ytmd-room";

pub(crate) struct RoomCipher {
    key: LessSafeKey,
    topic_id: String,
    rng: SystemRandom,
}

fn to_hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

impl RoomCipher {
    /// Same code (any case, surrounding spaces) → same key and topic id.
    pub(crate) fn new(room_code: &str) -> Self {
        let code = room_code.trim().to_uppercase();
        let mut derived = [0u8; 48];
        ring::pbkdf2::derive(
            ring::pbkdf2::PBKDF2_HMAC_SHA256,
            NonZeroU32::new(PBKDF2_ITERATIONS).expect("non-zero"),
            KDF_SALT,
            code.as_bytes(),
            &mut derived,
        );
        let key = LessSafeKey::new(UnboundKey::new(&AES_256_GCM, &derived[..32]).expect("32-byte key"));
        Self {
            key,
            topic_id: to_hex(&derived[32..]),
            rng: SystemRandom::new(),
        }
    }

    /// Public name of the room on brokers and in LAN beacons.
    pub(crate) fn topic_id(&self) -> &str {
        &self.topic_id
    }

    /// `nonce || ciphertext || tag`, with a fresh random nonce.
    pub(crate) fn seal(&self, plaintext: &[u8]) -> Option<Vec<u8>> {
        let mut nonce = [0u8; NONCE_LEN];
        self.rng.fill(&mut nonce).ok()?;
        let mut in_out = plaintext.to_vec();
        self.key
            .seal_in_place_append_tag(Nonce::assume_unique_for_key(nonce), Aad::from(AAD), &mut in_out)
            .ok()?;
        let mut out = nonce.to_vec();
        out.extend_from_slice(&in_out);
        Some(out)
    }

    /// `None` for anything not sealed with this room's key (wrong room,
    /// tampered, truncated).
    pub(crate) fn open(&self, data: &[u8]) -> Option<Vec<u8>> {
        if data.len() < NONCE_LEN {
            return None;
        }
        let (nonce, sealed) = data.split_at(NONCE_LEN);
        let nonce = Nonce::try_assume_unique_for_key(nonce).ok()?;
        let mut in_out = sealed.to_vec();
        let plain = self.key.open_in_place(nonce, Aad::from(AAD), &mut in_out).ok()?;
        Some(plain.to_vec())
    }

    pub(crate) fn seal_msg(&self, msg: &WireMessage) -> Option<Vec<u8>> {
        self.seal(&serde_json::to_vec(msg).ok()?)
    }

    pub(crate) fn open_msg(&self, data: &[u8]) -> Option<WireMessage> {
        serde_json::from_slice(&self.open(data)?).ok()
    }

    /// One LAN protocol line: base64 of the sealed message, plus `\n`.
    pub(crate) fn seal_line(&self, msg: &WireMessage) -> Option<String> {
        let mut line = STANDARD.encode(self.seal_msg(msg)?);
        line.push('\n');
        Some(line)
    }

    pub(crate) fn open_line(&self, line: &str) -> Option<WireMessage> {
        self.open_msg(&STANDARD.decode(line.trim()).ok()?)
    }
}

/// Public, stable stand-in for a guest's secret install id: bans, approvals
/// and roles are keyed by it, so they can travel to a new host without
/// revealing ids someone could join as.
pub(crate) fn client_hash(client_id: &str) -> String {
    let mut ctx = ring::digest::Context::new(&ring::digest::SHA256);
    ctx.update(b"ytmd-client:");
    ctx.update(client_id.as_bytes());
    to_hex(&ctx.finish().as_ref()[..16])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_same_code_same_key_any_case() {
        let a = RoomCipher::new("YTMD-ABCDEFGHJK");
        let b = RoomCipher::new("  ytmd-abcdefghjk ");
        assert_eq!(a.topic_id(), b.topic_id());
        let sealed = a.seal(b"hello").unwrap();
        assert_eq!(b.open(&sealed).as_deref(), Some(&b"hello"[..]));
    }

    #[test]
    fn test_topic_id_does_not_contain_the_code() {
        let c = RoomCipher::new("YTMD-ABCDEFGHJK");
        assert_eq!(c.topic_id().len(), 32);
        assert!(!c.topic_id().to_uppercase().contains("ABCDEFGHJK"));
    }

    #[test]
    fn test_other_room_or_tampered_bytes_do_not_open() {
        let a = RoomCipher::new("YTMD-AAAAAAAAAA");
        let b = RoomCipher::new("YTMD-BBBBBBBBBB");
        assert_ne!(a.topic_id(), b.topic_id());
        let mut sealed = a.seal(b"secret").unwrap();
        assert!(b.open(&sealed).is_none(), "wrong room");
        let last = sealed.len() - 1;
        sealed[last] ^= 1;
        assert!(a.open(&sealed).is_none(), "tampered");
        assert!(a.open(b"short").is_none());
    }

    #[test]
    fn test_nonces_differ_and_plaintext_is_hidden() {
        let c = RoomCipher::new("YTMD-ABCDEFGHJK");
        let msg = WireMessage::Heartbeat { user_id: "user-visible".into() };
        let one = c.seal_line(&msg).unwrap();
        let two = c.seal_line(&msg).unwrap();
        assert_ne!(one, two);
        assert!(!one.contains("user-visible"));
        assert!(matches!(c.open_line(&one), Some(WireMessage::Heartbeat { user_id }) if user_id == "user-visible"));
    }

    #[test]
    fn test_client_hash_is_stable_and_not_the_id() {
        assert_eq!(client_hash("install-1"), client_hash("install-1"));
        assert_ne!(client_hash("install-1"), client_hash("install-2"));
        assert!(!client_hash("install-1").contains("install"));
    }
}
