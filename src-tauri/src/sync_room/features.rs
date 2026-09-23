//! Host-side room features on top of membership: join approval, vote skip,
//! reactions, the shared queue, and the snapshot a host hands to its
//! successor. Every method here runs on the host (guests reach them through
//! `handle_guest_message`) and checks the caller's role itself.

use super::*;
use std::cmp::Reverse;

/// The reactions anyone can send. A fixed set keeps a public room from
/// being used to push arbitrary text onto everyone's screen.
pub const REACTIONS: &[&str] = &["🔥", "❤️", "😂", "👏", "😮", "💃"];
const REACTION_COOLDOWN: Duration = Duration::from_millis(800);
const MAX_QUEUE: usize = 100;
const MAX_TITLE_CHARS: usize = 200;

/// The member who takes over when the host leaves without picking someone:
/// highest role first, then whoever joined earliest. Every peer computes the
/// same answer from the same member list.
pub(crate) fn pick_successor(members: &[RoomMember]) -> Option<String> {
    members
        .iter()
        .filter(|m| !m.is_host)
        .min_by_key(|m| (Reverse(m.role.rank()), m.joined_at_ms, m.id.clone()))
        .map(|m| m.id.clone())
}

/// A YouTube (Music) video id from a pasted link or a bare id:
/// `music.youtube.com/watch?v=…`, `youtube.com/watch?v=…`,
/// `youtu.be/…`, `youtube.com/shorts/…`.
pub fn parse_video_id(input: &str) -> Option<String> {
    let input = input.trim();
    if is_video_id(input) {
        return Some(input.to_string());
    }
    let with_scheme = if input.contains("://") { input.to_string() } else { format!("https://{input}") };
    let url = url::Url::parse(&with_scheme).ok()?;
    let host = url.host_str()?.trim_start_matches("www.").trim_start_matches("m.");
    let id = match host {
        "youtu.be" => url.path_segments()?.next().map(str::to_string),
        "youtube.com" | "music.youtube.com" => {
            let mut segments = url.path_segments()?;
            match segments.next() {
                Some("watch") => url.query_pairs().find(|(k, _)| k == "v").map(|(_, v)| v.into_owned()),
                Some("shorts") | Some("embed") | Some("live") => segments.next().map(str::to_string),
                _ => None,
            }
        }
        _ => None,
    }?;
    is_video_id(&id).then_some(id)
}

/// First id not used by `queue` (ids are `q<n>`), for a new host carrying
/// the queue on.
pub(crate) fn next_queue_id(queue: &[QueueItem]) -> u64 {
    queue
        .iter()
        .filter_map(|i| i.id.strip_prefix('q')?.parse::<u64>().ok())
        .max()
        .map_or(0, |n| n + 1)
}

impl SyncRoomManager {
    // --- Join approval -------------------------------------------------

    pub(crate) fn set_require_approval(&self, on: bool, sink: &Arc<dyn SyncEventSink>) -> Result<(), String> {
        self.update_host_room(sink, |room| {
            room.require_approval = on;
            Ok(())
        })
    }

    /// TCP transport: the receiver resolves with the host's decision about
    /// `user_id`'s pending join.
    pub(crate) fn approval_waiter(
        &self,
        user_id: &str,
    ) -> Option<oneshot::Receiver<Result<Admission, RejectReason>>> {
        let mut book = self.host_book.lock();
        let entry = book.pending.get_mut(user_id)?;
        let (tx, rx) = oneshot::channel();
        entry.waiter = Some(tx);
        Some(rx)
    }

    /// Host: lets a waiting guest in, or turns them away.
    pub(crate) fn decide_pending(&self, user_id: &str, approve: bool, sink: &Arc<dyn SyncEventSink>) -> Result<(), String> {
        let (result, waiter) = {
            let mut guard = self.state.lock();
            let room = guard.as_mut().filter(|r| r.is_host).ok_or(ERR_NOT_HOST)?;
            let mut book = self.host_book.lock();
            let entry = book.pending.remove(user_id).ok_or(ERR_NO_SUCH_MEMBER)?;
            room.pending.retain(|p| p.user_id != user_id);
            let result = if approve {
                let hash = client_hash(&entry.join.client_id);
                self.admit_locked(room, &mut book, entry.join, hash)
            } else {
                Err(RejectReason::Denied)
            };
            (result, entry.waiter)
        };
        match &result {
            Ok(admission) => {
                if let Some(old) = &admission.replaced {
                    self.unregister_peer(old);
                }
                // An internet guest is in once a State lists it; a LAN
                // guest's connection announces again when it registers.
                self.announce_room(&admission.room, sink);
            }
            Err(reason) => {
                self.broadcast_to_peers(&WireMessage::Rejected { user_id: user_id.to_string(), reason: *reason });
                if let Some(room) = self.get_room_state() {
                    sink.room_updated(&room);
                }
            }
        }
        if let Some(waiter) = waiter {
            let _ = waiter.send(result);
        }
        Ok(())
    }

