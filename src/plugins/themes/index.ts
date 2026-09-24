import { YTMDPlugin, PluginContext, PluginManifest } from '../types';
import manifest from './manifest.json';
import { AMBIENT_THEME_CSS, BASE_THEME_CSS } from './presets';

let cleanup: (() => void) | null = null;

export const ThemeEnginePlugin: YTMDPlugin = {
  id: 'theme_engine',
  manifest: manifest as PluginManifest,
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
    // separate preset picker. ON reads the per-track ambient accent into
    // YTM's own CSS custom properties (call-to-action color, menu/dialog/
    // chip backgrounds); OFF falls back to one static, polished dark theme.
    // Both are pure custom-property overrides on <html>/<body> — no direct
    // selectors or JS-driven style writes against YTM's own Polymer
    // elements. An earlier attempt at that (forcing a repaint on
    // #nav-bar-background/#player-bar-background) reliably fixed the
    // translucency but crashed YTM's own Polymer scheduler in the real
    // app ("Attempted to assign to readonly property" in scheduler.js) —
    // those elements are under active Polymer property-effect management,
    // and mutating their inline style out from under it corrupts internal
    // scheduler state badly enough to blank the whole page. Not worth it:
    // custom properties are the only mechanism proven both safe and
    // effective (see presets.ts).
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
    if (ctx.events) {
      unlistenPromises.push(
        ctx.events.listen<boolean>('set-ambient-enabled', (e) => {
          applyMode(e.payload);
        }),
        ctx.events.listen<string>('set-custom-css', (e) => {
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
