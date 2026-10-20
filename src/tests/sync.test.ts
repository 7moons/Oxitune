import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import {
  computeSyncAction,
  controlForCommand,
  isStalePayload,
  LocalPlayback,
  ownRole,
  RoomMemberPayload,
  RoomSyncController,
  SyncPlaybackPayload,
  TransitEstimator
} from '../plugins/sync-room';
import { isSyncGuest, setRoomNextOverride } from '../preload/syncRole';
import { PlayerBridge } from '../preload/bridge';
import { canControl, canKick, roleOf, SYNC_REACTIONS, votesNeeded } from '../preload/syncRoles';
import { describeProbes } from '../ui/syncProbe';
import { queueAddFromMenuData } from '../plugins/sync-room/queuePanel';
import { setCompanionLocale } from '../ui/i18n';

const payload = (over: Partial<SyncPlaybackPayload> = {}): SyncPlaybackPayload => ({
  video_id: 'AAAAAAAAAA1',
  title: 'T',
  artist: 'A',
  current_time_secs: 50,
  is_playing: true,
  timestamp_ms: 10_000,
  ...over
});

const local = (over: Partial<LocalPlayback> = {}): LocalPlayback => ({
  videoId: 'AAAAAAAAAA1',
  paused: false,
  currentTime: 50,
  duration: 200,
  correcting: false,
  ...over
});

describe('computeSyncAction', () => {
  test('different track: navigate only, no play/seek on the old video', () => {
    const a = computeSyncAction(payload(), local({ videoId: 'aaaaaaaaaaa' }), 0);
    expect(a).toEqual({ navigateTo: 'AAAAAAAAAA1', setPlaying: null, seekTo: null, playbackRate: 1 });
  });

  test('rejects malformed video ids', () => {
    const a = computeSyncAction(payload({ video_id: 'javascript:x' }), local({ videoId: null }), 0);
    expect(a.navigateTo).toBeNull();
  });

  test('in sync: nothing to do', () => {
    expect(computeSyncAction(payload(), local({ currentTime: 50.1 }), 0.2)).toEqual({
      navigateTo: null,
      setPlaying: null,
      seekTo: null,
      playbackRate: 1
    });
  });

  test('host paused, guest playing: pause', () => {
    expect(computeSyncAction(payload({ is_playing: false }), local(), 0).setPlaying).toBe(false);
  });

  test('host playing, guest paused: play', () => {
    expect(computeSyncAction(payload(), local({ paused: true }), 0).setPlaying).toBe(true);
  });

  test('large drift seeks to host position plus transit', () => {
    const a = computeSyncAction(payload(), local({ currentTime: 40 }), 0.25);
    expect(a.seekTo).toBeCloseTo(50.25, 3);
    expect(a.playbackRate).toBe(1);
  });

  test('transit is capped at 1s whatever the estimate says', () => {
    expect(computeSyncAction(payload(), local({ currentTime: 40 }), 30).seekTo).toBeCloseTo(51, 3);
  });

  // The old 1.5s seek-only tolerance let guests sit up to 1.5s off forever
  // and every correction was an audible jump plus a rebuffer.
  test('small drift is closed by speed, not a seek', () => {
    const behind = computeSyncAction(payload(), local({ currentTime: 49.4 }), 0);
    expect(behind.seekTo).toBeNull();
    expect(behind.playbackRate).toBeCloseTo(1.1, 5); // 0.6s behind wants +20%, capped at +10%

    const slightlyBehind = computeSyncAction(payload(), local({ currentTime: 49.7 }), 0);
    expect(slightlyBehind.playbackRate).toBeCloseTo(1.1, 5);
    const ahead = computeSyncAction(payload(), local({ currentTime: 50.3 }), 0);
    expect(ahead.playbackRate).toBeCloseTo(0.9, 5);
    const barelyAhead = computeSyncAction(payload(), local({ currentTime: 50.27 }), 0);
    expect(barelyAhead.playbackRate).toBeCloseTo(0.91, 5);
  });

  test('catch-up keeps going until nearly exact, but does not start on noise', () => {
    expect(computeSyncAction(payload(), local({ currentTime: 49.9 }), 0).playbackRate).toBe(1);
    expect(computeSyncAction(payload(), local({ currentTime: 49.9, correcting: true }), 0).playbackRate).toBeCloseTo(
      1 + 0.1 / 3,
      5
    );
    expect(computeSyncAction(payload(), local({ currentTime: 49.97, correcting: true }), 0).playbackRate).toBe(1);
  });

  test('paused host ignores transit time and speed', () => {
    const a = computeSyncAction(payload({ is_playing: false }), local({ paused: true, currentTime: 10 }), 0.9);
    expect(a.seekTo).toBe(50);
    expect(a.playbackRate).toBe(1);
    expect(computeSyncAction(payload({ is_playing: false }), local({ paused: true, currentTime: 49.8 }), 0).seekTo).toBeNull();
  });

  // Regression: a seek onto the last frame ended the guest's song and YTM
  // autoplayed the guest's own next song instead of the host's.
  test('never seeks into the last second of the song', () => {
    expect(computeSyncAction(payload({ current_time_secs: 199.8 }), local({ currentTime: 150 }), 0.5).seekTo).toBe(199);
    expect(
      computeSyncAction(payload({ current_time_secs: 200, is_playing: false }), local({ paused: true, currentTime: 150 }), 0)
        .seekTo
    ).toBe(199);
    // unknown duration: nothing to clamp against
    expect(computeSyncAction(payload(), local({ currentTime: 40, duration: NaN }), 0).seekTo).toBe(50);
  });
});

