import { describe, expect, test } from 'bun:test';
import { rgbToHex } from '../plugins/ambient/color';

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
