import { OxitunePlugin, PluginContext, PluginManifest } from '../types';
import manifest from './manifest.json';
import { createIconButton, ICONS } from '../../preload/ui/kit';
import { t } from '../../preload/ui/i18n';

let cleanup: (() => void) | null = null;

export const PipPlugin: OxitunePlugin = {
  id: 'pip',
  manifest: manifest as PluginManifest,
  name: 'Floating Picture-in-Picture',
  description: 'Detachable floating always-on-top video window for watching music videos while browsing',
  defaultEnabled: true,

  onInit(ctx: PluginContext) {
    const injectPipButton = () => {
      if (document.getElementById('oxitune-pip-btn')) return;

      const playerBarRight = document.querySelector(
        'ytmusic-player-bar .right-controls-buttons, #player-bar-background .right-controls-buttons, ytmusic-player-bar .middle-controls-buttons'
      );

      if (playerBarRight) {
        const pipBtn = createIconButton({ id: 'oxitune-pip-btn', label: t().pipButton, iconPath: ICONS.pip });

        pipBtn.addEventListener('click', async () => {
          const video = ctx.getVideoElement();
          if (!video) return;

          try {
            if (document.pictureInPictureElement) {
              await document.exitPictureInPicture();
            } else if (document.pictureInPictureEnabled) {
              await video.requestPictureInPicture();
            } else {
              // Fallback to Mini Player window
              await ctx.invoke('toggle_mini_player');
            }
          } catch (e) {
            console.warn('[Oxitune PiP] Could not enter PiP:', e);
            await ctx.invoke('toggle_mini_player').catch((err) => console.error('[Oxitune PiP] Mini player fallback failed:', err));
          }
        });

        playerBarRight.appendChild(pipBtn);
      }
    };

    const pollInterval = window.setInterval(injectPipButton, 1000);
    injectPipButton();

    cleanup = () => {
      clearInterval(pollInterval);
      document.getElementById('oxitune-pip-btn')?.remove();
    };
  },

  onDestroy() {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  }
};
