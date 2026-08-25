import { describe, expect, test } from 'bun:test';

function getGainPolarityClass(gain: number): 'positive' | 'negative' | 'zero' {
  if (gain > 0) return 'positive';
  if (gain < 0) return 'negative';
  return 'zero';
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || 'U';
}

function formatCrossfade(secs: number): string {
  if (secs <= 0) return 'Disabled';
  return `${secs.toFixed(1)}s`;
}

function formatDb(db: number): string {
  const sign = db > 0 ? '+' : '';
  return `${sign}${db.toFixed(1)}`;
}

describe('UI Helpers & Formatter Suite', () => {
  test('classifies gain polarity accurately into positive, negative, or zero', () => {
    expect(getGainPolarityClass(4.5)).toBe('positive');
    expect(getGainPolarityClass(0.1)).toBe('positive');
    expect(getGainPolarityClass(-3.0)).toBe('negative');
    expect(getGainPolarityClass(-0.5)).toBe('negative');
    expect(getGainPolarityClass(0)).toBe('zero');
  });

  test('extracts clean 2-letter uppercase initials for user avatars', () => {
    expect(getInitials('Kacper')).toBe('KA');
    expect(getInitials('Kacper Kowalski')).toBe('KK');
    expect(getInitials('John Doe Extra')).toBe('JD');
    expect(getInitials('A')).toBe('A');
    expect(getInitials('')).toBe('U');
  });

  test('formats crossfade values and disabled state', () => {
    expect(formatCrossfade(0)).toBe('Disabled');
    expect(formatCrossfade(-1)).toBe('Disabled');
    expect(formatCrossfade(2.5)).toBe('2.5s');
    expect(formatCrossfade(10)).toBe('10.0s');
  });

  test('formats dB gains with explicit plus sign for positive values', () => {
    expect(formatDb(3.5)).toBe('+3.5');
    expect(formatDb(-4.0)).toBe('-4.0');
    expect(formatDb(0)).toBe('0.0');
  });
});
