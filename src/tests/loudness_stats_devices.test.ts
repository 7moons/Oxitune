import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import {
  AudioEngine,
  LIMITER_RATIO,
  LIMITER_THRESHOLD_DB,
  MAX_NORMALIZATION_BOOST_DB,
  limiterMakeupDb,
  normalizationGainDb
} from '../plugins/audio-dsp/engine';
import { LOUDNESS_WAIT_TICKS, LoudnessController, PlayerLoudness } from '../plugins/audio-dsp/loudness';
import { dayBarHeights, dayLabel, formatListenTime } from '../ui/stats';
import { MAX_DEVICE_PROFILES, DeviceProfiles, hasDeviceProfile, withDeviceProfile } from '../ui/eqDevices';

describe('normalizationGainDb', () => {
  test('raises a quiet song by what it is missing', () => {
    expect(normalizationGainDb(-4.5)).toBe(4.5);
    expect(normalizationGainDb(-0.1)).toBeCloseTo(0.1, 10);
  });

  test('caps the boost', () => {
    expect(normalizationGainDb(-30)).toBe(MAX_NORMALIZATION_BOOST_DB);
  });

  test('leaves loud songs to the player and unknown loudness alone', () => {
    expect(normalizationGainDb(3.2)).toBe(0);
    expect(normalizationGainDb(0)).toBe(0);
    expect(normalizationGainDb(undefined)).toBe(0);
    expect(normalizationGainDb(null)).toBe(0);
    expect(normalizationGainDb(NaN)).toBe(0);
  });
});

describe('limiterMakeupDb', () => {
  test("matches the Web Audio compressor's built-in make-up gain", () => {
    // full-scale input comes out at threshold + (0 - threshold) / ratio dB;
    // make-up is that gain's inverse to the power 0.6.
    expect(limiterMakeupDb(-1.5, 20)).toBeCloseTo(0.855, 6);
    expect(limiterMakeupDb(-24, 12)).toBeCloseTo(13.2, 6);
    expect(limiterMakeupDb(0, 20)).toBeCloseTo(0, 10);
  });

  test('is small for the limiter in use, so the trim is inaudible', () => {
    expect(limiterMakeupDb(LIMITER_THRESHOLD_DB, LIMITER_RATIO)).toBeLessThan(1);
  });
});

describe('LoudnessController', () => {
  const engine = AudioEngine.getInstance();
  let set: ReturnType<typeof spyOn<AudioEngine, 'setNormalizationDb'>>;
  let player: PlayerLoudness | null;
  const lastDb = () => set.mock.calls.at(-1)![0] as number;
  const make = () => {
    const c = new LoudnessController(() => player);
    c.setEnabled(true);
    return c;
  };

  beforeEach(() => {
    player = null;
    set = spyOn(engine, 'setNormalizationDb');
  });
  afterEach(() => set.mockRestore());

  test("boosts a quiet song once the player describes it", () => {
    const c = make();
    player = { videoId: 'quiet', loudnessDb: -6 };
    c.onTrackChange('quiet');
    expect(lastDb()).toBe(6);
  });

  // The player's details switch a moment after the song: the previous
  // song's boost must not play on the new one meanwhile.
  test("never applies the previous song's figure to the new song", () => {
    const c = make();
    player = { videoId: 'quiet', loudnessDb: -8 };
    c.onTrackChange('quiet');
    expect(lastDb()).toBe(8);

    c.onTrackChange('loud'); // the player still describes "quiet"
    expect(lastDb()).toBe(0);
    c.onTick();
    expect(lastDb()).toBe(0);

    player = { videoId: 'loud', loudnessDb: 2 };
    c.onTick();
    expect(lastDb()).toBe(0);
    player = { videoId: 'loud', loudnessDb: -3 };
    c.onTick(); // resolved already: the figure is read once per song
    expect(lastDb()).toBe(0);
  });

  test('resolves on a later tick, then stops asking', () => {
    const c = make();
    c.onTrackChange('a');
    c.onTick();
    player = { videoId: 'a', loudnessDb: -5 };
    c.onTick();
    expect(lastDb()).toBe(5);
    const calls = set.mock.calls.length;
    for (let i = 0; i < 10; i++) c.onTick();
    expect(set.mock.calls.length).toBe(calls);
  });

  test('gives up after a while and leaves the song at its own level', () => {
    const c = make();
    c.onTrackChange('never');
    for (let i = 0; i < LOUDNESS_WAIT_TICKS; i++) c.onTick();
    player = { videoId: 'never', loudnessDb: -9 };
    c.onTick();
    expect(lastDb()).toBe(0);
  });

  test('metadata for the same song does not redo (or dip) the gain', () => {
    const c = make();
    player = { videoId: 'a', loudnessDb: -4 };
    c.onTrackChange('a');
    const calls = set.mock.calls.length;
    player = null;
    c.onTrackChange('a');
    expect(set.mock.calls.length).toBe(calls);
  });

  test('off: nothing is boosted, and switching off removes the boost', () => {
    const c = new LoudnessController(() => ({ videoId: 'a', loudnessDb: -6 }));
    c.onTrackChange('a');
    c.onTick();
    expect(set).not.toHaveBeenCalled();
    c.setEnabled(true);
    c.onTrackChange('a');
    expect(lastDb()).toBe(6);
    c.setEnabled(false);
    expect(lastDb()).toBe(0);
  });
});

