import { EQ_FREQUENCIES, EQ_PRESETS, clampGain } from './presets';
import { PlayerBridge } from '../../preload/bridge';

/** RMS level of time-domain samples in dBFS; -100 for (near) silence. */
export function rmsToDb(samples: ArrayLike<number>): number {
  if (samples.length === 0) return -100;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  const rms = Math.sqrt(sum / samples.length);
  if (rms <= 0.00001) return -100;
  return 20 * Math.log10(rms);
}

export function clampPlaybackRate(rate: number): number {
  return Math.max(0.5, Math.min(2.0, rate));
}

/** The limiter that follows a normalization boost. */
export const LIMITER_THRESHOLD_DB = -1.5;
export const LIMITER_RATIO = 20;
/** The most a quiet song is raised. */
export const MAX_NORMALIZATION_BOOST_DB = 9;

/** The make-up gain a Web Audio compressor adds by itself (it cannot be
 * switched off): (1 / gain of a full-scale signal) ^ 0.6, here in dB. */
export function limiterMakeupDb(thresholdDb: number, ratio: number): number {
  return -0.6 * (thresholdDb - thresholdDb / ratio);
}

/**
 * How much to raise a song so quiet ones match the rest. `loudnessDb` is
 * YouTube's own measurement of the song against its reference level: the
 * player already turns down songs above it (positive values), but leaves the
 * quiet ones quiet. Unknown loudness changes nothing.
 */
export function normalizationGainDb(loudnessDb: number | undefined | null): number {
  if (typeof loudnessDb !== 'number' || !Number.isFinite(loudnessDb) || loudnessDb >= 0) return 0;
  return Math.min(MAX_NORMALIZATION_BOOST_DB, -loudnessDb);
}

/** A second song routed into the graph (`AudioEngine.attachOverlay`). */
export interface OverlayHandle {
  setGain: (value: number, rampSecs?: number) => void;
  detach: () => void;
}

export class AudioEngine {
  private static instance: AudioEngine | null = null;
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private filters: BiquadFilterNode[] = [];
  private preampNode: GainNode | null = null;
  private normNode: GainNode | null = null;
  /** Where the (faded) song and an overlapping next song meet, ahead of
   * the equalizer, so both get the same processing. */
  private busNode: GainNode | null = null;
  private normDb = 0;
  private fadeNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private isInitialized = false;
  private isNormalizing = false;
  private hookedVideo: HTMLVideoElement | null = null;
  // Reused across every getAudioPowerDb() call instead of allocating a new
  // Float32Array(256) per call (every tick when skip-silence is enabled) —
  // the buffer's size is fixed to analyserNode.fftSize for its lifetime, so
  // there's nothing to gain from a fresh allocation each time.
  private powerBuffer: Float32Array<ArrayBuffer> | null = null;
  // Remembered so speed/pitch work without the Web Audio graph (they're
  // plain <video> properties) and can be re-applied after YTM resets them
  // on a track change.
  private playbackRate = 1;
  private preservesPitch = true;
  // Remembered so settings changed before the graph exists (DSP was off at
  // startup) are applied the moment it's built.
  private gains: number[] = EQ_FREQUENCIES.map(() => 0);
  private preampDb = 0;
  private fadeTarget = 1;

  public isInitializedFor(video: HTMLVideoElement): boolean {
    return this.isInitialized && this.hookedVideo === video;
  }

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  public init(video: HTMLVideoElement): void {
    if (this.isInitialized && this.hookedVideo === video) {
      this.resumeContext();
      return;
    }

    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) {
        console.warn('[Oxitune DSP] Web Audio API is not supported in this environment');
        return;
      }

      // YTM swapped its <video>: the old context would otherwise stay open
      // (and keep its audio thread) for the rest of the session.
      if (this.audioCtx) {
        const stale = this.audioCtx;
        this.isInitialized = false;
        try {
          this.sourceNode?.disconnect();
        } catch (_) {
          // already disconnected
        }
        void stale.close().catch(() => undefined);
      }

