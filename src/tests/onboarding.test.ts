import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';
import { applyChoices, moveStep, toggleValue, WELCOME_STEPS, WELCOME_TOGGLES } from '../ui/onboarding';
import { placeTip, shouldShowOnLoad, TIP_STEPS, visibleSteps } from '../preload/ui/tips';
import { pickLocale } from '../preload/ui/i18n';

const root = join(import.meta.dir, '..', '..');
const html = readFileSync(join(root, 'welcome.html'), 'utf8');

describe('welcome window', () => {
  test('every toggle in the page is a known choice, and every choice has a toggle', () => {
    const inPage = [...html.matchAll(/<input type="checkbox" id="([^"]+)"/g)].map((m) => m[1]).sort();
    expect(inPage).toEqual(WELCOME_TOGGLES.map(([f]) => f).sort());
  });

  test('every step has its section, in order', () => {
    const sections = [...html.matchAll(/data-step="([^"]+)"/g)].map((m) => m[1]);
    expect(sections).toEqual([...WELCOME_STEPS]);
  });

  test('a missing field shows what AppConfig::default() has', () => {
    const rust = readFileSync(join(root, 'src-tauri', 'src', 'config.rs'), 'utf8');
    const defaults = rust.slice(rust.indexOf('impl Default for AppConfig'));
    for (const [field, fallback] of WELCOME_TOGGLES) {
      const m = defaults.match(new RegExp(`\\b${field}: (true|false),`));
      expect(m?.[1], field).toBe(String(fallback));
      expect(toggleValue({}, field)).toBe(fallback);
    }
    expect(toggleValue({ remote_enabled: true }, 'remote_enabled')).toBe(true);
    expect(() => toggleValue({}, 'custom_css')).toThrow();
  });

  test('choices change only their own fields', () => {
    const config = { discord_rpc_enabled: true, equalizer_gains: [1, 2], local_music_dir: '/music', onboarding_done: false };
    const next = applyChoices(config, { discord_rpc_enabled: false, local_music_dir: true } as Record<string, boolean>);
    expect(next).toEqual({ discord_rpc_enabled: false, equalizer_gains: [1, 2], local_music_dir: '/music', onboarding_done: false });
    expect(config.discord_rpc_enabled).toBe(true);
  });

  test('steps stay inside the wizard', () => {
    expect(moveStep(0, -1)).toBe(0);
    expect(moveStep(0, 1)).toBe(1);
    expect(moveStep(WELCOME_STEPS.length - 1, 1)).toBe(WELCOME_STEPS.length - 1);
  });
});

describe('tips in YouTube Music', () => {
  test('on load only once the welcome window is done, and only once', () => {
    expect(shouldShowOnLoad({ onboarding_done: true }, false)).toBe(true);
    expect(shouldShowOnLoad({ onboarding_done: true }, true)).toBe(false);
    expect(shouldShowOnLoad({ onboarding_done: false }, false)).toBe(false);
    expect(shouldShowOnLoad({}, false)).toBe(false);
  });

  const viewport = { width: 1200, height: 800 };
  const tip = { width: 320, height: 140 };

  test('a tip sits under its anchor, centered, inside the window', () => {
    const pos = placeTip({ top: 10, left: 1100, width: 40, height: 40 }, tip, viewport);
    expect(pos.below).toBe(true);
    expect(pos.top).toBe(62);
    expect(pos.left).toBe(1200 - 320 - 12);
    expect(placeTip({ top: 10, left: 0, width: 40, height: 40 }, tip, viewport).left).toBe(12);
  });

  test('above the anchor when there is no room below (the player bar)', () => {
    const pos = placeTip({ top: 728, left: 0, width: 1200, height: 72 }, tip, viewport);
    expect(pos.below).toBe(false);
    expect(pos.top).toBe(728 - 140 - 12);
    expect(pos.left).toBe(440);
  });

  test('only anchors on screen get a tip', () => {
    const rect = (w: number) => ({ getBoundingClientRect: () => ({ width: w, height: w }) });
    const doc = {
      querySelector: (sel: string) => (sel === '#oxitune-menu-btn' ? rect(40) : sel === 'ytmusic-player-bar' ? rect(0) : null)
    } as unknown as Pick<Document, 'querySelector'>;
    const steps = visibleSteps(doc);
    expect(steps.length).toBe(2);
    expect(steps.every((s) => s.anchor === '#oxitune-menu-btn')).toBe(true);
    expect(visibleSteps({ querySelector: () => null } as unknown as Pick<Document, 'querySelector'>)).toEqual([]);
  });

  test('every tip names its words in every language', () => {
    // en/pl key parity is checked in ui_kit.test.ts; here, every word a tip uses.
    for (const lang of ['en', 'pl']) {
      const s = pickLocale(lang);
      for (const text of [s.tipMenuTitle, s.tipMenuBody, s.tipPlayerTitle, s.tipPlayerBody, s.tipShortcutsTitle, s.tipShortcutsBody, s.tipNext, s.tipDone, s.tipSkip]) {
        expect(text.length).toBeGreaterThan(0);
      }
    }
    expect(TIP_STEPS[0].anchor).toBe('#oxitune-menu-btn');
  });
});
