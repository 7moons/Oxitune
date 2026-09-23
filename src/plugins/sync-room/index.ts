import { YTMDPlugin, PluginContext, TrackInfo } from '../types';
import { PlayerBridge } from '../../preload/bridge';

export interface SyncPlaybackPayload {
  video_id: string;
  title: string;
  artist: string;
  current_time_secs: number;
  is_playing: boolean;
  timestamp_ms: number;
}

interface RoomStatePayload {
  room_code: string;
  is_host: boolean;
  playback_state: SyncPlaybackPayload | null;
}

export interface LocalPlayback {
  videoId: string | null;
  paused: boolean;
  currentTime: number;
}

export interface SyncAction {
  navigateTo: string | null;
  setPlaying: boolean | null;
  seekTo: number | null;
}

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const DRIFT_TOLERANCE_SECS = 1.5;
/** Host and guest clocks are never perfectly in sync, so the host's
 * `timestamp_ms` can't be trusted for more than a rough transit estimate.
 * Capping it keeps a skewed clock from pushing the guest seconds ahead. */
const MAX_TRANSIT_SECS = 1.0;
const HOST_BROADCAST_INTERVAL_MS = 1000;
/** How long after asking YTM to switch tracks we trust that switch to be in
 * flight before issuing it again (or falling back to a full page load). */
const NAVIGATION_GRACE_MS = 5000;

export function computeSyncAction(payload: SyncPlaybackPayload, local: LocalPlayback, nowMs: number): SyncAction {
  const action: SyncAction = { navigateTo: null, setPlaying: null, seekTo: null };

  if (VIDEO_ID_RE.test(payload.video_id) && local.videoId !== payload.video_id) {
    action.navigateTo = payload.video_id;
    return action;
  }

  if (payload.is_playing === local.paused) {
    action.setPlaying = payload.is_playing;
  }

  const transit = Math.min(MAX_TRANSIT_SECS, Math.max(0, (nowMs - payload.timestamp_ms) / 1000));
  const target = payload.is_playing ? payload.current_time_secs + transit : payload.current_time_secs;
  if (Math.abs(local.currentTime - target) > DRIFT_TOLERANCE_SECS) {
    action.seekTo = target;
  }
  return action;
}

function currentVideoId(): string | null {
  return new URLSearchParams(window.location.search).get('v');
}

