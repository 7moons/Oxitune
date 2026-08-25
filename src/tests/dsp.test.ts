import { describe, expect, test } from 'bun:test';
import { EQ_FREQUENCIES, EQ_PRESETS, clampGain } from '../plugins/audio-dsp/presets';

describe('Audio DSP & Equalizer Suite', () => {
  test('defines exactly 10 standard audio frequency bands', () => {
    expect(EQ_FREQUENCIES.length).toBe(10);
    expect(EQ_FREQUENCIES[0]).toBe(32);
    expect(EQ_FREQUENCIES[9]).toBe(16000);
    // Ascending order check
    for (let i = 1; i < EQ_FREQUENCIES.length; i++) {
      expect(EQ_FREQUENCIES[i]).toBeGreaterThan(EQ_FREQUENCIES[i - 1]);
    }
  });

  test('all presets have exactly 10 valid clamped gains', () => {
    const presetKeys = Object.keys(EQ_PRESETS);
    expect(presetKeys.length).toBeGreaterThanOrEqual(8);

    for (const key of presetKeys) {
      const preset = EQ_PRESETS[key];
      expect(preset.gains.length).toBe(10);
      for (const gain of preset.gains) {
        expect(gain).toBeGreaterThanOrEqual(-12);
        expect(gain).toBeLessThanOrEqual(12);
      }
      if (preset.preamp !== undefined) {
        expect(preset.preamp).toBeGreaterThanOrEqual(-12);
        expect(preset.preamp).toBeLessThanOrEqual(12);
      }
    }
  });

  test('clampGain restricts values strictly between -12dB and +12dB', () => {
    expect(clampGain(0)).toBe(0);
    expect(clampGain(5.5)).toBe(5.5);
    expect(clampGain(-12)).toBe(-12);
    expect(clampGain(12)).toBe(12);
    expect(clampGain(24)).toBe(12);
    expect(clampGain(-50)).toBe(-12);
  });

  test('linear gain math converts dB correctly', () => {
    const dbToLinear = (db: number) => Math.pow(10, db / 20);
    expect(dbToLinear(0)).toBeCloseTo(1.0, 5);
    expect(dbToLinear(6)).toBeCloseTo(1.99526, 4);
    expect(dbToLinear(-6)).toBeCloseTo(0.50118, 4);
  });
});
