//! End-to-end protection for Listen Together (sync protocol 3).
//!
//! **Room secret.** A room code is `YTMD-` plus 26 characters of a 32-letter
//! alphabet: 130 random bits (`generate_room_code`). HKDF-SHA256 derives the
//! room key (AES-256-GCM) and the public topic id from it with separate
//! labels, so the topic id that brokers and the LAN see says nothing usable
//! about the key, and guessing a code offline is out of reach (2^130). The
//! old 10-character codes (~50 bits, PBKDF2 with a fixed salt, crackable
//! offline from the public topic id) are refused with `sync.error.oldCode`.
//!
//! **Who sent it.** Every install has its own Ed25519 identity
//! (`~/.ytmd/sync_identity`, owner-only). Every message is signed and the
//! signature covers the room's topic id, the sender's key, a per-session id,
//! a counter and a timestamp, then the whole thing is sealed with the room
//! key (AES-GCM, fresh random 96-bit nonce, AAD = protocol + topic id). A
//! receiver learns the sender's `client_hash` (SHA-256 of its public key)
//! from the signature, never from a field it could forge: the host binds each
//! member id to the key it joined with, and guests only accept host messages
//! signed by the key they pinned for the host (see `sync_room.rs`).
//!
//! **Replays.** Each sender keeps a random session id and a counter; a
//! receiver accepts each (session, counter) once, within a sliding window,
//! and a new session only with a timestamp within `MAX_CLOCK_SKEW` of its own
//! clock. So a broker operator (or anyone on the LAN) who records sealed
//! messages cannot play a `Kicked`, `Leave` or `Control` back later.
//!
//! What it does not do (documented in AUDIT.md): anyone holding the code can
//! read the room and join it (the code is a bearer secret; approval is what
//! stops strangers); a member who is kicked still knows the code, so can keep
//! reading until the room ends; a fresh joiner trusts the first host key it
//! sees (trust on first use), after that the host key is pinned.

use crate::sync_room::WireMessage;
use base64::{engine::general_purpose::STANDARD, Engine};
use parking_lot::Mutex;
use ring::aead::{Aad, LessSafeKey, Nonce, UnboundKey, AES_256_GCM, NONCE_LEN};
use ring::rand::{SecureRandom, SystemRandom};
use ring::signature::{Ed25519KeyPair, KeyPair, UnparsedPublicKey, ED25519};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

/// Wire format version inside every signed body.
const WIRE_VERSION: u8 = 3;
const HKDF_SALT: &[u8] = b"ytmd-listen-together-v3";
const SIGN_DOMAIN: &[u8] = b"ytmd-listen-together-v3/sig\0";
const AAD_PREFIX: &str = "ytmd-room-v3:";
/// How far a new sender session's timestamp may be from our clock.
const MAX_CLOCK_SKEW_MS: u64 = 10 * 60 * 1000;
/// Counters older than `max - REPLAY_WINDOW` are refused outright.
const REPLAY_WINDOW: u64 = 1024;
/// Distinct senders tracked per room before the oldest are forgotten.
const MAX_TRACKED_SENDERS: usize = 256;

pub const CODE_PREFIX: &str = "YTMD-";
pub const CODE_ALPHABET: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
pub const CODE_LEN: usize = 26;
const LEGACY_CODE_LEN: usize = 10;

pub(crate) fn to_hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

fn now_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as u64
}

// ---------------------------------------------------------------------
// Room codes
// ---------------------------------------------------------------------

/// A new room code: 26 × 5 = 130 random bits from the OS RNG.
pub fn generate_room_code() -> String {
    let rng = SystemRandom::new();
    let mut bytes = [0u8; CODE_LEN];
    rng.fill(&mut bytes).expect("OS random number generator");
    let body: String = bytes.iter().map(|b| CODE_ALPHABET[(b & 31) as usize] as char).collect();
    format!("{CODE_PREFIX}{body}")
}

