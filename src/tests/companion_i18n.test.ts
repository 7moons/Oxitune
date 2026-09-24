import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';
import { COMPANION_LOCALES, formatMessage, resolveCompanionLocale, setCompanionLocale, tr } from '../ui/i18n';
import { rangeFillPercent } from '../ui/range';
import { estimatePosition } from '../ui/format';

const root = join(import.meta.dir, '..', '..');
const PAGES = ['settings.html', 'sync.html', 'local.html', 'miniplayer.html'];

describe('companion window translations', () => {
  test('every data-i18n key in the HTML exists in every locale', () => {
    const missing: string[] = [];
    for (const page of PAGES) {
      const html = readFileSync(join(root, page), 'utf8');
      for (const m of html.matchAll(/data-i18n(?:-label|-placeholder)?="([^"]+)"/g)) {
        for (const [lang, dict] of Object.entries(COMPANION_LOCALES)) {
          if (!(m[1] in dict)) missing.push(`${page}: ${m[1]} (${lang})`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  test('no user-facing English left untagged in the markup', () => {
    // Visible text nodes must come from data-i18n; brand names and numeric
    // chip labels are the only literals allowed.
    const allowed = new Set(['#', 'Oscilla', 'OSC-', 'YouTube Music', '0:00', '/', '—', '60%', '0.0 dB', 'Off', '1.00×', '0.8×', '1.25×', '1.5×', 'YTMD-']);
    const offenders: string[] = [];
    for (const page of PAGES) {
      const html = readFileSync(join(root, page), 'utf8').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/g, '');
      for (const m of html.matchAll(/<([a-z0-9]+)([^>]*)>([^<]+)</g)) {
        const text = m[3].trim();
        if (!text || allowed.has(text) || m[2].includes('data-i18n=')) continue;
        offenders.push(`${page}: <${m[1]}> "${text}"`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('placeholders are filled; unknown ones are left visible', () => {
    expect(formatMessage('{a} of {b}', { a: 1, b: 2 })).toBe('1 of 2');
    expect(formatMessage('Hi {name}', {})).toBe('Hi {name}');
  });

  test('locale resolution falls back to English', () => {
    expect(resolveCompanionLocale('pl-PL')).toBe('pl');
    expect(resolveCompanionLocale('de')).toBe('en');
    expect(resolveCompanionLocale(undefined)).toBe('en');
  });

  test('tr follows the active locale', () => {
    setCompanionLocale('pl');
    expect(tr('sync.leave')).toBe('Opuść sesję');
    expect(tr('local.countFiltered', { shown: 2, total: 9 })).toBe('2 z 9 utworów');
    setCompanionLocale('en');
    expect(tr('sync.leave')).toBe('Leave session');
  });
});

describe('YTM-style slider fill', () => {
  test('maps value into 0–100%', () => {
    expect(rangeFillPercent(0, -12, 12)).toBe(50);
    expect(rangeFillPercent(-12, -12, 12)).toBe(0);
    expect(rangeFillPercent(20, 0, 10)).toBe(100);
    expect(rangeFillPercent(5, 10, 10)).toBe(0);
    expect(rangeFillPercent(NaN, 0, 1)).toBe(0);
  });
});

describe('mini player progress between reports', () => {
  const track = { title: 't', artist: 'a', duration_secs: 200, current_time_secs: 50, is_playing: true };
  test('advances while playing', () => {
    expect(estimatePosition(track, 1_000, 3_500)).toBeCloseTo(52.5, 3);
  });
  test('holds still while paused', () => {
    expect(estimatePosition({ ...track, is_playing: false }, 1_000, 60_000)).toBe(50);
  });
  test('never runs past the end', () => {
    expect(estimatePosition(track, 0, 10_000_000)).toBe(200);
  });
});