describe('TransitEstimator', () => {
  // Regression: the guest used to trust the host's wall clock (capped at
  // 1s), so any clock difference became a constant sync error.
  test('a skewed clock does not count as transit time', () => {
    const est = new TransitEstimator();
    const skew = 30_000; // guest clock 30s ahead
    expect(est.transitSecs(1_000, 1_000 + skew + 40)).toBe(0);
    expect(est.transitSecs(2_000, 2_000 + skew + 40)).toBe(0);
    expect(est.transitSecs(3_000, 3_000 + skew + 290)).toBeCloseTo(0.25, 5);
    // guest clock behind works the same
    const behind = new TransitEstimator();
    behind.transitSecs(10_000, 5_020);
    expect(behind.transitSecs(11_000, 6_120)).toBeCloseTo(0.1, 5);
  });

  test('forgets old samples, so a clock adjustment is picked up', () => {
    const est = new TransitEstimator(3);
    est.transitSecs(0, 0); // fast sample under the old clock
    est.transitSecs(1_000, 1_500);
    est.transitSecs(2_000, 2_500);
    expect(est.transitSecs(3_000, 3_500)).toBe(0); // old sample aged out
  });
});

describe('isStalePayload', () => {
  test('drops reordered/redelivered payloads', () => {
    expect(isStalePayload(9_000, 10_000)).toBe(true);
    expect(isStalePayload(10_000, 10_000)).toBe(false);
    expect(isStalePayload(11_000, 10_000)).toBe(false);
    expect(isStalePayload(5_000, null)).toBe(false);
  });
  test('accepts a big step back (host clock reset) instead of freezing', () => {
    expect(isStalePayload(1_000, 60_000)).toBe(false);
  });
});

describe('controlForCommand', () => {
  test('maps media keys / tray / mini player commands to room requests', () => {
    expect(controlForCommand('next', false)).toEqual({ kind: 'next' });
    expect(controlForCommand('previous', false)).toEqual({ kind: 'previous' });
    expect(controlForCommand('play', false)).toEqual({ kind: 'set_playing', playing: true });
    expect(controlForCommand('pause', true)).toEqual({ kind: 'set_playing', playing: false });
    expect(controlForCommand('play_pause', true)).toEqual({ kind: 'set_playing', playing: true });
    expect(controlForCommand('play_pause', false)).toEqual({ kind: 'set_playing', playing: false });
    expect(controlForCommand('like', false)).toBeNull();
  });
});

