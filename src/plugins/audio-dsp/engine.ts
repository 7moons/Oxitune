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

export class AudioEngine {
  private static instance: AudioEngine | null = null;
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private filters: BiquadFilterNode[] = [];
  private preampNode: GainNode | null = null;
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

      this.audioCtx = new AudioCtxClass();
      this.hookedVideo = video;

      // 1. Source node from video
      this.sourceNode = this.audioCtx.createMediaElementSource(video);

      // 2. Dynamics compressor for Loudness Normalization
      this.compressorNode = this.audioCtx.createDynamicsCompressor();
      this.compressorNode.threshold.setValueAtTime(-24, this.audioCtx.currentTime);
      this.compressorNode.knee.setValueAtTime(30, this.audioCtx.currentTime);
      this.compressorNode.ratio.setValueAtTime(12, this.audioCtx.currentTime);
      this.compressorNode.attack.setValueAtTime(0.003, this.audioCtx.currentTime);
      this.compressorNode.release.setValueAtTime(0.25, this.audioCtx.currentTime);

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

      // 6. Analyser for real-time visualizer & silence detection
      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.8;

      // Connect graph
      this.rebuildGraph();
      this.setAllGains(this.gains);
      this.setPreamp(this.preampDb);
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
    if (!this.audioCtx || !this.sourceNode || !this.preampNode || !this.fadeNode || !this.analyserNode || !this.compressorNode) {
      return;
    }

    try {
      this.sourceNode.disconnect();
      this.compressorNode.disconnect();
      this.filters.forEach((f) => f.disconnect());
      this.preampNode.disconnect();
      this.fadeNode.disconnect();
      this.analyserNode.disconnect();

      let lastNode: AudioNode = this.sourceNode;

      // Route through compressor if loudness normalization enabled
      if (this.isNormalizing) {
        lastNode.connect(this.compressorNode);
        lastNode = this.compressorNode;
      }

      // Route through 10-band EQ filters
      for (const filter of this.filters) {
        lastNode.connect(filter);
        lastNode = filter;
      }

      // Route through Preamp Gain
      lastNode.connect(this.preampNode);
      lastNode = this.preampNode;

      // Route through Crossfade / Fade node
      lastNode.connect(this.fadeNode);
      lastNode = this.fadeNode;

      // Route through Analyser
      lastNode.connect(this.analyserNode);

      // Route to destination (speakers)
      this.analyserNode.connect(this.audioCtx.destination);
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

  public applyPreset(presetId: string): number[] {
    const preset = EQ_PRESETS[presetId] || EQ_PRESETS.flat;
    this.setAllGains(preset.gains);
    if (preset.preamp !== undefined) {
      this.setPreamp(preset.preamp);
    }
    return preset.gains;
  }

  // Crossfade API
  public fadeIn(durationSecs: number): void {
    if (!this.fadeNode || !this.audioCtx || durationSecs <= 0) {
      if (this.fadeNode && this.audioCtx) {
        this.fadeNode.gain.setValueAtTime(1.0, this.audioCtx.currentTime);
      }
      return;
    }
    const now = this.audioCtx.currentTime;
    this.fadeNode.gain.cancelScheduledValues(now);
    this.fadeNode.gain.setValueAtTime(0.001, now);
    this.fadeNode.gain.linearRampToValueAtTime(1.0, now + durationSecs);
  }

  public fadeOut(durationSecs: number): void {
    if (!this.fadeNode || !this.audioCtx || durationSecs <= 0) return;
    const now = this.audioCtx.currentTime;
    this.fadeNode.gain.cancelScheduledValues(now);
    this.fadeNode.gain.setValueAtTime(this.fadeNode.gain.value, now);
    this.fadeNode.gain.linearRampToValueAtTime(0.001, now + durationSecs);
  }

  public resetFade(): void {
    if (this.fadeNode && this.audioCtx) {
      const now = this.audioCtx.currentTime;
      this.fadeNode.gain.cancelScheduledValues(now);
      this.fadeNode.gain.setValueAtTime(1.0, now);
    }
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
