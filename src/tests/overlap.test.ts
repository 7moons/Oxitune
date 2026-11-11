import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import {
  CONFIRM_TIMEOUT_MS,
  HANDOFF_TIMEOUT_MS,
  MainPlayerState,
  OverlapController,
  OverlapDeps,
  OverlayPlayer,
  SEEK_LEAD_SECS,
  overlapLevel
} from '../plugins/audio-dsp/overlap';
import { CrossfadeController, MAX_HOLD_MS } from '../plugins/audio-dsp/crossfade';
import { AudioEngine } from '../plugins/audio-dsp/engine';
import { inSyncRoom, setRoomNextOverride, setSyncGuest } from '../preload/syncRole';
import { TrackInfo } from '../plugins/types';
import { DEFAULT_OVERLAP_SECS, reconcileOverlap } from '../ui/format';

const track = (videoId: string, durationSecs = 200, currentTimeSecs = 0): TrackInfo => ({
  title: `Song ${videoId}`,
  artist: 'Artist',
  durationSecs,
  currentTimeSecs,
  isPlaying: true,
  videoId
});

class FakeOverlay implements OverlayPlayer {
  url: string | null = null;
  playing = false;
  level = 0;
  time = 0;
  isReady = true;
  hasFailed = false;
  disposedWith: number | null = null;
  volume = 1;
  muted = false;
  load(url: string) {
    this.url = url;
  }
  play() {
    this.playing = true;
  }
  pause() {
    this.playing = false;
  }
  setLevel(level: number) {
    this.level = level;
  }
  setVolume(volume: number, muted: boolean) {
    this.volume = volume;
    this.muted = muted;
  }
  currentTime() {
    return this.time;
  }
  ready() {
    return this.isReady;
  }
  failed() {
    return this.hasFailed;
  }
  dispose(fadeSecs = 0) {
    this.disposedWith = fadeSecs;
    this.playing = false;
  }
}

class FakeFade {
  holdNext = false;
  held = false;
  releases = 0;
  setHoldNext(hold: boolean) {
    this.holdNext = hold;
  }
  isHeld() {
    return this.held;
  }
  release() {
    this.releases++;
    this.held = false;
    this.holdNext = false;
  }
}

function setup(opts: { next?: string | null; resolve?: (id: string) => Promise<string> } = {}) {
  const overlays: FakeOverlay[] = [];
  const seeks: number[] = [];
  const logs: string[] = [];
  const env = {
    now: 0,
    main: { paused: false, seeking: false, readyState: 4, volume: 0.8, muted: false } as MainPlayerState,
    ad: false,
    repeatOne: false,
    room: false,
    next: opts.next === undefined ? 'next0000001' : opts.next,
    resolved: [] as string[],
    createFails: false
  };
  const fade = new FakeFade();
  const deps: OverlapDeps = {
    resolve:
      opts.resolve ??
      ((id) => {
        env.resolved.push(id);
        return Promise.resolve(`https://rr1.googlevideo.com/${id}`);
      }),
    nextVideoId: () => env.next,
    createOverlay: () => {
      if (env.createFails) return null;
      const o = new FakeOverlay();
      overlays.push(o);
      return o;
    },
    seekMain: (secs) => seeks.push(secs),
    mainState: () => env.main,
    playerDuration: () => undefined,
    isAd: () => env.ad,
    repeatsOne: () => env.repeatOne,
    inRoom: () => env.room,
    now: () => env.now,
    log: (m) => logs.push(m)
  };
  const c = new OverlapController(deps, fade);
  c.setCrossfadeSeconds(5);
  c.setEnabled(true);
  return { c, env, fade, overlays, seeks, logs };
}

const flush = () => new Promise<void>((r) => setTimeout(r, 0));

/** Plays song `a` up to the start of its fade window with the next song ready. */
async function untilOverlapping(s: ReturnType<typeof setup>, a = track('aaaaaaaaaaa')) {
  s.c.onTrackChange(a);
  s.c.onTick(175, a); // 25s left: look the next song up
  await flush();
  expect(s.c.getPhase()).toBe('ready');
  s.c.onTick(195.1, a); // inside the 5s window
  expect(s.c.getPhase()).toBe('overlapping');
  return a;
}

describe('overlapLevel', () => {
  test('is the equal-power partner of the fade-out', () => {
    expect(overlapLevel(0)).toBe(0);
    expect(overlapLevel(1)).toBeCloseTo(1, 10);
    expect(overlapLevel(0.5)).toBeCloseTo(Math.SQRT1_2, 6);
    // Fade-out at the same moment is cos: the two powers add up to 1.
    for (const p of [0.1, 0.3, 0.7, 0.9]) {
      const out = Math.sin((1 - p) * (Math.PI / 2));
      expect(overlapLevel(p) ** 2 + out ** 2).toBeCloseTo(1, 10);
    }
    expect(overlapLevel(-1)).toBe(0);
    expect(overlapLevel(7)).toBeCloseTo(1, 10);
  });
});