describe('RoomSyncController (guest)', () => {
  const g = globalThis as unknown as Record<string, unknown>;
  let saved: Record<string, unknown>;
  let location: { search: string; href: string };

  beforeEach(() => {
    saved = { window: g.window, document: g.document };
    location = { search: '?v=AAAAAAAAAA1', href: '' };
    g.window = { location };
    g.document = { getElementById: () => null, querySelector: () => null };
  });
  afterEach(() => {
    g.window = saved.window;
    g.document = saved.document;
  });

  const fakeVideo = (over: Partial<HTMLVideoElement> = {}) =>
    ({ paused: false, currentTime: 50, duration: 200, playbackRate: 1, preservesPitch: false, ...over }) as HTMLVideoElement;

  const guest = () => {
    const c = new RoomSyncController();
    c.setRoomState(true, false);
    return c;
  };

  test('marks the page as a guest only while it is one', () => {
    const c = guest();
    expect(isSyncGuest()).toBe(true);
    c.setRoomState(true, true);
    expect(isSyncGuest()).toBe(false);
    c.setRoomState(false, false);
    expect(isSyncGuest()).toBe(false);
  });

  test('catches up by speed, then restores the original speed and pitch', () => {
    const c = guest();
    const video = fakeVideo({ currentTime: 49.4 });
    c.handleRemotePlayback(payload({ timestamp_ms: 1_000 }), video, 1_000);
    expect(video.playbackRate).toBeCloseTo(1.1, 5);
    expect(video.preservesPitch).toBe(true);
    expect(video.currentTime).toBe(49.4); // no seek

    video.currentTime = 51;
    c.handleRemotePlayback(payload({ timestamp_ms: 2_000, current_time_secs: 51 }), video, 2_000);
    expect(video.playbackRate).toBe(1);
    expect(video.preservesPitch).toBe(false);
  });

  test('ignores a redelivered older payload', () => {
    const c = guest();
    const video = fakeVideo();
    c.handleRemotePlayback(payload({ timestamp_ms: 5_000 }), video, 5_000);
    c.handleRemotePlayback(payload({ timestamp_ms: 4_000, video_id: 'aaaaaaaaaaa' }), video, 5_100);
    expect(location.href).toBe(''); // did not navigate back to the old song
  });

  // Regression: a guest's skip was undone by the next host broadcast.
  test('a song the guest picks becomes a request to the host', () => {
    const c = guest();
    expect(c.handleLocalTrackChange('bbbbbbbbbbb', 1_000)).toBeNull(); // no host state yet
    c.handleRemotePlayback(payload({ timestamp_ms: 1_000 }), fakeVideo(), 1_000);

    expect(c.handleLocalTrackChange('AAAAAAAAAA1', 2_000)).toBeNull(); // the host's own song
    c.noteUserInput(1_500); // clicked a song
    expect(c.handleLocalTrackChange('bbbbbbbbbbb', 2_000)).toEqual({ kind: 'play_video', video_id: 'bbbbbbbbbbb' });

    // Until the host switches, its broadcasts of the old song don't pull us back.
    location.search = '?v=bbbbbbbbbbb';
    c.handleRemotePlayback(payload({ timestamp_ms: 3_000 }), fakeVideo(), 3_000);
    expect(location.href).toBe('');
  });

  test('our own sync navigation and YTM autoplay are not requests', () => {
    const c = guest();
    location.search = '?v=aaaaaaaaaaa';
    c.handleRemotePlayback(payload({ timestamp_ms: 1_000 }), fakeVideo(), 1_000); // navigates to the host's song
    expect(location.href).toContain('AAAAAAAAAA1'); // no ytmusic-app in the stub: full-load fallback
    // host moved on while that navigation was landing
    c.handleRemotePlayback(payload({ timestamp_ms: 2_000, video_id: 'ccccccccccc' }), fakeVideo(), 2_000);
    expect(c.handleLocalTrackChange('AAAAAAAAAA1', 2_100)).toBeNull();

    const d = guest();
    d.handleRemotePlayback(payload({ timestamp_ms: 1_000 }), fakeVideo(), 1_000);
    d.noteLocalTick(fakeVideo({ currentTime: 198.5, duration: 200 }), 5_000);
    expect(d.handleLocalTrackChange('eeeeeeeeeee', 6_000)).toBeNull();
  });

  // Regression: a song that couldn't play on a DJ's page ("Video
  // unavailable") made YTM skip it there, and that skip was sent to the
  // host as the DJ's pick, skipping the song for the whole room.
  // Regression: the guest seeked with `video.currentTime`, but once YTM
  // appends the next song to the same media stream the video's timeline
  // isn't the song's: the seek landed in the previous song, YTM jumped back
  // to 0:00 of the current one, and the guest heard the old song forever.
  test('seeks through YTM’s player, in song time, not on the video element', () => {
    const seeks: number[] = [];
    g.document = {
      getElementById: (id: string) =>
        id === 'movie_player'
          ? {
              classList: { contains: () => false },
              getVideoData: () => ({ video_id: 'AAAAAAAAAA1' }),
              getCurrentTime: () => 0,
              getDuration: () => 76,
              seekTo: (s: number) => seeks.push(s)
            }
          : null,
      querySelector: () => null
    };
    const c = guest();
    const video = fakeVideo({ currentTime: 85, duration: 115 }); // stream timeline, not the song's
    c.handleRemotePlayback(payload({ timestamp_ms: 1_000, current_time_secs: 13 }), video, 1_000);
    expect(seeks).toEqual([13]);
    expect(video.currentTime).toBe(85);
  });

  test('reports YouTube Music’s player time standing still while the video plays, once per song', () => {
    let songTime = 0;
    g.document = {
      getElementById: (id: string) =>
        id === 'movie_player'
          ? {
              classList: { contains: () => false },
              getVideoData: () => ({ video_id: 'AAAAAAAAAA1' }),
              getCurrentTime: () => songTime,
              getDuration: () => 76
            }
          : null,
      querySelector: () => null
    };
    const c = guest();
    const video = fakeVideo({ currentTime: 85 });
    expect(c.checkPlayer(video)).toBe(false);
    video.currentTime = 87;
    expect(c.checkPlayer(video)).toBe(false); // not long enough yet
    video.currentTime = 88.5;
    expect(c.checkPlayer(video)).toBe(true);
    video.currentTime = 95;
    expect(c.checkPlayer(video)).toBe(false); // already reported for this song

    const healthy = guest();
    const v2 = fakeVideo({ currentTime: 10 });
    for (let i = 0; i < 10; i++) {
      songTime = i;
      v2.currentTime = 10 + i;
      expect(healthy.checkPlayer(v2)).toBe(false);
    }
  });

  // Regression: YouTube Music's Song/Video switch loads the song under a
  // different id; a DJ's switch went to the host as a new pick and the
  // whole room restarted the song from 0:00.
  test('the Song/Video switch keeps the room’s place', () => {
    const c = guest();
    c.handleRemotePlayback(payload({ timestamp_ms: 1_000, current_time_secs: 120 }), fakeVideo({ currentTime: 120 }), 1_000);
    c.noteUserInput(1_500);
    c.noteAvToggle(1_500);
    expect(c.handleLocalTrackChange('bbbbbbbbbbb', 2_000)).toEqual({
      kind: 'play_video',
      video_id: 'bbbbbbbbbbb',
      keep_position: true
    });

    let loaded = 'AAAAAAAAAA1';
    const seeks: number[] = [];
    g.document = {
      getElementById: (id: string) =>
        id === 'movie_player'
          ? {
              classList: { contains: () => false },
              getVideoData: () => ({ video_id: loaded }),
              getCurrentTime: () => (loaded === 'AAAAAAAAAA1' ? 120 : 0),
              getDuration: () => 200,
              seekTo: (s: number) => seeks.push(s)
            }
          : null,
      querySelector: (sel: string) => (sel === 'video' ? fakeVideo({ paused: true }) : null)
    };
    const host = new RoomSyncController(() => {});
    host.setRoomState(true, true);
    host.applyRemoteControl({ from: 'DJ', action: { kind: 'play_video', video_id: 'bbbbbbbbbbb', keep_position: true } });
    expect(location.href).toContain('bbbbbbbbbbb');

    // While the new version loads, the host doesn't announce its 0:00.
    const sent: unknown[] = [];
    const invoke = async (_cmd: string, args?: Record<string, unknown>) => {
      sent.push(args);
      return null;
    };
    loaded = 'bbbbbbbbbbb';
    const track = { title: 'T', artist: 'A', durationSecs: 200, currentTimeSecs: 0, isPlaying: true, videoId: 'bbbbbbbbbbb' };
    host.broadcastLocalState(track, fakeVideo({ currentTime: 0 }), invoke, true);
    expect(sent).toHaveLength(0);

    host.applyPendingSeek(fakeVideo({ currentTime: 0 }));
    expect(seeks).toEqual([120]); // paused: no time added
    host.broadcastLocalState(track, fakeVideo({ currentTime: 120 }), invoke, true);
    expect(sent).toHaveLength(1);
  });

  test('a plain pick after clicking elsewhere still starts the song over', () => {
    const c = guest();
    c.handleRemotePlayback(payload({ timestamp_ms: 1_000 }), fakeVideo(), 1_000);
    c.noteAvToggle(100); // long ago
    c.noteUserInput(9_500);
    expect(c.handleLocalTrackChange('bbbbbbbbbbb', 10_000)).toEqual({ kind: 'play_video', video_id: 'bbbbbbbbbbb' });
  });

  test('YTM skipping a song by itself is not a request; the guest goes back to the host’s song', () => {
    const c = guest();
    c.handleRemotePlayback(payload({ timestamp_ms: 1_000 }), fakeVideo(), 1_000);
    c.noteUserInput(100); // long ago
    location.search = '?v=bbbbbbbbbbb'; // YTM's own skip
    expect(c.handleLocalTrackChange('bbbbbbbbbbb', 12_000)).toBeNull();
    c.handleRemotePlayback(payload({ timestamp_ms: 13_000 }), fakeVideo(), 13_000);
    expect(location.href).toContain('AAAAAAAAAA1');
  });

  // Regression: at the end of a song a guest that finished first autoplayed
  // its own next song, got pulled back to the host's old one, finished it
  // again, autoplayed again... flipping between songs until the host moved.
  test('a guest that finished the song first waits for the host instead of going back', () => {
    const c = guest();
    c.handleRemotePlayback(payload({ timestamp_ms: 1_000, current_time_secs: 190 }), fakeVideo({ currentTime: 190 }), 1_000);
    c.noteLocalTick(fakeVideo({ currentTime: 198.5 }), 9_000);
    location.search = '?v=eeeeeeeeeee'; // YTM autoplayed the guest's own next song
    expect(c.handleLocalTrackChange('eeeeeeeeeee', 9_600)).toBeNull();

    c.handleRemotePlayback(payload({ timestamp_ms: 10_000, current_time_secs: 197.5 }), fakeVideo(), 10_000);
    expect(location.href).toBe(''); // stayed put

    c.handleRemotePlayback(payload({ timestamp_ms: 11_000, video_id: 'ccccccccccc', current_time_secs: 0 }), fakeVideo(), 11_000);
    expect(location.href).toContain('ccccccccccc'); // followed the host's next song
  });

  test('a host restarting the song it just finished is still followed', () => {
    const c = guest();
    c.handleRemotePlayback(payload({ timestamp_ms: 1_000, current_time_secs: 190 }), fakeVideo({ currentTime: 190 }), 1_000);
    c.noteLocalTick(fakeVideo({ currentTime: 198.5 }), 9_000);
    location.search = '?v=eeeeeeeeeee';
    c.handleRemotePlayback(payload({ timestamp_ms: 10_000, current_time_secs: 0.5 }), fakeVideo(), 10_000);
    expect(location.href).toContain('AAAAAAAAAA1');
  });

  test('stops the old song before switching, so it cannot end and autoplay mid-switch', () => {
    const video = fakeVideo({ currentTime: 198 });
    let pauses = 0;
    video.pause = () => {
      pauses++;
    };
    g.document = { getElementById: () => null, querySelector: (sel: string) => (sel === 'video' ? video : null) };
    const c = guest();
    location.search = '?v=aaaaaaaaaaa';
    c.handleRemotePlayback(payload({ timestamp_ms: 1_000, current_time_secs: 1 }), video, 1_000);
    expect(pauses).toBe(1);
  });

  test('a host that is between songs says nothing', () => {
    const c = new RoomSyncController();
    c.setRoomState(true, true);
    const sent: unknown[] = [];
    const invoke = async (_cmd: string, args?: Record<string, unknown>) => {
      sent.push(args);
      return null;
    };
    const track = { title: 'T', artist: 'A', durationSecs: 200, currentTimeSecs: 200, isPlaying: false, videoId: 'AAAAAAAAAA1' };
    c.broadcastLocalState(track, fakeVideo({ currentTime: 200, paused: true, ended: true }), invoke, true);
    expect(sent).toHaveLength(0);
  });

  // Regression: around a track change the URL already named the next song
  // while the video still reported the old song's end (or the reverse), and
  // guests seeked the next song to its end or restarted the old one.
  test('a host broadcasts the song the player has loaded, with its own position', () => {
    g.document = {
      getElementById: (id: string) =>
        id === 'movie_player'
          ? { classList: { contains: () => false }, getVideoData: () => ({ video_id: 'ccccccccccc' }), getCurrentTime: () => 0.3 }
          : null,
      querySelector: () => null
    };
    const c = new RoomSyncController();
    c.setRoomState(true, true);
    const sent: { playback: SyncPlaybackPayload }[] = [];
    const invoke = async (_cmd: string, args?: Record<string, unknown>) => {
      sent.push(args as { playback: SyncPlaybackPayload });
      return null;
    };
    const track = { title: 'T', artist: 'A', durationSecs: 200, currentTimeSecs: 199, isPlaying: true, videoId: 'AAAAAAAAAA1' };
    c.broadcastLocalState(track, fakeVideo({ currentTime: 199.7 }), invoke, true);
    expect(sent[0].playback.video_id).toBe('ccccccccccc');
    expect(sent[0].playback.current_time_secs).toBe(0.3);
  });

  test('a host never turns its own track changes into requests', () => {
    const c = new RoomSyncController();
    c.setRoomState(true, true);
    expect(c.handleLocalTrackChange('bbbbbbbbbbb', 1_000)).toBeNull();
  });

  test('a listener guest sends nothing to the host and is told why', async () => {
    g.document = { ...(g.document as object), documentElement: { lang: 'en' } }; // for t()
    const toasts: string[] = [];
    const c = new RoomSyncController((m) => toasts.push(m));
    c.setRoomState(true, false, false);
    const calls: string[] = [];
    const invoke = async (cmd: string) => {
      calls.push(cmd);
      return null;
    };
    c.requestControl({ kind: 'previous' }, invoke);
    expect(calls).toEqual([]);
    expect(toasts).toHaveLength(1);

    // A listener's "next" is a vote to skip, not a skip.
    c.requestControl({ kind: 'next' }, invoke);
    await Promise.resolve();
    expect(calls).toEqual(['vote_sync_skip']);

    c.handleRemotePlayback(payload({ timestamp_ms: 1_000 }), fakeVideo(), 1_000);
    expect(c.handleLocalTrackChange('bbbbbbbbbbb', 2_000)).toBeNull(); // the host sync pulls it back instead

    c.setRoomState(true, false, true); // promoted to DJ
    c.requestControl({ kind: 'next' }, invoke);
    expect(calls).toEqual(['vote_sync_skip', 'send_sync_control']);
  });

  test('a host plays the shared queue as a song ends, once per song', async () => {
    g.document = { ...(g.document as object), documentElement: { lang: 'en' } };
    const toasts: string[] = [];
    const c = new RoomSyncController((m) => toasts.push(m));
    c.setRoomState(true, true);
    const calls: string[] = [];
    const invoke = async (cmd: string) => {
      calls.push(cmd);
      return { id: 'q0', video_id: 'bbbbbbbbbbb', title: 'Next One', artist: '', added_by: 'Ola', added_by_id: 'x' };
    };
    c.advanceQueue(1, fakeVideo({ currentTime: 100, duration: 200 }), invoke);
    expect(calls).toEqual([]); // mid-song
    c.advanceQueue(0, fakeVideo({ currentTime: 199.5, duration: 200 }), invoke);
    expect(calls).toEqual([]); // empty queue: YTM's autoplay goes on
    c.advanceQueue(1, fakeVideo({ currentTime: 199.5, duration: 200 }), invoke);
    c.advanceQueue(1, fakeVideo({ currentTime: 199.7, duration: 200 }), invoke);
    await new Promise((r) => setTimeout(r, 0));
    expect(calls).toEqual(['sync_queue_take_next']);
    expect(location.href).toContain('bbbbbbbbbbb');
    expect(toasts[0]).toContain('Next One');

    const guestSide = new RoomSyncController(() => {});
    guestSide.setRoomState(true, false);
    guestSide.advanceQueue(1, fakeVideo({ currentTime: 199.5, duration: 200 }), invoke);
    expect(calls).toHaveLength(1); // only the host advances
  });

  // Regression: skipping on the host (its next button, media keys, a
  // guest's skip, a vote) played YTM's own up-next, not the shared queue.
  describe('"next" on the host uses the shared queue', () => {
    let nativeNextClicks = 0;
    const withNextButton = () => {
      nativeNextClicks = 0;
      g.document = {
        getElementById: () => null,
        querySelector: (sel: string) => (sel.includes('.next-button') ? { click: () => nativeNextClicks++ } : null),
        documentElement: { lang: 'en' }
      };
    };
    const hostWith = (queueLength: () => number, taken: unknown) => {
      const c = new RoomSyncController(() => {});
      c.setRoomState(true, true);
      const calls: string[] = [];
      const invoke = async (cmd: string) => {
        calls.push(cmd);
        return taken;
      };
      setRoomNextOverride(() => c.playNextFromQueue(queueLength(), invoke));
      return { c, calls };
    };
    const queued = { id: 'q0', video_id: 'bbbbbbbbbbb', title: 'Queued', artist: '', added_by: 'Ola', added_by_id: 'x' };
    afterEach(() => setRoomNextOverride(null));

    test('any skip takes the queue’s first song, not YTM’s', async () => {
      withNextButton();
      const { calls } = hostWith(() => 2, queued);
      PlayerBridge.next();
      PlayerBridge.next(); // a double click must not eat two songs
      await new Promise((r) => setTimeout(r, 0));
      expect(calls).toEqual(['sync_queue_take_next']);
      expect(nativeNextClicks).toBe(0);
      expect(location.href).toContain('bbbbbbbbbbb');
    });

    test('a guest’s skip or a won vote, carried out on the host, does the same', async () => {
      withNextButton();
      const { c, calls } = hostWith(() => 1, queued);
      c.applyRemoteControl({ from: 'Ola', action: { kind: 'next' }, source: { kind: 'vote' } });
      await new Promise((r) => setTimeout(r, 0));
      expect(calls).toEqual(['sync_queue_take_next']);
      expect(nativeNextClicks).toBe(0);
    });

    test('with an empty queue, YTM’s own next plays', () => {
      withNextButton();
      const { calls } = hostWith(() => 0, null);
      PlayerBridge.next();
      expect(calls).toEqual([]);
      expect(nativeNextClicks).toBe(1);
    });

    test('a queue emptied meanwhile still skips', async () => {
      withNextButton();
      const { calls } = hostWith(() => 1, null);
      PlayerBridge.next();
      await new Promise((r) => setTimeout(r, 0));
      expect(calls).toEqual(['sync_queue_take_next']);
      expect(nativeNextClicks).toBe(1);
    });

    test('a guest page is never taken over', () => {
      withNextButton();
      const c = new RoomSyncController(() => {});
      c.setRoomState(true, false);
      expect(c.playNextFromQueue(3, async () => null)).toBe(false);
    });
  });
});

