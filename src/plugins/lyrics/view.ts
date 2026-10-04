/**
 * One lyrics display: the lines, the word-by-word fill, background vocals,
 * interlude dots, translation/romanization under each line, and scrolling
 * that follows the song until the listener scrolls on their own.
 *
 * Used twice: in YTM's Lyrics tab and in the fullscreen view. It only ever
 * touches its own elements.
 */
import { createEl } from '../../utils/dom';
import {
  CurrentLyrics,
  EMPTY_LYRICS,
  LyricsGap,
  LyricsWord,
  activeLineIndex,
  findGaps,
  lineEnd,
  wordProgress
} from '../../types/lyrics';

/** A translation and a romanization per shown line (`shownLines` order). */
export interface LyricsExtras {
  translation: (string | null)[] | null;
  romanization: (string | null)[] | null;
}

export const NO_EXTRAS: LyricsExtras = { translation: null, romanization: null };

/** After the listener scrolls, following the song waits this long. */
export const SCROLL_HOLD_MS = 5000;

interface WordRun {
  words: LyricsWord[];
  els: HTMLElement[];
  /** Last fill written per word (0..1), so a frame writes only what changed. */
  shown: number[];
}

interface Row {
  el: HTMLElement;
  main: WordRun | null;
  bg: WordRun | null;
}

interface GapRow {
  gap: LyricsGap;
  el: HTMLElement;
  dots: HTMLElement[];
  lit: number;
}

/** The interlude `time` falls in, or -1. */
export function activeGapIndex(gaps: LyricsGap[], time: number): number {
  return gaps.findIndex((g) => time >= g.from && time < g.to);
}

/** How many of an interlude's three dots are lit at `time`. */
export function litDots(gap: LyricsGap, time: number): number {
  const progress = (time - gap.from) / Math.max(0.001, gap.to - gap.from);
  return Math.max(0, Math.min(3, Math.floor(progress * 3) + 1));
}

/** The plain-text line to bring into view at `progress` (0..1) of the song. */
export function plainLineAt(lineCount: number, progress: number): number {
  if (lineCount <= 0 || !Number.isFinite(progress)) return -1;
  return Math.max(0, Math.min(lineCount - 1, Math.floor(progress * lineCount)));
}

/** Fill steps smaller than this aren't worth a style write. */
const FILL_STEP = 0.02;

export class LyricsView {
  readonly root: HTMLElement;
  private readonly list: HTMLElement;
  private readonly resume: HTMLButtonElement;
  private lyrics: CurrentLyrics = { ...EMPTY_LYRICS };
  private rows: Row[] = [];
  private gaps: GapRow[] = [];
  private gapSpans: LyricsGap[] = [];
  private active = -1;
  private activeGap = -1;
  private plainShown = -1;
  private holdUntil = 0;

  constructor(private readonly opts: { onSeek: (secs: number) => void; resumeLabel: string }) {
    this.root = createEl('div', { className: 'ytmd-lyrics-view' });
    this.list = createEl('div', { className: 'ytmd-lyrics-lines' });
    this.resume = createEl('button', { className: 'ytmd-chip ytmd-lyrics-resume', text: opts.resumeLabel });
    this.resume.type = 'button';
    this.resume.hidden = true;
    this.root.append(this.list, this.resume);

    this.list.addEventListener('click', (e) => {
      const row = (e.target as Element | null)?.closest<HTMLElement>('.ytmd-lyric-line[data-line]');
      const line = row ? this.lyrics.synced[Number(row.dataset.line)] : undefined;
      if (line) this.opts.onSeek(Math.max(0, line.t - this.lyrics.offset_secs));
    });
    const hold = () => this.holdScroll();
    this.root.addEventListener('wheel', hold, { passive: true });
    this.root.addEventListener('touchmove', hold, { passive: true });
    this.resume.addEventListener('click', () => {
      this.releaseScroll();
      this.scrollToCurrent();
    });
  }

  /** Blur and glow on or off (`lyrics_effects`). */
  setEffects(on: boolean): void {
    this.root.classList.toggle('ytmd-lyrics-effects', on);
  }

  get hasLines(): boolean {
    return this.rows.length > 0;
  }

