import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_PREFS, carriedPosition, lyricsStamp, readPrefs } from '../plugins/lyrics';
import { LYRICS_THEMES, activeGapIndex, litDots, plainLineAt, toTheme } from '../plugins/lyrics/view';
import { formatClock, isFullscreenKey, isTypingTarget, seekTarget } from '../plugins/lyrics/fullscreen';
import { LYRICS_CSS } from '../plugins/lyrics/styles';
import {
  LyricsLine,
  MIN_GAP_SECS,
  estimateWords,
  findGaps,
  lineEnd,
  shownLines,
  toCurrentLyrics,
  toLineTexts,
  wordProgress
} from '../types/lyrics';

const words = [
  { t: 10, text: 'One ', end: 10.5 },
  { t: 11, text: 'two ' },
  { t: 12, text: 'three' }
];

describe('wordProgress', () => {
  test('a word fills from its start to its stated end', () => {
    expect(wordProgress(words, 0, 9.9)).toBe(0);
    expect(wordProgress(words, 0, 10)).toBe(0);
    expect(wordProgress(words, 0, 10.25)).toBeCloseTo(0.5);
    expect(wordProgress(words, 0, 10.5)).toBe(1);
    expect(wordProgress(words, 0, 99)).toBe(1);
  });

  test('without an end it lasts until the next word', () => {
    expect(wordProgress(words, 1, 11.5)).toBeCloseTo(0.5);
    expect(wordProgress(words, 1, 12)).toBe(1);
  });

  test('the last word lasts until the line ends, never forever', () => {
    expect(wordProgress(words, 2, 12.75, 13.5)).toBeCloseTo(0.5);
    expect(wordProgress(words, 2, 13.5, 13.5)).toBe(1);
    // A line that runs for a minute doesn't stretch its last word over it.
    expect(wordProgress(words, 2, 14, 72)).toBe(1);
    expect(wordProgress(words, 2, 12.9)).toBeCloseTo(0.5);
  });

  test('a broken end time never divides by zero', () => {
    const broken = [{ t: 5, text: 'x', end: 5 }, { t: 5, text: 'y' }];
    expect(wordProgress(broken, 0, 5.01)).toBeGreaterThan(0);
    expect(wordProgress(broken, 0, 6)).toBe(1);
    expect(wordProgress(broken, 7, 6)).toBe(0);
  });
});

// Lines timed only as a whole (LRCLIB) used to just turn white: no fill.
describe('estimated words for a line timed as a whole', () => {
  test('the words share the time until the next line by their length', () => {
    const words = estimateWords('One three  go', 10, 11);
    expect(words.map((w) => w.text)).toEqual(['One ', 'three  ', 'go']);
    expect(words.map((w) => w.text).join('')).toBe('One three  go');
    expect(words[0].t).toBe(10);
    // 3 + 5 + 2 characters over 92% of the second the line has.
    expect(words[0].end).toBeCloseTo(10 + 0.92 * 0.3);
    expect(words[1].t).toBe(words[0].end as number);
    expect(words[2].end).toBeCloseTo(10.92);
    expect(wordProgress(words, 1, (words[1].t + (words[1].end as number)) / 2)).toBeCloseTo(0.5);
  });

  test('a line before a long pause is not crawled through', () => {
    const words = estimateWords('Twelve chars', 10, 70);
    expect(words.at(-1)?.end).toBeCloseTo(11.5);
    const long = estimateWords('x'.repeat(40), 10, 70);
    expect(long.at(-1)?.end).toBeCloseTo(10 + 40 * 0.11);
  });

  test('text without spaces is one word; nothing to time is no words', () => {
    expect(estimateWords('\u6B4C\u8A5E\u306E\u4E00\u884C', 5, 8)).toHaveLength(1);
    expect(estimateWords('   ', 5, 8)).toEqual([]);
    expect(estimateWords('late', 8, 8)).toEqual([]);
  });
});

