import { describe, expect, test } from 'bun:test';
import { nextInQueue, songTags } from '../plugins/lyrics/songInfo';

describe('songTags', () => {
  const response = {
    videoDetails: { videoId: 'BBBBBBBBBB2' },
    microformat: { microformatDataRenderer: { tags: ['Glasshouse', 'Paper lanterns Glasshouse', 42, ' ', 'Life Is Plenty'] } }
  };

  test('the song’s tags, strings only', () => {
    expect(songTags(response, 'BBBBBBBBBB2')).toEqual(['Glasshouse', 'Paper lanterns Glasshouse', 'Life Is Plenty']);
  });

  test('nothing while the player still describes another song', () => {
    expect(songTags(response, 'EEEEEEEEEE5')).toEqual([]);
    expect(songTags(undefined, 'BBBBBBBBBB2')).toEqual([]);
    expect(songTags(response, undefined)).toEqual([]);
  });

  test('at most 20', () => {
    const many = { ...response, microformat: { microformatDataRenderer: { tags: Array.from({ length: 50 }, (_, i) => `t${i}`) } } };
    expect(songTags(many, 'BBBBBBBBBB2')).toHaveLength(20);
  });
});

describe('nextInQueue', () => {
  const row = (selected: boolean, data: unknown) =>
    ({ hasAttribute: (name: string) => name === 'selected' && selected, data }) as unknown as Element & { data?: unknown };
  const song = (videoId: string, title: string, artist: string, length: string) => ({
    videoId,
    title: { runs: [{ text: title }] },
    shortBylineText: { runs: [{ text: artist }] },
    lengthText: { runs: [{ text: length }] }
  });

  test('the row after the playing one', () => {
    const rows = [
      row(false, song('aaaaaaaaaaa', 'Before', 'X', '1:00')),
      row(true, song('DDDDDDDDDD4', 'Lantern', 'Ironvine', '3:07')),
      row(false, song('CCCCCCCCCC3', 'Lantern', 'Ironvine', '2:59'))
    ];
    expect(nextInQueue(rows)).toEqual({ videoId: 'CCCCCCCCCC3', title: 'Lantern', artist: 'Ironvine', durationSecs: 179 });
  });

  test('none at the end of the queue, without a playing row, or with a bad id', () => {
    expect(nextInQueue([row(true, song('DDDDDDDDDD4', 'Lantern', 'Ironvine', '3:07'))])).toBeNull();
    expect(nextInQueue([row(false, song('DDDDDDDDDD4', 'Lantern', 'Ironvine', '3:07'))])).toBeNull();
    expect(nextInQueue([row(true, {}), row(false, song('javascript:', 'X', 'Y', '1:00'))])).toBeNull();
  });

  test('an unknown length is null', () => {
    expect(nextInQueue([row(true, {}), row(false, song('CCCCCCCCCC3', 'Lantern', 'Ironvine', ''))])?.durationSecs).toBeNull();
  });
});