/// The canonical code in `input` (any case, spaces and dashes inside
/// ignored). Errors are i18n keys: a 10-character code is from YTMD 0.2 or
/// older (`sync.error.oldCode`), anything else is `sync.error.badCode`.
pub fn parse_room_code(input: &str) -> Result<String, &'static str> {
    let upper = input.trim().to_ascii_uppercase();
    let rest = upper.strip_prefix(CODE_PREFIX).ok_or("sync.error.badCode")?;
    let body: String = rest.chars().filter(|c| !c.is_whitespace() && *c != '-').collect();
    let valid_chars = body.bytes().all(|b| CODE_ALPHABET.contains(&b));
    match body.len() {
        CODE_LEN if valid_chars => Ok(format!("{CODE_PREFIX}{body}")),
        LEGACY_CODE_LEN if valid_chars => Err("sync.error.oldCode"),
        _ => Err("sync.error.badCode"),
    }
}

// ---------------------------------------------------------------------
// Install identity
// ---------------------------------------------------------------------

/// This install's signing key in rooms.
pub struct Identity {
    key: Ed25519KeyPair,
    client_hash: String,
}

impl Identity {
    fn from_seed(seed: &[u8; 32]) -> Self {
        let key = Ed25519KeyPair::from_seed_unchecked(seed).expect("32-byte Ed25519 seed");
        let client_hash = client_hash_of_key(key.public_key().as_ref());
        Self { key, client_hash }
    }

    pub fn generate() -> Self {
        let mut seed = [0u8; 32];
        SystemRandom::new().fill(&mut seed).expect("OS random number generator");
        Self::from_seed(&seed)
    }

    /// Deterministic identity for tests: the same label is the same install.
    #[cfg(test)]
    pub fn for_test(label: &str) -> Self {
        let digest = ring::digest::digest(&ring::digest::SHA256, format!("ytmd-test-identity:{label}").as_bytes());
        let mut seed = [0u8; 32];
        seed.copy_from_slice(digest.as_ref());
        Self::from_seed(&seed)
    }

    /// The saved identity, or a new one written there (owner-only on unix).
    /// If it can't be written it lasts until restart.
    pub fn load_or_create(path: &Path) -> Self {
        if let Ok(saved) = std::fs::read_to_string(path) {
            let saved = saved.trim();
            if saved.len() == 64 {
                let mut seed = [0u8; 32];
                let ok = (0..32).all(|i| {
                    u8::from_str_radix(&saved[2 * i..2 * i + 2], 16).map(|b| seed[i] = b).is_ok()
                });
                if ok {
                    return Self::from_seed(&seed);
                }
            }
        }
        let mut seed = [0u8; 32];
        SystemRandom::new().fill(&mut seed).expect("OS random number generator");
        if let Err(e) = crate::secure_fs::write_private(path, to_hex(&seed).as_bytes()) {
            log::warn!("Listen Together: couldn't save the room identity: {e}");
        }
        Self::from_seed(&seed)
    }

    pub fn client_hash(&self) -> &str {
        &self.client_hash
    }

    fn public_key(&self) -> &[u8] {
        self.key.public_key().as_ref()
    }
}

/// Test installs: the `client_hash` of `Identity::for_test(label)`.
#[cfg(test)]
pub(crate) fn client_hash(label: &str) -> String {
    Identity::for_test(label).client_hash().to_string()
}

/// A cipher for `code` sending as a throwaway test identity.
#[cfg(test)]
pub(crate) fn test_cipher(code: &str) -> RoomCipher {
    RoomCipher::new(code, Arc::new(Identity::generate()))
}

/// Public, stable name of an install in rooms: bans, approvals and roles are
/// keyed by it. Derived from the public key, so it can't be claimed without
/// the matching private key.
pub fn client_hash_of_key(public_key: &[u8]) -> String {
    let mut ctx = ring::digest::Context::new(&ring::digest::SHA256);
    ctx.update(b"ytmd-client-key:");
    ctx.update(public_key);
    to_hex(&ctx.finish().as_ref()[..16])
}