describe('lineEnd', () => {
  const lines: LyricsLine[] = [
    { t: 5, text: 'a', end: 8 },
    { t: 10, text: 'b' },
    { t: 20, text: 'c', end: 40 },
    { t: 30, text: 'd' }
  ];
  test('its own end, else the next line, else a few seconds', () => {
    expect(lineEnd(lines, 0)).toBe(8);
    expect(lineEnd(lines, 1)).toBe(20);
    expect(lineEnd(lines, 3)).toBe(36);
  });
  test('a line never outlasts the start of the next one', () => {
    expect(lineEnd(lines, 2)).toBe(30);
  });
});

describe('interludes', () => {
  const lines: LyricsLine[] = [
    { t: 18, text: 'a', end: 22 },
    { t: 23, text: 'b', end: 26 },
    { t: 60, text: 'c' },
    { t: 120, text: 'd' }
  ];
  const gaps = findGaps(lines);

  test('the intro and pauses after a stated end; a line without an end has none', () => {
    expect(gaps).toEqual([
      { before: 0, from: 0, to: 18 },
      { before: 2, from: 26, to: 60 }
    ]);
    expect(findGaps([{ t: MIN_GAP_SECS - 1, text: 'soon' }])).toEqual([]);
    expect(findGaps([])).toEqual([]);
  });

  test('which one is on, and its dots', () => {
    expect(activeGapIndex(gaps, 5)).toBe(0);
    expect(activeGapIndex(gaps, 18)).toBe(-1);
    expect(activeGapIndex(gaps, 40)).toBe(1);
    expect(activeGapIndex(gaps, 61)).toBe(-1);
    expect(litDots(gaps[0], 0)).toBe(1);
    expect(litDots(gaps[0], 7)).toBe(2);
    expect(litDots(gaps[0], 17.9)).toBe(3);
    expect(litDots(gaps[0], 500)).toBe(3);
  });
});

describe('plain lyrics follow the song', () => {
  test('the line to show for how far the song is', () => {
    expect(plainLineAt(40, 0)).toBe(0);
    expect(plainLineAt(40, 0.5)).toBe(20);
    expect(plainLineAt(40, 1)).toBe(39);
    expect(plainLineAt(40, 7)).toBe(39);
    expect(plainLineAt(0, 0.5)).toBe(-1);
    expect(plainLineAt(40, Number.NaN)).toBe(-1);
  });
});

describe('the richer payload', () => {
  test('ends, the second voice and background vocals survive parsing', () => {
    const p = toCurrentLyrics({
      video_id: 'v',
      provider: 'lrcred',
      synced: [
        {
          t: 1,
          text: 'Hello there',
          end: 3,
          alt: true,
          words: [{ t: 1, text: 'Hello ', end: 2 }, { t: 2, text: 'there' }, { t: 'x', text: 'bad' }],
          bg: { text: '(ooh)', words: [{ t: 2.5, text: '(ooh)', end: 3 }] }
        },
        { t: 4, text: 'Plain', end: 'soon', alt: 'yes', bg: { text: '  ' }, words: [] }
      ],
      plain: null,
      offset_secs: 0,
      source_url: null
    });
    expect(p.synced[0]).toEqual({
      t: 1,
      text: 'Hello there',
      end: 3,
      alt: true,
      words: [{ t: 1, text: 'Hello ', end: 2 }, { t: 2, text: 'there' }],
      bg: { text: '(ooh)', words: [{ t: 2.5, text: '(ooh)', end: 3 }] }
    });
    expect(p.synced[1]).toEqual({ t: 4, text: 'Plain' });
  });

  test('shown lines are what translations are indexed by', () => {
    expect(shownLines({ synced: [{ t: 1, text: 'a' }], plain: 'x\ny' })).toEqual(['a']);
    expect(shownLines({ synced: [], plain: 'one\n\ntwo' })).toEqual(['one', '', 'two']);
    expect(shownLines({ synced: [], plain: null })).toEqual([]);
  });

  test('a translation reply is taken line by line, junk becomes none', () => {
    expect(toLineTexts({ video_id: 'v', lines: ['Cześć', null, '  ', 3] })).toEqual({ video_id: 'v', lines: ['Cześć', null, null, null] });
    expect(toLineTexts(null)).toEqual({ video_id: null, lines: [] });
    expect(toLineTexts({ lines: 'no' }).lines).toEqual([]);
  });
});

