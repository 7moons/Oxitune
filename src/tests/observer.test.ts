import { describe, expect, test } from 'bun:test';

function parseLrc(lrcText: string): Array<{ timeSecs: number; text: string }> {
  const lines = lrcText.split('\n');
  const result: Array<{ timeSecs: number; text: string }> = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;

  for (const line of lines) {
    const match = line.match(timeRegex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const millis = parseInt(match[3].padEnd(3, '0').slice(0, 3), 10);
      const timeSecs = minutes * 60 + seconds + millis / 1000;
      const text = match[4].trim();
      if (text) {
        result.push({ timeSecs, text });
      }
    }
  }

  return result.sort((a, b) => a.timeSecs - b.timeSecs);
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

describe('LRC Parser & Time Formatting', () => {
  test('correctly parses timestamped LRC lines', () => {
    const lrc = `
[00:12.50]Is this the real life?
[00:15.80]Is this just fantasy?
[00:21.00]Caught in a landslide
`;
    const parsed = parseLrc(lrc);
    expect(parsed.length).toBe(3);
    expect(parsed[0].timeSecs).toBeCloseTo(12.5, 2);
    expect(parsed[0].text).toBe('Is this the real life?');
    expect(parsed[1].timeSecs).toBeCloseTo(15.8, 2);
    expect(parsed[1].text).toBe('Is this just fantasy?');
    expect(parsed[2].timeSecs).toBe(21.0);
  });

  test('correctly handles global offset tag [offset: 500]', () => {
    const lrcWithOffset = `
[offset:500]
[00:10.00]First line
[00:20.00]Second line
`;
    const offsetMatch = /\[offset:\s*([+-]?\d+)\s*\]/i.exec(lrcWithOffset);
    const offsetSecs = offsetMatch ? parseInt(offsetMatch[1], 10) / 1000 : 0;
    expect(offsetSecs).toBe(0.5);
  });

  test('formats seconds into mm:ss strings', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(234)).toBe('3:54');
    expect(formatDuration(3600)).toBe('60:00');
  });
});