describe('Listen Together shared constants mirror the backend', () => {
  const features = readFileSync(join(import.meta.dir, '..', '..', 'src-tauri', 'src', 'sync_room', 'features.rs'), 'utf8');

  test('the reaction set is the one the host accepts', () => {
    const rust = features.match(/pub const REACTIONS: &\[&str\] = &\[([^\]]+)\]/)?.[1] ?? '';
    const emojis = [...rust.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    expect(emojis).toEqual([...SYNC_REACTIONS]);
  });

  test('a skip needs more than half the room', () => {
    expect(features).toContain('members / 2 + 1');
    expect([1, 2, 3, 4, 5].map(votesNeeded)).toEqual([1, 2, 2, 3, 3]);
  });
});

describe('YTM queue menu items in a room', () => {
  // Shapes read from a live YTM menu (`ytmusic-menu-service-item-renderer.data`).
  const item = (queueAddEndpoint: unknown) => ({ text: {}, serviceEndpoint: { clickTrackingParams: 'x', queueAddEndpoint } });

  test('"Add to queue" and "Play next" become shared-queue adds', () => {
    expect(
      queueAddFromMenuData(item({ queueTarget: { videoId: 'AAAAAAAAAA1' }, queueInsertPosition: 'INSERT_AT_END' }))
    ).toEqual({ videoId: 'AAAAAAAAAA1', next: false });
    expect(
      queueAddFromMenuData(item({ queueTarget: { videoId: 'AAAAAAAAAA1' }, queueInsertPosition: 'INSERT_AFTER_CURRENT_VIDEO' }))
    ).toEqual({ videoId: 'AAAAAAAAAA1', next: true });
  });

  test('an album or playlist is recognized but has no single song', () => {
    expect(queueAddFromMenuData(item({ queueTarget: { playlistId: 'OLAK5uy_x' }, queueInsertPosition: 'INSERT_AT_END' }))).toEqual({
      videoId: null,
      next: false
    });
  });

  test('every other menu item is left to YTM', () => {
    expect(queueAddFromMenuData({ serviceEndpoint: { removeFromQueueEndpoint: { videoId: 'AAAAAAAAAA1' } } })).toBeNull();
    expect(queueAddFromMenuData({ navigationEndpoint: {} })).toBeNull();
    expect(queueAddFromMenuData(undefined)).toBeNull();
    expect(queueAddFromMenuData(item({ queueTarget: { videoId: 'javascript:' } }))).toEqual({ videoId: null, next: false });
  });
});

