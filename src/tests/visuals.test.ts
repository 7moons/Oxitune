import { describe, expect, test } from 'bun:test';
import { THEME_PRESETS } from '../plugins/themes/presets';

describe('Visuals & Themes Suite', () => {
  test('defines curated theme presets with valid CSS', () => {
    const presetKeys = Object.keys(THEME_PRESETS);
    expect(presetKeys.length).toBeGreaterThanOrEqual(7);

    expect(THEME_PRESETS.default).toBeDefined();
    expect(THEME_PRESETS.oled).toBeDefined();
    expect(THEME_PRESETS.nord).toBeDefined();
    expect(THEME_PRESETS.catppuccin).toBeDefined();
    expect(THEME_PRESETS.gruvbox).toBeDefined();
    expect(THEME_PRESETS.tokyo_night).toBeDefined();
    expect(THEME_PRESETS.dracula).toBeDefined();
    expect(THEME_PRESETS.rose_pine).toBeDefined();

    for (const key of presetKeys) {
      const preset = THEME_PRESETS[key];
      expect(preset.id).toBe(key);
      expect(preset.name.length).toBeGreaterThan(0);
      expect(preset.css.length).toBeGreaterThan(10);
    }
  });

  test('OLED preset contains pure black #000000 background', () => {
    expect(THEME_PRESETS.oled.css).toContain('#000000');
  });

  test('Nord preset contains signature polar night and frost colors', () => {
    expect(THEME_PRESETS.nord.css).toContain('#2e3440');
    expect(THEME_PRESETS.nord.css).toContain('#88c0d0');
  });

  test('Catppuccin Mocha contains mauve and base colors', () => {
    expect(THEME_PRESETS.catppuccin.css).toContain('#1e1e2e');
    expect(THEME_PRESETS.catppuccin.css).toContain('#cba6f7');
  });
});
