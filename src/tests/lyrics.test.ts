import { describe, expect, test } from 'bun:test';
import { isCurrentSongKey, isLyricsTabUnlocked, loadOffsets, formatOffset, songKeyOf } from '../plugins/lyrics';
import { activeLineIndex, activeWordIndex, providerName, toCurrentLyrics, LyricsLine } from '../types/lyrics';
import { moveProvider, normalizeProviders } from '../ui/lyricsProviders';

// LRC parsing moved to the backend: src-tauri/src/lyrics/lrc.rs has its tests.

const lines: LyricsLine[] = [
  { t: 5, text: 'first' },
  { t: 10, text: 'second', words: [{ t: 10, text: 'sec' }, { t: 11, text: 'ond' }] },
  { t: 20, text: 'third' }
];

describe('activeLineIndex', () => {
  test('before the first line there is none', () => {
    expect(activeLineIndex(lines, 4.9, 0)).toBe(-1);
  });
  test('a line stays active until the next one starts', () => {
    expect(activeLineIndex(lines, 5, 0)).toBe(0);
    expect(activeLineIndex(lines, 19.99, 0)).toBe(1);
    expect(activeLineIndex(lines, 500, 0)).toBe(2);
  });
  test('a positive offset shows lines earlier', () => {
    expect(activeLineIndex(lines, 9, 1)).toBe(1);
    expect(activeLineIndex(lines, 10, -1)).toBe(0);
  });
  test('no lines', () => {
    expect(activeLineIndex([], 10, 0)).toBe(-1);
  });
});

describe('activeWordIndex', () => {
  test('words light up as they start', () => {
    expect(activeWordIndex(lines[1], 10.5, 0)).toBe(0);
    expect(activeWordIndex(lines[1], 11, 0)).toBe(1);
    expect(activeWordIndex(lines[1], 9, 0)).toBe(-1);
  });
  test('lines without words have no active word', () => {
    expect(activeWordIndex(lines[0], 6, 0)).toBe(-1);
    expect(activeWordIndex(undefined, 6, 0)).toBe(-1);
  });
});

describe('toCurrentLyrics', () => {
  test('keeps a well-formed payload', () => {
    const p = toCurrentLyrics({ video_id: 'v', provider: 'lrclib', synced: lines, plain: 'x', offset_secs: 0.5, source_url: null });
    expect(p.provider).toBe('lrclib');
    expect(p.synced).toHaveLength(3);
    expect(p.offset_secs).toBe(0.5);
  });
  test('malformed input becomes no lyrics, never throws', () => {
    expect(toCurrentLyrics(null).synced).toEqual([]);
    const p = toCurrentLyrics({ synced: [{ t: 'x', text: 1 }, { t: 1, text: 'ok' }], offset_secs: Number.NaN, provider: 3 });
    expect(p.synced).toEqual([{ t: 1, text: 'ok' }]);
    expect(p.offset_secs).toBe(0);
    expect(p.provider).toBeNull();
  });
});

describe('providerName', () => {
  test('brand names and the translated local label', () => {
    expect(providerName('musixmatch', 'Local')).toBe('Musixmatch');
    expect(providerName('lrcred', 'Local')).toBe('lrc.red');
    expect(providerName('unison', 'Local')).toBe('Unison');
    expect(providerName('local', 'Pliki lokalne')).toBe('Pliki lokalne');
    expect(providerName(null, 'x')).toBe('');
  });
});

describe('Lyrics: stale fetch guard', () => {
  test('accepts a response for the song still playing', () => {
    expect(isCurrentSongKey('Song A - Artist A', 'Song A - Artist A')).toBe(true);
  });

  test('rejects a response for a song the user has already skipped past', () => {
    expect(isCurrentSongKey('Song A - Artist A', 'Song B - Artist B')).toBe(false);
  });

  test('song key prefers the video id, like the backend', () => {
    expect(songKeyOf({ videoId: 'abc', title: 'T', artist: 'A' })).toBe('abc|t');
    // The same id with a corrected title is a new lookup.
    expect(songKeyOf({ videoId: 'abc', title: 'Other', artist: 'A' })).not.toBe(songKeyOf({ videoId: 'abc', title: 'T', artist: 'A' }));
    expect(songKeyOf({ videoId: undefined, title: 'T', artist: 'A' })).toBe('T - A');
  });
});

