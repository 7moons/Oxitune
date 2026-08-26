import { YTMDPlugin, PluginContext } from '../types';

let cleanup: (() => void) | null = null;

export const VisualizerPlugin: YTMDPlugin = {
  id: 'visualizer',
  name: 'Modern Clean Theme & Custom CSS',
  description: 'Applies sleek dark aesthetics, subtle scrollbars, and user-defined custom CSS',
  defaultEnabled: true,

  onInit(ctx: PluginContext) {
    const style = document.createElement('style');
    style.id = 'ytmd-theme-styles';

    const customCss = (ctx.config.custom_css as string) || '';

    let baseThemeCss = `
      /* Clean subtle scrollbars */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
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

    style.textContent = `${baseThemeCss}\n${customCss}`;
    document.head.appendChild(style);

    cleanup = () => {
      style.remove();
    };
  },

  onDestroy() {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  }
};
