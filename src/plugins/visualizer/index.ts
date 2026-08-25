import { YTMDPlugin, PluginContext } from '../types';

export const VisualizerPlugin: YTMDPlugin = {
  id: 'visualizer',
  name: 'Modern Clean Theme & Custom CSS',
  description: 'Applies sleek dark aesthetics, subtle scrollbars, and user-defined custom CSS',
  defaultEnabled: true,

  onInit(ctx: PluginContext) {
    const style = document.createElement('style');
    style.id = 'ytmd-theme-styles';

    const customCss = (ctx.config.custom_css as string) || '';
    const theme = (ctx.config.theme as string) || 'default-dark';

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
    `;

    if (theme === 'oled') {
      baseThemeCss += `
        body, #content, ytmusic-app-layout, #background.ytmusic-item-section-renderer {
          background-color: #000000 !important;
        }
        ytmusic-nav-bar, ytmusic-player-bar {
          background: #000000 !important;
          border-color: #1a1a1a !important;
        }
      `;
    }

    style.textContent = `${baseThemeCss}\n${customCss}`;
    document.head.appendChild(style);

    (this as any)._cleanup = () => {
      style.remove();
    };
  },

  onDestroy() {
    if ((this as any)._cleanup) {
      (this as any)._cleanup();
    }
  }
};