    /// A waiting guest went away (its connection closed or timed out).
    pub(crate) fn drop_pending(&self, user_id: &str, sink: &Arc<dyn SyncEventSink>) {
        let room = {
            let mut guard = self.state.lock();
            let Some(room) = guard.as_mut() else {
                return;
            };
            if self.host_book.lock().pending.remove(user_id).is_none() {
                return;
            }
            room.pending.retain(|p| p.user_id != user_id);
            room.clone()
        };
        sink.room_updated(&room);
    }

    /// Drops joins nobody decided on within `APPROVAL_TIMEOUT` (the guest has
    /// given up by then). Returns the room if anything changed.
    pub(crate) fn expire_pending(&self) -> Option<RoomState> {
        let mut guard = self.state.lock();
        let room = guard.as_mut()?;
        let mut book = self.host_book.lock();
        let before = book.pending.len();
        book.pending.retain(|_, p| p.since.elapsed() < APPROVAL_TIMEOUT);
        if book.pending.len() == before {
            return None;
        }
        room.pending.retain(|p| book.pending.contains_key(&p.user_id));
        Some(room.clone())
    }

    // --- Vote skip -----------------------------------------------------

    /// Counts `member_id`'s vote to skip the current song; a majority of the
    /// room (host included) skips it. Anyone may vote, listeners too.
    pub(crate) fn vote_skip(&self, member_id: &str, sink: &Arc<dyn SyncEventSink>) -> Result<(), String> {
        let (room, passed) = {
            let mut guard = self.state.lock();
            let room = guard.as_mut().filter(|r| r.is_host).ok_or(ERR_NOT_HOST)?;
            if room.member(member_id).is_none() {
                return Err(ERR_NO_SUCH_MEMBER.into());
            }
            let current = room
                .playback_state
                .as_ref()
                .map(|p| p.video_id.clone())
                .ok_or("sync.error.nothingPlaying")?;
            let mut book = self.host_book.lock();
            if book.vote_video.as_deref() != Some(current.as_str()) {
                book.vote_video = Some(current);
                room.skip_votes.clear();
            }
            if !room.skip_votes.iter().any(|v| v == member_id) {
                room.skip_votes.push(member_id.to_string());
            }
            let passed = room.skip_votes.len() >= votes_needed(room.members.len());
            if passed {
                room.skip_votes.clear();
                book.vote_video = None;
            }
            (room.clone(), passed)
        };
        if passed {
            sink.control_requested(&SyncControlRequest {
                from: String::new(),
                action: SyncControl::Next,
                source: ControlSource::Vote,
            });
        }
        self.announce_room(&room, sink);
        Ok(())
    }

    // --- Reactions -----------------------------------------------------

    pub(crate) fn react(&self, member_id: &str, emoji: &str, sink: &Arc<dyn SyncEventSink>) -> Result<(), String> {
        if !REACTIONS.contains(&emoji) {
            return Err(ERR_NOT_ALLOWED.into());
        }
        let from = {
            let guard = self.state.lock();
            let room = guard.as_ref().filter(|r| r.is_host).ok_or(ERR_NOT_HOST)?;
            let nickname = room.member(member_id).ok_or(ERR_NO_SUCH_MEMBER)?.nickname.clone();
            let mut book = self.host_book.lock();
            let now = Instant::now();
            if book
                .last_reaction
                .get(member_id)
                .is_some_and(|last| now.saturating_duration_since(*last) < REACTION_COOLDOWN)
            {
                return Err("sync.error.tooFast".into());
            }
            book.last_reaction.insert(member_id.to_string(), now);
            nickname
        };
        let reaction = ReactionPayload { from, emoji: emoji.to_string() };
        sink.reaction(&reaction);
        self.broadcast_to_peers(&WireMessage::ReactionShown { from: reaction.from, emoji: reaction.emoji });
        Ok(())
    }

    // --- Shared queue --------------------------------------------------

