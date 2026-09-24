import { YTMDPlugin, PluginContext, TrackInfo, PluginManifest } from '../types';
import manifest from './manifest.json';
import { extractPalette, renderAmbientWash } from './color';
import { createEl } from '../../utils/dom';

let setIntensity: ((val: number) => void) | null = null;
let cleanup: (() => void) | null = null;
let lastCoverUrl: string | null | undefined;

export const AmbientLightingPlugin: YTMDPlugin = {
  id: 'ambient_lighting',
  manifest: manifest as PluginManifest,
  name: 'Dynamic Ambient Lighting',
  description: 'Fills the page behind the translucent chrome with a blurred, color-extracted wash of the active album cover — the same treatment the companion windows use',
  defaultEnabled: true,

  onInit(ctx: PluginContext) {
    let backdrop = document.getElementById('ytmd-ambient-backdrop');
    if (!backdrop) {
      backdrop = createEl('div', { id: 'ytmd-ambient-backdrop' });
      document.body.prepend(backdrop);
    }
    backdrop.replaceChildren();

    const cover = createEl('img', { id: 'ytmd-ambient-cover' });
    cover.alt = '';
    const veil = createEl('div', { id: 'ytmd-ambient-veil' });
    backdrop.appendChild(cover);
    backdrop.appendChild(veil);

    const intensity = typeof ctx.config.ambient_intensity === 'number' ? ctx.config.ambient_intensity : 0.6;
    const isEnabled = ctx.config.ambient_lighting_enabled !== false;

    const style = document.createElement('style');
    style.id = 'ytmd-ambient-styles';
    style.textContent = `
      #ytmd-ambient-backdrop {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 0;
        overflow: hidden;
        opacity: ${isEnabled ? intensity : 0};
        transition: opacity 0.8s ease;
      }
      /* Full-bleed blurred cover, so nav bar/player bar/sidebar going
         translucent (theme_engine's Ambient CSS) reveals something rich.
         The src is a small bitmap blurred once per track in JS
         (renderAmbientWash) and stretched here — deliberately no CSS
         filter and no animation: a live blur(64px) on a full-window layer
         plus an infinite transform animation made WebKit re-blur the whole
         window every frame, which stuttered scrolling and playback. */
      #ytmd-ambient-cover {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
        opacity: 0;
        transition: opacity 1.1s ease;
      }
      #ytmd-ambient-veil {
        position: absolute;
        inset: 0;
        background:
          radial-gradient(ellipse 70% 55% at 20% 0%, color-mix(in srgb, var(--ytmd-accent-primary, #3a2f1f) 45%, transparent) 0%, transparent 60%),
          radial-gradient(ellipse 65% 60% at 100% 100%, color-mix(in srgb, var(--ytmd-accent-secondary, #0e0c11) 40%, transparent) 0%, transparent 65%),
          linear-gradient(180deg, rgba(7, 6, 10, 0.35) 0%, rgba(7, 6, 10, 0.75) 100%);
      }
      /* Ensure YouTube Music transparent backgrounds let the wash pass through */
      ytmusic-app-layout, #browse-page, ytmusic-browse-response {
        background-color: transparent !important;
      }
    `;
    document.head.appendChild(style);

    setIntensity = (val: number) => {
      if (backdrop) backdrop.style.opacity = String(val);
    };

    const unlistenPromises: Promise<() => void>[] = [];
    if (ctx.events) {
      unlistenPromises.push(
        ctx.events.listen<number>('set-ambient-intensity', (e) => {
          setIntensity?.(e.payload);
        }),
        ctx.events.listen<boolean>('set-ambient-enabled', (e) => {
          // Re-enabling restores the user's chosen intensity, not a default.
          const configured = typeof ctx.config.ambient_intensity === 'number' ? ctx.config.ambient_intensity : 0.6;
          setIntensity?.(e.payload ? configured : 0);
        })
      );
    }

    cleanup = () => {
      unlistenPromises.forEach((p) => p.then((unlisten) => unlisten()));
      setIntensity = null;
      lastCoverUrl = undefined;
      document.getElementById('ytmd-ambient-styles')?.remove();
      document.getElementById('ytmd-ambient-backdrop')?.remove();
    };

    if (ctx.track) {
      this.onTrackChange!(ctx.track, ctx);
    }
  },

  async onTrackChange(track: TrackInfo) {

    const coverUrl = track.coverUrl || null;
    if (coverUrl === lastCoverUrl) return;
    lastCoverUrl = coverUrl;

    const cover = document.getElementById('ytmd-ambient-cover') as HTMLImageElement | null;
    if (cover) {
      const wash = coverUrl ? await renderAmbientWash(coverUrl) : null;
      // A newer track may have arrived while this one was rendering.
      if (coverUrl !== lastCoverUrl) return;
      cover.style.opacity = wash ? '1' : '0';
      if (wash) cover.src = wash;
    }

    try {
      const palette = await extractPalette(coverUrl || '');

      // Exposed as custom properties on <html> so other injected UI (the
      // veil gradient above, the burger menu, theme_engine's Ambient CSS)
      // all read the same per-track palette without re-extracting it.
      const root = document.documentElement.style;
      root.setProperty('--ytmd-accent', palette.accent);
      root.setProperty('--ytmd-accent-primary', palette.primary);
      root.setProperty('--ytmd-accent-secondary', palette.secondary);
    } catch {
      // Fallback stays whatever was last set (or the CSS defaults).
    }
  },

  onDestroy() {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  }
};