// ---------------------------------------------------------------------
// Sealed, signed messages
// ---------------------------------------------------------------------

#[derive(Serialize, Deserialize)]
struct SignedBody {
    v: u8,
    /// Sender's Ed25519 public key (base64).
    from: String,
    /// Sender's random session id and message counter, for replay checks.
    sid: u64,
    ctr: u64,
    /// Sender's clock (Unix ms), only for accepting a new session.
    ts: u64,
    msg: WireMessage,
}

#[derive(Serialize, Deserialize)]
struct Envelope {
    /// The signed body, exactly as signed (base64 of its JSON).
    b: String,
    /// Ed25519 signature over `SIGN_DOMAIN || topic_id || b` (base64).
    s: String,
}

/// A message that opened, verified and wasn't a replay.
#[derive(Debug)]
pub(crate) struct Opened {
    pub msg: WireMessage,
    /// `client_hash_of_key` of the key that signed it.
    pub sender: String,
}

struct KeyLen(usize);
impl ring::hkdf::KeyType for KeyLen {
    fn len(&self) -> usize {
        self.0
    }
}

#[derive(Default)]
struct SenderWindow {
    sid: u64,
    max: u64,
    /// Bit i set = counter `max - i` seen.
    seen: u128,
    /// Extra bits for the rest of the window.
    older: std::collections::BTreeSet<u64>,
    last_used: u64,
}

impl SenderWindow {
    /// Records `ctr`; false if it was seen or is too old.
    fn accept(&mut self, ctr: u64) -> bool {
        if ctr > self.max {
            let shift = ctr - self.max;
            // Move what falls off the 128-bit map into `older`.
            for i in 0..128u64 {
                if self.seen & (1u128 << i) != 0 && i.saturating_add(shift) >= 128 {
                    self.older.insert(self.max - i);
                }
            }
            self.seen = if shift >= 128 { 0 } else { self.seen << shift };
            self.seen |= 1;
            self.max = ctr;
            let floor = self.max.saturating_sub(REPLAY_WINDOW);
            self.older.retain(|c| *c > floor);
            return true;
        }
        let back = self.max - ctr;
        if back >= REPLAY_WINDOW {
            return false;
        }
        if back < 128 {
            let bit = 1u128 << back;
            if self.seen & bit != 0 {
                return false;
            }
            self.seen |= bit;
            return true;
        }
        self.older.insert(ctr)
    }
}

pub(crate) struct RoomCipher {
    key: LessSafeKey,
    topic_id: String,
    rng: SystemRandom,
    identity: Arc<Identity>,
    session: u64,
    counter: AtomicU64,
    replay: Mutex<HashMap<String, SenderWindow>>,
}

impl RoomCipher {
    /// Key and topic id for `room_code` (callers pass a code already checked
    /// by `parse_room_code`), sending as `identity`.
    pub(crate) fn new(room_code: &str, identity: Arc<Identity>) -> Self {
        let code = room_code.trim().to_ascii_uppercase();
        let prk = ring::hkdf::Salt::new(ring::hkdf::HKDF_SHA256, HKDF_SALT).extract(code.as_bytes());
        let mut key_bytes = [0u8; 32];
        let mut topic = [0u8; 16];
        prk.expand(&[b"room-key"], KeyLen(32))
            .and_then(|okm| okm.fill(&mut key_bytes))
            .expect("HKDF output fits");
        prk.expand(&[b"topic-id"], KeyLen(16))
            .and_then(|okm| okm.fill(&mut topic))
            .expect("HKDF output fits");
        let rng = SystemRandom::new();
        let mut sid = [0u8; 8];
        rng.fill(&mut sid).expect("OS random number generator");
        Self {
            key: LessSafeKey::new(UnboundKey::new(&AES_256_GCM, &key_bytes).expect("32-byte key")),
            topic_id: to_hex(&topic),
            rng,
            identity,
            session: u64::from_le_bytes(sid),
            counter: AtomicU64::new(1),
            replay: Mutex::new(HashMap::new()),
        }
    }