function isAdPlaying(): boolean {
  const player = document.getElementById('movie_player');
  return !!player && (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting'));
}

/** Switches tracks through YTM's own SPA router (the same `yt-navigate`
 * event its links fire) instead of `location.href`, which reloaded the
 * whole app, re-ran every plugin, and took seconds per track change. */
function navigateToVideo(videoId: string) {
  const app = document.querySelector('ytmusic-app');
  if (!app) {
    window.location.href = `https://music.youtube.com/watch?v=${videoId}`;
    return;
  }
  app.dispatchEvent(
    new CustomEvent('yt-navigate', {
      bubbles: true,
      composed: true,
      detail: { endpoint: { watchEndpoint: { videoId } } }
    })
  );
}

export class RoomSyncController {
  private isHost = false;
  private inRoom = false;
  private lastBroadcastMs = 0;
  private pendingNav: { videoId: string; atMs: number; attempts: number } | null = null;

  public setRoomState(inRoom: boolean, isHost: boolean) {
    this.inRoom = inRoom;
    this.isHost = isHost;
    if (!inRoom) this.pendingNav = null;
  }

  public isInRoom(): boolean {
    return this.inRoom;
  }

  public isRoomHost(): boolean {
    return this.isHost;
  }

  public handleRemotePlayback(payload: SyncPlaybackPayload, video: HTMLVideoElement | null) {
    if (!this.inRoom || this.isHost || isAdPlaying()) return;

    const now = Date.now();
    const local: LocalPlayback = {
      videoId: currentVideoId(),
      paused: video ? video.paused : true,
      currentTime: video ? video.currentTime : 0
    };
    const action = computeSyncAction(payload, local, now);

    if (action.navigateTo) {
      const pending = this.pendingNav;
      if (pending && pending.videoId === action.navigateTo && now - pending.atMs < NAVIGATION_GRACE_MS) return;
      const attempts = pending && pending.videoId === action.navigateTo ? pending.attempts + 1 : 1;
      this.pendingNav = { videoId: action.navigateTo, atMs: now, attempts };
      if (attempts > 1) {
        // SPA navigation didn't take; a full load always does.
        window.location.href = `https://music.youtube.com/watch?v=${action.navigateTo}`;
      } else {
        navigateToVideo(action.navigateTo);
      }
      return;
    }
    this.pendingNav = null;
    if (!video) return;

    if (action.setPlaying === true) PlayerBridge.play();
    else if (action.setPlaying === false) PlayerBridge.pause();

    if (action.seekTo !== null) PlayerBridge.seekTo(action.seekTo);
  }

  /** `force` skips the throttle: track and play/pause changes go out
   * immediately instead of waiting up to a second for the next tick. */
  public broadcastLocalState(
    track: TrackInfo | null,
    video: HTMLVideoElement | null,
    invoke: PluginContext['invoke'],
    force = false
  ) {
    if (!this.inRoom || !this.isHost || !track || !track.videoId || !video || isAdPlaying()) return;

    const now = Date.now();
    if (!force && now - this.lastBroadcastMs < HOST_BROADCAST_INTERVAL_MS) return;
    this.lastBroadcastMs = now;

    invoke('broadcast_sync_state', {
      playback: {
        video_id: track.videoId,
        title: track.title,
        artist: track.artist,
        current_time_secs: video.currentTime,
        is_playing: !video.paused,
        timestamp_ms: now
      }
    }).catch((e) => console.error('[YTMD Room Sync] broadcast failed:', e));
  }
}

let controllerRef: RoomSyncController | null = null;
let cleanup: (() => void) | null = null;

export const SyncRoomPlugin: YTMDPlugin = {
  id: 'sync_room',
  name: 'P2P Room Sync',
  description: 'Listen together with friends in real-time synchronized listening rooms',
  defaultEnabled: true,

  onInit(ctx: PluginContext) {
    const controller = new RoomSyncController();
    controllerRef = controller;

    const unlistenPromises: Promise<() => void>[] = [];
    if (window.__TAURI__?.event) {
      unlistenPromises.push(
        window.__TAURI__.event.listen<{ room_code: string; is_host: boolean }>('sync-room-updated', (e) => {
          controller.setRoomState(true, e.payload.is_host);
        }),
        window.__TAURI__.event.listen('sync-room-left', () => {
          controller.setRoomState(false, false);
        }),
        window.__TAURI__.event.listen<SyncPlaybackPayload>('sync-playback-remote', (e) => {
          controller.handleRemotePlayback(e.payload, ctx.getVideoElement());
        })
      );
    }

    // The page can (re)load while already in a room: app start after a
    // crash, or a fallback full-page track switch. Pick the room back up
    // instead of silently dropping out of sync.
    ctx
      .invoke('get_sync_room_state')
      .then((state) => {
        if (controllerRef !== controller || !state || typeof state !== 'object') return;
        const room = state as RoomStatePayload;
        controller.setRoomState(true, room.is_host);
        if (!room.is_host && room.playback_state) {
          controller.handleRemotePlayback(room.playback_state, ctx.getVideoElement());
        }
      })
      .catch((e) => console.error('[YTMD Room Sync] failed to restore room state:', e));

    cleanup = () => {
      unlistenPromises.forEach((p) => p.then((unlisten) => unlisten()));
      controllerRef = null;
    };
  },

  onTrackChange(track: TrackInfo, ctx: PluginContext) {
    controllerRef?.broadcastLocalState(track, ctx.getVideoElement(), ctx.invoke, true);
  },

  onPlaybackChange(_isPlaying: boolean, ctx: PluginContext) {
    controllerRef?.broadcastLocalState(ctx.track, ctx.getVideoElement(), ctx.invoke, true);
  },

  onTick(_currentTimeSecs: number, ctx: PluginContext) {
    controllerRef?.broadcastLocalState(ctx.track, ctx.getVideoElement(), ctx.invoke);
  },

  onDestroy() {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  }
};
