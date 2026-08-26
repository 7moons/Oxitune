import { YTMDPlugin, PluginContext } from '../types';

let cleanup: (() => void) | null = null;

// Pure decision logic, covered directly by src/tests/power.test.ts: only
// pause when the tab/screen actually went hidden, the feature is enabled,
// and something is actually playing (never pause an already-paused video).
export const shouldPauseOnLock = (isHidden: boolean, pauseOnLockEnabled: boolean, videoPaused: boolean): boolean =>
  isHidden && pauseOnLockEnabled && !videoPaused;

export const PowerPlugin: YTMDPlugin = {
  id: 'power_watchdog',
  name: 'Smart Power & Audio Watchdog',
  description: 'Inhibits system sleep during active playback and auto-pauses when screen is locked',
  defaultEnabled: true,

  onInit(ctx: PluginContext) {
    let wakeLock: WakeLockSentinel | null = null;
    let checkVideoInterval: number | null = null;
    let attachedVideo: HTMLVideoElement | null = null;
    const inhibitSleep = ctx.config.inhibit_sleep !== false;

    const requestWakeLock = async () => {
      if (!inhibitSleep || wakeLock !== null) return;
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
          wakeLock.addEventListener('release', () => {
            wakeLock = null;
          });
        }
        await ctx.invoke('set_inhibit_sleep', { inhibit: true });
      } catch {
        // WakeLock not supported or denied
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLock !== null) {
        try {
          await wakeLock.release();
          wakeLock = null;
        } catch {
          // Release
        }
      }
      await ctx.invoke('set_inhibit_sleep', { inhibit: false });
    };

    const attachVideoListeners = (video: HTMLVideoElement) => {
      video.addEventListener('play', requestWakeLock);
      video.addEventListener('playing', requestWakeLock);
      video.addEventListener('pause', releaseWakeLock);
      video.addEventListener('ended', releaseWakeLock);
      attachedVideo = video;
    };

    const detachVideoListeners = (video: HTMLVideoElement) => {
      video.removeEventListener('play', requestWakeLock);
      video.removeEventListener('playing', requestWakeLock);
      video.removeEventListener('pause', releaseWakeLock);
      video.removeEventListener('ended', releaseWakeLock);
    };

    const video = ctx.getVideoElement();
    if (video) {
      attachVideoListeners(video);
    } else {
      checkVideoInterval = window.setInterval(() => {
        const v = ctx.getVideoElement();
        if (v) {
          if (checkVideoInterval !== null) clearInterval(checkVideoInterval);
          checkVideoInterval = null;
          attachVideoListeners(v);
        }
      }, 1000);
    }

    // Auto-pause when the screen locks or the window/tab is hidden, if enabled.
    const handleVisibilityChange = () => {
      const activeVideo = ctx.getVideoElement();
      if (!activeVideo) return;
      if (shouldPauseOnLock(document.hidden, Boolean(ctx.config.pause_on_lock), activeVideo.paused)) {
        ctx.sendPlayerCommand('pause');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    cleanup = () => {
      if (checkVideoInterval !== null) {
        clearInterval(checkVideoInterval);
        checkVideoInterval = null;
      }
      if (attachedVideo) {
        detachVideoListeners(attachedVideo);
        attachedVideo = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void releaseWakeLock();
    };
  },

  onDestroy() {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  }
};
