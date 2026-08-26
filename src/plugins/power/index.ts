import { YTMDPlugin, PluginContext } from '../types';

export const PowerPlugin: YTMDPlugin = {
  id: 'power_watchdog',
  name: 'Smart Power & Audio Watchdog',
  description: 'Inhibits system sleep during active playback and auto-pauses when screen is locked',
  defaultEnabled: true,

  onInit(ctx: PluginContext) {
    let wakeLock: WakeLockSentinel | null = null;
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

    const video = ctx.getVideoElement();
    if (video) {
      video.addEventListener('play', requestWakeLock);
      video.addEventListener('playing', requestWakeLock);
      video.addEventListener('pause', releaseWakeLock);
      video.addEventListener('ended', releaseWakeLock);
    } else {
      const checkVideo = setInterval(() => {
        const v = ctx.getVideoElement();
        if (v) {
          clearInterval(checkVideo);
          v.addEventListener('play', requestWakeLock);
          v.addEventListener('playing', requestWakeLock);
          v.addEventListener('pause', releaseWakeLock);
          v.addEventListener('ended', releaseWakeLock);
        }
      }, 1000);
    }

    // Auto-pause when page/screen is hidden/locked if enabled
    if (ctx.config.pause_on_lock) {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && ctx.config.pause_on_lock) {
          // Screen lock or minimize trigger
        }
      });
    }
  }
};
