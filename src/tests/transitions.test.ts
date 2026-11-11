import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import {
  CrossfadeController,
  FADE_RAMP_SECS,
  MAX_FADE_IN_SECS,
  fadeGainAt,
  preciseDuration
} from '../plugins/audio-dsp/crossfade';
import { SkipSilenceController } from '../plugins/audio-dsp/skip-silence';
import { AudioEngine } from '../plugins/audio-dsp/engine';
import { PlayerBridge } from '../preload/bridge';
import { TrackInfo } from '../plugins/types';
import { findYouThereConfirm, touchActivity } from '../preload/keepAlive';

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

describe('fadeGainAt', () => {
  test('full level outside the fades', () => {
    expect(fadeGainAt(100, 200, 5, 2)).toBe(1);
    expect(fadeGainAt(195, 200, 5, 0)).toBeCloseTo(1, 10);
    expect(fadeGainAt(2, 200, 5, 2)).toBe(1);
  });

  test('equal-power fade-out: -3 dB at the middle, silent at the end', () => {
    expect(fadeGainAt(197.5, 200, 5, 0)).toBeCloseTo(Math.SQRT1_2, 6);
    expect(fadeGainAt(200, 200, 5, 0)).toBeCloseTo(0, 10);
    expect(fadeGainAt(203, 200, 5, 0)).toBe(0);
  });

  test('fade-in rises from silence', () => {
    expect(fadeGainAt(0, 200, 5, 2)).toBe(0);
    expect(fadeGainAt(1, 200, 5, 2)).toBeCloseTo(Math.SQRT1_2, 6);
    expect(fadeGainAt(-1, 200, 5, 2)).toBe(0);
  });

  test('never above 1, never below 0, monotonic through a fade-out', () => {
    let prev = 1;
    for (let pos = 190; pos <= 200; pos += 0.1) {
      const g = fadeGainAt(pos, 200, 8, 0);
      expect(g).toBeGreaterThanOrEqual(0);
      expect(g).toBeLessThanOrEqual(1);
      expect(g).toBeLessThanOrEqual(prev + 1e-9);
      prev = g;
    }
  });

  test('a song shorter than both fades takes the lower of the two', () => {
    expect(fadeGainAt(1, 3, 5, 2)).toBeCloseTo(Math.sin((2 / 5) * (Math.PI / 2)), 6);
  });

  test('no fade without a duration or with crossfade off', () => {
    expect(fadeGainAt(50, 0, 5, 0)).toBe(1);
    expect(fadeGainAt(199, 200, 0, 0)).toBe(1);
  });
});

describe('preciseDuration', () => {
  test("uses the player's fractional length when it is this song's", () => {
    expect(preciseDuration(200, 200.74)).toBe(200.74);
    expect(preciseDuration(200, 200)).toBe(200);
  });

  test("ignores a length that is another song's or the whole stream's", () => {
    expect(preciseDuration(200, 431.2)).toBe(200);
    expect(preciseDuration(200, 180)).toBe(200);
    expect(preciseDuration(200, undefined)).toBe(200);
    expect(preciseDuration(200, NaN)).toBe(200);
  });
});

