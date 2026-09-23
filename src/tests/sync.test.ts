import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import {
  computeSyncAction,
  controlForCommand,
  isStalePayload,
  LocalPlayback,
  RoomSyncController,
  SyncPlaybackPayload,
  TransitEstimator
} from '../plugins/sync-room';
import { isSyncGuest } from '../preload/syncRole';

const payload = (over: Partial<SyncPlaybackPayload> = {}): SyncPlaybackPayload => ({
  video_id: 'dQw4w9WgXcQ',
  title: 'T',
  artist: 'A',
  current_time_secs: 50,
  is_playing: true,
  timestamp_ms: 10_000,
  ...over
});

const local = (over: Partial<LocalPlayback> = {}): LocalPlayback => ({
  videoId: 'dQw4w9WgXcQ',
  paused: false,
  currentTime: 50,
  duration: 200,
  correcting: false,
  ...over
});

describe('computeSyncAction', () => {
  test('different track: navigate only, no play/seek on the old video', () => {
    const a = computeSyncAction(payload(), local({ videoId: 'aaaaaaaaaaa' }), 0);
    expect(a).toEqual({ navigateTo: 'dQw4w9WgXcQ', setPlaying: null, seekTo: null, playbackRate: 1 });
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
    location = { search: '?v=dQw4w9WgXcQ', href: '' };
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

    expect(c.handleLocalTrackChange('dQw4w9WgXcQ', 2_000)).toBeNull(); // the host's own song
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
    expect(location.href).toContain('dQw4w9WgXcQ'); // no ytmusic-app in the stub: full-load fallback
    // host moved on while that navigation was landing
    c.handleRemotePlayback(payload({ timestamp_ms: 2_000, video_id: 'ccccccccccc' }), fakeVideo(), 2_000);
    expect(c.handleLocalTrackChange('dQw4w9WgXcQ', 2_100)).toBeNull();

    const d = guest();
    d.handleRemotePlayback(payload({ timestamp_ms: 1_000 }), fakeVideo(), 1_000);
    d.noteLocalTick(fakeVideo({ currentTime: 198.5, duration: 200 }), 5_000);
    expect(d.handleLocalTrackChange('eeeeeeeeeee', 6_000)).toBeNull();
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
    expect(location.href).toContain('dQw4w9WgXcQ');
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
    const track = { title: 'T', artist: 'A', durationSecs: 200, currentTimeSecs: 200, isPlaying: false, videoId: 'dQw4w9WgXcQ' };
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
    const track = { title: 'T', artist: 'A', durationSecs: 200, currentTimeSecs: 199, isPlaying: true, videoId: 'dQw4w9WgXcQ' };
    c.broadcastLocalState(track, fakeVideo({ currentTime: 199.7 }), invoke, true);
    expect(sent[0].playback.video_id).toBe('ccccccccccc');
    expect(sent[0].playback.current_time_secs).toBe(0.3);
  });

  test('a host never turns its own track changes into requests', () => {
    const c = new RoomSyncController();
    c.setRoomState(true, true);
    expect(c.handleLocalTrackChange('bbbbbbbbbbb', 1_000)).toBeNull();
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
