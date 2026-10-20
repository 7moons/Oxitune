/**
 * The `lyrics-changed` / `get_current_lyrics` payload (schemas/lyrics_v1.json)
 * and the timing helpers every lyrics view shares.
 */

export interface LyricsWord {
  /** Seconds from the start of the song. */
  t: number;
  text: string;
  /** When the word stops being sung, when the provider says. */
  end?: number;
}

export interface LyricsLine {
  /** Seconds from the start of the song. */
  t: number;
  text: string;
  words?: LyricsWord[];
  /** When the line stops being sung, when the provider says. */
  end?: number;
  /** Sung by the song's second voice (a duet): shown on the other side. */
  alt?: boolean;
  /** Background vocals sung under the line. */
  bg?: { text: string; words?: LyricsWord[] };
}

/** `translate_lyrics` / `romanize_lyrics`: one text per shown line. */
export interface LineTexts {
  video_id: string | null;
  lines: (string | null)[];
}

export interface CurrentLyrics {
  video_id: string | null;
  provider: string | null;
  synced: LyricsLine[];
  plain: string | null;
  /** Positive = lyrics run ahead: a line is active once `position + offset_secs >= t`. */
  offset_secs: number;
  source_url: string | null;
}

/** A "Wrong lyrics?" choice from `list_lyrics_candidates`. */
export interface LyricsCandidate {
  provider: string;
  id: string;
  title: string;
  artist: string;
  synced: boolean;
  preview: string;
  selected: boolean;
}

export const EMPTY_LYRICS: CurrentLyrics = {
  video_id: null,
  provider: null,
  synced: [],
  plain: null,
  offset_secs: 0,
  source_url: null
};