describe('connection test verdict', () => {
  const probe = (broker: string, reachable: boolean) => ({ broker, reachable, millis: 120 });

  test('all, some, or no brokers reachable', () => {
    setCompanionLocale('en');
    expect(describeProbes([probe('a', true), probe('b', true)]).verdict).toBe('sync.test.allOk');
    expect(describeProbes([probe('a', true), probe('b', false)]).verdict).toBe('sync.test.someOk');
    expect(describeProbes([probe('a', false), probe('b', false)]).verdict).toBe('sync.test.noneOk');
    expect(describeProbes([]).verdict).toBe('sync.test.noneOk');
    expect(describeProbes([probe('a', true), probe('b', false)]).lines).toEqual(['a: 120 ms', 'b: no answer']);
  });
});

describe('Listen Together roles', () => {
  const room = (members: RoomMemberPayload[], me: string, isHost = false) => ({
    members,
    current_user_id: me,
    is_host: isHost
  });

  test('own role, with members from hosts that predate roles counting as DJs', () => {
    const members: RoomMemberPayload[] = [
      { id: 'h', nickname: 'H', is_host: true },
      { id: 'a', nickname: 'A', is_host: false, role: 'listener' },
      { id: 'b', nickname: 'B', is_host: false }
    ];
    expect(ownRole(room(members, 'h', true))).toBe('host');
    expect(ownRole(room(members, 'a'))).toBe('listener');
    expect(ownRole(room(members, 'b'))).toBe('dj');
    expect(canControl('listener')).toBe(false);
    expect(canControl('dj')).toBe(true);
  });

  test('kick rights mirror MemberRole::can_kick in sync_room.rs', () => {
    expect(canKick('host', 'moderator')).toBe(true);
    expect(canKick('moderator', 'dj')).toBe(true);
    expect(canKick('moderator', 'listener')).toBe(true);
    expect(canKick('moderator', 'moderator')).toBe(false);
    expect(canKick('moderator', 'host')).toBe(false);
    expect(canKick('dj', 'listener')).toBe(false);
    expect(roleOf({ is_host: true, role: 'listener' })).toBe('host');
  });
});

