import { describe, expect, test } from 'bun:test';
import { AMBIENT_THEME_CSS, BASE_THEME_CSS } from '../plugins/themes/presets';

describe('Visuals & Themes Suite', () => {
  test('both theme modes define non-trivial CSS', () => {
    expect(AMBIENT_THEME_CSS.length).toBeGreaterThan(10);
    expect(BASE_THEME_CSS.length).toBeGreaterThan(10);
  });

  test('the Ambient theme reads its accent from the per-track custom property, never a hardcoded hex', () => {
    expect(AMBIENT_THEME_CSS).toContain('var(--ytmd-accent');
    expect(AMBIENT_THEME_CSS).not.toMatch(/--ytmusic-call-to-action:\s*#[0-9a-fA-F]{3,6}/);
  });

  test('the Ambient theme makes nav bar, player bar and sidebar translucent glass, not opaque boxes', () => {
    expect(AMBIENT_THEME_CSS).toMatch(/ytmusic-nav-bar,\s*ytmusic-player-bar,\s*ytmusic-player-page\s*{[^}]*backdrop-filter:\s*blur/);
    expect(AMBIENT_THEME_CSS).toMatch(/ytmusic-guide-renderer\s*{[^}]*backdrop-filter:\s*blur/);
  });

  test('the Base theme is fully static — no per-track custom property, no backdrop blur', () => {
    expect(BASE_THEME_CSS).not.toContain('var(--ytmd-accent');
    expect(BASE_THEME_CSS).not.toContain('backdrop-filter');
    expect(BASE_THEME_CSS).toContain('#e8b06b');
  });

  test('both modes protect album artwork from background overrides', () => {
    expect(AMBIENT_THEME_CSS).toContain('yt-img-shadow');
    expect(BASE_THEME_CSS).toContain('yt-img-shadow');
  });
});
