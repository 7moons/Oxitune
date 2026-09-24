import { YTMDPlugin, PluginContext, PluginManifest } from '../types';
import manifest from './manifest.json';

let cleanup: (() => void) | null = null;

export const VisualizerPlugin: YTMDPlugin = {
  id: 'visualizer',
  manifest: manifest as PluginManifest,
  name: 'Sleek Scrollbars',
  description: 'Applies subtle, low-contrast scrollbar colors',
  defaultEnabled: true,

  // Nav bar / player bar background, backdrop-filter and artwork protection
  // all moved to theme_engine (src/plugins/themes) — this plugin used to
  // carry its own competing copy of those exact rules in a separate
  // #ytmd-theme-styles tag, which fought theme_engine's Ambient/Base CSS
  // for the same selectors every time the ambient toggle changed which one
  // should win. Scrollbar styling is the one thing left that's actually
  // this plugin's own.
  onInit(_ctx: PluginContext) {
    let style = document.getElementById('ytmd-theme-styles') as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = 'ytmd-theme-styles';
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