/** Index of the last item whose `t` has been reached at `time`, or -1. */
function lastReached(items: { t: number }[], time: number): number {
  let lo = 0;
  let hi = items.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (items[mid].t <= time) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

/** The line being sung at `positionSecs`, or -1 before the first line. */
export function activeLineIndex(lines: LyricsLine[], positionSecs: number, offsetSecs: number): number {
  return lastReached(lines, positionSecs + offsetSecs);
}

/** The word being sung in `line`, or -1 before its first word / without words. */
export function activeWordIndex(line: LyricsLine | undefined, positionSecs: number, offsetSecs: number): number {
  return line?.words ? lastReached(line.words, positionSecs + offsetSecs) : -1;
}

/** The lines every view shows, in order: the timed lines, else the plain
 * text line by line (mirrors `shown_lines` in lyrics/commands.rs, which
 * translations are indexed by). */
export function shownLines(lyrics: Pick<CurrentLyrics, 'synced' | 'plain'>): string[] {
  if (lyrics.synced.length > 0) return lyrics.synced.map((l) => l.text);
  return lyrics.plain ? lyrics.plain.split('\n') : [];
}

/** A word is taken to last this long when nothing says when it ends. */
const DEFAULT_WORD_SECS = 0.6;
/** A line with no stated end and no next line is taken to last this long. */
const DEFAULT_LAST_LINE_SECS = 6;

/** When line `i` stops being sung: its own end, else the next line's start. */
export function lineEnd(lines: LyricsLine[], i: number): number {
  const line = lines[i];
  const next = lines[i + 1]?.t;
  if (typeof line.end === 'number' && line.end >= line.t) return next === undefined ? line.end : Math.min(line.end, Math.max(next, line.t));
  return next ?? line.t + DEFAULT_LAST_LINE_SECS;
}

/** How far through word `i` the song is at `time` (song time, offset
 * already added), 0..1: its own end when known, else the next word's start,
 * else `lineEndSecs`. */
export function wordProgress(words: LyricsWord[], i: number, time: number, lineEndSecs?: number): number {
  const word = words[i];
  if (!word || time <= word.t) return 0;
  const fallback = words[i + 1]?.t ?? Math.min(lineEndSecs ?? Infinity, word.t + DEFAULT_WORD_SECS * 3);
  const end = typeof word.end === 'number' && word.end > word.t ? word.end : Math.max(fallback, word.t + 0.05);
  return Math.min(1, (time - word.t) / (end - word.t));
}

/** Roughly how long a sung character takes, for lines timed only as a whole. */
const SECS_PER_CHAR = 0.11;
const MIN_SWEEP_SECS = 1.5;

/** Word timing made up for a line that is only timed as a whole (most
 * LRC lyrics), so it fills like a word-timed one instead of only turning
 * white: the words share the line's time by their length. The sweep takes
 * the time until `endSecs` (the next line), but no longer than singing
 * the text plausibly takes, so a line before a long pause isn't crawled
 * through. An estimate: it shows the pace, not each word's true moment. */
export function estimateWords(text: string, startSecs: number, endSecs: number): LyricsWord[] {
  const parts = text.match(/\S+\s*/g) ?? [];
  const lengths = parts.map((p) => Math.max(1, p.trim().length));
  const chars = lengths.reduce((a, b) => a + b, 0);
  if (chars === 0 || !(endSecs > startSecs)) return [];
  const duration = Math.min((endSecs - startSecs) * 0.92, Math.max(MIN_SWEEP_SECS, chars * SECS_PER_CHAR));
  let t = startSecs;
  return parts.map((part, i) => {
    const end = t + (duration * lengths[i]) / chars;
    const word = { t, text: part, end };
    t = end;
    return word;
  });
}

/** A stretch with no singing, long enough to show as an interlude. */
export interface LyricsGap {
  /** The line it comes before; `lines.length` is never used (no outro dots). */
  before: number;
  from: number;
  to: number;
}

/** Shorter pauses are just breathing room between lines. */
export const MIN_GAP_SECS = 7;

/** Interludes: before the first line, and between a line's stated end and
 * the next line. Without stated ends a gap can't be told from a long line. */
export function findGaps(lines: LyricsLine[]): LyricsGap[] {
  const gaps: LyricsGap[] = [];
  if (lines.length === 0) return gaps;
  if (lines[0].t >= MIN_GAP_SECS) gaps.push({ before: 0, from: 0, to: lines[0].t });
  for (let i = 1; i < lines.length; i++) {
    const prevEnd = lines[i - 1].end;
    if (typeof prevEnd === 'number' && lines[i].t - prevEnd >= MIN_GAP_SECS) {
      gaps.push({ before: i, from: prevEnd, to: lines[i].t });
    }
  }
  return gaps;
}

/** Display name of a provider id; `localLabel` is the translated "Local files". */
export function providerName(id: string | null | undefined, localLabel: string): string {
  switch (id) {
    case 'local':
      return localLabel;
    case 'lrcred':
      return 'lrc.red';
    case 'lrclib':
      return 'LRCLIB';
    case 'unison':
      return 'Unison';
    case 'musixmatch':
      return 'Musixmatch';
    case 'netease':
      return 'NetEase';
    case 'ytm':
      return 'YouTube Music';
    case 'genius':
      return 'Genius';
    default:
      return id || '';
  }
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function toWords(value: unknown): LyricsWord[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const words = value
    .filter((w) => isNum(w?.t) && typeof w?.text === 'string')
    .map((w): LyricsWord => (isNum(w.end) ? { t: w.t, text: w.text, end: w.end } : { t: w.t, text: w.text }));
  return words.length > 0 ? words : undefined;
}

function toLine(value: { t: number; text: string } & Record<string, unknown>): LyricsLine {
  const line: LyricsLine = { t: value.t, text: value.text };
  const words = toWords(value.words);
  if (words) line.words = words;
  if (isNum(value.end)) line.end = value.end;
  if (value.alt === true) line.alt = true;
  const bg = value.bg as { text?: unknown; words?: unknown } | undefined;
  if (bg && typeof bg.text === 'string' && bg.text.trim() !== '') {
    const bgWords = toWords(bg.words);
    line.bg = bgWords ? { text: bg.text, words: bgWords } : { text: bg.text };
  }
  return line;
}

/** A `translate_lyrics` / `romanize_lyrics` reply; malformed means none. */
export function toLineTexts(value: unknown): LineTexts {
  const v = (value && typeof value === 'object' ? value : {}) as Partial<LineTexts>;
  return {
    video_id: typeof v.video_id === 'string' ? v.video_id : null,
    lines: Array.isArray(v.lines) ? v.lines.map((l) => (typeof l === 'string' && l.trim() !== '' ? l : null)) : []
  };
}

/** Parses the payload defensively; anything malformed becomes "no lyrics". */
export function toCurrentLyrics(value: unknown): CurrentLyrics {
  if (!value || typeof value !== 'object') return { ...EMPTY_LYRICS };
  const v = value as Partial<CurrentLyrics>;
  return {
    video_id: typeof v.video_id === 'string' ? v.video_id : null,
    provider: typeof v.provider === 'string' ? v.provider : null,
    synced: Array.isArray(v.synced)
      ? v.synced.filter((l) => typeof l?.t === 'number' && typeof l?.text === 'string').map((l) => toLine(l as never))
      : [],
    plain: typeof v.plain === 'string' ? v.plain : null,
    offset_secs: typeof v.offset_secs === 'number' && Number.isFinite(v.offset_secs) ? v.offset_secs : 0,
    source_url: typeof v.source_url === 'string' ? v.source_url : null
  };
}
