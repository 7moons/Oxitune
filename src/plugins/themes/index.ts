import { YTMDPlugin, PluginContext } from '../types';
import { AMBIENT_THEME_CSS, BASE_THEME_CSS } from './presets';

let cleanup: (() => void) | null = null;

export const ThemeEnginePlugin: YTMDPlugin = {
  id: 'theme_engine',
  name: 'Theme Engine & Live CSS',
  description: 'Switches YouTube Music\'s chrome between the Ambient and Base looks, and injects user custom CSS with instant hot-reload',
  defaultEnabled: true,

  onInit(ctx: PluginContext) {
    const ensureHead = () => document.head || document.documentElement;

    const getOrCreateStyle = (id: string) => {
      let el = document.getElementById(id) as HTMLStyleElement;
      if (!el) {
        el = document.createElement('style');
        el.id = id;
        const target = ensureHead();
        if (target) target.appendChild(el);
      }
      return el;
    };

    // The Ambient Lighting toggle is the only visual mode switch — no
    // separate preset picker. ON gets the full translucent-chrome look that
    // reads the per-track ambient wash through the nav/player bars; OFF
    // falls back to one static, polished dark theme.
    const applyMode = (ambientEnabled: boolean) => {
      const themeStyle = getOrCreateStyle('ytmd-active-theme');
      themeStyle.textContent = ambientEnabled ? AMBIENT_THEME_CSS : BASE_THEME_CSS;
    };

    const applyCustomCss = (cssText: string) => {
      const customStyle = getOrCreateStyle('ytmd-custom-css');
      if (customStyle) {
        customStyle.textContent = cssText;
      }
    };

    // Initial load
    applyMode(ctx.config.ambient_lighting_enabled !== false);

    const initialCustomCss = (ctx.config.custom_css as string) || '';
    applyCustomCss(initialCustomCss);

    // Listen to live updates from settings — the same 'set-ambient-enabled'
    // event AmbientLightingPlugin listens to for the glow orb's opacity.
    const unlistenPromises: Promise<() => void>[] = [];
    if (window.__TAURI__?.event) {
      unlistenPromises.push(
        window.__TAURI__.event.listen<boolean>('set-ambient-enabled', (e) => {
          applyMode(e.payload);
        }),
        window.__TAURI__.event.listen<string>('set-custom-css', (e) => {
          applyCustomCss(e.payload);
        })
      );
    }

    cleanup = () => {
      unlistenPromises.forEach((p) => p.then((unlisten) => unlisten()));
    };

    console.log('[YTMD] Theme engine active.');
  },

  onDestroy() {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  }
};
