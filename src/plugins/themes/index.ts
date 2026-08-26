import { YTMDPlugin, PluginContext } from '../types';
import { AMBIENT_THEME_CSS, BASE_THEME_CSS } from './presets';

let cleanup: (() => void) | null = null;
let currentAmbientEnabled = true;
let repaintTimers: number[] = [];

// #nav-bar-background / #player-bar-background are the elements that
// actually paint the nav bar / player bar — confirmed via
// document.elementsFromPoint() against a live music.youtube.com tab;
// ytmusic-nav-bar and ytmusic-player-bar themselves render no visible
// background of their own, despite being what the stylesheet rules above
// target. Their computed style updates correctly from a plain stylesheet
// rule, but the on-screen pixels don't — a compositor-layer-caching quirk
// on these position:fixed elements. Forcing a layout read plus a one-frame
// opacity nudge after each style write is the standard workaround for
// getting an already-composited GPU layer to actually repaint.
const CHROME_BG_TARGETS = ['#nav-bar-background', '#player-bar-background'];
const REPAINT_RETRY_DELAYS_MS = [0, 150, 400, 900, 1800, 3500];

function chromeBgFor(ambientEnabled: boolean): string {
  return ambientEnabled ? 'color-mix(in srgb, #0c0a10 55%, transparent)' : '#141319';
}

function forceRepaint(el: HTMLElement) {
  const prevTransition = el.style.transition;
  el.style.transition = 'none';
  void el.offsetHeight;
  el.style.opacity = '0.999';
  void el.offsetHeight;
  el.style.opacity = '1';
  el.style.transition = prevTransition;
}

function applyChromeBackground() {
  const bg = chromeBgFor(currentAmbientEnabled);
  for (const sel of CHROME_BG_TARGETS) {
    const el = document.querySelector<HTMLElement>(sel);
    if (!el) continue;
    el.style.setProperty('background', bg, 'important');
    forceRepaint(el);
  }
}

function clearRepaintTimers() {
  repaintTimers.forEach((id) => clearTimeout(id));
  repaintTimers = [];
}

/** Retries across a spread of delays: some elements (or their compositor
 * layer) may not exist yet on the very first pass, and a single retry can
 * land in the same paint-caching state as the original write. */
function scheduleRepaintRetries() {
  clearRepaintTimers();
  repaintTimers = REPAINT_RETRY_DELAYS_MS.map((delay) => window.setTimeout(applyChromeBackground, delay));
}

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
      currentAmbientEnabled = ambientEnabled;
      const themeStyle = getOrCreateStyle('ytmd-active-theme');
      themeStyle.textContent = ambientEnabled ? AMBIENT_THEME_CSS : BASE_THEME_CSS;
      scheduleRepaintRetries();
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
      clearRepaintTimers();
    };

    console.log('[YTMD] Theme engine active.');
  },

  // A track change is also YouTube Music re-rendering large chunks of the
  // player bar (title/art/progress) — cheap insurance against that churn
  // having rebuilt #player-bar-background since the last retry burst.
  onTrackChange() {
    scheduleRepaintRetries();
  },

  onDestroy() {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  }
};
