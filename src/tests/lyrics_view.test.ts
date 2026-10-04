import { describe, expect, test } from 'bun:test';
import { DEFAULT_PREFS, lyricsStamp, readPrefs } from '../plugins/lyrics';
import { activeGapIndex, litDots, plainLineAt } from '../plugins/lyrics/view';
import { formatClock, seekTarget } from '../plugins/lyrics/fullscreen';
import { LYRICS_CSS } from '../plugins/lyrics/styles';
import {
  LyricsLine,
  MIN_GAP_SECS,
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
        lyrics_effects: false
      })
    ).toEqual({ translate: true, lang: 'pl', romanize: true, autoOpen: true, effects: false });
    expect(readPrefs({})).toEqual(DEFAULT_PREFS);
  });

  test('an update carrying only some fields keeps the rest', () => {
    const before = { translate: true, lang: 'pl', romanize: false, autoOpen: true, effects: false };
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
  // fullscreen backdrop is a pre-blurred bitmap instead (see CLAUDE.md).
  test('no live blur or backdrop-filter on the fullscreen layers', () => {
    const fullscreenRules = LYRICS_CSS.split('}').filter((rule) => /#ytmd-lyrics-fs|\.ytmd-fs-/.test(rule.split('{')[0] ?? ''));
    expect(fullscreenRules.length).toBeGreaterThan(5);
    for (const rule of fullscreenRules) {
      expect(rule).not.toMatch(/backdrop-filter|filter:\s*blur/);
    }
  });

  test('the per-line blur is only on when effects are', () => {
    for (const rule of LYRICS_CSS.split('}').filter((r) => /filter:\s*blur/.test(r))) {
      expect(rule.split('{')[0]).toContain('.ytmd-lyrics-effects');
    }
  });
});
