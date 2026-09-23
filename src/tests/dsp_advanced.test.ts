import { SkipSilenceController } from '../plugins/audio-dsp/skip-silence';
import { AudioEngine } from '../plugins/audio-dsp/engine';
import { needsAudioGraph } from '../plugins/audio-dsp';
import { describe, expect, test, spyOn } from 'bun:test';
import { CrossfadeController } from '../plugins/audio-dsp/crossfade';
import { TrackInfo } from '../plugins/types';

function makeTrack(overrides: Partial<TrackInfo> = {}): TrackInfo {
  return {
    title: 'Song',
    artist: 'Artist',
    durationSecs: 200,
    currentTimeSecs: 0,
    isPlaying: true,
    videoId: 'track-a',
    ...overrides
  };
}

describe('CrossfadeController: auto-advance timer is tracked and cancellable', () => {
  // Regression coverage for the untracked setTimeout footgun: previously
  // nothing held the handle from the auto-advance `setTimeout` scheduled by
  // onTick, so a track change or plugin teardown couldn't cancel it (it
  // relied solely on a currentTrackId check inside the callback to stay
  // safe). Both entry points must now call clearTimeout on it.

  test('onTrackChange cancels a previously scheduled auto-advance timer', () => {
    const clearSpy = spyOn(global, 'clearTimeout');
    try {
      const controller = new CrossfadeController();
      controller.setCrossfadeSeconds(5);

      const trackA = makeTrack({ videoId: 'a', durationSecs: 10 });
      controller.onTrackChange(trackA);
      const callsBeforeSchedule = clearSpy.mock.calls.length;
      // remaining = 0.05s <= crossfadeSeconds and > 0: schedules the
      // auto-advance timer.
      controller.onTick(9.95, trackA);

      controller.onTrackChange(makeTrack({ videoId: 'b' }));

      expect(clearSpy.mock.calls.length).toBeGreaterThan(callsBeforeSchedule);
    } finally {
      clearSpy.mockRestore();
    }
  });

  test('destroy() cancels a pending auto-advance timer', () => {
    const clearSpy = spyOn(global, 'clearTimeout');
    try {
      const controller = new CrossfadeController();
      controller.setCrossfadeSeconds(5);

      const track = makeTrack({ videoId: 'x', durationSecs: 10 });
      controller.onTrackChange(track);
      const callsBeforeDestroy = clearSpy.mock.calls.length;
      controller.onTick(9.95, track);

      controller.destroy();

      expect(clearSpy.mock.calls.length).toBeGreaterThan(callsBeforeDestroy);
    } finally {
      clearSpy.mockRestore();
    }
  });

  test('does not schedule (and therefore never needs to cancel) when crossfade is disabled', () => {
    const setSpy = spyOn(global, 'setTimeout');
    try {
      const controller = new CrossfadeController();
      controller.setCrossfadeSeconds(0);

      const track = makeTrack({ videoId: 'y', durationSecs: 10 });
      controller.onTrackChange(track);
      controller.onTick(9.95, track);

      expect(setSpy).not.toHaveBeenCalled();
      controller.destroy();
    } finally {
      setSpy.mockRestore();
    }
  });
});

describe('Advanced DSP: Crossfade, Skip Silence & Speed/Pitch', () => {
  test('crossfade timing clamps between 0s and 12s', () => {
    const clampCrossfade = (secs: number) => Math.max(0, Math.min(12, secs));
    expect(clampCrossfade(0)).toBe(0);
    expect(clampCrossfade(5.5)).toBe(5.5);
    expect(clampCrossfade(12)).toBe(12);
    expect(clampCrossfade(25)).toBe(12);
    expect(clampCrossfade(-5)).toBe(0);
  });

  test('calculates crossfade trigger boundary correctly', () => {
    const duration = 210; // 3:30 song
    const crossfadeSecs = 5.0;

    const isCrossfadeTriggered = (current: number) => {
      const remaining = duration - current;
      return remaining <= crossfadeSecs && remaining > 0;
    };

    expect(isCrossfadeTriggered(100)).toBe(false);
    expect(isCrossfadeTriggered(200)).toBe(false);
    expect(isCrossfadeTriggered(205)).toBe(true);
    expect(isCrossfadeTriggered(208.5)).toBe(true);
  });

  test('RMS audio power dB calculation handles silence and full scale', () => {
    const computeDb = (rms: number) => {
      if (rms <= 0.00001) return -100;
      return 20 * Math.log10(rms);
    };

    expect(computeDb(0)).toBe(-100);
    expect(computeDb(1.0)).toBeCloseTo(0, 5); // 0 dB (full scale)
    expect(computeDb(0.1)).toBeCloseTo(-20, 5); // -20 dB
    expect(computeDb(0.001)).toBeCloseTo(-60, 5); // -60 dB (detected as silence under -50dB)
  });

  test('playback speed clamps strictly between 0.5x and 2.0x', () => {
    const clampSpeed = (rate: number) => Math.max(0.5, Math.min(2.0, rate));
    expect(clampSpeed(1.0)).toBe(1.0);
    expect(clampSpeed(0.25)).toBe(0.5);
    expect(clampSpeed(4.0)).toBe(2.0);
    expect(clampSpeed(1.25)).toBe(1.25);
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

describe('crossfade after seeking back', () => {
  test('seeking out of the fade window cancels the fade so it can fade again later', () => {
    const cf = new CrossfadeController();
    cf.setCrossfadeSeconds(5);
    const track = { title: 't', artist: 'a', videoId: 'dQw4w9WgXcQ', durationSecs: 200, currentTimeSecs: 0, isPlaying: true };
    cf.onTrackChange(track);
    const engine = AudioEngine.getInstance();
    const fadeOut = spyOn(engine, 'fadeOut');
    const resetFade = spyOn(engine, 'resetFade');

    cf.onTick(197, track); // inside window -> fade out
    cf.onTick(100, track); // user seeks back -> fade undone
    cf.onTick(197, track); // reaches the end again -> fades again

    expect(fadeOut).toHaveBeenCalledTimes(2);
    expect(resetFade).toHaveBeenCalledTimes(1);
    cf.destroy();
    fadeOut.mockRestore();
    resetFade.mockRestore();
  });
});
