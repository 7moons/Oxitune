import { describe, expect, test } from 'bun:test';
import { CacheEntry, foundDiffers, matchesFilter } from '../ui/lyricsCache';

const entry = (over: Partial<CacheEntry> = {}): CacheEntry => ({
  video_id: 'FFFFFFFFFF6',
  song: { title: 'City Lights', artist: 'Mira Vale, Young Oskar i Tidewave' },
  saved_at: 1_790_000_000,
  picked: false,
  fresh: true,
  found: { provider: 'ytm', title: 'City Lights', artist: 'Mira Vale, Young Oskar i Tidewave', synced: false, lines: 40, preview: 'W taką noc' },
  ...over
});

describe('matchesFilter', () => {
  test('matches the song, what was found, or the id, ignoring case', () => {
    expect(matchesFilter(entry(), '')).toBe(true);
    expect(matchesFilter(entry(), 'city')).toBe(true);
    expect(matchesFilter(entry(), 'OSKAR')).toBe(true);
    expect(matchesFilter(entry(), 'fFfF')).toBe(true);
    expect(matchesFilter(entry({ found: { ...entry().found!, title: 'Harbor City Lights', artist: 'Kaizen' } }), 'kaizen')).toBe(true);
    expect(matchesFilter(entry(), 'kasia')).toBe(false);
  });

  test('an entry without a recorded song or lyrics still matches by id', () => {
    expect(matchesFilter(entry({ song: null, found: null }), 'ffffff')).toBe(true);
  });
});

describe('foundDiffers', () => {
  test('flags lyrics whose title or artist aren’t the song’s', () => {
    expect(foundDiffers(entry())).toBe(false);
    expect(foundDiffers(entry({ found: { ...entry().found!, title: 'Harbor City Lights', artist: 'Harbor City Lights' } }))).toBe(true);
    expect(foundDiffers(entry({ found: null }))).toBe(false);
    expect(foundDiffers(entry({ song: null }))).toBe(false);
  });
});