describe('listening stats formatting', () => {
  test('formatListenTime', () => {
    expect(formatListenTime(0)).toBe('0 min');
    expect(formatListenTime(59_999)).toBe('0 min');
    expect(formatListenTime(12 * 60_000)).toBe('12 min');
    expect(formatListenTime(3 * 3_600_000 + 5 * 60_000)).toBe('3 h 05 min');
    expect(formatListenTime(-5)).toBe('0 min');
    expect(formatListenTime(NaN)).toBe('0 min');
  });

  test('dayBarHeights scales to the busiest day and keeps small days visible', () => {
    expect(dayBarHeights([{ listened_ms: 0 }, { listened_ms: 50 }, { listened_ms: 100 }])).toEqual([0, 50, 100]);
    expect(dayBarHeights([{ listened_ms: 1 }, { listened_ms: 1000 }])).toEqual([4, 100]);
    expect(dayBarHeights([{ listened_ms: 0 }, { listened_ms: 0 }])).toEqual([0, 0]);
    expect(dayBarHeights([])).toEqual([]);
  });

  test('dayLabel reads the day number as a UTC date', () => {
    // Day 19675 = 2023-11-14.
    expect(dayLabel(19675, 'en-US')).toBe('Nov 14');
  });
});

describe('equalizer per output device', () => {
  const device = { id: 'dev-1', name: 'Headphones' };
  const eq = { preset: 'rock', gains: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], preamp: -2 };

  test('remembering saves the current equalizer under the device', () => {
    const next = withDeviceProfile({}, device, true, eq)!;
    expect(next).toEqual({ 'dev-1': { name: 'Headphones', preset: 'rock', gains: eq.gains, preamp: -2 } });
    expect(next['dev-1'].gains).not.toBe(eq.gains);
    expect(hasDeviceProfile(next, device)).toBe(true);
  });

  test('a remembered device follows later equalizer changes', () => {
    const first = withDeviceProfile({}, device, true, eq)!;
    const second = withDeviceProfile(first, device, true, { ...eq, preset: 'flat', preamp: 0 })!;
    expect(second['dev-1'].preset).toBe('flat');
    expect(first['dev-1'].preset).toBe('rock');
  });

  test("switching it off forgets only this device's profile", () => {
    const profiles: DeviceProfiles = {
      'dev-1': { name: 'Headphones', ...eq },
      'dev-2': { name: 'Speakers', ...eq }
    };
    expect(Object.keys(withDeviceProfile(profiles, device, false, eq)!)).toEqual(['dev-2']);
  });

  test('with no known device nothing changes', () => {
    const profiles: DeviceProfiles = { 'dev-2': { name: 'Speakers', ...eq } };
    expect(withDeviceProfile(profiles, null, true, eq)).toEqual(profiles);
    expect(withDeviceProfile(undefined, null, false, eq)).toEqual({});
    expect(hasDeviceProfile(profiles, null)).toBe(false);
    expect(hasDeviceProfile(undefined, device)).toBe(false);
  });

  test('refuses a new device over the limit, but still updates a known one', () => {
    const full: DeviceProfiles = {};
    for (let i = 0; i < MAX_DEVICE_PROFILES; i++) full[`d${i}`] = { name: `D${i}`, ...eq };
    expect(withDeviceProfile(full, device, true, eq)).toBeNull();
    expect(withDeviceProfile(full, { id: 'd3', name: 'D3' }, true, { ...eq, preset: 'pop' })!.d3.preset).toBe('pop');
  });

  test('a device id that looks like an object key is not a profile', () => {
    expect(hasDeviceProfile({}, { id: 'constructor', name: 'x' })).toBe(false);
  });
});
