import { describe, expect, test } from 'bun:test';
import { formatDb, formatCrossfade, formatDuration, getInitials, filterTracks } from '../ui/format';

describe('companion window formatters', () => {
  test('initials for member avatars', () => {
    expect(getInitials('Kacper')).toBe('KA');
    expect(getInitials('Kacper Kowalski')).toBe('KK');
    expect(getInitials('John Doe Extra')).toBe('JD');
    expect(getInitials('A')).toBe('A');
    expect(getInitials('')).toBe('U');
  });

  test('crossfade label', () => {
    expect(formatCrossfade(0)).toBe('Disabled');
    expect(formatCrossfade(-1)).toBe('Disabled');
    expect(formatCrossfade(2.5)).toBe('2.5s');
    expect(formatCrossfade(10)).toBe('10.0s');
  });

  test('dB label has an explicit plus sign', () => {
    expect(formatDb(3.5)).toBe('+3.5');
    expect(formatDb(-4.0)).toBe('-4.0');
    expect(formatDb(0)).toBe('0.0');
  });

  test('track duration as m:ss', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(NaN)).toBe('0:00');
    expect(formatDuration(45)).toBe('0:45');
    expect(formatDuration(215)).toBe('3:35');
    expect(formatDuration(3600)).toBe('60:00');
  });
});

describe('local library search', () => {
  const tracks = [
    { title: 'Get Lucky', artist: 'Daft Punk', album: 'Random Access Memories' },
    { title: 'Harder, Better, Faster, Stronger', artist: 'Daft Punk', album: 'Discovery' },
    { title: 'Starboy', artist: 'The Weeknd', album: null }
  ];

  test('matches title, artist or album, case-insensitively', () => {
    expect(filterTracks(tracks, 'DAFT').length).toBe(2);
    expect(filterTracks(tracks, 'starboy').length).toBe(1);
    expect(filterTracks(tracks, 'discovery').length).toBe(1);
    expect(filterTracks(tracks, 'nonexistent').length).toBe(0);
  });

  test('empty query returns everything; missing album never matches', () => {
    expect(filterTracks(tracks, '  ')).toBe(tracks);
    expect(filterTracks(tracks, 'null').length).toBe(0);
  });
});
