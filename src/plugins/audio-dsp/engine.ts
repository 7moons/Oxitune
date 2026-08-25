import { EQ_FREQUENCIES, EQ_PRESETS, clampGain } from './presets';

export class AudioEngine {
  private static instance: AudioEngine | null = null;
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private filters: BiquadFilterNode[] = [];
  private preampNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private isInitialized = false;
  private isNormalizing = false;
  private hookedVideo: HTMLVideoElement | null = null;

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
        console.warn('[YTMD DSP] Web Audio API is not supported in this environment');
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

      // 5. Analyser for real-time visualizer
      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 128;
      this.analyserNode.smoothingTimeConstant = 0.8;

      // Connect graph
      this.rebuildGraph();

      // Ensure AudioContext resumes upon playback
      const resume = () => this.resumeContext();
      video.addEventListener('play', resume);
      video.addEventListener('playing', resume);
      document.addEventListener('click', resume, { once: true });

      this.isInitialized = true;
      console.log('[YTMD DSP] AudioEngine & DSP pipeline initialized successfully.');
    } catch (e) {
      console.error('[YTMD DSP] Failed to initialize AudioEngine:', e);
    }
  }

  public rebuildGraph(): void {
    if (!this.audioCtx || !this.sourceNode || !this.preampNode || !this.analyserNode || !this.compressorNode) {
      return;
    }

    try {
      this.sourceNode.disconnect();
      this.compressorNode.disconnect();
      this.filters.forEach((f) => f.disconnect());
      this.preampNode.disconnect();
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

      // Route through Analyser
      lastNode.connect(this.analyserNode);

      // Route to destination (speakers)
      this.analyserNode.connect(this.audioCtx.destination);
    } catch (e) {
      console.error('[YTMD DSP] Graph rebuild error:', e);
    }
  }

  public resumeContext(): void {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public setBandGain(bandIndex: number, gainDb: number): void {
    if (bandIndex < 0 || bandIndex >= this.filters.length || !this.audioCtx) return;
    const clamped = clampGain(gainDb);
    this.filters[bandIndex].gain.setValueAtTime(clamped, this.audioCtx.currentTime);
  }

  public setAllGains(gains: number[]): void {
    if (!this.audioCtx) return;
    gains.forEach((g, idx) => {
      if (idx < this.filters.length) {
        this.filters[idx].gain.setValueAtTime(clampGain(g), this.audioCtx!.currentTime);
      }
    });
  }

  public setPreamp(gainDb: number): void {
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

  public getAnalyserNode(): AnalyserNode | null {
    return this.analyserNode;
  }

  public getFrequencyData(): Uint8Array | null {
    if (!this.analyserNode) return null;
    const data = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(data);
    return data;
  }

  public setPlaybackRate(rate: number): void {
    if (this.hookedVideo) {
      this.hookedVideo.playbackRate = Math.max(0.25, Math.min(4.0, rate));
    }
  }

  public setPreservesPitch(preserve: boolean): void {
    if (this.hookedVideo) {
      (this.hookedVideo as any).preservesPitch = preserve;
      (this.hookedVideo as any).mozPreservesPitch = preserve;
      (this.hookedVideo as any).webkitPreservesPitch = preserve;
    }
  }
}
