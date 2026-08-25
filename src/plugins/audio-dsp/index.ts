import { YTMDPlugin, PluginContext } from '../types';
import { AudioEngine } from './engine';

export const AudioDspPlugin: YTMDPlugin = {
  id: 'audio_dsp',
  name: 'Audio DSP & 10-Band Equalizer',
  description: 'Parametric 10-band equalizer, loudness normalization, audio compressor, and live spectrum visualizer',
  defaultEnabled: true,

  onInit(ctx: PluginContext) {
    const video = ctx.getVideoElement();
    const engine = AudioEngine.getInstance();

    if (video) {
      engine.init(video);
    } else {
      // Retry when video mounts
      const checkVideo = setInterval(() => {
        const v = ctx.getVideoElement();
        if (v) {
          clearInterval(checkVideo);
          engine.init(v);
        }
      }, 500);
    }

    // Apply configuration
    const config = ctx.config;
    if (config.equalizer_gains && Array.isArray(config.equalizer_gains)) {
      engine.setAllGains(config.equalizer_gains as number[]);
    } else if (config.equalizer_preset && typeof config.equalizer_preset === 'string') {
      engine.applyPreset(config.equalizer_preset);
    }

    if (config.preamp_gain !== undefined) {
      engine.setPreamp(config.preamp_gain as number);
    }

    if (config.loudness_normalization !== undefined) {
      engine.setLoudnessNormalization(Boolean(config.loudness_normalization));
    }

    // Listen to Tauri events for live EQ adjustment from settings window
    if (window.__TAURI__?.event) {
      const { listen } = window.__TAURI__.event;

      listen<{ bandIndex: number; gain: number }>('set-eq-band', (e) => {
        engine.setBandGain(e.payload.bandIndex, e.payload.gain);
      });

      listen<{ gains: number[]; preset?: string }>('set-eq-all', (e) => {
        engine.setAllGains(e.payload.gains);
      });

      listen<string>('set-eq-preset', (e) => {
        engine.applyPreset(e.payload);
      });

      listen<number>('set-preamp', (e) => {
        engine.setPreamp(e.payload);
      });

      listen<boolean>('set-loudness-normalization', (e) => {
        engine.setLoudnessNormalization(e.payload);
      });

      listen<number>('set-playback-rate', (e) => {
        engine.setPlaybackRate(e.payload);
      });

      listen<boolean>('set-preserves-pitch', (e) => {
        engine.setPreservesPitch(e.payload);
      });
    }

    console.log('[YTMD] Audio DSP & Equalizer plugin active.');
  }
};
