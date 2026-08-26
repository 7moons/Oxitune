import { YTMDPlugin, PluginContext, TrackInfo } from '../types';
import { AudioEngine } from './engine';
import { CrossfadeController } from './crossfade';
import { SkipSilenceController } from './skip-silence';

let crossfadeRef: CrossfadeController | null = null;
let skipSilenceRef: SkipSilenceController | null = null;
let cleanup: (() => void) | null = null;

export const AudioDspPlugin: YTMDPlugin = {
  id: 'audio_dsp',
  name: 'Audio DSP & 10-Band Equalizer',
  description: 'Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control',
  defaultEnabled: true,

  onInit(ctx: PluginContext) {
    const video = ctx.getVideoElement();
    const engine = AudioEngine.getInstance();
    const crossfade = new CrossfadeController();
    const skipSilence = new SkipSilenceController();

    crossfadeRef = crossfade;
    skipSilenceRef = skipSilence;

    const config = ctx.config;
    const isDspActive = Boolean(
      config.equalizer_enabled ||
      config.loudness_normalization ||
      (config.equalizer_gains && Array.isArray(config.equalizer_gains) && (config.equalizer_gains as number[]).some(g => g !== 0))
    );

    let checkVideo: number | null = null;
    if (isDspActive) {
      if (video) {
        engine.init(video);
      } else {
        checkVideo = window.setInterval(() => {
          const v = ctx.getVideoElement();
          if (v) {
            if (checkVideo !== null) clearInterval(checkVideo);
            checkVideo = null;
            engine.init(v);
          }
        }, 500);
      }
    }

    // Apply configuration
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

    if (config.crossfade_seconds !== undefined) {
      crossfade.setCrossfadeSeconds(config.crossfade_seconds as number);
    }

    if (config.skip_silence_enabled !== undefined) {
      skipSilence.setEnabled(Boolean(config.skip_silence_enabled));
    }

    if (config.playback_speed !== undefined) {
      engine.setPlaybackRate(config.playback_speed as number);
    }

    if (config.preserve_pitch !== undefined) {
      engine.setPreservesPitch(Boolean(config.preserve_pitch));
    }

    // Listen to Tauri events for live adjustments from settings window
    const unlistenPromises: Promise<() => void>[] = [];
    if (window.__TAURI__?.event) {
      const { listen } = window.__TAURI__.event;

      unlistenPromises.push(
        listen<{ bandIndex: number; gain: number }>('set-eq-band', (e) => {
          engine.setBandGain(e.payload.bandIndex, e.payload.gain);
        }),
        listen<{ gains: number[]; preset?: string }>('set-eq-all', (e) => {
          engine.setAllGains(e.payload.gains);
        }),
        listen<string>('set-eq-preset', (e) => {
          engine.applyPreset(e.payload);
        }),
        listen<number>('set-preamp', (e) => {
          engine.setPreamp(e.payload);
        }),
        listen<boolean>('set-loudness-normalization', (e) => {
          engine.setLoudnessNormalization(e.payload);
        }),
        listen<number>('set-crossfade-seconds', (e) => {
          crossfade.setCrossfadeSeconds(e.payload);
        }),
        listen<boolean>('set-skip-silence', (e) => {
          skipSilence.setEnabled(e.payload);
        }),
        listen<number>('set-playback-rate', (e) => {
          engine.setPlaybackRate(e.payload);
        }),
        listen<boolean>('set-preserves-pitch', (e) => {
          engine.setPreservesPitch(e.payload);
        })
      );
    }

    cleanup = () => {
      if (checkVideo !== null) {
        clearInterval(checkVideo);
        checkVideo = null;
      }
      unlistenPromises.forEach((p) => p.then((unlisten) => unlisten()));
      crossfadeRef?.destroy();
      crossfadeRef = null;
      skipSilenceRef = null;
    };

    console.log('[YTMD] Audio DSP, Equalizer, Crossfade & Speed controls active.');
  },

  onTrackChange(track: TrackInfo) {
    if (crossfadeRef) crossfadeRef.onTrackChange(track);
    if (skipSilenceRef) skipSilenceRef.onTrackChange();
  },

  onTick(currentTimeSecs: number, ctx: PluginContext) {
    if (crossfadeRef) crossfadeRef.onTick(currentTimeSecs, ctx.track);
    if (skipSilenceRef) skipSilenceRef.onTick(currentTimeSecs, ctx.track, ctx.getVideoElement());
  },

  onDestroy() {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  }
};
