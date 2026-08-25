import { YTMDPlugin, PluginContext, TrackInfo } from '../types';
import { extractPalette } from './color';
import { createEl } from '../../utils/dom';

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
        transition: opacity 0.8s ease, filter 0.8s ease;
        overflow: hidden;
        filter: blur(90px);
        transform: scale(1.2);
        will-change: transform, opacity;
      }
      .ytmd-ambient-orb {
        position: absolute;
        border-radius: 50%;
        transition: all 1.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      #ytmd-orb-1 {
        width: 60vw;
        height: 60vh;
        top: -10vh;
        right: -10vw;
        background: #18181b;
      }
      #ytmd-orb-2 {
        width: 55vw;
        height: 55vh;
        bottom: 5vh;
        left: -10vw;
        background: #09090b;
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

    (this as any)._setIntensity = (val: number) => {
      if (backdrop) backdrop.style.opacity = String(val);
    };

    if (window.__TAURI__?.event) {
      window.__TAURI__.event.listen<number>('set-ambient-intensity', (e) => {
        (this as any)._setIntensity(e.payload);
      });
      window.__TAURI__.event.listen<boolean>('set-ambient-enabled', (e) => {
        (this as any)._setIntensity(e.payload ? 0.6 : 0);
      });
    }

    if (ctx.track) {
      this.onTrackChange!(ctx.track, ctx);
    }
  },

  async onTrackChange(track: TrackInfo) {
    if (!track.coverUrl) return;

    try {
      const palette = await extractPalette(track.coverUrl);
      const orb1 = document.getElementById('ytmd-orb-1');
      const orb2 = document.getElementById('ytmd-orb-2');

      if (orb1) orb1.style.background = palette.primary;
      if (orb2) orb2.style.background = palette.secondary;
    } catch {
      // Fallback
    }
  }
};
