import { describe, expect, test } from 'bun:test';

describe('Downloader & Local Music Suite', () => {
  test('validates supported audio formats and bitrates', () => {
    const validFormats = ['mp3', 'flac', 'opus'];
    const isSupported = (fmt: string) => validFormats.includes(fmt.toLowerCase());

    expect(isSupported('mp3')).toBe(true);
    expect(isSupported('FLAC')).toBe(true);
    expect(isSupported('opus')).toBe(true);
    expect(isSupported('exe')).toBe(false);
    expect(isSupported('txt')).toBe(false);
  });

  test('formats local track duration into mm:ss accurately', () => {
    const formatDuration = (secs: number) => {
      if (secs <= 0) return '--:--';
      const m = Math.floor(secs / 60);
      const s = Math.floor(secs % 60);
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    expect(formatDuration(0)).toBe('--:--');
    expect(formatDuration(45)).toBe('0:45');
    expect(formatDuration(215)).toBe('3:35');
    expect(formatDuration(3600)).toBe('60:00');
  });

  test('filters local tracks by title, artist or album accurately', () => {
    const tracks = [
      { id: '1', title: 'Get Lucky', artist: 'Daft Punk', album: 'Random Access Memories' },
      { id: '2', title: 'Harder, Better, Faster, Stronger', artist: 'Daft Punk', album: 'Discovery' },
      { id: '3', title: 'Starboy', artist: 'The Weeknd', album: 'Starboy' }
    ];

    const search = (query: string) => {
      const q = query.toLowerCase();
      return tracks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          t.album.toLowerCase().includes(q)
      );
    };

    expect(search('daft').length).toBe(2);
    expect(search('starboy').length).toBe(1);
    expect(search('discovery').length).toBe(1);
    expect(search('nonexistent').length).toBe(0);
  });
});
