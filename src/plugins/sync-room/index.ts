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

export class RoomSyncController {
  private isHost = false;
  private inRoom = false;
  private lastBroadcastTimestamp = 0;

  public setRoomState(inRoom: boolean, isHost: boolean) {
    this.inRoom = inRoom;
    this.isHost = isHost;
  }

  public isInRoom(): boolean {
    return this.inRoom;
  }

  public isRoomHost(): boolean {
    return this.isHost;
  }

  public handleRemotePlayback(payload: SyncPlaybackPayload, video: HTMLVideoElement | null) {
    if (!this.inRoom || this.isHost || !video) return;

    const now = Date.now();
    const elapsedSinceSent = (now - payload.timestamp_ms) / 1000;
    const targetTime = payload.is_playing
      ? payload.current_time_secs + Math.max(0, elapsedSinceSent)
      : payload.current_time_secs;

    // 1. Check if track needs to change
    const currentVideoId = new URLSearchParams(window.location.search).get('v');
    if (payload.video_id && /^[A-Za-z0-9_-]{11}$/.test(payload.video_id) && currentVideoId !== payload.video_id) {
      console.log(`[YTMD Room Sync] Switching to track: ${payload.video_id}`);
      window.location.href = `https://music.youtube.com/watch?v=${payload.video_id}`;
      return;
    }

    // 2. Play / Pause alignment
    if (payload.is_playing && video.paused) {
      PlayerBridge.play();
    } else if (!payload.is_playing && !video.paused) {
      PlayerBridge.pause();
    }

    // 3. Drift compensation (> 1.5s tolerance)
    const drift = Math.abs(video.currentTime - targetTime);
    if (drift > 1.5) {
      console.log(`[YTMD Room Sync] Drift detected (${drift.toFixed(2)}s). Resyncing to ${targetTime.toFixed(1)}s...`);
      PlayerBridge.seekTo(targetTime);
    }
  }

  public broadcastLocalState(track: TrackInfo | null, video: HTMLVideoElement | null, invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>) {
    if (!this.inRoom || !this.isHost || !track || !track.videoId || !video) return;

    // Throttle so we don't spam broadcast_sync_state on every tick
    const now = Date.now();
    if (now - this.lastBroadcastTimestamp < 1000) return;
    this.lastBroadcastTimestamp = now;

    invoke('broadcast_sync_state', {
      playback: {
        video_id: track.videoId,
        title: track.title,
        artist: track.artist,
        current_time_secs: video.currentTime,
        is_playing: !video.paused,
        timestamp_ms: Date.now()
      }
    }).catch(() => {
      // Local broadcast
    });
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

    cleanup = () => {
      unlistenPromises.forEach((p) => p.then((unlisten) => unlisten()));
      controllerRef = null;
    };
  },

  onTick(_currentTimeSecs: number, ctx: PluginContext) {
    if (controllerRef && controllerRef.isInRoom() && controllerRef.isRoomHost()) {
      controllerRef.broadcastLocalState(ctx.track, ctx.getVideoElement(), ctx.invoke);
    }
  },

  onDestroy() {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  }
};
