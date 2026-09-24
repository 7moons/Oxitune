/**
 * Phone remote protocol v1, mirrored from src-tauri/src/remote_server/protocol.rs.
 * The contract is schemas/remote_v1.json; src/tests/remote.test.ts checks
 * these message types against it.
 */

export const PROTOCOL_VERSION = 1;

export interface TrackView {
  title: string;
  artist: string;
  album?: string | null;
  cover_url?: string | null;
  duration_secs: number;
  video_id?: string | null;
}

export type LikeStatus = 'like' | 'dislike' | 'none';
export type RepeatMode = 'none' | 'all' | 'one';

export interface Accent {
  primary: string;
  secondary: string;
  accent: string;
}

export interface PlayerState {
  track: TrackView | null;
  playing: boolean;
  position_secs: number;
  sampled_at_ms: number;
  server_time_ms: number;
  volume: number;
  muted: boolean;
  like: LikeStatus;
  shuffle: boolean;
  repeat: RepeatMode;
  accent: Accent | null;
}

export interface QueueEntry {
  id: string;
  video_id: string;
  title: string;
  artist: string;
  thumbnail?: string | null;
  current?: boolean;
}

export interface RoomMember {
  id: string;
  nickname: string;
  role: 'host' | 'moderator' | 'dj' | 'listener';
  is_host: boolean;
}

export interface RoomView {
  is_host: boolean;
  me: string;
  members: RoomMember[];
  skip_votes: string[];
  votes_needed: number;
}

export interface SearchResult {
  video_id: string;
  title: string;
  subtitle: string;
  thumbnail?: string | null;
}

export interface LyricWord {
  t: number;
  text: string;
}

export interface LyricLine {
  t: number;
  text: string;
  words?: LyricWord[];
}

/** The lyrics feature's `lyrics-changed` payload, passed through. */
export interface LyricsPayload {
  video_id?: string | null;
  provider?: string | null;
  synced?: LyricLine[] | null;
  plain?: string | null;
  offset_secs?: number | null;
  source_url?: string | null;
}

export type ServerMsg =
  | { type: 'hello'; version: number }
  | ({ type: 'state' } & PlayerState)
  | { type: 'queue'; items: QueueEntry[]; shared: boolean }
  | { type: 'lyrics'; lyrics: LyricsPayload | null }
  | { type: 'room'; room: RoomView | null }
  | { type: 'reaction'; from: string; emoji: string }
  | { type: 'search_results'; id: number; results: SearchResult[] }
  | { type: 'result'; id: number; ok: boolean; error?: string };

export type PlayerCommand = 'play_pause' | 'next' | 'previous' | 'like' | 'dislike' | 'mute' | 'shuffle' | 'repeat';

export type ClientMsg =
  | { type: 'cmd'; id?: number; command: PlayerCommand }
  | { type: 'seek'; id?: number; position_secs: number }
  | { type: 'volume'; id?: number; volume: number }
  | { type: 'queue_jump'; id?: number; item_id: string }
  | { type: 'queue_move'; id?: number; item_id: string; to_index: number }
  | { type: 'queue_remove'; id?: number; item_id: string }
  | { type: 'search'; id: number; query: string }
  | { type: 'play'; id?: number; video_id: string }
  | { type: 'enqueue'; id?: number; video_id: string; next?: boolean }
  | { type: 'react'; id?: number; emoji: string }
  | { type: 'vote_skip'; id?: number };

export const SERVER_MSG_TYPES: ServerMsg['type'][] = [
  'hello',
  'state',
  'queue',
  'lyrics',
  'room',
  'reaction',
  'search_results',
  'result'
];

export const CLIENT_MSG_TYPES: ClientMsg['type'][] = [
  'cmd',
  'seek',
  'volume',
  'queue_jump',
  'queue_move',
  'queue_remove',
  'search',
  'play',
  'enqueue',
  'react',
  'vote_skip'
];