  /** Rebuilds the lines for new lyrics. */
  setLyrics(lyrics: CurrentLyrics, extras: LyricsExtras): void {
    this.lyrics = lyrics;
    this.active = -1;
    this.activeGap = -1;
    this.plainShown = -1;
    this.releaseScroll();
    this.rows = [];
    this.gaps = [];

    const nodes: HTMLElement[] = [];
    if (lyrics.synced.length > 0) {
      const gaps = findGaps(lyrics.synced);
      lyrics.synced.forEach((line, i) => {
        const gap = gaps.find((g) => g.before === i);
        if (gap) {
          const row = this.buildGap(gap);
          this.gaps.push(row);
          nodes.push(row.el);
        }
        const el = createEl('div', { className: 'ytmd-lyric-line' });
        el.dataset.line = String(i);
        if (line.alt) el.classList.add('ytmd-alt');
        const main = this.buildText('ytmd-lyric-main', line.text, line.words);
        el.append(main.el);
        let bg: WordRun | null = null;
        if (line.bg) {
          const built = this.buildText('ytmd-lyric-bg', line.bg.text, line.bg.words);
          el.append(built.el);
          bg = built.run;
        }
        this.rows.push({ el, main: main.run, bg });
        nodes.push(el);
      });
    } else if (lyrics.plain) {
      for (const text of lyrics.plain.split('\n')) {
        const el = createEl('div', { className: 'ytmd-lyric-line ytmd-plain' });
        if (text.trim() === '') el.classList.add('ytmd-empty');
        el.append(createEl('div', { className: 'ytmd-lyric-main', text }));
        this.rows.push({ el, main: null, bg: null });
        nodes.push(el);
      }
    }
    this.gapSpans = this.gaps.map((g) => g.gap);
    this.list.replaceChildren(...nodes);
    this.root.classList.toggle('ytmd-lyrics-plain', lyrics.synced.length === 0);
    this.setExtras(extras);
  }

  /** Shows (or removes) the translation and romanization under each line. */
  setExtras(extras: LyricsExtras): void {
    this.rows.forEach((row, i) => {
      this.setSubline(row.el, 'ytmd-lyric-roman', extras.romanization?.[i] ?? null);
      this.setSubline(row.el, 'ytmd-lyric-trans', extras.translation?.[i] ?? null);
    });
  }

  /** The offset changed: same lines, other moments. */
  setOffset(offsetSecs: number): void {
    this.lyrics = { ...this.lyrics, offset_secs: offsetSecs };
  }

  /** Moves the highlight to `positionSecs`; follows it when `follow`. */
  update(positionSecs: number, follow: boolean): void {
    const lines = this.lyrics.synced;
    if (lines.length === 0) return;
    const time = positionSecs + this.lyrics.offset_secs;

    const gapIdx = activeGapIndex(this.gapSpans, time);
    let idx = activeLineIndex(lines, positionSecs, this.lyrics.offset_secs);
    // During an interlude the line before it is over.
    if (gapIdx >= 0 && idx >= 0 && time >= lineEnd(lines, idx)) idx = -1;

    if (gapIdx !== this.activeGap) {
      this.gaps[this.activeGap]?.el.classList.remove('ytmd-active');
      this.activeGap = gapIdx;
      this.gaps[gapIdx]?.el.classList.add('ytmd-active');
      if (follow && gapIdx >= 0) this.scrollTo(this.gaps[gapIdx].el);
    }
    const gap = this.gaps[gapIdx];
    if (gap) {
      const lit = litDots(gap.gap, time);
      if (lit !== gap.lit) {
        gap.lit = lit;
        gap.dots.forEach((dot, i) => dot.classList.toggle('ytmd-lit', i < lit));
      }
    }

    if (idx !== this.active) {
      const old = this.rows[this.active];
      if (old) {
        old.el.classList.remove('ytmd-active');
        this.clearFill(old.main);
        this.clearFill(old.bg);
      }
      this.rows[this.active - 1]?.el.classList.remove('ytmd-near');
      this.rows[this.active + 1]?.el.classList.remove('ytmd-near');
      this.active = idx;
      const row = this.rows[idx];
      if (row) {
        row.el.classList.add('ytmd-active');
        this.rows[idx - 1]?.el.classList.add('ytmd-near');
        this.rows[idx + 1]?.el.classList.add('ytmd-near');
        if (follow) this.scrollTo(row.el);
      }
    }

    const row = this.rows[idx];
    if (row) {
      const end = lineEnd(lines, idx);
      this.fill(row.main, time, end);
      this.fill(row.bg, time, end);
    }
  }

