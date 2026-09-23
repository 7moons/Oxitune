import { describe, expect, test } from 'bun:test';
import {
  parseLrc,
  isCurrentSongKey,
  isLyricsTabUnlocked,
  loadOffsets,
  storeOffset,
  formatOffset,
  MAX_STORED_OFFSETS
} from '../plugins/lyrics';

describe('parseLrc', () => {
  test('parses standard [mm:ss.xx] timestamps in order', () => {
    const lrc = [
      '[00:12.50]First line',
      '[00:05.00]Second line appears first in time',
      '[01:02.345]Third line with millis'
    ].join('\n');

    const lines = parseLrc(lrc);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toEqual({ timeSecs: 5, text: 'Second line appears first in time' });
    expect(lines[1]).toEqual({ timeSecs: 12.5, text: 'First line' });
    expect(lines[2].timeSecs).toBeCloseTo(62.345, 3);
  });

  test('drops lines with empty text after the timestamp', () => {
    const lines = parseLrc('[00:01.00]\n[00:02.00]Real lyric');
    expect(lines).toEqual([{ timeSecs: 2, text: 'Real lyric' }]);
  });

  test('ignores non-lyric metadata lines without a timestamp', () => {
    const lines = parseLrc('[ar:Some Artist]\n[00:03.00]Actual lyric');
    expect(lines).toEqual([{ timeSecs: 3, text: 'Actual lyric' }]);
  });
});

describe('Lyrics: stale fetch guard', () => {
  test('accepts a response for the song still playing', () => {
    expect(isCurrentSongKey('Song A - Artist A', 'Song A - Artist A')).toBe(true);
  });

  test('rejects a response for a song the user has already skipped past', () => {
    // fetch_lyrics was requested for Song A, but the user changed tracks to
    // Song B before it resolved — must not paint Song A's lyrics over Song B.
    expect(isCurrentSongKey('Song A - Artist A', 'Song B - Artist B')).toBe(false);
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

describe('parseLrc global offset', () => {
  test('[offset:+500] shifts every line 0.5s earlier', () => {
    const lines = parseLrc('[offset:500]\n[00:10.00]First\n[00:20.00]Second');
    expect(lines.map((l) => l.timeSecs)).toEqual([9.5, 19.5]);
  });
});

describe('lyrics timing offsets persist across restarts', () => {
  const memoryStorage = () => {
    const data = new Map<string, string>();
    return {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v)
    };
  };

  test('round-trips through storage', () => {
    const storage = memoryStorage();
    const map = loadOffsets(storage);
    storeOffset(map, 'Song - Artist', 1.5, storage);
    expect(loadOffsets(storage).get('Song - Artist')).toBe(1.5);
  });

  test('zero offset is removed, not stored', () => {
    const storage = memoryStorage();
    const map = loadOffsets(storage);
    storeOffset(map, 'a', 1, storage);
    storeOffset(map, 'a', 0, storage);
    expect(loadOffsets(storage).has('a')).toBe(false);
  });

  test('keeps only the most recent entries', () => {
    const storage = memoryStorage();
    const map = loadOffsets(storage);
    for (let i = 0; i < MAX_STORED_OFFSETS + 5; i++) storeOffset(map, `s${i}`, 0.5, storage);
    const loaded = loadOffsets(storage);
    expect(loaded.size).toBe(MAX_STORED_OFFSETS);
    expect(loaded.has('s0')).toBe(false);
    expect(loaded.has(`s${MAX_STORED_OFFSETS + 4}`)).toBe(true);
  });

  test('corrupt or blocked storage never throws', () => {
    expect(loadOffsets({ getItem: () => '{not json', setItem: () => {} }).size).toBe(0);
    expect(loadOffsets({ getItem: () => '[["ok", 1], ["bad", "x"], 3]', setItem: () => {} })).toEqual(new Map([['ok', 1]]));
    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      }
    };
    expect(loadOffsets(throwing).size).toBe(0);
    expect(() => storeOffset(new Map(), 'a', 1, throwing)).not.toThrow();
    expect(loadOffsets(null).size).toBe(0);
  });

  test('offset label', () => {
    expect(formatOffset(0)).toBe('0.0 s');
    expect(formatOffset(1.5)).toBe('+1.5 s');
    expect(formatOffset(-0.5)).toBe('−0.5 s');
  });
});
