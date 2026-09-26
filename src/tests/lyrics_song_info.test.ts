import { describe, expect, test } from 'bun:test';
import { nextInQueue, songTags } from '../plugins/lyrics/songInfo';

describe('songTags', () => {
  const response = {
    videoDetails: { videoId: 'jRGrNDV2mKc' },
    microformat: { microformatDataRenderer: { tags: ['Korn', 'Freak on leash Korn', 42, ' ', 'Life Is Peachy'] } }
  };

  test('the song’s tags, strings only', () => {
    expect(songTags(response, 'jRGrNDV2mKc')).toEqual(['Korn', 'Freak on leash Korn', 'Life Is Peachy']);
  });

  test('nothing while the player still describes another song', () => {
    expect(songTags(response, 'HaFdmN2ha2I')).toEqual([]);
    expect(songTags(undefined, 'jRGrNDV2mKc')).toEqual([]);
    expect(songTags(response, undefined)).toEqual([]);
  });

  test('at most 20', () => {
    const many = { ...response, microformat: { microformatDataRenderer: { tags: Array.from({ length: 50 }, (_, i) => `t${i}`) } } };
    expect(songTags(many, 'jRGrNDV2mKc')).toHaveLength(20);
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
      row(true, song('1mjlM_RnsVE', 'Monster', 'Skillet', '3:07')),
      row(false, song('Bn96ZZpHfLo', 'Monster', 'Skillet', '2:59'))
    ];
    expect(nextInQueue(rows)).toEqual({ videoId: 'Bn96ZZpHfLo', title: 'Monster', artist: 'Skillet', durationSecs: 179 });
  });

  test('none at the end of the queue, without a playing row, or with a bad id', () => {
    expect(nextInQueue([row(true, song('1mjlM_RnsVE', 'Monster', 'Skillet', '3:07'))])).toBeNull();
    expect(nextInQueue([row(false, song('1mjlM_RnsVE', 'Monster', 'Skillet', '3:07'))])).toBeNull();
    expect(nextInQueue([row(true, {}), row(false, song('javascript:', 'X', 'Y', '1:00'))])).toBeNull();
  });

  test('an unknown length is null', () => {
    expect(nextInQueue([row(true, {}), row(false, song('Bn96ZZpHfLo', 'Monster', 'Skillet', ''))])?.durationSecs).toBeNull();
  });
});
