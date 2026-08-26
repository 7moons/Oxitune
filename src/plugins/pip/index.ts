import { YTMDPlugin, PluginContext } from '../types';
import { createEl, createSvg } from '../../utils/dom';

let cleanup: (() => void) | null = null;

export const PipPlugin: YTMDPlugin = {
  id: 'pip',
  name: 'Floating Picture-in-Picture',
  description: 'Detachable floating always-on-top video window for watching music videos while browsing',
  defaultEnabled: true,

  onInit(ctx: PluginContext) {
    const injectPipButton = () => {
      if (document.getElementById('ytmd-pip-btn')) return;

      const playerBarRight = document.querySelector(
        'ytmusic-player-bar .right-controls-buttons, #player-bar-background .right-controls-buttons, ytmusic-player-bar .middle-controls-buttons'
      );

      if (playerBarRight) {
        const pipBtn = createEl('button', {
          id: 'ytmd-pip-btn',
          title: 'Picture-in-Picture (Float Video)',
          style: 'background:none; border:none; color:#a1a1aa; cursor:pointer; padding:6px; border-radius:6px; display:flex; align-items:center; justify-content:center; margin:0 4px; transition:color 0.15s ease, background-color 0.15s ease;'
        });

        const pipIcon = createSvg('M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z', 20, 20);
        pipBtn.appendChild(pipIcon);
        pipBtn.style.cssText = `
          background: none;
          border: none;
          color: #a1a1aa;
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 4px;
          transition: color 0.15s ease, background-color 0.15s ease;
        `;
        pipBtn.addEventListener('mouseenter', () => {
          pipBtn.style.color = '#fafafa';
          pipBtn.style.backgroundColor = '#27272a';
        });
        pipBtn.addEventListener('mouseleave', () => {
          pipBtn.style.color = '#a1a1aa';
          pipBtn.style.backgroundColor = 'transparent';
        });

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
            console.warn('[YTMD PiP] Could not enter PiP:', e);
            await ctx.invoke('toggle_mini_player');
          }
        });

        playerBarRight.appendChild(pipBtn);
      }
    };

    const pollInterval = window.setInterval(injectPipButton, 1000);
    injectPipButton();

    cleanup = () => {
      clearInterval(pollInterval);
      document.getElementById('ytmd-pip-btn')?.remove();
    };
  },

  onDestroy() {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  }
};