    /// Public name of the room on brokers and in LAN beacons.
    pub(crate) fn topic_id(&self) -> &str {
        &self.topic_id
    }

    fn aad(&self) -> String {
        format!("{AAD_PREFIX}{}", self.topic_id)
    }

    fn signed_bytes(&self, body_b64: &str) -> Vec<u8> {
        let mut out = SIGN_DOMAIN.to_vec();
        out.extend_from_slice(self.topic_id.as_bytes());
        out.push(0);
        out.extend_from_slice(body_b64.as_bytes());
        out
    }

    /// `nonce || ciphertext || tag` of the signed envelope.
    pub(crate) fn seal_msg(&self, msg: &WireMessage) -> Option<Vec<u8>> {
        let body = SignedBody {
            v: WIRE_VERSION,
            from: STANDARD.encode(self.identity.public_key()),
            sid: self.session,
            ctr: self.counter.fetch_add(1, Ordering::SeqCst),
            ts: now_ms(),
            msg: msg.clone(),
        };
        let b = STANDARD.encode(serde_json::to_vec(&body).ok()?);
        let s = STANDARD.encode(self.identity.key.sign(&self.signed_bytes(&b)).as_ref());
        let plain = serde_json::to_vec(&Envelope { b, s }).ok()?;

        let mut nonce = [0u8; NONCE_LEN];
        self.rng.fill(&mut nonce).ok()?;
        let mut in_out = plain;
        self.key
            .seal_in_place_append_tag(Nonce::assume_unique_for_key(nonce), Aad::from(self.aad().as_bytes()), &mut in_out)
            .ok()?;
        let mut out = nonce.to_vec();
        out.extend_from_slice(&in_out);
        Some(out)
    }

    /// `None` for anything not sealed with this room's key, not validly
    /// signed, or already seen.
    pub(crate) fn open_msg(&self, data: &[u8]) -> Option<Opened> {
        if data.len() < NONCE_LEN {
            return None;
        }
        let (nonce, sealed) = data.split_at(NONCE_LEN);
        let nonce = Nonce::try_assume_unique_for_key(nonce).ok()?;
        let mut in_out = sealed.to_vec();
        let plain = self.key.open_in_place(nonce, Aad::from(self.aad().as_bytes()), &mut in_out).ok()?;
        let envelope: Envelope = serde_json::from_slice(plain).ok()?;
        let body_bytes = STANDARD.decode(&envelope.b).ok()?;
        let body: SignedBody = serde_json::from_slice(&body_bytes).ok()?;
        if body.v != WIRE_VERSION {
            return None;
        }
        let public_key = STANDARD.decode(&body.from).ok()?;
        let signature = STANDARD.decode(&envelope.s).ok()?;
        UnparsedPublicKey::new(&ED25519, &public_key)
            .verify(&self.signed_bytes(&envelope.b), &signature)
            .ok()?;
        let sender = client_hash_of_key(&public_key);
        if !self.fresh(&sender, body.sid, body.ctr, body.ts) {
            log::debug!("Listen Together: dropped a replayed or stale message");
            return None;
        }
        Some(Opened { msg: body.msg, sender })
    }

