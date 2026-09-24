import { pageEvents } from '../../preload/bridgeClient';
import { YTMDPlugin, PluginContext, TrackInfo } from '../types';
import { AudioEngine } from './engine';
import { CrossfadeController } from './crossfade';
import { SkipSilenceController } from './skip-silence';
import { isSyncGuest } from '../../preload/syncRole';

let crossfadeRef: CrossfadeController | null = null;
let skipSilenceRef: SkipSilenceController | null = null;
let cleanup: (() => void) | null = null;

/** Features that only work with YTM's audio routed through the Web Audio
 * graph: EQ/preamp/normalization process it, crossfade fades it, and skip
 * silence measures it. Speed and pitch are plain <video> properties. */
export function needsAudioGraph(config: Record<string, unknown>): boolean {
  const gains = config.equalizer_gains;
  return Boolean(
    config.equalizer_enabled ||
      config.loudness_normalization ||
      config.skip_silence_enabled ||
      (typeof config.crossfade_seconds === 'number' && config.crossfade_seconds > 0) ||
      (typeof config.preamp_gain === 'number' && config.preamp_gain !== 0) ||
      (Array.isArray(gains) && gains.some((g) => g !== 0))
  );
}

export const AudioDspPlugin: YTMDPlugin = {
  id: 'audio_dsp',
  name: 'Audio DSP & 10-Band Equalizer',
  description: 'Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control',
  defaultEnabled: true,

  onInit(ctx: PluginContext) {
    const engine = AudioEngine.getInstance();
    const crossfade = new CrossfadeController();
    const skipSilence = new SkipSilenceController();

    crossfadeRef = crossfade;
    skipSilenceRef = skipSilence;

    const config = ctx.config;

    // Builds the Web Audio graph on first need. Routing YTM's audio through
    // Web Audio has a cost, so it's skipped until a feature that needs it
    // is on — but that includes turning one on live from Settings, which
    // used to do nothing until the next app restart.
    let checkVideo: number | null = null;
    const ensureEngine = () => {
      if (checkVideo !== null) return;
      const v = ctx.getVideoElement();
      if (v) {
        if (!engine.isInitializedFor(v)) engine.init(v);
        return;
      }
      checkVideo = window.setInterval(() => {
        const found = ctx.getVideoElement();
        if (found) {
          if (checkVideo !== null) clearInterval(checkVideo);
          checkVideo = null;
          engine.init(found);
        }
      }, 500);
    };

    if (needsAudioGraph(config)) ensureEngine();

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
    if (pageEvents) {
      const { listen } = pageEvents;

      unlistenPromises.push(
        listen<{ bandIndex: number; gain: number }>('set-eq-band', (e) => {
          ensureEngine();
          engine.setBandGain(e.payload.bandIndex, e.payload.gain);
        }),
        listen<{ gains: number[]; preset?: string }>('set-eq-all', (e) => {
          ensureEngine();
          engine.setAllGains(e.payload.gains);
        }),
        listen<string>('set-eq-preset', (e) => {
          ensureEngine();
          engine.applyPreset(e.payload);
        }),
        listen<number>('set-preamp', (e) => {
          ensureEngine();
          engine.setPreamp(e.payload);
        }),
        listen<boolean>('set-loudness-normalization', (e) => {
          if (e.payload) ensureEngine();
          engine.setLoudnessNormalization(e.payload);
        }),
        listen<number>('set-crossfade-seconds', (e) => {
          if (e.payload > 0) ensureEngine();
          crossfade.setCrossfadeSeconds(e.payload);
        }),
        listen<boolean>('set-skip-silence', (e) => {
          if (e.payload) ensureEngine();
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
    AudioEngine.getInstance().applyRateAndPitch();
    if (crossfadeRef) crossfadeRef.onTrackChange(track);
    if (skipSilenceRef) skipSilenceRef.onTrackChange();
  },

  onTick(currentTimeSecs: number, ctx: PluginContext) {
    // Both move the player (early skip, silence jumps); a guest follows the host instead.
    if (isSyncGuest()) return;
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