      this.audioCtx = new AudioCtxClass();
      this.hookedVideo = video;
      this.fadeTarget = 1;

      // 1. Source node from video
      this.sourceNode = this.audioCtx.createMediaElementSource(video);

      // 2. Loudness normalization: a per-song gain (see normalizationGainDb)
      // and a limiter behind it that only catches the peaks a boost pushes
      // over full scale. This used to be one heavy compressor on every song,
      // which evened songs out by squashing the dynamics inside each of them.
      this.normNode = this.audioCtx.createGain();
      this.compressorNode = this.audioCtx.createDynamicsCompressor();
      this.compressorNode.threshold.setValueAtTime(LIMITER_THRESHOLD_DB, this.audioCtx.currentTime);
      this.compressorNode.knee.setValueAtTime(0, this.audioCtx.currentTime);
      this.compressorNode.ratio.setValueAtTime(LIMITER_RATIO, this.audioCtx.currentTime);
      this.compressorNode.attack.setValueAtTime(0.002, this.audioCtx.currentTime);
      this.compressorNode.release.setValueAtTime(0.1, this.audioCtx.currentTime);

      // 3. 10-band Equalizer Filters
      this.filters = EQ_FREQUENCIES.map((freq, idx) => {
        if (!this.audioCtx) throw new Error('AudioContext missing');
        const filter = this.audioCtx.createBiquadFilter();
        if (idx === 0) {
          filter.type = 'lowshelf';
        } else if (idx === EQ_FREQUENCIES.length - 1) {
          filter.type = 'highshelf';
        } else {
          filter.type = 'peaking';
          filter.Q.setValueAtTime(1.4, this.audioCtx.currentTime);
        }
        filter.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
        filter.gain.setValueAtTime(0, this.audioCtx.currentTime);
        return filter;
      });

      // 4. Preamp gain
      this.preampNode = this.audioCtx.createGain();
      this.preampNode.gain.setValueAtTime(1.0, this.audioCtx.currentTime);

      // 5. Crossfade / Fade gain node
      this.fadeNode = this.audioCtx.createGain();
      this.fadeNode.gain.setValueAtTime(1.0, this.audioCtx.currentTime);

      this.busNode = this.audioCtx.createGain();

      // 6. Analyser for real-time visualizer & silence detection
      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.8;

      // Connect graph
      this.rebuildGraph();
      this.setAllGains(this.gains);
      this.setPreamp(this.preampDb);
      this.setNormalizationDb(this.normDb, 0);
      this.applyRateAndPitch();

      // Ensure AudioContext resumes upon playback
      const resume = () => this.resumeContext();
      video.addEventListener('play', resume);
      video.addEventListener('playing', resume);
      document.addEventListener('click', resume, { once: true });

