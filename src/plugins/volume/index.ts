import { YTMDPlugin, PluginContext } from '../types';

let cleanup: (() => void) | null = null;

export const VolumePlugin: YTMDPlugin = {
  id: 'volume',
  name: 'Wheel Volume Controller',
  description: 'Adjust volume smoothly by scrolling the mouse wheel anywhere over the player bar',
  defaultEnabled: true,

  onInit(ctx: PluginContext) {
    const handleWheel = (e: WheelEvent) => {
      const playerBar = document.querySelector('ytmusic-player-bar, #player-bar-background');
      if (!playerBar) return;

      const rect = playerBar.getBoundingClientRect();
      // Check if mouse is hovering over player bar
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        e.preventDefault();
        const video = ctx.getVideoElement();
        if (video) {
          const step = (ctx.config.wheel_volume_step as number) || 0.05;
          const delta = e.deltaY < 0 ? step : -step;
          const newVol = Math.max(0, Math.min(1, video.volume + delta));
          video.volume = newVol;
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });

    cleanup = () => {
      window.removeEventListener('wheel', handleWheel);
    };
  },

  onDestroy() {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  }
};