describe('lyrics settings on the page', () => {
  test('the whole config at start', () => {
    expect(
      readPrefs({
        lyrics_translate_enabled: true,
        lyrics_translate_lang: 'pl',
        lyrics_romanize_enabled: true,
        lyrics_auto_open: true,
        lyrics_effects: false,
        lyrics_theme: 'karaoke'
      })
    ).toEqual({ translate: true, lang: 'pl', romanize: true, autoOpen: true, effects: false, theme: 'karaoke' });
    expect(readPrefs({})).toEqual(DEFAULT_PREFS);
  });

  test('an update carrying only some fields keeps the rest', () => {
    const before = { translate: true, lang: 'pl', romanize: false, autoOpen: true, effects: false, theme: 'compact' as const };
    expect(readPrefs({ lyrics_romanize_enabled: true }, before)).toEqual({ ...before, romanize: true });
    expect(readPrefs({ custom_css: 'a{}' }, before)).toEqual(before);
  });

  test('a language the backend would refuse is not taken', () => {
    for (const bad of ['', 'english', 'en&tl=x', 5, null]) {
      expect(readPrefs({ lyrics_translate_lang: bad }).lang).toBe('en');
    }
    expect(readPrefs({ lyrics_translate_lang: 'zh-CN' }).lang).toBe('zh-CN');
  });

  test('a translation is tied to the lyrics it was made for', () => {
    const lyrics = { video_id: 'v', provider: 'lrclib', synced: [{ t: 1, text: 'a' }], plain: null };
    const stamp = lyricsStamp(lyrics, 'v|song');
    expect(lyricsStamp(lyrics, 'v|song')).toBe(stamp);
    expect(lyricsStamp({ ...lyrics, provider: 'genius' }, 'v|song')).not.toBe(stamp);
    expect(lyricsStamp({ ...lyrics, synced: [] }, 'v|song')).not.toBe(stamp);
    expect(lyricsStamp(lyrics, 'w|other')).not.toBe(stamp);
  });
});

describe('position between ticks', () => {
  test('follows the video clock, so a tick never snaps the fill', () => {
    // 0.1 s of song since the tick, whatever the wall clock says.
    expect(carriedPosition(30, 100.1, 100, 140, 1)).toBeCloseTo(30.1);
    expect(carriedPosition(30, 100.1, 100, 60, 1.5)).toBeCloseTo(30.1);
    expect(carriedPosition(30, 100, 100, 500, 1)).toBe(30);
  });

  test('a clock that jumped (seek, other video) falls back to the wall clock, capped', () => {
    expect(carriedPosition(30, 20, 100, 200, 1)).toBeCloseTo(30.2);
    expect(carriedPosition(30, 160, 100, 200, 2)).toBeCloseTo(30.4);
    expect(carriedPosition(30, Number.NaN, 100, 9000, 1)).toBe(31);
    expect(carriedPosition(30, 100, Number.NaN, -50, 1)).toBe(30);
  });
});

