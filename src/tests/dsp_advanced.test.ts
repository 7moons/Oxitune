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
