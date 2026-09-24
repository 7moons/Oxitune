import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';
import { REMOTE_LOCALES, errorText, resolveRemoteLocale, rt, setRemoteLocale } from '../remote/i18n';
import { CLIENT_MSG_TYPES, SERVER_MSG_TYPES, type PlayerState, type ServerMsg } from '../remote/protocol';
import {
  activeLineIndex,
  backoffMs,
  canControlRoom,
  currentPosition,
  formatTime,
  initialState,
  moveItem,
  reduce,
  syncedLines
} from '../remote/store';

const root = join(import.meta.dir, '..', '..');

const player = (over: Partial<PlayerState> = {}): PlayerState => ({
  track: { title: 'Maniac', artist: 'Carpenter Brut', duration_secs: 300, video_id: 'aaaaaaaaaaa' },
  playing: true,
  position_secs: 10,
  sampled_at_ms: 1_000,
  server_time_ms: 1_500,
  volume: 0.5,
  muted: false,
  like: 'none',
  shuffle: false,
  repeat: 'none',
  accent: null,
  ...over
});

describe('remote state reducer', () => {
  test('connection flag follows the socket', () => {
    const s = reduce(initialState, { type: 'connected' });
    expect(s.connected).toBe(true);
    expect(reduce(s, { type: 'disconnected' }).connected).toBe(false);
  });

  test('state, queue, lyrics and room messages land in their slots', () => {
    let s = reduce(initialState, { type: 'message', now: 42, msg: { type: 'state', ...player() } });
    expect(s.player?.track?.title).toBe('Maniac');
    expect(s.playerReceivedAt).toBe(42);
    expect(s.player && 'type' in s.player).toBe(false);

    s = reduce(s, {
      type: 'message',
      now: 0,
      msg: { type: 'queue', shared: true, items: [{ id: 'q1', video_id: 'aaaaaaaaaaa', title: 'Maniac', artist: 'CB' }] }
    });
    expect(s.queue).toHaveLength(1);
    expect(s.queueShared).toBe(true);

    s = reduce(s, { type: 'message', now: 0, msg: { type: 'lyrics', lyrics: { video_id: 'aaaaaaaaaaa', synced: [{ t: 1, text: 'a' }] } } });
    expect(s.lyrics?.synced).toHaveLength(1);

    const room = { is_host: false, me: 'm1', members: [], skip_votes: [], votes_needed: 1 };
    s = reduce(s, { type: 'message', now: 0, msg: { type: 'room', room } });
    expect(s.room).toEqual(room);
  });

  test('reactions keep only the newest few', () => {
    let s = initialState;
    for (let i = 0; i < 20; i++) s = reduce(s, { type: 'message', now: i, msg: { type: 'reaction', from: 'K', emoji: String(i) } });
    expect(s.reactions).toHaveLength(12);
    expect(s.reactions[11].emoji).toBe('19');
  });

  test('replies and hello leave the state untouched', () => {
    const msgs: ServerMsg[] = [
      { type: 'hello', version: 1 },
      { type: 'result', id: 1, ok: true },
      { type: 'search_results', id: 2, results: [] }
    ];
    for (const msg of msgs) expect(reduce(initialState, { type: 'message', now: 0, msg })).toBe(initialState);
  });
});

describe('position between reports', () => {
  test('adds transit on the desktop clock and elapsed time on the phone clock', () => {
    // 0.5 s between sample and send, 2 s since receipt.
    expect(currentPosition(player(), 10_000, 12_000)).toBeCloseTo(12.5, 3);
  });
  test('holds still while paused', () => {
    expect(currentPosition(player({ playing: false }), 0, 60_000)).toBe(10);
  });
  test('never runs past the end or before zero', () => {
    expect(currentPosition(player(), 0, 10_000_000)).toBe(300);
    expect(currentPosition(player({ position_secs: -5, playing: false }), 0, 0)).toBe(0);
    expect(currentPosition(null, 0, 0)).toBe(0);
  });
  test('clock skew between the machines has no effect', () => {
    // The phone's clock is not used against the desktop's at all.
    const a = currentPosition(player({ sampled_at_ms: 5_000, server_time_ms: 5_500 }), 100, 2_100);
    const b = currentPosition(player({ sampled_at_ms: 9_000_000, server_time_ms: 9_000_500 }), 100, 2_100);
    expect(a).toBeCloseTo(b, 6);
  });
  test('formatTime', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(65.9)).toBe('1:05');
    expect(formatTime(3723)).toBe('1:02:03');
    expect(formatTime(NaN)).toBe('0:00');
  });
});

describe('lyrics', () => {
  const lines = [
    { t: 1, text: 'one' },
    { t: 5, text: 'two' },
    { t: 9, text: 'three' }
  ];
  test('active line by position and offset', () => {
    expect(activeLineIndex(lines, 0)).toBe(-1);
    expect(activeLineIndex(lines, 1)).toBe(0);
    expect(activeLineIndex(lines, 6)).toBe(1);
    expect(activeLineIndex(lines, 100)).toBe(2);
    expect(activeLineIndex(lines, 4, 1)).toBe(1);
  });
  test("another song's lyrics are ignored", () => {
    expect(syncedLines({ video_id: 'bbbbbbbbbbb', synced: lines }, 'aaaaaaaaaaa')).toBeNull();
    expect(syncedLines({ video_id: 'aaaaaaaaaaa', synced: lines }, 'aaaaaaaaaaa')).toBe(lines);
    expect(syncedLines({ synced: [] }, 'aaaaaaaaaaa')).toBeNull();
    expect(syncedLines(null, 'x')).toBeNull();
  });
});

