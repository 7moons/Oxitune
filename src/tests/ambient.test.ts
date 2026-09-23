import { describe, expect, test } from 'bun:test';
import { rgbToHex, boxBlurRGBA, gradeRGBA } from '../plugins/ambient/color';

describe('Ambient Lighting: rgbToHex', () => {
  test('converts RGB triples to 6-digit hex matching the fallback palette format', () => {
    expect(rgbToHex(220, 38, 38)).toBe('#dc2626');
    expect(rgbToHex(0, 0, 0)).toBe('#000000');
    expect(rgbToHex(255, 255, 255)).toBe('#ffffff');
  });

  test('clamps out-of-range channel values instead of producing invalid hex', () => {
    // The accent color is computed as primary + 30 per channel, which can
    // overflow 255 — the old rgb()-string implementation relied on
    // Math.min(255, ...) at the call site; the hex helper must be safe on
    // its own regardless of what the caller passes in.
    expect(rgbToHex(300, -10, 128)).toBe('#ff0080');
  });

  test('output is a valid CSS hex color that a two-digit alpha suffix can attach to', () => {
    // This is the actual bug: appending an alpha suffix to `rgb(r, g, b)`
    // produces an invalid CSS color the browser silently drops. Hex must be
    // exactly 6 digits (7 chars including '#') so `${color}66` is valid
    // #RRGGBBAA.
    const hex = rgbToHex(24, 24, 27);
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    expect(`${hex}66`).toMatch(/^#[0-9a-f]{8}$/);
  });
});

describe('Ambient Lighting: pre-blurred wash', () => {
  const px = (w: number, h: number, fill: (x: number, y: number) => [number, number, number]) => {
    const d = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const [r, g, b] = fill(x, y);
        d.set([r, g, b, 255], (y * w + x) * 4);
      }
    return d;
  };

  test('box blur softens a hard edge and preserves flat regions', () => {
    const d = px(8, 1, (x) => (x < 4 ? [0, 0, 0] : [240, 240, 240]));
    boxBlurRGBA(d, 8, 1, 1);
    expect(d[0]).toBe(0);
    expect(d[7 * 4]).toBe(240);
    expect(d[3 * 4]).toBeGreaterThan(0);
    expect(d[4 * 4]).toBeLessThan(240);
    expect(d[3]).toBe(255); // alpha untouched on opaque input
  });

  test('blurs vertically too', () => {
    const d = px(1, 6, (_x, y) => (y < 3 ? [0, 0, 0] : [90, 90, 90]));
    boxBlurRGBA(d, 1, 6, 1);
    expect(d[2 * 4]).toBe(30);
    expect(d[3 * 4]).toBe(60);
  });

  test('grade keeps grey grey and scales brightness', () => {
    const d = px(1, 1, () => [200, 200, 200]);
    gradeRGBA(d, 1.65, 0.5);
    expect([d[0], d[1], d[2]]).toEqual([100, 100, 100]);
  });

  test('grade increases saturation', () => {
    const d = px(1, 1, () => [200, 100, 100]);
    gradeRGBA(d, 1.65, 1);
    expect(d[0] - d[1]).toBeGreaterThan(100);
  });
});