// The injected page can't call #[tauri::command]s directly; every command
// it invokes must be declared in the `bridge_commands!` table in
// src-tauri/src/bridge.rs (which generates both BRIDGE_COMMANDS and the
// dispatch match from that one list), or the backend answers "Unknown
// bridge command". `broadcast_sync_state` and `set_inhibit_sleep` were once
// missing, which broke Listen Together and the sleep inhibitor outright.
describe('injected-page IPC bridge', () => {
  const root = join(import.meta.dir, '..', '..');

  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const p = join(dir, name);
      return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : [];
    });

  /** Command names declared in the `bridge_commands! { ... }` invocation. */
  const bridgeCommands = (): Set<string> => {
    const src = readFileSync(join(root, 'src-tauri/src/bridge.rs'), 'utf8');
    const start = src.indexOf('bridge_commands! {');
    expect(start).toBeGreaterThan(-1);
    const table = src.slice(start, src.indexOf('\n}\n', start));
    return new Set([...table.matchAll(/^\s+"([a-z_]+)" => \|/gm)].map((m) => m[1]));
  };

  test('every command invoked from src/preload + src/plugins is in the bridge table', () => {
    const invoked = new Set<string>();
    for (const file of [...walk(join(root, 'src/preload')), ...walk(join(root, 'src/plugins'))]) {
      // The client itself calls the two page commands (oxitune_bridge/oxitune_subscribe).
      if (file.endsWith('bridgeClient.ts')) continue;
      for (const m of readFileSync(file, 'utf8').matchAll(/(?:invoke|invokeBackend|runAction)\(\s*'([a-z_]+)'/g)) {
        invoked.add(m[1]);
      }
    }
    const handled = bridgeCommands();

    expect(handled.size).toBeGreaterThan(10);
    expect(invoked.size).toBeGreaterThan(5);
    expect([...invoked].filter((cmd) => !handled.has(cmd))).toEqual([]);
  });
});