    /// DJs and up add songs; the host's page plays them in order as each
    /// song ends.
    pub(crate) fn queue_add(
        &self,
        member_id: &str,
        video_id: &str,
        title: &str,
        artist: &str,
        sink: &Arc<dyn SyncEventSink>,
    ) -> Result<(), String> {
        if !is_video_id(video_id) {
            return Err("sync.error.badLink".into());
        }
        self.update_host_room(sink, |room| {
            let adder = room.member(member_id).ok_or(ERR_NO_SUCH_MEMBER)?;
            if !adder.role.can_control() {
                return Err(ERR_NOT_ALLOWED.into());
            }
            if room.queue.len() >= MAX_QUEUE {
                return Err("sync.error.queueFull".into());
            }
            let title = clean_text(title, MAX_TITLE_CHARS);
            let item = QueueItem {
                id: {
                    let mut book = self.host_book.lock();
                    book.next_queue_id += 1;
                    format!("q{}", book.next_queue_id - 1)
                },
                video_id: video_id.to_string(),
                title: if title.is_empty() { video_id.to_string() } else { title },
                artist: clean_text(artist, MAX_TITLE_CHARS),
                added_by: adder.nickname.clone(),
                added_by_id: member_id.to_string(),
            };
            room.queue.push(item);
            Ok(())
        })
    }

    /// Whoever added a song can take it out again; moderators and the host
    /// can remove any.
    pub(crate) fn queue_remove(&self, member_id: &str, item_id: &str, sink: &Arc<dyn SyncEventSink>) -> Result<(), String> {
        self.update_host_room(sink, |room| {
            let role = room.member(member_id).ok_or(ERR_NO_SUCH_MEMBER)?.role;
            let pos = room.queue.iter().position(|i| i.id == item_id).ok_or("sync.error.noSuchSong")?;
            if room.queue[pos].added_by_id != member_id && !role.can_moderate() {
                return Err(ERR_NOT_ALLOWED.into());
            }
            room.queue.remove(pos);
            Ok(())
        })
    }

    /// DJs and up play a queued song right away.
    pub(crate) fn queue_play(&self, member_id: &str, item_id: &str, sink: &Arc<dyn SyncEventSink>) -> Result<(), String> {
        let mut played = None;
        self.update_host_room(sink, |room| {
            if !room.member(member_id).ok_or(ERR_NO_SUCH_MEMBER)?.role.can_control() {
                return Err(ERR_NOT_ALLOWED.into());
            }
            let pos = room.queue.iter().position(|i| i.id == item_id).ok_or("sync.error.noSuchSong")?;
            played = Some(room.queue.remove(pos));
            Ok(())
        })?;
        if let Some(item) = played {
            sink.control_requested(&SyncControlRequest {
                from: item.added_by,
                action: SyncControl::PlayVideo { video_id: item.video_id },
                source: ControlSource::Queue { title: item.title },
            });
        }
        Ok(())
    }

    pub(crate) fn queue_take_next(&self, sink: &Arc<dyn SyncEventSink>) -> Option<QueueItem> {
        let mut next = None;
        self.update_host_room(sink, |room| {
            if room.queue.is_empty() {
                return Err(String::new());
            }
            next = Some(room.queue.remove(0));
            Ok(())
        })
        .ok()?;
        next
    }

    // --- Handoff -------------------------------------------------------

    /// Host: the message that hands the room to `requested` (or the natural
    /// successor), with what the new host needs to keep the room as it was.
    pub(crate) fn handoff_message(&self, requested: Option<&str>) -> Result<WireMessage, String> {
        let guard = self.state.lock();
        let room = guard.as_ref().filter(|r| r.is_host).ok_or(ERR_NOT_HOST)?;
        let new_host_id = match requested {
            Some(id) => room
                .member(id)
                .filter(|m| !m.is_host)
                .map(|m| m.id.clone())
                .ok_or(ERR_NO_SUCH_MEMBER)?,
            None => pick_successor(&room.members).ok_or("sync.error.noSuccessor")?,
        };
        let approved = self.host_book.lock().approved.iter().cloned().collect();
        Ok(WireMessage::HostHandoff {
            new_host_id,
            room: RoomStateWire::from(room),
            banned: room.banned.clone(),
            approved,
        })
    }
}

/// Votes that skip a song in a room of `members`: more than half.
pub(crate) fn votes_needed(members: usize) -> usize {
    members / 2 + 1
}