describe('OverlapController', () => {
  test('looks the next song up ahead, starts it in the fade window, and hands over', async () => {
    const s = setup();
    const a = await untilOverlapping(s);
    const overlay = s.overlays[0];
    expect(s.env.resolved).toEqual(['next0000001']);
    expect(overlay.url).toBe('https://rr1.googlevideo.com/next0000001');
    expect(overlay.playing).toBe(true);
    expect(s.fade.holdNext).toBe(true);

    s.c.onTick(197.5, a);
    expect(overlay.level).toBeCloseTo(overlapLevel(0.5), 6);
    expect(overlay.volume).toBe(0.8);

    // YTM moves on to the song the second player is already 5s into.
    overlay.time = 5;
    s.fade.held = true;
    const b = track('next0000001', 180);
    s.c.onTrackChange(b);
    expect(s.c.getPhase()).toBe('handoff');
    expect(s.seeks).toEqual([5 + SEEK_LEAD_SECS]);
    expect(overlay.level).toBe(1);

    // Still seeking: wait.
    s.env.main.seeking = true;
    s.c.onTick(0.1, b);
    expect(s.c.getPhase()).toBe('handoff');

    // Landed next to the second player: swap.
    s.env.main.seeking = false;
    overlay.time = 5.6;
    s.c.onTick(5.65, b);
    expect(s.c.getPhase()).toBe('idle');
    expect(s.fade.releases).toBe(1);
    expect(overlay.disposedWith).toBeGreaterThan(0);
  });

  test('a seek that lands off is corrected, then the hand-over is forced', async () => {
    const s = setup();
    await untilOverlapping(s);
    const overlay = s.overlays[0];
    overlay.time = 5;
    s.fade.held = true;
    const b = track('next0000001', 180);
    s.c.onTrackChange(b);

    overlay.time = 6;
    s.c.onTick(5.5, b); // half a second behind
    expect(s.seeks.length).toBe(2);
    expect(s.seeks[1]).toBeCloseTo(6 + SEEK_LEAD_SECS + 0.5, 6);
    overlay.time = 7;
    s.c.onTick(6.5, b);
    expect(s.seeks.length).toBe(3);
    overlay.time = 8;
    s.c.onTick(7.5, b); // no more corrections: take over anyway
    expect(s.c.getPhase()).toBe('idle');
    expect(s.fade.releases).toBe(1);
  });

  test('a hand-over that never settles is forced after a timeout', async () => {
    const s = setup();
    await untilOverlapping(s);
    s.overlays[0].time = 5;
    s.fade.held = true;
    const b = track('next0000001', 180);
    s.c.onTrackChange(b);
    s.env.main.seeking = true;
    s.env.now += HANDOFF_TIMEOUT_MS + 1;
    s.c.onTick(0, b);
    expect(s.c.getPhase()).toBe('idle');
    expect(s.fade.releases).toBe(1);
    expect(s.overlays[0].disposedWith).not.toBeNull();
  });

  test('a different song than expected stops the second player and releases the hold', async () => {
    const s = setup();
    await untilOverlapping(s);
    s.c.onTrackChange(track('other000001'));
    expect(s.c.getPhase()).toBe('idle');
    expect(s.overlays[0].disposedWith).not.toBeNull();
    expect(s.fade.releases).toBe(1);
    expect(s.fade.holdNext).toBe(false);
    expect(s.seeks).toEqual([]);
  });

  test('an ad, or a song that is never confirmed, ends the overlap', async () => {
    const s = setup();
    const a = await untilOverlapping(s);
    s.env.ad = true;
    s.c.onTick(0.2, a);
    expect(s.c.getPhase()).toBe('idle');
    expect(s.fade.releases).toBe(1);

    const s2 = setup();
    const a2 = await untilOverlapping(s2);
    s2.c.onTick(199.9, a2);
    s2.c.onTick(0.2, a2); // something started; no details yet
    expect(s2.c.getPhase()).toBe('overlapping');
    expect(s2.overlays[0].level).toBe(1);
    s2.env.now += CONFIRM_TIMEOUT_MS + 1;
    s2.c.onTick(1.2, a2);
    expect(s2.c.getPhase()).toBe('idle');
    expect(s2.fade.releases).toBe(1);
  });

  test('pausing the song pauses the second player too', async () => {
    const s = setup();
    const a = await untilOverlapping(s);
    s.env.main.paused = true;
    s.c.onTick(196, a);
    expect(s.overlays[0].playing).toBe(false);
    s.env.main.paused = false;
    s.c.onTick(196, a);
    expect(s.overlays[0].playing).toBe(true);
  });

  test('seeking back out of the fade stops the overlap', async () => {
    const s = setup();
    const a = await untilOverlapping(s);
    s.c.onTick(100, a);
    expect(s.c.getPhase()).toBe('idle');
    expect(s.fade.holdNext).toBe(false);
    expect(s.overlays[0].disposedWith).not.toBeNull();
  });

  test('falls back to the ordinary crossfade when the stream cannot be had', async () => {
    const s = setup({ resolve: () => Promise.reject(new Error('ytdlp-missing')) });
    const a = track('aaaaaaaaaaa');
    s.c.onTrackChange(a);
    s.c.onTick(175, a);
    await flush();
    expect(s.c.getPhase()).toBe('idle');
    s.c.onTick(176, a); // one attempt per song
    await flush();
    s.c.onTick(195.1, a);
    expect(s.c.getPhase()).toBe('idle');
    expect(s.overlays.length).toBe(0);
    expect(s.fade.holdNext).toBe(false);
  });

  test('a second player that fails or is not buffered in time is dropped', async () => {
    const s = setup();
    const a = track('aaaaaaaaaaa');
    s.c.onTrackChange(a);
    s.c.onTick(175, a);
    await flush();
    s.overlays[0].isReady = false;
    s.c.onTick(195.1, a);
    expect(s.c.getPhase()).toBe('ready');
    s.c.onTick(196.5, a); // too far into the window to join
    expect(s.c.getPhase()).toBe('idle');

    const s2 = setup();
    const a2 = await untilOverlapping(s2);
    s2.overlays[0].hasFailed = true;
    s2.c.onTick(196, a2);
    expect(s2.c.getPhase()).toBe('idle');
    expect(s2.fade.releases).toBe(1);
  });

  test('never for repeat-one, an unknown next song, a room, or when switched off', async () => {
    const cases: ((s: ReturnType<typeof setup>) => void)[] = [
      (s) => (s.env.repeatOne = true),
      (s) => (s.env.next = null),
      (s) => (s.env.next = 'aaaaaaaaaaa'),
      (s) => (s.env.room = true),
      (s) => s.c.setEnabled(false),
      (s) => s.c.setCrossfadeSeconds(0)
    ];
    for (const arrange of cases) {
      const s = setup();
      arrange(s);
      const a = track('aaaaaaaaaaa');
      s.c.onTrackChange(a);
      s.c.onTick(175, a);
      await flush();
      s.c.onTick(195.1, a);
      expect(s.c.getPhase()).toBe('idle');
      expect(s.env.resolved).toEqual([]);
    }
  });

  test('too little of the song left: no lookup', async () => {
    const s = setup();
    const a = track('aaaaaaaaaaa');
    s.c.onTrackChange(a);
    s.c.onTick(194, a); // 6s left, the window is 5s
    await flush();
    expect(s.env.resolved).toEqual([]);
  });

  test('a lookup that answers after the song changed is ignored', async () => {
    let answer: (url: string) => void = () => undefined;
    const s = setup({ resolve: () => new Promise((r) => (answer = r)) });
    const a = track('aaaaaaaaaaa');
    s.c.onTrackChange(a);
    s.c.onTick(175, a);
    expect(s.c.getPhase()).toBe('resolving');
    s.c.onTrackChange(track('other000001'));
    answer('https://rr1.googlevideo.com/late');
    await flush();
    expect(s.c.getPhase()).toBe('idle');
    expect(s.overlays.length).toBe(0);
  });

  test('switching the setting off mid-overlap brings the music straight back', async () => {
    const s = setup();
    await untilOverlapping(s);
    s.c.setEnabled(false);
    expect(s.overlays[0].disposedWith).not.toBeNull();
    expect(s.fade.releases).toBe(1);
  });
});