describe('CrossfadeController', () => {
  const engine = AudioEngine.getInstance();
  let gain: ReturnType<typeof spyOn<AudioEngine, 'setFadeGain'>>;
  let next: ReturnType<typeof spyOn<typeof PlayerBridge, 'next'>>;
  const lastGain = () => gain.mock.calls.at(-1)![0] as number;
  const make = (secs = 5, playerDuration?: number) => {
    const cf = new CrossfadeController(
      () => playerDuration,
      () => 1
    );
    cf.setCrossfadeSeconds(secs);
    gain.mockClear();
    return cf;
  };

  beforeEach(() => {
    gain = spyOn(engine, 'setFadeGain');
    next = spyOn(PlayerBridge, 'next').mockImplementation(() => undefined);
  });
  afterEach(() => {
    gain.mockRestore();
    next.mockRestore();
  });

  test('crossfade length clamps between 0s and 12s', () => {
    const cf = new CrossfadeController();
    for (const [input, expected] of [[0, 0], [5.5, 5.5], [12, 12], [25, 12], [-5, 0], [NaN, 0]]) {
      cf.setCrossfadeSeconds(input);
      expect(cf.getCrossfadeSeconds()).toBe(expected);
    }
  });

  test('plays at full level until the last crossfade seconds, then fades', () => {
    const cf = make(5);
    const track = makeTrack({ durationSecs: 210 });
    cf.onTrackChange(track);
    cf.onTick(100, track);
    expect(lastGain()).toBe(1);
    cf.onTick(204, track);
    expect(lastGain()).toBe(1);
    cf.onTick(207.5, track);
    expect(lastGain()).toBeGreaterThan(0);
    expect(lastGain()).toBeLessThan(Math.SQRT1_2);
    cf.onTick(209.9, track);
    expect(lastGain()).toBe(0);
  });

  test('does nothing when crossfade is off', () => {
    const cf = make(0);
    const track = makeTrack({ durationSecs: 10 });
    cf.onTrackChange(track);
    cf.onTick(9.95, track);
    expect(gain).not.toHaveBeenCalled();
  });

  // Regression: a timer pressed "next" 0.2s before the end, whatever the
  // player was doing: paused in the last seconds, or on repeat-one.
  test('never presses next: YTM moves on by itself', async () => {
    const setSpy = spyOn(globalThis, 'setTimeout');
    try {
      const cf = make(5);
      const track = makeTrack({ durationSecs: 10 });
      cf.onTrackChange(track);
      cf.onTick(9.95, track);
      expect(setSpy).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    } finally {
      setSpy.mockRestore();
    }
  });

  // Regression: the fade was a wall-clock ramp, so a pause inside the window
  // went on to silence. Now no tick means no change, and the same position
  // asks for the same level.
  test('the level depends only on the position', () => {
    const cf = make(5);
    const track = makeTrack({ durationSecs: 200 });
    cf.onTrackChange(track);
    cf.onTick(197, track);
    const level = lastGain();
    const calls = gain.mock.calls.length;
    // paused: no ticks arrive
    expect(gain.mock.calls.length).toBe(calls);
    cf.onTick(197, track);
    expect(lastGain()).toBe(level);
  });

  test('seeking back out of the fade restores full level, and it fades again later', () => {
    const cf = make(5);
    const track = makeTrack({ durationSecs: 200 });
    cf.onTrackChange(track);
    cf.onTick(197, track);
    expect(lastGain()).toBeLessThan(1);
    cf.onTick(100, track);
    expect(lastGain()).toBe(1);
    cf.onTick(197, track);
    expect(lastGain()).toBeLessThan(1);
  });

  test('the song after a faded-out one fades in, over at most MAX_FADE_IN_SECS', () => {
    const cf = make(8);
    const a = makeTrack({ videoId: 'a', durationSecs: 200 });
    cf.onTrackChange(a);
    cf.onTick(199.9, a);
    const b = makeTrack({ videoId: 'b', durationSecs: 180 });
    cf.onTrackChange(b);
    expect(lastGain()).toBeLessThan(0.5);
    cf.onTick(1, b);
    expect(lastGain()).toBeGreaterThan(0.5);
    expect(lastGain()).toBeLessThan(1);
    cf.onTick(MAX_FADE_IN_SECS, b);
    expect(lastGain()).toBe(1);
  });

  // Regression: the next song's details arrive up to a few seconds after it
  // starts; until then it stayed at the silent end of the fade-out.
  test('fades the next song in before its details arrive', () => {
    const cf = make(5);
    const a = makeTrack({ videoId: 'a', durationSecs: 200 });
    cf.onTrackChange(a);
    cf.onTick(199.9, a);
    expect(lastGain()).toBe(0);
    cf.onTick(0.2, a); // the player is on the next song, the track is not yet
    expect(lastGain()).toBeGreaterThan(0);
    cf.onTick(1.2, a);
    const beforeDetails = lastGain();
    cf.onTrackChange(makeTrack({ videoId: 'b', durationSecs: 180, currentTimeSecs: 1 }));
    expect(lastGain()).toBeGreaterThan(0);
    expect(lastGain()).toBeLessThanOrEqual(beforeDetails);
  });

  // Regression: repeat-one restarts the song with no track change; "seeked
  // back out of the window" jumped it to full level (and the timer skipped it).
  test('repeat-one: the restarted song fades in', () => {
    const cf = make(5);
    const track = makeTrack({ durationSecs: 200 });
    cf.onTrackChange(track);
    cf.onTick(199.9, track);
    cf.onTick(0.1, track);
    expect(lastGain()).toBeLessThan(0.5);
    cf.onTick(2.5, track);
    expect(lastGain()).toBe(1);
  });

  // Regression: a song picked by hand is already playing when it is detected;
  // dropping it to silence then was a dip, not a fade-in.
  test('a song picked by hand, or resumed mid-way, plays at full level', () => {
    const cf = make(5);
    cf.onTrackChange(makeTrack({ videoId: 'first' }));
    expect(lastGain()).toBe(1);
    cf.onTick(60, makeTrack({ videoId: 'first' }));
    cf.onTrackChange(makeTrack({ videoId: 'picked' }));
    expect(lastGain()).toBe(1);
    cf.onTrackChange(makeTrack({ videoId: 'resumed', currentTimeSecs: 95 }));
    expect(lastGain()).toBe(1);
  });

  test('metadata arriving mid-song does not touch the level', () => {
    const cf = make(5);
    cf.onTrackChange(makeTrack({ videoId: 'same' }));
    const calls = gain.mock.calls.length;
    cf.onTrackChange(makeTrack({ videoId: 'same', currentTimeSecs: 80, coverUrl: 'https://x/cover.jpg' }));
    cf.onTrackChange(makeTrack({ videoId: 'same', currentTimeSecs: 120, durationSecs: 203 }));
    expect(gain.mock.calls.length).toBe(calls);
  });

  // Regression: against the rounded-down length the fade hit silence up to a
  // second before the song was over.
  test("fades against the player's exact length", () => {
    const cf = make(5, 200.9);
    const track = makeTrack({ durationSecs: 200 });
    cf.onTrackChange(track);
    cf.onTick(200 - FADE_RAMP_SECS, track);
    expect(lastGain()).toBeGreaterThan(0.2);
  });

  test("a stale duration (the previous song's) does not fade the new song", () => {
    const cf = make(5);
    const track = makeTrack({ durationSecs: 100 });
    cf.onTrackChange(track);
    cf.onTick(150, track);
    expect(lastGain()).toBe(1);
  });

  test('switching crossfade off, or tearing down, restores full level', () => {
    const reset = spyOn(engine, 'resetFade');
    try {
      const cf = make(5);
      const track = makeTrack({ durationSecs: 200 });
      cf.onTrackChange(track);
      cf.onTick(198, track);
      cf.setCrossfadeSeconds(0);
      expect(reset).toHaveBeenCalledTimes(1);
      cf.destroy();
      expect(reset).toHaveBeenCalledTimes(2);
    } finally {
      reset.mockRestore();
    }
  });
});

