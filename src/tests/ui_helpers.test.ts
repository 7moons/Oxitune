import { describe, expect, test } from 'bun:test';
import { formatDb, formatCrossfade, formatDuration, getInitials, filterTracks } from '../ui/format';

describe('companion window formatters', () => {
  test('initials for member avatars', () => {
    expect(getInitials('Alex')).toBe('AL');
    expect(getInitials('Alex Kowalski')).toBe('AK');
    expect(getInitials('John Doe Extra')).toBe('JD');
    expect(getInitials('A')).toBe('A');
    expect(getInitials('')).toBe('U');
  });

  test('crossfade label', () => {
    expect(formatCrossfade(0, 'Off')).toBe('Off');
    expect(formatCrossfade(-1, 'Wył.')).toBe('Wył.');
    expect(formatCrossfade(2.5, 'Off')).toBe('2.5 s');
    expect(formatCrossfade(10, 'Off')).toBe('10.0 s');
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
    { title: 'Get Going', artist: 'Soft Circuit', album: 'Borrowed Summer Light' },
    { title: 'Wider, Brighter, Louder, Longer', artist: 'Soft Circuit', album: 'Open Water' },
    { title: 'Nightboy', artist: 'The Midweek', album: null }
  ];

  test('matches title, artist or album, case-insensitively', () => {
    expect(filterTracks(tracks, 'SOFT').length).toBe(2);
    expect(filterTracks(tracks, 'nightboy').length).toBe(1);
    expect(filterTracks(tracks, 'open water').length).toBe(1);
    expect(filterTracks(tracks, 'nonexistent').length).toBe(0);
  });

  test('empty query returns everything; missing album never matches', () => {
    expect(filterTracks(tracks, '  ')).toBe(tracks);
    expect(filterTracks(tracks, 'null').length).toBe(0);
  });
});
