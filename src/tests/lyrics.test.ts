import { describe, expect, test } from 'bun:test';
import { parseLrc, isCurrentSongKey, isLyricsTabUnlocked } from '../plugins/lyrics';

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