describe('lyrics looks', () => {
  const root = join(import.meta.dir, '..', '..');
  test('the same ids in the backend, the stylesheet and Settings', () => {
    const rust = readFileSync(join(root, 'src-tauri/src/config.rs'), 'utf8');
    const listed = /LYRICS_THEMES: \[&str; \d+\] = \[([^\]]+)\]/.exec(rust)?.[1].match(/[a-z]+/g);
    expect(listed).toEqual([...LYRICS_THEMES]);
    const html = readFileSync(join(root, 'settings.html'), 'utf8');
    const select = /<select id="lyrics_theme"[\s\S]*?<\/select>/.exec(html)?.[0] ?? '';
    expect([...select.matchAll(/value="([a-z]+)"/g)].map((m) => m[1])).toEqual([...LYRICS_THEMES]);
    for (const theme of LYRICS_THEMES.filter((id) => id !== 'classic')) {
      expect(LYRICS_CSS).toContain(`[data-theme="${theme}"]`);
    }
  });

  test('an unknown look is the classic one', () => {
    expect(toTheme('karaoke')).toBe('karaoke');
    expect(toTheme('neon')).toBe('classic');
    expect(toTheme(undefined)).toBe('classic');
    expect(readPrefs({ lyrics_theme: 'nope' }).theme).toBe('classic');
  });

  // Each finished syllable blinked: its color animated from transparent
  // while the gradient that had been painting it was already gone.
  test('a word is painted one way only, with no transition', () => {
    const wordRules = LYRICS_CSS.split('}').filter((rule) => (rule.split('{')[0] ?? '').includes('.oxitune-lyric-word'));
    expect(wordRules).toHaveLength(1);
    expect(wordRules[0]).toContain('var(--oxitune-fill, 0)');
    expect(wordRules[0].split('{')[1]).not.toContain('transition');
    expect(LYRICS_CSS).not.toContain('oxitune-sung');
  });
});

describe('fullscreen takeover', () => {
  const key = (over: Partial<KeyboardEvent>) => ({ key: 'f', ctrlKey: false, altKey: false, metaKey: false, shiftKey: false, repeat: false, ...over });
  test('a bare F is the fullscreen shortcut', () => {
    expect(isFullscreenKey(key({}))).toBe(true);
    expect(isFullscreenKey(key({ key: 'F' }))).toBe(true);
    for (const other of [{ ctrlKey: true }, { altKey: true }, { metaKey: true }, { shiftKey: true }, { repeat: true }, { key: 'g' }]) {
      expect(isFullscreenKey(key(other))).toBe(false);
    }
  });

  test('typing an F in the search box is not the shortcut', () => {
    expect(isTypingTarget({ tagName: 'INPUT' })).toBe(true);
    expect(isTypingTarget({ tagName: 'textarea' })).toBe(true);
    expect(isTypingTarget({ tagName: 'DIV', isContentEditable: true })).toBe(true);
    expect(isTypingTarget({ tagName: 'DIV' })).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});

describe('fullscreen player', () => {
  test('clock', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(65.9)).toBe('1:05');
    expect(formatClock(3725)).toBe('1:02:05');
    expect(formatClock(Number.NaN)).toBe('0:00');
    expect(formatClock(-4)).toBe('0:00');
  });

  test('a click on the bar seeks within the song', () => {
    expect(seekTarget(150, 100, 200, 240)).toBe(60);
    expect(seekTarget(50, 100, 200, 240)).toBe(0);
    expect(seekTarget(900, 100, 200, 240)).toBe(240);
    expect(seekTarget(150, 100, 0, 240)).toBeNull();
    expect(seekTarget(150, 100, 200, 0)).toBeNull();
  });
});

describe('lyrics stylesheet', () => {
  // WebKitGTK repaints a live blur on a full-window layer every frame; the
  // fullscreen backdrop is a pre-blurred bitmap instead.
  test('no live blur or backdrop-filter on the fullscreen layers', () => {
    const fullscreenRules = LYRICS_CSS.split('}').filter((rule) => /#oxitune-lyrics-fs|\.oxitune-fs-/.test(rule.split('{')[0] ?? ''));
    expect(fullscreenRules.length).toBeGreaterThan(5);
    for (const rule of fullscreenRules) {
      expect(rule).not.toMatch(/backdrop-filter|filter:\s*blur/);
    }
  });

  test('the per-line blur is only on when effects are', () => {
    for (const rule of LYRICS_CSS.split('}').filter((r) => /filter:\s*blur/.test(r))) {
      expect(rule.split('{')[0]).toContain('.oxitune-lyrics-effects');
    }
  });
});
