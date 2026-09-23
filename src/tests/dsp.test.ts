import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';
import { EQ_FREQUENCIES, EQ_MAX_DB, EQ_PRESETS, clampGain } from '../plugins/audio-dsp/presets';

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

  test('clampGain allows the full ±24 dB range and nothing beyond', () => {
    expect(EQ_MAX_DB).toBe(24);
    expect(clampGain(0)).toBe(0);
    expect(clampGain(5.5)).toBe(5.5);
    expect(clampGain(-18)).toBe(-18);
    expect(clampGain(24)).toBe(24);
    expect(clampGain(-24)).toBe(-24);
    expect(clampGain(30)).toBe(24);
    expect(clampGain(-50)).toBe(-24);
  });

  test('settings sliders offer the same range the engine accepts', () => {
    const html = readFileSync(join(import.meta.dir, '..', '..', 'settings.html'), 'utf8');
    const preamp = html.match(/id="preamp_gain" min="(-?\d+)" max="(-?\d+)"/);
    expect(preamp).not.toBeNull();
    expect(Number(preamp![1])).toBe(-EQ_MAX_DB);
    expect(Number(preamp![2])).toBe(EQ_MAX_DB);
    const settingsTs = readFileSync(join(import.meta.dir, '..', 'ui', 'settings.ts'), 'utf8');
    expect(settingsTs).toContain('slider.min = String(-EQ_MAX_DB)');
    expect(settingsTs).toContain('slider.max = String(EQ_MAX_DB)');
  });

  test('linear gain math converts dB correctly', () => {
    const dbToLinear = (db: number) => Math.pow(10, db / 20);
    expect(dbToLinear(0)).toBeCloseTo(1.0, 5);
    expect(dbToLinear(6)).toBeCloseTo(1.99526, 4);
    expect(dbToLinear(-6)).toBeCloseTo(0.50118, 4);
  });
});
