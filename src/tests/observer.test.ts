import { describe, expect, test } from 'bun:test';
import {
  parseTimeStrToSecs,
  shouldFallbackTick,
  FALLBACK_TICK_AFTER_MS,
  classifyTrackUpdate,
  titlesAgree,
  settledMetadata,
  songFromPlayer,
  sameTitle
} from '../preload/observer';
import type { TrackInfo } from '../plugins/types';

describe('parseTimeStrToSecs (player bar "0:15 / 3:45" parts)', () => {
  test('m:ss and h:mm:ss', () => {
    expect(parseTimeStrToSecs('0:15')).toBe(15);
    expect(parseTimeStrToSecs(' 3:45 ')).toBe(225);
    expect(parseTimeStrToSecs('1:02:03')).toBe(3723);
  });

  test('garbage and unsupported shapes are 0, never NaN', () => {
    expect(parseTimeStrToSecs('')).toBe(0);
    expect(parseTimeStrToSecs('live')).toBe(0);
    expect(parseTimeStrToSecs('42')).toBe(0);
  });
});

describe('shouldFallbackTick', () => {
  test('no fallback tick while timeupdate is flowing (~250ms apart)', () => {
    expect(shouldFallbackTick(10_250, 10_000)).toBe(false);
  });
  test('fallback tick once timeupdate has gone quiet', () => {
    expect(shouldFallbackTick(10_000 + FALLBACK_TICK_AFTER_MS, 10_000)).toBe(true);
    expect(shouldFallbackTick(5_000, 0)).toBe(true);
  });
});

const song = (over: Partial<TrackInfo> = {}): TrackInfo => ({
  title: 'Neon Runner',
  artist: 'Night Drive',
  album: 'Triptych',
  coverUrl: 'https://lh3.googleusercontent.com/a',
  durationSecs: 300,
  currentTimeSecs: 10,
  isPlaying: true,
  videoId: 'aaaaaaaaaaa',
  ...over
});

describe('classifyTrackUpdate', () => {
  test('first track and a new song id are new songs', () => {
    expect(classifyTrackUpdate(null, song())).toBe('new');
    expect(classifyTrackUpdate(song(), song({ videoId: 'bbbbbbbbbbb', title: 'Chrome Heart' }))).toBe('new');
  });

  test('same id with a settled title is the same song, not a second change', () => {
    // The title used to arrive a frame before the URL id, firing two changes.
    expect(classifyTrackUpdate(song({ title: 'Old title' }), song())).toBe('metadata');
  });

  test('a stale duration is corrected, not only a zero one', () => {
    expect(classifyTrackUpdate(song({ durationSecs: 187 }), song())).toBe('metadata');
    expect(classifyTrackUpdate(song({ durationSecs: 0 }), song())).toBe('metadata');
    expect(classifyTrackUpdate(song({ durationSecs: 301 }), song())).toBeNull();
  });

  test('without ids, title or artist decides', () => {
    const noId = song({ videoId: undefined });
    expect(classifyTrackUpdate(noId, song({ videoId: undefined, title: 'Other' }))).toBe('new');
    expect(classifyTrackUpdate(noId, song())).toBe('metadata');
  });

  test('position and play state alone are not track changes', () => {
    expect(classifyTrackUpdate(song(), song({ currentTimeSecs: 99, isPlaying: false }))).toBeNull();
  });
});

describe('titlesAgree', () => {
  test('case and spacing differences agree, different songs do not', () => {
    expect(titlesAgree('Neon Runner', ' neon runner ')).toBe(true);
    expect(titlesAgree('Neon Runner', 'Chrome Heart')).toBe(false);
  });
  test('an unknown side never blocks', () => {
    expect(titlesAgree(undefined, 'Neon Runner')).toBe(true);
    expect(titlesAgree('Neon Runner', '')).toBe(true);
  });
});

// Regression: MediaSession kept the previous song ("Grow A Vine") while the
// player had switched to "Wake Me Up Inside"; the pair was reported anyway
// and the lyrics for the old title were cached under the new song's id.
// The song's identity comes from one object the player swaps as a whole
// (what pear-desktop's song-info does), never pieced together.
describe('songFromPlayer', () => {
  const details = {
    videoId: 'BBBBBBBBBB2',
    title: ' Paper Lanterns (Official HD Video) ',
    author: 'Glasshouse',
    lengthSeconds: '267',
    thumbnail: { thumbnails: [{ url: 'https://i.ytimg.com/small.jpg' }, { url: 'https://i.ytimg.com/big.jpg' }] }
  };

  test('describes the loaded song from its details', () => {
    expect(songFromPlayer(details, 'BBBBBBBBBB2')).toEqual({
      videoId: 'BBBBBBBBBB2',
      title: 'Paper Lanterns (Official HD Video)',
      artist: 'Glasshouse',
      durationSecs: 267,
      coverUrl: 'https://i.ytimg.com/big.jpg'
    });
  });

  test('details of another song than the loaded one are a switch in progress', () => {
    expect(songFromPlayer(details, 'EEEEEEEEEE5')).toBe('switching');
    expect(songFromPlayer({ ...details, title: '' }, 'BBBBBBBBBB2')).toBe('switching');
  });

  test('no details: the older sources decide', () => {
    expect(songFromPlayer(undefined, 'BBBBBBBBBB2')).toBeNull();
    expect(songFromPlayer({}, undefined)).toBeNull();
  });

  test('a missing length is 0, not NaN', () => {
    const song = songFromPlayer({ ...details, lengthSeconds: undefined }, undefined);
    expect(song !== null && song !== 'switching' && song.durationSecs).toBe(0);
  });
});

describe('sameTitle', () => {
  test('needs both titles, equal aside from case and spacing', () => {
    expect(sameTitle('Loose', ' loose ')).toBe(true);
    expect(sameTitle('Loose', '')).toBe(false);
    expect(sameTitle(undefined, 'Loose')).toBe(false);
    expect(sameTitle('Loose', 'Supa Freak Love')).toBe(false);
  });
});

describe('settledMetadata', () => {
  test('describes the song from the player, never from the stale MediaSession', () => {
    expect(settledMetadata('-eGM0IJc70Y', { title: ' Wake Me Up Inside ', author: 'Lumen Fall' })).toEqual({
      title: 'Wake Me Up Inside',
      artist: 'Lumen Fall',
      coverUrl: 'https://i.ytimg.com/vi/-eGM0IJc70Y/hqdefault.jpg'
    });
    expect(settledMetadata('-eGM0IJc70Y', undefined).title).toBe(''); // no title: not reported at all
  });
});