    fn fresh(&self, sender: &str, sid: u64, ctr: u64, ts: u64) -> bool {
        let now = now_ms();
        let mut replay = self.replay.lock();
        if let Some(window) = replay.get_mut(sender) {
            if window.sid == sid {
                window.last_used = now;
                return window.accept(ctr);
            }
        }
        // A sender's new session: only if its clock is about right, so an
        // old session recorded earlier can't be replayed from scratch.
        if now.abs_diff(ts) > MAX_CLOCK_SKEW_MS {
            return false;
        }
        if replay.len() >= MAX_TRACKED_SENDERS && !replay.contains_key(sender) {
            if let Some(oldest) = replay.iter().min_by_key(|(_, w)| w.last_used).map(|(k, _)| k.clone()) {
                replay.remove(&oldest);
            }
        }
        let mut window = SenderWindow { sid, max: ctr, seen: 1, last_used: now, ..SenderWindow::default() };
        window.older.clear();
        replay.insert(sender.to_string(), window);
        true
    }

    /// One LAN protocol line: base64 of the sealed message, plus `\n`.
    pub(crate) fn seal_line(&self, msg: &WireMessage) -> Option<String> {
        let mut line = STANDARD.encode(self.seal_msg(msg)?);
        line.push('\n');
        Some(line)
    }

    pub(crate) fn open_line(&self, line: &str) -> Option<Opened> {
        self.open_msg(&STANDARD.decode(line.trim()).ok()?)
    }
}

// ---------------------------------------------------------------------
// Protocol 2, only to tell old clients to update
// ---------------------------------------------------------------------

/// The protocol-2 cipher (PBKDF2 of the code, no signatures). A v3 host
/// derives it from its own code only to answer an old client's `Join` with
/// `Rejected { Outdated }`, which that client shows as "update YTMD".
pub(crate) struct LegacyCipher {
    key: LessSafeKey,
    topic_id: String,
    rng: SystemRandom,
}

impl LegacyCipher {
    const ITERATIONS: u32 = 20_000;
    const SALT: &'static [u8] = b"ytmd-listen-together-v2";
    const AAD: &'static [u8] = b"ytmd-room";

    pub(crate) fn new(room_code: &str) -> Self {
        let code = room_code.trim().to_uppercase();
        let mut derived = [0u8; 48];
        ring::pbkdf2::derive(
            ring::pbkdf2::PBKDF2_HMAC_SHA256,
            std::num::NonZeroU32::new(Self::ITERATIONS).expect("non-zero"),
            Self::SALT,
            code.as_bytes(),
            &mut derived,
        );
        Self {
            key: LessSafeKey::new(UnboundKey::new(&AES_256_GCM, &derived[..32]).expect("32-byte key")),
            topic_id: to_hex(&derived[32..]),
            rng: SystemRandom::new(),
        }
    }

    pub(crate) fn topic_id(&self) -> &str {
        &self.topic_id
    }

    pub(crate) fn seal_msg(&self, msg: &WireMessage) -> Option<Vec<u8>> {
        let mut nonce = [0u8; NONCE_LEN];
        self.rng.fill(&mut nonce).ok()?;
        let mut in_out = serde_json::to_vec(msg).ok()?;
        self.key
            .seal_in_place_append_tag(Nonce::assume_unique_for_key(nonce), Aad::from(Self::AAD), &mut in_out)
            .ok()?;
        let mut out = nonce.to_vec();
        out.extend_from_slice(&in_out);
        Some(out)
    }

    pub(crate) fn open_msg(&self, data: &[u8]) -> Option<WireMessage> {
        if data.len() < NONCE_LEN {
            return None;
        }
        let (nonce, sealed) = data.split_at(NONCE_LEN);
        let nonce = Nonce::try_assume_unique_for_key(nonce).ok()?;
        let mut in_out = sealed.to_vec();
        let plain = self.key.open_in_place(nonce, Aad::from(Self::AAD), &mut in_out).ok()?;
        serde_json::from_slice(plain).ok()
    }

    pub(crate) fn seal_line(&self, msg: &WireMessage) -> Option<String> {
        let mut line = STANDARD.encode(self.seal_msg(msg)?);
        line.push('\n');
        Some(line)
    }