      this.isInitialized = true;
      console.log('[Oxitune DSP] AudioEngine & DSP pipeline initialized successfully.');
    } catch (e) {
      console.error('[Oxitune DSP] Failed to initialize AudioEngine:', e);
    }
  }

  public rebuildGraph(): void {
    if (!this.audioCtx || !this.sourceNode || !this.preampNode || !this.fadeNode || !this.analyserNode || !this.compressorNode || !this.normNode || !this.busNode) {
      return;
    }

    try {
      this.sourceNode.disconnect();
      this.compressorNode.disconnect();
      this.normNode.disconnect();
      this.filters.forEach((f) => f.disconnect());
      this.preampNode.disconnect();
      this.fadeNode.disconnect();
      this.analyserNode.disconnect();
      // Only what leaves the bus: an overlapping song feeding it stays connected.
      this.busNode.disconnect();

      // Analyser on the raw song: skip-silence must measure the song, not
      // the fade or the equalizer. Measured after the fade, every faded-in
      // intro read as silence and got fast-forwarded, and every fade-out as
      // a silent outro.
      this.sourceNode.connect(this.analyserNode);

      // The fade right behind it, then the bus where an overlapping next
      // song joins.
      this.analyserNode.connect(this.fadeNode);
      this.fadeNode.connect(this.busNode);

      let lastNode: AudioNode = this.busNode;

      // Per-song gain first when loudness normalization is on
      if (this.isNormalizing) {
        lastNode.connect(this.normNode);
        lastNode = this.normNode;
      }

      // Route through 10-band EQ filters
      for (const filter of this.filters) {
        lastNode.connect(filter);
        lastNode = filter;
      }

      // Route through Preamp Gain
      lastNode.connect(this.preampNode);
      lastNode = this.preampNode;

      // The limiter last, so it also catches what the EQ and preamp add
      if (this.isNormalizing) {
        lastNode.connect(this.compressorNode);
        lastNode = this.compressorNode;
      }

      lastNode.connect(this.audioCtx.destination);
    } catch (e) {
      console.error('[Oxitune DSP] Graph rebuild error:', e);
    }
  }

  public resumeContext(): void {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public setBandGain(bandIndex: number, gainDb: number): void {
    if (bandIndex < 0 || bandIndex >= this.gains.length) return;
    const clamped = clampGain(gainDb);
    this.gains[bandIndex] = clamped;
    if (!this.audioCtx || bandIndex >= this.filters.length) return;
    this.filters[bandIndex].gain.setValueAtTime(clamped, this.audioCtx.currentTime);
  }

  public setAllGains(gains: number[]): void {
    gains.forEach((g, idx) => {
      if (idx < this.gains.length) this.gains[idx] = clampGain(g);
    });
    const ctx = this.audioCtx;
    if (!ctx) return;
    this.gains.forEach((g, idx) => {
      if (idx < this.filters.length) {
        this.filters[idx].gain.setValueAtTime(g, ctx.currentTime);
      }
    });
  }

  public setPreamp(gainDb: number): void {
    this.preampDb = clampGain(gainDb);
    if (!this.preampNode || !this.audioCtx) return;
    const linearGain = Math.pow(10, clampGain(gainDb) / 20);
    this.preampNode.gain.setValueAtTime(linearGain, this.audioCtx.currentTime);
  }

  public setLoudnessNormalization(enabled: boolean): void {
    if (this.isNormalizing !== enabled) {
      this.isNormalizing = enabled;
      this.rebuildGraph();
    }
  }

  /** The current song's normalization gain in dB (0 = leave it alone). The
   * limiter's built-in make-up gain is taken back out here. */
  public setNormalizationDb(gainDb: number, rampSecs = 0.2): void {
    this.normDb = Math.max(0, Math.min(MAX_NORMALIZATION_BOOST_DB, Number.isFinite(gainDb) ? gainDb : 0));
    if (!this.normNode || !this.audioCtx) return;
    const linear = Math.pow(10, (this.normDb - limiterMakeupDb(LIMITER_THRESHOLD_DB, LIMITER_RATIO)) / 20);
    const param = this.normNode.gain;
    const now = this.audioCtx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    if (rampSecs > 0) param.linearRampToValueAtTime(linear, now + rampSecs);
    else param.setValueAtTime(linear, now);
  }

  public getNormalizationDb(): number {
    return this.normDb;
  }

  public applyPreset(presetId: string): number[] {
    const preset = EQ_PRESETS[presetId] || EQ_PRESETS.flat;
    this.setAllGains(preset.gains);
    if (preset.preamp !== undefined) {
      this.setPreamp(preset.preamp);
    }
    return preset.gains;
  }

  // Crossfade API
  /** Moves the fade gain to `gain` (0..1) over `rampSecs`, from wherever it
   * is now. The crossfade controller calls this on every tick with the level
   * the song's position asks for, so the fade follows the song (pause, seek,
   * buffering, speed) instead of a wall-clock ramp scheduled once. */
  public setFadeGain(gain: number, rampSecs = 0): void {
    const target = Math.max(0, Math.min(1, Number.isFinite(gain) ? gain : 1));
    if (!this.fadeNode || !this.audioCtx) return;
    // Unchanged for most of a song (1.0): don't rewrite the automation 4x/s.
    if (target === this.fadeTarget) return;
    this.fadeTarget = target;
    const param = this.fadeNode.gain;
    const now = this.audioCtx.currentTime;
    const current = param.value;
    param.cancelScheduledValues(now);
    param.setValueAtTime(current, now);
    if (rampSecs > 0) {
      param.linearRampToValueAtTime(target, now + rampSecs);
    } else {
      param.setValueAtTime(target, now);
    }
  }

  /**
   * Routes a second media element (the next song, for the overlapping
   * crossfade) into the graph behind the fade, so it is equalized like the
   * song itself but not faded with it. The element must be CORS-enabled
   * (`crossOrigin` set and the server allowing it), or Web Audio plays
   * silence for it. `null` when there is no graph to join.
   */
  public attachOverlay(element: HTMLMediaElement): OverlayHandle | null {
    const ctx = this.audioCtx;
    const bus = this.busNode;
    if (!ctx || !bus) return null;
    try {
      const source = ctx.createMediaElementSource(element);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      source.connect(gain);
      gain.connect(bus);
      let last = 0;
      return {
        setGain: (value: number, rampSecs = 0) => {
          const target = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
          if (target === last) return;
          last = target;
          const now = ctx.currentTime;
          gain.gain.cancelScheduledValues(now);
          gain.gain.setValueAtTime(gain.gain.value, now);
          if (rampSecs > 0) gain.gain.linearRampToValueAtTime(target, now + rampSecs);
          else gain.gain.setValueAtTime(target, now);
        },
        detach: () => {
          try {
            source.disconnect();
            gain.disconnect();
          } catch (_) {
            // the context was closed under it
          }
        }
      };
    } catch (e) {
      console.warn('[Oxitune DSP] Could not route the next song into the graph:', e);
      return null;
    }
  }

  public resetFade(): void {
    // A short ramp, not a jump: a step in gain is a click.
    this.setFadeGain(1, 0.05);
  }

  // Silence Detection (RMS audio power in dB). `null` when there's no
  // analyser to measure with — callers must not read that as "silent".
  public getAudioPowerDb(): number | null {
    if (!this.analyserNode) return null;
    if (!this.powerBuffer || this.powerBuffer.length !== this.analyserNode.fftSize) {
      this.powerBuffer = new Float32Array(this.analyserNode.fftSize);
    }
    this.analyserNode.getFloatTimeDomainData(this.powerBuffer);
    return rmsToDb(this.powerBuffer);
  }

  public getFrequencyData(): Uint8Array | null {
    if (!this.analyserNode) return null;
    const data = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(data);
    return data;
  }

  // Speed & Pitch
  public setPlaybackRate(rate: number): void {
    this.playbackRate = clampPlaybackRate(rate);
    this.applyRateAndPitch();
  }

  public setPreservesPitch(preserve: boolean): void {
    this.preservesPitch = preserve;
    this.applyRateAndPitch();
  }

  /** Writes the remembered speed/pitch to the live <video>. Only touches
   * properties that differ, so calling it every track change is free when
   * the user never changed them. */
  public applyRateAndPitch(): void {
    const video = this.hookedVideo ?? PlayerBridge.getVideo();
    if (!video) return;
    if (video.playbackRate !== this.playbackRate) video.playbackRate = this.playbackRate;
    if (video.preservesPitch !== this.preservesPitch) {
      video.preservesPitch = this.preservesPitch;
      const vendorPrefixed = video as HTMLVideoElement & {
        webkitPreservesPitch?: boolean;
      };
      vendorPrefixed.webkitPreservesPitch = this.preservesPitch;
    }
  }
}
