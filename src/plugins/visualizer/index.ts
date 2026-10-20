import { OxitunePlugin, PluginContext, PluginManifest } from '../types';
import manifest from './manifest.json';

let cleanup: (() => void) | null = null;

export const VisualizerPlugin: OxitunePlugin = {
  id: 'visualizer',
  manifest: manifest as PluginManifest,
  name: 'Sleek Scrollbars',
  description: 'Applies subtle, low-contrast scrollbar colors',
  defaultEnabled: true,

  // Only the scrollbar; bars, backdrop and artwork belong to theme_engine
  // (src/plugins/themes).
  onInit(_ctx: PluginContext) {
    let style = document.getElementById('oxitune-theme-styles') as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = 'oxitune-theme-styles';
    }

    style.textContent = `
      /* Deliberately NOT overriding ::-webkit-scrollbar width/height.
         YouTube Music's own layout code reserves gutter space sized for the
         native (wider) scrollbar; shrinking the rendered scrollbar to a
         custom width leaves a stale gap the size of the difference wherever
         that reserved space gets exposed (e.g. when focusing/expanding the
         now-playing view triggers a layout recalc) — seen as empty space
         where the scrollbar used to be. */
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
    `;
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