    pub(crate) fn open_line(&self, line: &str) -> Option<WireMessage> {
        self.open_msg(&STANDARD.decode(line.trim()).ok()?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const CODE: &str = "YTMD-ABCDEFGHJKLMNPQRSTUVWXYZ";

    fn cipher(code: &str, who: &str) -> RoomCipher {
        RoomCipher::new(code, Arc::new(Identity::for_test(who)))
    }

    fn hb(id: &str) -> WireMessage {
        WireMessage::Heartbeat { user_id: id.into() }
    }

    #[test]
    fn test_codes_have_130_bits_and_parse_back() {
        let code = generate_room_code();
        assert_eq!(code.len(), CODE_PREFIX.len() + CODE_LEN);
        assert_eq!(parse_room_code(&code), Ok(code.clone()));
        let spaced = format!("  {}  ", code.to_lowercase());
        assert_eq!(parse_room_code(&spaced), Ok(code.clone()));
        let grouped = format!("YTMD-{}-{}", &code[5..18], &code[18..]);
        assert_eq!(parse_room_code(&grouped), Ok(code.clone()));
        assert_ne!(generate_room_code(), code);
        // Every alphabet letter is used with equal weight (32 = 2^5).
        assert_eq!(CODE_ALPHABET.len(), 32);
    }

    #[test]
    fn test_old_and_malformed_codes_are_refused() {
        assert_eq!(parse_room_code("YTMD-ABCDEFGHJK"), Err("sync.error.oldCode"));
        assert_eq!(parse_room_code("YTMD-ABC"), Err("sync.error.badCode"));
        assert_eq!(parse_room_code("ABCDEFGHJKLMNPQRSTUVWXYZ23"), Err("sync.error.badCode"));
        assert_eq!(parse_room_code("YTMD-ABCDEFGHJKLMNPQRSTUVWXY0"), Err("sync.error.badCode"), "0 is not in the alphabet");
    }

    #[test]
    fn test_same_code_same_topic_and_messages_open_across_installs() {
        let a = cipher(CODE, "a");
        let b = cipher(&CODE.to_lowercase(), "b");
        assert_eq!(a.topic_id(), b.topic_id());
        assert_eq!(a.topic_id().len(), 32);
        assert!(!a.topic_id().to_uppercase().contains("ABCDEFGHJK"));
        let opened = b.open_msg(&a.seal_msg(&hb("x")).unwrap()).unwrap();
        assert_eq!(opened.sender, Identity::for_test("a").client_hash());
        assert!(matches!(opened.msg, WireMessage::Heartbeat { ref user_id } if user_id == "x"));
    }

    #[test]
    fn test_other_room_tampered_or_truncated_does_not_open() {
        let a = cipher(CODE, "a");
        let other = cipher("YTMD-ZZZZZZZZZZZZZZZZZZZZZZZZZZ", "b");
        let mut sealed = a.seal_msg(&hb("x")).unwrap();
        assert!(other.open_msg(&sealed).is_none(), "wrong room");
        let last = sealed.len() - 1;
        sealed[last] ^= 1;
        assert!(cipher(CODE, "c").open_msg(&sealed).is_none(), "tampered");
        assert!(a.open_msg(b"short").is_none());
    }

    #[test]
    fn test_nonces_differ_and_plaintext_is_hidden() {
        let c = cipher(CODE, "a");
        let one = c.seal_line(&hb("user-visible")).unwrap();
        let two = c.seal_line(&hb("user-visible")).unwrap();
        assert_ne!(one, two);
        assert!(!one.contains("user-visible"));
        let rx = cipher(CODE, "rx");
        assert!(rx.open_line(&one).is_some());
    }

    #[test]
    fn test_replayed_messages_are_dropped() {
        let tx = cipher(CODE, "tx");
        let rx = cipher(CODE, "rx");
        let first = tx.seal_msg(&hb("x")).unwrap();
        let second = tx.seal_msg(&hb("x")).unwrap();
        assert!(rx.open_msg(&second).is_some());
        assert!(rx.open_msg(&first).is_some(), "out of order within the window is fine");
        assert!(rx.open_msg(&first).is_none(), "but only once");
        assert!(rx.open_msg(&second).is_none());
    }

    #[test]
    fn test_counter_window_slides() {
        let mut w = SenderWindow { sid: 1, max: 1, seen: 1, ..SenderWindow::default() };
        assert!(w.accept(300));
        assert!(w.accept(100), "within the window, not seen");
        assert!(!w.accept(100));
        assert!(w.accept(5000));
        assert!(!w.accept(300), "fell out of the window");
        assert!(!w.accept(5000));
    }

    /// A signature is only valid for its own body: swapping in another
    /// message under someone else's signature (to pose as them) fails.
    #[test]
    fn test_signed_by_someone_else_does_not_verify() {
        let mallory = cipher(CODE, "mallory");
        let host = Identity::for_test("host");
        // Mallory signs with her key but claims the host's public key.
        let body = SignedBody {
            v: WIRE_VERSION,
            from: STANDARD.encode(host.public_key()),
            sid: 1,
            ctr: 1,
            ts: now_ms(),
            msg: WireMessage::Kicked { user_id: "victim".into() },
        };
        let b = STANDARD.encode(serde_json::to_vec(&body).unwrap());
        let s = STANDARD.encode(Identity::for_test("mallory").key.sign(&mallory.signed_bytes(&b)).as_ref());
        let mut nonce = [0u8; NONCE_LEN];
        SystemRandom::new().fill(&mut nonce).unwrap();
        let mut in_out = serde_json::to_vec(&Envelope { b, s }).unwrap();
        mallory
            .key
            .seal_in_place_append_tag(Nonce::assume_unique_for_key(nonce), Aad::from(mallory.aad().as_bytes()), &mut in_out)
            .unwrap();
        let mut forged = nonce.to_vec();
        forged.extend_from_slice(&in_out);
        assert!(cipher(CODE, "victim").open_msg(&forged).is_none());
    }

    #[test]
    fn test_stale_session_is_refused() {
        let rx = cipher(CODE, "rx");
        assert!(!rx.fresh("someone", 7, 1, now_ms() - 2 * MAX_CLOCK_SKEW_MS));
        assert!(rx.fresh("someone", 7, 1, now_ms()));
        assert!(rx.fresh("someone", 7, 2, 0), "same session: the counter decides");
    }

    #[test]
    fn test_client_hash_comes_from_the_key() {
        let a = Identity::for_test("a");
        assert_eq!(a.client_hash(), client_hash_of_key(a.public_key()));
        assert_ne!(a.client_hash(), Identity::for_test("b").client_hash());
        assert_eq!(a.client_hash().len(), 32);
    }

    #[test]
    fn test_identity_persists_and_is_private() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("sync_identity");
        let first = Identity::load_or_create(&path);
        assert_eq!(Identity::load_or_create(&path).client_hash(), first.client_hash());
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            assert_eq!(std::fs::metadata(&path).unwrap().permissions().mode() & 0o777, 0o600);
        }
        std::fs::write(&path, "garbage").unwrap();
        assert_ne!(Identity::load_or_create(&path).client_hash(), first.client_hash());
    }

    #[test]
    fn test_legacy_cipher_matches_protocol_2() {
        // Same derivation as the 0.2 RoomCipher: topic id is 32 hex chars
        // and a message it seals opens with the same code.
        let a = LegacyCipher::new("YTMD-ABCDEFGHJK");
        let b = LegacyCipher::new(" ytmd-abcdefghjk ");
        assert_eq!(a.topic_id(), b.topic_id());
        let line = a.seal_line(&hb("old")).unwrap();
        assert!(matches!(b.open_line(&line), Some(WireMessage::Heartbeat { .. })));
    }
}
