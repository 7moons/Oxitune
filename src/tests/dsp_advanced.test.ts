import { SkipSilenceController } from '../plugins/audio-dsp/skip-silence';
import { AudioEngine, rmsToDb, clampPlaybackRate } from '../plugins/audio-dsp/engine';
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

describe('CrossfadeController: fades only when a song really starts', () => {
  test('metadata arriving mid-song does not fade the same song in again', () => {
    const engine = AudioEngine.getInstance();
    const fadeIn = spyOn(engine, 'fadeIn');
    try {
      const controller = new CrossfadeController();
      controller.setCrossfadeSeconds(5);
      controller.onTrackChange(makeTrack({ videoId: 'same' }));
      expect(fadeIn).toHaveBeenCalledTimes(1);

      controller.onTrackChange(makeTrack({ videoId: 'same', currentTimeSecs: 80, coverUrl: 'https://x/cover.jpg' }));
      controller.onTrackChange(makeTrack({ videoId: 'same', currentTimeSecs: 120, durationSecs: 203 }));
      expect(fadeIn).toHaveBeenCalledTimes(1);

      controller.onTrackChange(makeTrack({ videoId: 'next' }));
      expect(fadeIn).toHaveBeenCalledTimes(2);
    } finally {
      fadeIn.mockRestore();
    }
  });

  test('a song first seen mid-way plays at full level instead of fading in', () => {
    const engine = AudioEngine.getInstance();
    const fadeIn = spyOn(engine, 'fadeIn');
    const reset = spyOn(engine, 'resetFade');
    try {
      const controller = new CrossfadeController();
      controller.setCrossfadeSeconds(5);
      controller.onTrackChange(makeTrack({ videoId: 'resumed', currentTimeSecs: 95 }));
      expect(fadeIn).not.toHaveBeenCalled();
      expect(reset).toHaveBeenCalledTimes(1);
    } finally {
      fadeIn.mockRestore();
      reset.mockRestore();
    }
  });
});

describe('Advanced DSP: Crossfade, Skip Silence & Speed/Pitch', () => {
  test('crossfade timing clamps between 0s and 12s', () => {
    const cf = new CrossfadeController();
    for (const [input, expected] of [[0, 0], [5.5, 5.5], [12, 12], [25, 12], [-5, 0]]) {
      cf.setCrossfadeSeconds(input);
      expect(cf.getCrossfadeSeconds()).toBe(expected);
    }
  });

  test('fade-out triggers only inside the last crossfade window', () => {
    const cf = new CrossfadeController();
    cf.setCrossfadeSeconds(5);
    const track = makeTrack({ durationSecs: 210 });
    cf.onTrackChange(track);
    const fadeOut = spyOn(AudioEngine.getInstance(), 'fadeOut');
    cf.onTick(100, track);
    cf.onTick(204.9, track);
    expect(fadeOut).not.toHaveBeenCalled();
    cf.onTick(205, track);
    expect(fadeOut).toHaveBeenCalledTimes(1);
    cf.onTick(208.5, track); // already fading: no second trigger
    expect(fadeOut).toHaveBeenCalledTimes(1);
    cf.destroy();
    fadeOut.mockRestore();
  });

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

describe('crossfade after seeking back', () => {
  test('seeking out of the fade window cancels the fade so it can fade again later', () => {
    const cf = new CrossfadeController();
    cf.setCrossfadeSeconds(5);
    const track = { title: 't', artist: 'a', videoId: 'AAAAAAAAAA1', durationSecs: 200, currentTimeSecs: 0, isPlaying: true };
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
