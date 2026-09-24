/**
 * The phone app's state: a pure reducer over server messages plus the
 * helpers the screens derive from it. Unit-tested in src/tests/remote.test.ts.
 */
import type { LyricLine, LyricsPayload, PlayerState, QueueEntry, RoomView, ServerMsg } from './protocol';

export interface RemoteState {
  connected: boolean;
  player: PlayerState | null;
  /** Phone clock (performance.now ms) when `player` arrived. */
  playerReceivedAt: number;
  queue: QueueEntry[];
  queueShared: boolean;
  lyrics: LyricsPayload | null;
  room: RoomView | null;
  /** Newest last; trimmed to the last few for the floating reactions. */
  reactions: { from: string; emoji: string; at: number }[];
}

export const initialState: RemoteState = {
  connected: false,
  player: null,
  playerReceivedAt: 0,
  queue: [],
  queueShared: false,
  lyrics: null,
  room: null,
  reactions: []
};

const MAX_REACTIONS = 12;

export type Action = { type: 'connected' } | { type: 'disconnected' } | { type: 'message'; msg: ServerMsg; now: number };

export function reduce(state: RemoteState, action: Action): RemoteState {
  switch (action.type) {
    case 'connected':
      return { ...state, connected: true };
    case 'disconnected':
      return { ...state, connected: false };
    case 'message': {
      const { msg, now } = action;
      switch (msg.type) {
        case 'state': {
          const { type: _type, ...player } = msg;
          return { ...state, player, playerReceivedAt: now };
        }
        case 'queue':
          return { ...state, queue: msg.items, queueShared: msg.shared };
        case 'lyrics':
          return { ...state, lyrics: msg.lyrics };
        case 'room':
          return { ...state, room: msg.room };
        case 'reaction':
          return {
            ...state,
            reactions: [...state.reactions, { from: msg.from, emoji: msg.emoji, at: now }].slice(-MAX_REACTIONS)
          };
        default:
          return state;
      }
    }
  }
}

/** Where the song is now, in seconds. The desktop's position was read at
 * `sampled_at_ms` and sent at `server_time_ms` (both its clock); from then
 * on only the phone's own elapsed time counts, so the two clocks are never
 * compared. */
export function currentPosition(player: PlayerState | null, receivedAt: number, now: number): number {
  if (!player) return 0;
  const duration = player.track?.duration_secs ?? 0;
  let pos = player.position_secs;
  if (player.playing) {
    pos += Math.max(0, player.server_time_ms - player.sampled_at_ms) / 1000;
    pos += Math.max(0, now - receivedAt) / 1000;
  }
  return duration > 0 ? Math.min(Math.max(0, pos), duration) : Math.max(0, pos);
}

export function formatTime(secs: number): string {
  if (!Number.isFinite(secs) || secs < 0) secs = 0;
  const s = Math.floor(secs);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** Synced lines for the song that's playing, or null. Lyrics for another
 * song (a stale event) are ignored. */
export function syncedLines(lyrics: LyricsPayload | null, videoId: string | null | undefined): LyricLine[] | null {
  if (!lyrics?.synced || lyrics.synced.length === 0) return null;
  if (lyrics.video_id && videoId && lyrics.video_id !== videoId) return null;
  return lyrics.synced;
}

/** Index of the line being sung at `positionSecs`, or -1 before the first. */
export function activeLineIndex(lines: LyricLine[], positionSecs: number, offsetSecs = 0): number {
  const t = positionSecs + offsetSecs;
  let lo = 0;
  let hi = lines.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].t <= t) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

/** Reconnect delay after `attempt` failures: 0.5s doubling to 10s, with
 * jitter so several phones don't hammer the PC in step. */
export function backoffMs(attempt: number, random = Math.random()): number {
  const base = Math.min(10_000, 500 * 2 ** Math.min(attempt, 10));
  return Math.round(base * (0.75 + random * 0.5));
}

/** Local reorder for instant feedback while the desktop confirms. */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from < 0 || from >= items.length) return items;
  const out = items.slice();
  const [item] = out.splice(from, 1);
  out.splice(Math.max(0, Math.min(to, out.length)), 0, item);
  return out;
}

/** What this phone may do in a room: listeners only react and vote. */
export function canControlRoom(room: RoomView | null): boolean {
  if (!room) return true;
  const me = room.members.find((m) => m.id === room.me);
  return !!me && me.role !== 'listener';
}