describe('isLyricsTabUnlocked', () => {
  const tab = (attrs: Record<string, string>, classes: string[], disabled?: boolean) => ({
    disabled,
    hasAttribute: (n: string) => n in attrs,
    getAttribute: (n: string) => attrs[n] ?? null,
    classList: { contains: (c: string) => classes.includes(c) }
  });

  test('already unlocked tab is left alone by the poll', () => {
    expect(isLyricsTabUnlocked(tab({}, ['ytmd-lyrics-tab-unlocked'], false))).toBe(true);
  });

  test('never-touched tab needs unlocking', () => {
    expect(isLyricsTabUnlocked(tab({}, []))).toBe(false);
  });

  test('YTM re-disabling an unlocked tab triggers a re-unlock', () => {
    expect(isLyricsTabUnlocked(tab({ disabled: '' }, ['ytmd-lyrics-tab-unlocked']))).toBe(false);
    expect(isLyricsTabUnlocked(tab({ 'aria-disabled': 'true' }, ['ytmd-lyrics-tab-unlocked']))).toBe(false);
    expect(isLyricsTabUnlocked(tab({}, ['ytmd-lyrics-tab-unlocked'], true))).toBe(false);
  });
});

describe('old localStorage offsets are read for the one-time migration', () => {
  test('valid entries only', () => {
    expect(loadOffsets({ getItem: () => '[["ok", 1], ["bad", "x"], 3]' })).toEqual(new Map([['ok', 1]]));
  });

  test('corrupt, missing or blocked storage never throws', () => {
    expect(loadOffsets({ getItem: () => '{not json' }).size).toBe(0);
    expect(loadOffsets({ getItem: () => null }).size).toBe(0);
    expect(
      loadOffsets({
        getItem: () => {
          throw new Error('blocked');
        }
      }).size
    ).toBe(0);
    expect(loadOffsets(null).size).toBe(0);
  });

  test('offset label', () => {
    expect(formatOffset(0)).toBe('0.0 s');
    expect(formatOffset(1.5)).toBe('+1.5 s');
    expect(formatOffset(-0.5)).toBe('−0.5 s');
  });
});

describe('lyrics provider settings', () => {
  test('unknown and duplicate ids dropped, missing ones added with defaults', () => {
    const list = normalizeProviders([
      { id: 'genius', enabled: true },
      { id: 'bogus', enabled: true },
      { id: 'genius', enabled: false }
    ]);
    expect(list.find((p) => p.id === 'genius')).toEqual({ id: 'genius', enabled: true });
    expect(list.map((p) => p.id).sort()).toEqual(['genius', 'local', 'lrclib', 'lrcred', 'musixmatch', 'netease', 'unison', 'ytm']);
    for (const unofficial of ['musixmatch', 'netease', 'unison']) {
      expect(list.find((p) => p.id === unofficial)?.enabled).toBe(false);
    }
    expect(list.find((p) => p.id === 'lrclib')?.enabled).toBe(true);
    expect(list.find((p) => p.id === 'lrcred')?.enabled).toBe(true);
  });

  // Same rule (and the same cases) as sanitize_provider_settings in Rust.
  test('a provider new to a saved list goes where the default order has it', () => {
    const saved = (ids: string[]) => ids.map((id) => ({ id, enabled: true }));
    const ids = (list: { id: string }[]) => list.map((p) => p.id);
    expect(ids(normalizeProviders(undefined))).toEqual(['local', 'lrcred', 'lrclib', 'unison', 'musixmatch', 'netease', 'ytm', 'genius']);
    expect(ids(normalizeProviders(saved(['local', 'lrclib', 'musixmatch', 'netease', 'ytm', 'genius'])))).toEqual(
      ids(normalizeProviders(undefined))
    );
    expect(ids(normalizeProviders(saved(['genius', 'lrclib', 'local', 'musixmatch', 'netease', 'ytm'])))).toEqual([
      'genius', 'lrclib', 'unison', 'local', 'lrcred', 'musixmatch', 'netease', 'ytm'
    ]);
  });

  test('moving keeps every provider and clamps at the ends', () => {
    const list = normalizeProviders(undefined);
    expect(moveProvider(list, 1, -1).map((p) => p.id).slice(0, 2)).toEqual(['lrcred', 'local']);
    expect(moveProvider(list, 0, -1)).toEqual(list);
    expect(moveProvider(list, list.length - 1, 1)).toEqual(list);
    expect(moveProvider(list, 2, 1)).toHaveLength(list.length);
  });
});