// The page is a remote origin shared with YouTube's own scripts: only the
// main window may carry a remote URL, and it may reach nothing but the two
// page commands. Companion windows are local and never list remote URLs.
describe('capabilities', () => {
  const dir = join(import.meta.dir, '..', '..', 'src-tauri', 'capabilities');
  const caps = readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as {
      identifier: string;
      windows: string[];
      permissions: string[];
      remote?: { urls: string[] };
      local?: boolean;
    });

  test('only the main page capability has remote URLs, and only YouTube Music', () => {
    const remote = caps.filter((c) => c.remote);
    expect(remote.map((c) => c.identifier)).toEqual(['main-page']);
    expect(remote[0].windows).toEqual(['main']);
    expect(remote[0].remote?.urls).toEqual(['https://music.youtube.com/*']);
    expect(remote[0].permissions.sort()).toEqual(['allow-oxitune-bridge', 'allow-oxitune-subscribe']);
    // Capabilities also apply to local pages unless told otherwise.
    expect(remote[0].local).toBe(false);
  });

  test('no capability applies to every window', () => {
    for (const c of caps) expect(c.windows).not.toContain('*');
  });

  test('no window gets shell, file system or the page bridge by accident', () => {
    for (const c of caps.filter((c) => c.identifier !== 'main-page')) {
      for (const p of c.permissions) {
        expect(p.startsWith('shell:') || p.startsWith('fs:') || p === 'allow-oxitune-bridge').toBe(false);
      }
    }
  });
});
