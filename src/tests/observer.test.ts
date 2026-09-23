import { describe, expect, test } from 'bun:test';
import { parseTimeStrToSecs, shouldFallbackTick, FALLBACK_TICK_AFTER_MS } from '../preload/observer';

describe('parseTimeStrToSecs (player bar "0:15 / 3:45" parts)', () => {
  test('m:ss and h:mm:ss', () => {
    expect(parseTimeStrToSecs('0:15')).toBe(15);
    expect(parseTimeStrToSecs(' 3:45 ')).toBe(225);
    expect(parseTimeStrToSecs('1:02:03')).toBe(3723);
  });

  test('garbage and unsupported shapes are 0, never NaN', () => {
    expect(parseTimeStrToSecs('')).toBe(0);
    expect(parseTimeStrToSecs('live')).toBe(0);
    expect(parseTimeStrToSecs('42')).toBe(0);
  });
});

describe('shouldFallbackTick', () => {
  test('no fallback tick while timeupdate is flowing (~250ms apart)', () => {
    expect(shouldFallbackTick(10_250, 10_000)).toBe(false);
  });
  test('fallback tick once timeupdate has gone quiet', () => {
    expect(shouldFallbackTick(10_000 + FALLBACK_TICK_AFTER_MS, 10_000)).toBe(true);
    expect(shouldFallbackTick(5_000, 0)).toBe(true);
  });
});
