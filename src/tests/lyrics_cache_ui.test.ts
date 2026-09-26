import { describe, expect, test } from 'bun:test';
import { CacheEntry, foundDiffers, matchesFilter } from '../ui/lyricsCache';

const entry = (over: Partial<CacheEntry> = {}): CacheEntry => ({
  video_id: 'hGW3YNqoeg0',
  song: { title: 'Most Wanted', artist: 'Albert RCB, Young Leosia i PlanBe' },
  saved_at: 1_790_000_000,
  picked: false,
  fresh: true,
  found: { provider: 'ytm', title: 'Most Wanted', artist: 'Albert RCB, Young Leosia i PlanBe', synced: false, lines: 40, preview: 'W taką noc' },
  ...over
});

describe('matchesFilter', () => {
  test('matches the song, what was found, or the id, ignoring case', () => {
    expect(matchesFilter(entry(), '')).toBe(true);
    expect(matchesFilter(entry(), 'most')).toBe(true);
    expect(matchesFilter(entry(), 'LEOSIA')).toBe(true);
    expect(matchesFilter(entry(), 'hGW3')).toBe(true);
    expect(matchesFilter(entry({ found: { ...entry().found!, title: 'Berlins Most Wanted', artist: 'Bushido' } }), 'bushido')).toBe(true);
    expect(matchesFilter(entry(), 'kesha')).toBe(false);
  });

  test('an entry without a recorded song or lyrics still matches by id', () => {
    expect(matchesFilter(entry({ song: null, found: null }), 'hgw3yn')).toBe(true);
  });
});

describe('foundDiffers', () => {
  test('flags lyrics whose title or artist aren’t the song’s', () => {
    expect(foundDiffers(entry())).toBe(false);
    expect(foundDiffers(entry({ found: { ...entry().found!, title: 'Berlins Most Wanted', artist: 'Berlins Most Wanted' } }))).toBe(true);
    expect(foundDiffers(entry({ found: null }))).toBe(false);
    expect(foundDiffers(entry({ song: null }))).toBe(false);
  });
});
