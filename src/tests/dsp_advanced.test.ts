import { describe, expect, test } from 'bun:test';

describe('Advanced DSP: Crossfade, Skip Silence & Speed/Pitch', () => {
  test('crossfade timing clamps between 0s and 12s', () => {
    const clampCrossfade = (secs: number) => Math.max(0, Math.min(12, secs));
    expect(clampCrossfade(0)).toBe(0);
    expect(clampCrossfade(5.5)).toBe(5.5);
    expect(clampCrossfade(12)).toBe(12);
    expect(clampCrossfade(25)).toBe(12);
    expect(clampCrossfade(-5)).toBe(0);
  });

  test('calculates crossfade trigger boundary correctly', () => {
    const duration = 210; // 3:30 song
    const crossfadeSecs = 5.0;

    const isCrossfadeTriggered = (current: number) => {
      const remaining = duration - current;
      return remaining <= crossfadeSecs && remaining > 0;
    };

    expect(isCrossfadeTriggered(100)).toBe(false);
    expect(isCrossfadeTriggered(200)).toBe(false);
    expect(isCrossfadeTriggered(205)).toBe(true);
    expect(isCrossfadeTriggered(208.5)).toBe(true);
  });

  test('RMS audio power dB calculation handles silence and full scale', () => {
    const computeDb = (rms: number) => {
      if (rms <= 0.00001) return -100;
      return 20 * Math.log10(rms);
    };

    expect(computeDb(0)).toBe(-100);
    expect(computeDb(1.0)).toBeCloseTo(0, 5); // 0 dB (full scale)
    expect(computeDb(0.1)).toBeCloseTo(-20, 5); // -20 dB
    expect(computeDb(0.001)).toBeCloseTo(-60, 5); // -60 dB (detected as silence under -50dB)
  });

  test('playback speed clamps strictly between 0.5x and 2.0x', () => {
    const clampSpeed = (rate: number) => Math.max(0.5, Math.min(2.0, rate));
    expect(clampSpeed(1.0)).toBe(1.0);
    expect(clampSpeed(0.25)).toBe(0.5);
    expect(clampSpeed(4.0)).toBe(2.0);
    expect(clampSpeed(1.25)).toBe(1.25);
  });
});
