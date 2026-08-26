import { YTMDPlugin, PluginContext, TrackInfo } from '../types';
import { extractPalette } from './color';
import { createEl } from '../../utils/dom';

let setIntensity: ((val: number) => void) | null = null;
let cleanup: (() => void) | null = null;
let lastCoverUrl: string | null | undefined;

export const AmbientLightingPlugin: YTMDPlugin = {
  id: 'ambient_lighting',
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
        will-change: opacity;
      }
      /* Full-bleed blurred cover — the same #ambient-cover technique the
         companion windows use (src/ui/styles.css), so nav bar/player bar/
         sidebar going translucent (theme_engine's Ambient CSS) actually
         reveals something rich instead of a faint two-corner gradient. */
      #ytmd-ambient-cover {
        position: absolute;
        inset: -12%;
        width: 124%;
        height: 124%;
        object-fit: cover;
        object-position: center;
        filter: blur(64px) saturate(165%) brightness(0.55);
        opacity: 0;
        transition: opacity 1.1s ease;
      }
      body.ytmd-is-playing #ytmd-ambient-cover {
        animation: ytmd-ambient-breathe 16s ease-in-out infinite alternate;
      }
      @keyframes ytmd-ambient-breathe {
        from { transform: scale(1) rotate(0deg); }
        to { transform: scale(1.07) rotate(0.6deg); }
      }
      @media (prefers-reduced-motion: reduce) {
        body.ytmd-is-playing #ytmd-ambient-cover { animation: none; }
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
    if (window.__TAURI__?.event) {
      unlistenPromises.push(
        window.__TAURI__.event.listen<number>('set-ambient-intensity', (e) => {
          setIntensity?.(e.payload);
        }),
        window.__TAURI__.event.listen<boolean>('set-ambient-enabled', (e) => {
          setIntensity?.(e.payload ? 0.6 : 0);
        })
      );
    }

    cleanup = () => {
      unlistenPromises.forEach((p) => p.then((unlisten) => unlisten()));
      setIntensity = null;
      lastCoverUrl = undefined;
      document.body.classList.remove('ytmd-is-playing');
      document.getElementById('ytmd-ambient-styles')?.remove();
      document.getElementById('ytmd-ambient-backdrop')?.remove();
    };

    if (ctx.track) {
      this.onTrackChange!(ctx.track, ctx);
    }
  },

  async onTrackChange(track: TrackInfo) {
    document.body.classList.toggle('ytmd-is-playing', !!track.isPlaying);

    const coverUrl = track.coverUrl || null;
    if (coverUrl === lastCoverUrl) return;
    lastCoverUrl = coverUrl;

    const cover = document.getElementById('ytmd-ambient-cover') as HTMLImageElement | null;
    if (cover) {
      cover.style.opacity = coverUrl ? '1' : '0';
      if (coverUrl) cover.src = coverUrl;
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
