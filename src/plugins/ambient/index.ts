import { YTMDPlugin, PluginContext, TrackInfo } from '../types';
import { extractPalette } from './color';
import { createEl } from '../../utils/dom';

let setIntensity: ((val: number) => void) | null = null;
let cleanup: (() => void) | null = null;

export const AmbientLightingPlugin: YTMDPlugin = {
  id: 'ambient_lighting',
  name: 'Dynamic Ambient Lighting',
  description: 'Smoothly diffuses dynamic, reactive ambient colors from the active album cover behind the player',
  defaultEnabled: true,

  onInit(ctx: PluginContext) {
    let backdrop = document.getElementById('ytmd-ambient-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'ytmd-ambient-backdrop';
      document.body.prepend(backdrop);
    }

    const intensity = typeof ctx.config.ambient_intensity === 'number' ? ctx.config.ambient_intensity : 0.6;
    const isEnabled = ctx.config.ambient_lighting_enabled !== false;

    const style = document.createElement('style');
    style.id = 'ytmd-ambient-styles';
    style.textContent = `
      #ytmd-ambient-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 0;
        opacity: ${isEnabled ? intensity : 0};
        transition: opacity 0.8s ease;
        overflow: hidden;
        background: radial-gradient(circle at 80% 20%, rgba(24, 24, 27, 0.4) 0%, transparent 60%),
                    radial-gradient(circle at 20% 80%, rgba(9, 9, 11, 0.4) 0%, transparent 60%);
        will-change: opacity;
      }
      .ytmd-ambient-orb {
        display: none;
      }
      /* Ensure YouTube Music transparent backgrounds let ambient glow pass through subtly */
      ytmusic-app-layout, #browse-page, ytmusic-browse-response {
        background-color: transparent !important;
      }
    `;
    document.head.appendChild(style);

    const orb1 = createEl('div', { id: 'ytmd-orb-1', className: 'ytmd-ambient-orb' });
    const orb2 = createEl('div', { id: 'ytmd-orb-2', className: 'ytmd-ambient-orb' });
    backdrop.appendChild(orb1);
    backdrop.appendChild(orb2);

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
      document.getElementById('ytmd-ambient-styles')?.remove();
      document.getElementById('ytmd-ambient-backdrop')?.remove();
    };

    if (ctx.track) {
      this.onTrackChange!(ctx.track, ctx);
    }
  },

  async onTrackChange(track: TrackInfo) {
    if (!track.coverUrl) return;

    try {
      const palette = await extractPalette(track.coverUrl);
      const backdrop = document.getElementById('ytmd-ambient-backdrop');
      if (backdrop) {
        backdrop.style.background = `
          radial-gradient(circle at 80% 20%, ${palette.primary}66 0%, transparent 60%),
          radial-gradient(circle at 20% 80%, ${palette.secondary}66 0%, transparent 60%)
        `;
      }
    } catch {
      // Fallback
    }
  },

  onDestroy() {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  }
};
