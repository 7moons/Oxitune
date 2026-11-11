import { SkipSilenceController } from '../plugins/audio-dsp/skip-silence';
import { AudioEngine, rmsToDb, clampPlaybackRate } from '../plugins/audio-dsp/engine';
import { needsAudioGraph } from '../plugins/audio-dsp';
import { describe, expect, test } from 'bun:test';

describe('Advanced DSP: levels & Speed/Pitch', () => {
  test('rmsToDb handles silence and full scale', () => {
    expect(rmsToDb(new Float32Array(256))).toBe(-100);
    expect(rmsToDb([])).toBe(-100);
    expect(rmsToDb(new Float32Array(256).fill(1))).toBeCloseTo(0, 5);
    expect(rmsToDb(new Float32Array(256).fill(0.1))).toBeCloseTo(-20, 4);
    expect(rmsToDb(new Float32Array(256).fill(-0.001))).toBeCloseTo(-60, 3);
  });

  test('playback speed clamps strictly between 0.5x and 2.0x', () => {
    expect(clampPlaybackRate(1.0)).toBe(1.0);
    expect(clampPlaybackRate(0.25)).toBe(0.5);
    expect(clampPlaybackRate(4.0)).toBe(2.0);
    expect(clampPlaybackRate(1.25)).toBe(1.25);
  });
});

describe('skip silence without a Web Audio graph', () => {
  // Regression: getAudioPowerDb() returned -100 dB with no analyser, so
  // with skip-silence on and EQ off every intro got fast-forwarded.
  test('never seeks when the power level is unknown', () => {
    const ctl = new SkipSilenceController();
    ctl.setEnabled(true);
    const video = { paused: false, ended: false, currentTime: 2 } as HTMLVideoElement;
    const track = { title: 't', artist: 'a', durationSecs: 200, currentTimeSecs: 2, isPlaying: true };
    for (let i = 0; i < 10; i++) ctl.onTick(2, track, video);
    expect(video.currentTime).toBe(2);
    expect(AudioEngine.getInstance().getAudioPowerDb()).toBeNull();
  });
});

describe('needsAudioGraph', () => {
  test('stays off for a default config', () => {
    expect(needsAudioGraph({})).toBe(false);
    expect(needsAudioGraph({ equalizer_gains: [0, 0, 0], crossfade_seconds: 0, playback_speed: 1.5 })).toBe(false);
  });

  test('turns on for every feature that processes or measures audio', () => {
    expect(needsAudioGraph({ equalizer_enabled: true })).toBe(true);
    expect(needsAudioGraph({ loudness_normalization: true })).toBe(true);
    expect(needsAudioGraph({ skip_silence_enabled: true })).toBe(true);
    expect(needsAudioGraph({ crossfade_seconds: 4 })).toBe(true);
    expect(needsAudioGraph({ preamp_gain: -3 })).toBe(true);
    expect(needsAudioGraph({ equalizer_gains: [0, 2, 0] })).toBe(true);
  });
});