describe('CrossfadeController hold (the main player waits for the hand-over)', () => {
  const engine = AudioEngine.getInstance();
  let gain: ReturnType<typeof spyOn<AudioEngine, 'setFadeGain'>>;
  let now = 0;
  const lastGain = () => gain.mock.calls.at(-1)![0] as number;
  const make = () => {
    const cf = new CrossfadeController(
      () => undefined,
      () => 1,
      () => now
    );
    cf.setCrossfadeSeconds(5);
    return cf;
  };

  beforeEach(() => {
    now = 0;
    gain = spyOn(engine, 'setFadeGain');
  });
  afterEach(() => gain.mockRestore());

  test('the next song starts silent and stays so until released', () => {
    const cf = make();
    const a = track('aaaaaaaaaaa');
    cf.onTrackChange(a);
    cf.onTick(199.9, a);
    cf.setHoldNext(true);
    const b = track('next0000001', 180);
    cf.onTrackChange(b);
    expect(cf.isHeld()).toBe(true);
    expect(lastGain()).toBe(0);
    cf.onTick(5.3, b); // moved to where the second player is: still silent
    expect(lastGain()).toBe(0);
    cf.release();
    expect(cf.isHeld()).toBe(false);
    expect(lastGain()).toBe(1);
    cf.onTick(6, b);
    expect(lastGain()).toBe(1);
  });

  test('held from the first tick of the next song, before its details arrive', () => {
    const cf = make();
    const a = track('aaaaaaaaaaa');
    cf.onTrackChange(a);
    cf.onTick(199.9, a);
    cf.setHoldNext(true);
    cf.onTick(0.2, a);
    expect(cf.isHeld()).toBe(true);
    expect(lastGain()).toBe(0);
    cf.onTrackChange(track('next0000001', 180));
    expect(cf.isHeld()).toBe(true);
  });

  // The safety valve: whatever happens to the overlap, the music comes back.
  test('a hold nobody releases ends by itself', () => {
    const cf = make();
    const a = track('aaaaaaaaaaa');
    cf.onTrackChange(a);
    cf.onTick(199.9, a);
    cf.setHoldNext(true);
    const b = track('next0000001', 180);
    cf.onTrackChange(b);
    now += MAX_HOLD_MS - 1;
    cf.onTick(3, b);
    expect(lastGain()).toBe(0);
    now += 2;
    cf.onTick(3.2, b);
    expect(cf.isHeld()).toBe(false);
    expect(lastGain()).toBe(1);
  });

  test('without a hold the next song fades in as before; release is then a no-op', () => {
    const cf = make();
    const a = track('aaaaaaaaaaa');
    cf.onTrackChange(a);
    cf.onTick(199.9, a);
    cf.onTrackChange(track('next0000001', 180));
    expect(cf.isHeld()).toBe(false);
    expect(lastGain()).toBeGreaterThan(0);
    expect(lastGain()).toBeLessThan(1);
    const calls = gain.mock.calls.length;
    cf.release();
    expect(gain.mock.calls.length).toBe(calls);
  });

  test('a hold asked for and then called off does not silence the next song', () => {
    const cf = make();
    const a = track('aaaaaaaaaaa');
    cf.onTrackChange(a);
    cf.onTick(199.9, a);
    cf.setHoldNext(true);
    cf.setHoldNext(false);
    cf.onTrackChange(track('next0000001', 180));
    expect(cf.isHeld()).toBe(false);
  });

  test('switching crossfade off or tearing down ends a hold', () => {
    const cf = make();
    const a = track('aaaaaaaaaaa');
    cf.onTrackChange(a);
    cf.onTick(199.9, a);
    cf.setHoldNext(true);
    cf.onTrackChange(track('next0000001', 180));
    cf.setCrossfadeSeconds(0);
    expect(cf.isHeld()).toBe(false);
  });
});