describe('helpers', () => {
  test('reconnect backoff grows, caps at ~10 s and is jittered', () => {
    expect(backoffMs(0, 0.5)).toBe(500);
    expect(backoffMs(1, 0.5)).toBe(1000);
    expect(backoffMs(20, 0.5)).toBe(10_000);
    expect(backoffMs(20, 1)).toBe(12_500);
    expect(backoffMs(20, 0)).toBe(7_500);
  });
  test('moveItem', () => {
    expect(moveItem([1, 2, 3, 4], 0, 2)).toEqual([2, 3, 1, 4]);
    expect(moveItem([1, 2, 3], 2, 0)).toEqual([3, 1, 2]);
    expect(moveItem([1, 2, 3], 5, 0)).toEqual([1, 2, 3]);
  });
  test('listeners cannot edit the shared queue', () => {
    const room = (role: 'dj' | 'listener') => ({
      is_host: false,
      me: 'm2',
      members: [{ id: 'm2', nickname: 'Me', role, is_host: false }],
      skip_votes: [],
      votes_needed: 1
    });
    expect(canControlRoom(null)).toBe(true);
    expect(canControlRoom(room('dj'))).toBe(true);
    expect(canControlRoom(room('listener'))).toBe(false);
  });
});

describe('protocol mirrors schemas/remote_v1.json', () => {
  const schema = JSON.parse(readFileSync(join(root, 'schemas', 'remote_v1.json'), 'utf8'));
  const typesOf = (def: string): string[] =>
    schema.$defs[def].oneOf
      .map((ref: { $ref: string }) => schema.$defs[ref.$ref.split('/').pop() as string].properties.type.const)
      .sort();
  test('server message types', () => {
    expect([...SERVER_MSG_TYPES].sort() as string[]).toEqual(typesOf('ServerMsg'));
  });
  test('client message types', () => {
    expect([...CLIENT_MSG_TYPES].sort() as string[]).toEqual(typesOf('ClientMsg'));
  });
  test('player commands', () => {
    expect(schema.$defs.CmdMsg.properties.command.enum.sort()).toEqual(
      ['dislike', 'like', 'mute', 'next', 'play_pause', 'previous', 'repeat', 'shuffle'].sort()
    );
  });
});

describe('phone remote translations', () => {
  const html = readFileSync(join(root, 'remote.html'), 'utf8');
  const main = readFileSync(join(root, 'src', 'remote', 'main.ts'), 'utf8');

  test('every key used in the markup and code exists in every locale', () => {
    const keys = new Set<string>();
    for (const m of html.matchAll(/data-i18n(?:-label|-placeholder)?="([^"]+)"/g)) keys.add(m[1]);
    for (const m of main.matchAll(/rt\('([^']+)'/g)) keys.add(m[1]);
    for (const m of main.matchAll(/'((?:search|room|queue|player|status|lyrics|error)\.[A-Za-z]+)'/g)) keys.add(m[1]);
    const missing: string[] = [];
    for (const key of keys) {
      for (const [lang, dict] of Object.entries(REMOTE_LOCALES)) if (!(key in dict)) missing.push(`${key} (${lang})`);
    }
    expect(missing).toEqual([]);
  });

  test('both locales have the same keys', () => {
    expect(Object.keys(REMOTE_LOCALES.pl).sort()).toEqual(Object.keys(REMOTE_LOCALES.en).sort());
  });

  test('every role and server error has a string', () => {
    for (const role of ['host', 'moderator', 'dj', 'listener']) expect(REMOTE_LOCALES.en).toHaveProperty([`room.${role}`]);
    const rust = readFileSync(join(root, 'src-tauri', 'src', 'remote_server.rs'), 'utf8');
    const page = readFileSync(join(root, 'src', 'plugins', 'remote', 'host.ts'), 'utf8');
    const errors = new Set([...rust.matchAll(/remote\.error\.([A-Za-z]+)/g), ...page.matchAll(/remote\.error\.([A-Za-z]+)/g)].map((m) => m[1]));
    expect(errors.size).toBeGreaterThan(3);
    for (const e of errors) expect(REMOTE_LOCALES.en).toHaveProperty([`error.${e}`]);
  });

  test('no user-facing text left untagged in the markup', () => {
    const allowed = new Set(['YTMD', '0:00']);
    const stripped = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/g, '');
    const offenders: string[] = [];
    for (const m of stripped.matchAll(/<([a-z0-9]+)([^>]*)>([^<]+)</g)) {
      const text = m[3].trim();
      if (!text || allowed.has(text) || m[2].includes('data-i18n=')) continue;
      offenders.push(`<${m[1]}> "${text}"`);
    }
    expect(offenders).toEqual([]);
  });

  test('locale follows the phone, errors map to strings', () => {
    expect(resolveRemoteLocale('pl-PL')).toBe('pl');
    expect(resolveRemoteLocale('de-DE')).toBe('en');
    setRemoteLocale('pl');
    expect(rt('room.votes', { votes: 1, needed: 2 })).toBe('Głosy za pominięciem: 1 z 2');
    expect(errorText('remote.error.noRoom')).toBe('Nie jesteś w sesji wspólnego słuchania');
    setRemoteLocale('en');
    expect(errorText('remote.error.somethingNew')).toBe("Couldn't do that. Try again.");
    expect(errorText(undefined)).toBe("Couldn't do that. Try again.");
  });
});
