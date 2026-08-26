import { YTMDPlugin, PluginContext } from '../types';

let cleanup: (() => void) | null = null;

export const VisualizerPlugin: YTMDPlugin = {
  id: 'visualizer',
  name: 'Modern Clean Theme & Custom CSS',
  description: 'Applies sleek dark aesthetics, subtle scrollbars, and user-defined custom CSS',
  defaultEnabled: true,

  onInit(_ctx: PluginContext) {
    // Custom CSS is owned exclusively by theme_engine (src/plugins/themes) —
    // it has the live-reload plumbing (`set-custom-css` event listener) that
    // keeps it in sync with the settings window. This plugin used to bake
    // its own copy of custom_css into a separate <style> tag once at
    // onInit, which immediately went stale relative to any live edit.
    let style = document.getElementById('ytmd-theme-styles') as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = 'ytmd-theme-styles';
    }

    const baseThemeCss = `
      /* Clean subtle scrollbar colors only — deliberately NOT overriding
         ::-webkit-scrollbar width/height. YouTube Music's own layout code
         reserves gutter space sized for the native (wider) scrollbar; shrinking
         the rendered scrollbar to a custom width leaves a stale gap the size of
         the difference wherever that reserved space gets exposed (e.g. when
         focusing/expanding the now-playing view triggers a layout recalc) —
         seen as empty space where the scrollbar used to be. */
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: #27272a;
        border-radius: 4px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: #3f3f46;
      }

      /* Refined UI aesthetics */
      ytmusic-nav-bar {
        background: rgba(9, 9, 11, 0.92) !important;
        backdrop-filter: blur(12px);
        border-bottom: 1px solid #18181b;
      }

      ytmusic-player-bar {
        background: rgba(13, 13, 15, 0.96) !important;
        backdrop-filter: blur(16px);
        border-top: 1px solid #222226;
      }

      /* Ensure artwork and thumbnails are always visible and transparent */
      yt-img-shadow,
      yt-img-shadow #content,
      yt-img-shadow img,
      ytmusic-player-page #song-image,
      ytmusic-player-page #song-image #image,
      ytmusic-player-page #song-image #content,
      ytmusic-thumbnail-renderer,
      ytmusic-thumbnail-renderer #content,
      ytmusic-thumbnail-renderer img,
      #thumbnail,
      #thumbnail img,
      #song-image,
      #song-image img {
        background-color: transparent !important;
      }
    `;

    style.textContent = baseThemeCss;
    if (!style.isConnected) document.head.appendChild(style);

    cleanup = () => {
      style?.remove();
    };
  },

  onDestroy() {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  }
};
