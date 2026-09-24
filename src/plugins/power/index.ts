import { YTMDPlugin, PluginContext, PluginManifest } from '../types';
import manifest from './manifest.json';

let cleanup: (() => void) | null = null;

/** Whether the system should be kept awake right now. Read from the live
 * config on every play/pause, so toggling the setting applies on the next
 * state change instead of only after a restart. Default on. */
export const shouldInhibitSleep = (inhibitSetting: unknown, playing: boolean): boolean =>
  playing && inhibitSetting !== false;

export const PowerPlugin: YTMDPlugin = {
  id: 'power_watchdog',
  manifest: manifest as PluginManifest,
  name: 'Smart Power & Audio Watchdog',
  description: 'Keeps the system awake during playback',
  defaultEnabled: true,

  // Pausing on screen lock lives in the backend (screen_lock.rs listens for
  // the desktop's real lock signal). It used to key off `document.hidden`
  // here, which is also true when the window is merely minimized or hidden
  // to the tray — so minimizing paused the music.
  onInit(ctx: PluginContext) {
    let wakeLock: WakeLockSentinel | null = null;
    let inhibited = false;
    let attachedVideo: HTMLVideoElement | null = null;

    const setInhibit = (inhibit: boolean) => {
      if (inhibited === inhibit) return;
      inhibited = inhibit;
      ctx.invoke('set_inhibit_sleep', { inhibit }).catch((e) => {
        inhibited = !inhibit;
        console.error('[Oscilla Power] set_inhibit_sleep failed:', e);
      });
    };

    // The system-level inhibitor (above) is what actually matters; the
    // Screen Wake Lock API is a bonus that WebKitGTK usually doesn't have,
    // so it must never gate the backend call.
    const requestWakeLock = async () => {
      if (!('wakeLock' in navigator) || wakeLock !== null) return;
      try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => {
          wakeLock = null;
        });
      } catch {
        // Not supported or denied.
      }
    };

    const releaseWakeLock = () => {
      wakeLock?.release().catch(() => {});
      wakeLock = null;
    };

    const sync = () => {
      const video = ctx.getVideoElement();
      const playing = !!video && !video.paused && !video.ended;
      const inhibit = shouldInhibitSleep(ctx.config.inhibit_sleep, playing);
      setInhibit(inhibit);
      if (inhibit) void requestWakeLock();
      else releaseWakeLock();
    };

    const attach = (video: HTMLVideoElement) => {
      for (const ev of ['play', 'playing', 'pause', 'ended']) video.addEventListener(ev, sync);
      attachedVideo = video;
    };
    const detach = (video: HTMLVideoElement) => {
      for (const ev of ['play', 'playing', 'pause', 'ended']) video.removeEventListener(ev, sync);
    };

    const initial = ctx.getVideoElement();
    if (initial) attach(initial);
    sync();

    // YTM's SPA can swap out the <video> element; follow the live one.
    const checkVideoInterval = window.setInterval(() => {
      const v = ctx.getVideoElement();
      if (v && v !== attachedVideo) {
        if (attachedVideo) detach(attachedVideo);
        attach(v);
        sync();
      }
    }, 1000);

    cleanup = () => {
      clearInterval(checkVideoInterval);
      if (attachedVideo) detach(attachedVideo);
      attachedVideo = null;
      releaseWakeLock();
      setInhibit(false);
    };
  },

  onDestroy() {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  }
};