describe('SkipSilenceController outro', () => {
  // Regression: the counter kept running while the next song loaded and
  // pressed "next" again, skipping two songs.
  test('presses next once per song', () => {
    const engine = AudioEngine.getInstance();
    const power = spyOn(engine, 'getAudioPowerDb').mockImplementation(() => -80);
    const next = spyOn(PlayerBridge, 'next').mockImplementation(() => undefined);
    try {
      const ctl = new SkipSilenceController();
      ctl.setEnabled(true);
      ctl.onTrackChange();
      const video = { paused: false, ended: false, currentTime: 195 } as HTMLVideoElement;
      const track = makeTrack({ durationSecs: 200, currentTimeSecs: 195 });
      for (let i = 0; i < 12; i++) ctl.onTick(195 + i * 0.25, track, video);
      expect(next).toHaveBeenCalledTimes(1);

      ctl.onTrackChange();
      for (let i = 0; i < 3; i++) ctl.onTick(195, track, video);
      expect(next).toHaveBeenCalledTimes(2);
    } finally {
      power.mockRestore();
      next.mockRestore();
    }
  });
});

describe('keepAlive', () => {
  test('touchActivity stamps the last activity like YTM does', () => {
    const win: { _lact?: number; _fact?: number } = { _lact: 5, _fact: -1 };
    touchActivity(win, 1000);
    expect(win).toEqual({ _lact: 1000, _fact: 1000 });
    touchActivity(win, 2000);
    expect(win).toEqual({ _lact: 2000, _fact: 1000 });
  });

  const fakePrompt = (opts: { shown: boolean; hiddenAncestor?: boolean; button?: object | null }) =>
    ({
      closest: (sel: string) => (opts.hiddenAncestor && sel === '[aria-hidden="true"]' ? {} : null),
      getClientRects: () => ({ length: opts.shown ? 1 : 0 }),
      querySelector: () => opts.button ?? null
    }) as unknown as Element;
  const root = (...prompts: Element[]) => ({ querySelectorAll: () => prompts });

  test('finds the confirm button of a visible prompt', () => {
    const button = { click() {} };
    expect(findYouThereConfirm(root(fakePrompt({ shown: true, button })))).toBe(button as unknown as HTMLElement);
  });

  test('ignores an answered prompt left hidden in the page, and no prompt at all', () => {
    const button = { click() {} };
    expect(findYouThereConfirm(root())).toBeNull();
    expect(findYouThereConfirm(root(fakePrompt({ shown: false, button })))).toBeNull();
    expect(findYouThereConfirm(root(fakePrompt({ shown: true, hiddenAncestor: true, button })))).toBeNull();
    expect(findYouThereConfirm(root(fakePrompt({ shown: true, button: null })))).toBeNull();
  });
});