  /** Text-only lyrics drift along with the song (`progress` 0..1). */
  updatePlain(progress: number, follow: boolean): void {
    if (this.lyrics.synced.length > 0 || !follow) return;
    const idx = plainLineAt(this.rows.length, progress);
    if (idx === this.plainShown) return;
    this.plainShown = idx;
    const row = this.rows[idx];
    if (row) this.scrollTo(row.el);
  }

  /** Brings the line being sung back into view at once (the view was just shown). */
  scrollToCurrent(): void {
    const el = this.gaps[this.activeGap]?.el ?? this.rows[this.active]?.el ?? this.rows[this.plainShown]?.el;
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  private scrollTo(el: HTMLElement): void {
    if (Date.now() < this.holdUntil) return;
    if (!this.resume.hidden) this.releaseScroll();
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  private holdScroll(): void {
    if (this.rows.length === 0) return;
    this.holdUntil = Date.now() + SCROLL_HOLD_MS;
    this.resume.hidden = false;
    this.root.classList.add('ytmd-lyrics-browsing');
  }

  private releaseScroll(): void {
    this.holdUntil = 0;
    this.resume.hidden = true;
    this.root.classList.remove('ytmd-lyrics-browsing');
  }

  private buildText(className: string, text: string, words: LyricsWord[] | undefined): { el: HTMLElement; run: WordRun | null } {
    const el = createEl('div', { className });
    if (!words || words.length === 0) {
      el.textContent = text;
      return { el, run: null };
    }
    el.classList.add('ytmd-has-words');
    const els = words.map((w) => createEl('span', { className: 'ytmd-lyric-word', text: w.text }));
    el.append(...els);
    return { el, run: { words, els, shown: words.map(() => 0) } };
  }

  private buildGap(gap: LyricsGap): GapRow {
    const el = createEl('div', { className: 'ytmd-lyric-gap' });
    el.setAttribute('aria-hidden', 'true');
    const dots = [0, 1, 2].map(() => createEl('span', { className: 'ytmd-lyric-dot' }));
    el.append(...dots);
    return { gap, el, dots, lit: 0 };
  }

  private setSubline(row: HTMLElement, className: string, text: string | null): void {
    const existing = row.querySelector<HTMLElement>(`:scope > .${className}`);
    if (!text) {
      existing?.remove();
      return;
    }
    if (existing) {
      if (existing.textContent !== text) existing.textContent = text;
      return;
    }
    const el = createEl('div', { className, text });
    // Romanization sits right under the original, the translation last.
    if (className === 'ytmd-lyric-roman') row.querySelector(':scope > .ytmd-lyric-main')?.after(el);
    else row.append(el);
  }

  private fill(run: WordRun | null, time: number, lineEndSecs: number): void {
    if (!run) return;
    for (let i = 0; i < run.words.length; i++) {
      const p = wordProgress(run.words, i, time, lineEndSecs);
      const shown = run.shown[i];
      if (p === shown || (p > 0 && p < 1 && Math.abs(p - shown) < FILL_STEP)) continue;
      run.shown[i] = p;
      const el = run.els[i];
      el.classList.toggle('ytmd-sung', p >= 1);
      if (p > 0 && p < 1) el.style.setProperty('--ytmd-fill', p.toFixed(2));
      else el.style.removeProperty('--ytmd-fill');
    }
  }

  private clearFill(run: WordRun | null): void {
    if (!run) return;
    run.els.forEach((el, i) => {
      if (run.shown[i] === 0) return;
      run.shown[i] = 0;
      el.classList.remove('ytmd-sung');
      el.style.removeProperty('--ytmd-fill');
    });
  }
}
