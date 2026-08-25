import { YTMDPlugin, PluginContext, TrackInfo } from '../types';
import { PlayerBridge } from '../../preload/bridge';
import { setSafeHTML } from '../../utils/dom';

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
  private lastAppliedTimestamp = 0;

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

    this.lastAppliedTimestamp = now;

    // 1. Check if track needs to change
    const currentVideoId = new URLSearchParams(window.location.search).get('v');
    if (payload.video_id && currentVideoId !== payload.video_id) {
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

    // Throttle if we just applied a command
    if (Date.now() - this.lastAppliedTimestamp < 1000) return;

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

export const SyncRoomPlugin: YTMDPlugin = {
  id: 'sync_room',
  name: 'P2P Room Sync',
  description: 'Listen together with friends in real-time synchronized listening rooms',
  defaultEnabled: true,

  onInit(ctx: PluginContext) {
    const controller = new RoomSyncController();
    (this as any)._controller = controller;

    const injectListenTogetherBtn = () => {
      if (document.getElementById('ytmd-sync-nav-btn')) return;

      const navBarRight = document.querySelector('ytmusic-nav-bar .right-content');
      if (navBarRight) {
        const syncBtn = document.createElement('button');
        syncBtn.id = 'ytmd-sync-nav-btn';
        syncBtn.title = 'Listen Together (Room Sync)';
        setSafeHTML(syncBtn, `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
          </svg>
          <span style="margin-left: 6px; font-size: 13px; font-weight: 500;">Listen Together</span>
        `);
        syncBtn.style.cssText = `
          display: inline-flex;
          align-items: center;
          background: #18181b;
          border: 1px solid #27272a;
          color: #d4d4d8;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          margin-right: 8px;
          font-family: inherit;
          transition: background-color 0.15s ease, border-color 0.15s ease;
        `;
        syncBtn.addEventListener('mouseenter', () => {
          syncBtn.style.background = '#27272a';
          syncBtn.style.borderColor = '#3f3f46';
          syncBtn.style.color = '#fafafa';
        });
        syncBtn.addEventListener('mouseleave', () => {
          syncBtn.style.background = '#18181b';
          syncBtn.style.borderColor = '#27272a';
          syncBtn.style.color = '#d4d4d8';
        });

        syncBtn.addEventListener('click', async () => {
          await ctx.invoke('toggle_sync_window');
        });

        navBarRight.prepend(syncBtn);
      }
    };

    setInterval(injectListenTogetherBtn, 1000);
    injectListenTogetherBtn();

    if (window.__TAURI__?.event) {
      window.__TAURI__.event.listen<{ room_code: string; is_host: boolean }>('sync-room-updated', (e) => {
        controller.setRoomState(true, e.payload.is_host);
      });

      window.__TAURI__.event.listen('sync-room-left', () => {
        controller.setRoomState(false, false);
      });

      window.__TAURI__.event.listen<SyncPlaybackPayload>('sync-playback-remote', (e) => {
        controller.handleRemotePlayback(e.payload, ctx.getVideoElement());
      });
    }
  },

  onTick(_currentTimeSecs: number, ctx: PluginContext) {
    const controller = (this as any)._controller as RoomSyncController;
    if (controller && controller.isInRoom() && controller.isRoomHost()) {
      controller.broadcastLocalState(ctx.track, ctx.getVideoElement(), ctx.invoke);
    }
  }
};
