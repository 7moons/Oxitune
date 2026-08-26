import { describe, expect, test } from 'bun:test';
import { parseLrc, isCurrentSongKey } from '../plugins/lyrics';

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