describe('inSyncRoom', () => {
  afterEach(() => {
    setSyncGuest(false);
    setRoomNextOverride(null);
  });

  test('true for a guest and for a host, false alone', () => {
    expect(inSyncRoom()).toBe(false);
    setSyncGuest(true);
    expect(inSyncRoom()).toBe(true);
    setSyncGuest(false);
    setRoomNextOverride(() => false);
    expect(inSyncRoom()).toBe(true);
  });
});

describe('reconcileOverlap (Settings)', () => {
  // Regression: the overlap toggle saved as "on" next to a crossfade of 0,
  // and nothing happened at all.
  test('switching the overlap on with crossfade off gives it a length', () => {
    expect(reconcileOverlap('overlap', true, 0)).toEqual({ overlap: true, seconds: DEFAULT_OVERLAP_SECS });
    expect(reconcileOverlap('overlap', true, NaN)).toEqual({ overlap: true, seconds: DEFAULT_OVERLAP_SECS });
  });

  test('a crossfade already set is kept', () => {
    expect(reconcileOverlap('overlap', true, 8)).toEqual({ overlap: true, seconds: 8 });
    expect(reconcileOverlap('seconds', true, 2.5)).toEqual({ overlap: true, seconds: 2.5 });
  });

  test('turning crossfade off takes the overlap with it', () => {
    expect(reconcileOverlap('seconds', true, 0)).toEqual({ overlap: false, seconds: 0 });
  });

  test('with the overlap off nothing is touched', () => {
    expect(reconcileOverlap('overlap', false, 0)).toEqual({ overlap: false, seconds: 0 });
    expect(reconcileOverlap('seconds', false, 6)).toEqual({ overlap: false, seconds: 6 });
  });
});
