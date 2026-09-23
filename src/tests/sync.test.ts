import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { computeSyncAction, LocalPlayback, SyncPlaybackPayload } from '../plugins/sync-room';

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
  ...over
});

describe('computeSyncAction', () => {
  test('different track: navigate only, no play/seek on the old video', () => {
    const a = computeSyncAction(payload(), local({ videoId: 'aaaaaaaaaaa' }), 10_000);
    expect(a).toEqual({ navigateTo: 'dQw4w9WgXcQ', setPlaying: null, seekTo: null });
  });

  test('rejects malformed video ids', () => {
    const a = computeSyncAction(payload({ video_id: 'javascript:x' }), local({ videoId: null }), 10_000);
    expect(a.navigateTo).toBeNull();
  });

  test('in sync: nothing to do', () => {
    expect(computeSyncAction(payload(), local({ currentTime: 50.3 }), 10_250)).toEqual({
      navigateTo: null,
      setPlaying: null,
      seekTo: null
    });
  });

  test('host paused, guest playing: pause', () => {
    expect(computeSyncAction(payload({ is_playing: false }), local(), 10_000).setPlaying).toBe(false);
  });

  test('host playing, guest paused: play', () => {
    expect(computeSyncAction(payload(), local({ paused: true }), 10_000).setPlaying).toBe(true);
  });

  test('drift beyond tolerance seeks to host position plus transit', () => {
    const a = computeSyncAction(payload(), local({ currentTime: 40 }), 10_250);
    expect(a.seekTo).toBeCloseTo(50.25, 3);
  });

  test('skewed guest clock cannot push the target more than 1s ahead', () => {
    // Guest clock 30s ahead of host: naive math would seek to 80s.
    const a = computeSyncAction(payload(), local({ currentTime: 40 }), 40_000);
    expect(a.seekTo).toBeCloseTo(51, 3);
    // And a small skew alone never causes a seek loop.
    expect(computeSyncAction(payload(), local({ currentTime: 50.5 }), 40_000).seekTo).toBeNull();
  });

  test('paused host ignores transit time', () => {
    const a = computeSyncAction(payload({ is_playing: false }), local({ paused: true, currentTime: 10 }), 10_900);
    expect(a.seekTo).toBe(50);
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
