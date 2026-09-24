/**
 * The `lyrics-changed` / `get_current_lyrics` payload (schemas/lyrics_v1.json)
 * and the timing helpers every lyrics view shares.
 */

export interface LyricsWord {
  /** Seconds from the start of the song. */
  t: number;
  text: string;
}

export interface LyricsLine {
  /** Seconds from the start of the song. */
  t: number;
  text: string;
  words?: LyricsWord[];
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

/** Display name of a provider id; `localLabel` is the translated "Local files". */
export function providerName(id: string | null | undefined, localLabel: string): string {
  switch (id) {
    case 'local':
      return localLabel;
    case 'lrclib':
      return 'LRCLIB';
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

/** Parses the payload defensively; anything malformed becomes "no lyrics". */
export function toCurrentLyrics(value: unknown): CurrentLyrics {
  if (!value || typeof value !== 'object') return { ...EMPTY_LYRICS };
  const v = value as Partial<CurrentLyrics>;
  return {
    video_id: typeof v.video_id === 'string' ? v.video_id : null,
    provider: typeof v.provider === 'string' ? v.provider : null,
    synced: Array.isArray(v.synced) ? v.synced.filter((l) => typeof l?.t === 'number' && typeof l?.text === 'string') : [],
    plain: typeof v.plain === 'string' ? v.plain : null,
    offset_secs: typeof v.offset_secs === 'number' && Number.isFinite(v.offset_secs) ? v.offset_secs : 0,
    source_url: typeof v.source_url === 'string' ? v.source_url : null
  };
}
