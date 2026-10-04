/**
 * Fullscreen lyrics: the cover, the song and the player controls on the
 * left, the lyrics on the right, over the cover blurred into a backdrop.
 *
 * It is our own element shown with the Fullscreen API, not a restyling of
 * YTM's fullscreen player: the window follows the Fullscreen API on its
 * own (windowControls.ts), and Esc leaves it.
 */
import { createEl } from '../../utils/dom';
import { ICONS, createIconButton, setIconButtonIcon } from '../../preload/ui/kit';
import { renderAmbientWash } from '../ambient/color';
import { LyricsView } from './view';

export interface FullscreenLabels {
  close: string;
  previous: string;
  next: string;
  play: string;
  pause: string;
  resume: string;
}

export interface FullscreenTrack {
  title: string;
  artist: string;
  coverUrl?: string;
}

/** The pointer and the controls hide after this long without a move. */
const IDLE_MS = 3000;

/** `m:ss` (or `h:mm:ss`) for a position in seconds. */
export function formatClock(secs: number): string {
  const total = Number.isFinite(secs) && secs > 0 ? Math.floor(secs) : 0;
  const s = String(total % 60).padStart(2, '0');
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** Where in the song a click at `x` on a bar spanning `left`..`left + width` lands. */
export function seekTarget(x: number, left: number, width: number, durationSecs: number): number | null {
  if (!(width > 0) || !(durationSecs > 0)) return null;
  return Math.max(0, Math.min(1, (x - left) / width)) * durationSecs;
}

/** YTM's button into its fullscreen player (on the cover, player page). */
const YTM_ENTER = 'ytmusic-player .fullscreen-button';
const YTM_EXIT = '.exit-fullscreen-button';
/** YTM's fullscreen player is on (however it was reached). */
const YTM_FULLSCREEN =
  'ytmusic-player-page[player-fullscreened], ytmusic-app-layout[player-ui-state="FULLSCREEN"], ytmusic-player[player-ui-state="FULLSCREEN"]';
/** How often YTM's fullscreen is looked for when a way in wasn't caught. */
const TAKEOVER_POLL_MS = 300;

/** YTM's fullscreen shortcut: a bare F. */
export function isFullscreenKey(e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'altKey' | 'metaKey' | 'shiftKey' | 'repeat'>): boolean {
  return (e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey && !e.repeat;
}

/** Whether a key press there is typing (the search box, a comment), not a shortcut. */
export function isTypingTarget(target: { tagName?: string; isContentEditable?: boolean } | null): boolean {
  if (!target) return false;
  return target.isContentEditable === true || ['INPUT', 'TEXTAREA', 'SELECT'].includes((target.tagName ?? '').toUpperCase());
}

/**
 * Makes the lyrics view the app's fullscreen: YTM's fullscreen button and
 * its F shortcut are caught before YTM sees them, and if YTM's fullscreen
 * player comes up some other way (a double click on the cover) it is left
 * through YTM's own exit button and replaced. Returns the undo.
 */
export function takeOverFullscreen(view: { isOpen: () => boolean; open: () => void; close: () => void }): () => void {
  const toggle = () => (view.isOpen() ? view.close() : view.open());
  const swallow = (e: Event) => {
    e.preventDefault();
    e.stopImmediatePropagation();
  };
  const onClick = (e: MouseEvent) => {
    if (!(e.target instanceof Element) || !e.target.closest(YTM_ENTER)) return;
    swallow(e);
    view.open();
  };
  const onKey = (e: KeyboardEvent) => {
    if (!isFullscreenKey(e) || isTypingTarget(e.target as HTMLElement | null)) return;
    swallow(e);
    toggle();
  };
  const poll = window.setInterval(() => {
    if (view.isOpen() || !document.querySelector(YTM_FULLSCREEN)) return;
    const exit = Array.from(document.querySelectorAll<HTMLElement>(YTM_EXIT)).find((el) => el.offsetParent !== null);
    exit?.click();
    view.open();
  }, TAKEOVER_POLL_MS);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKey, true);
  return () => {
    clearInterval(poll);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKey, true);
  };
}

export class LyricsFullscreen {
  readonly view: LyricsView;
  private readonly root: HTMLElement;
  private readonly backdrop: HTMLElement;
  private readonly cover: HTMLImageElement;
  private readonly title: HTMLElement;
  private readonly artist: HTMLElement;
  private readonly played: HTMLElement;
  private readonly elapsed: HTMLElement;
  private readonly total: HTMLElement;
  private readonly playButton: HTMLButtonElement;
  private readonly status: HTMLElement;
  private idleTimer: number | null = null;
  private coverUrl = '';
  private durationSecs = 0;
  private shownSecond = -1;
  private playing: boolean | null = null;
  private open = false;

  constructor(
    private readonly opts: {
      labels: FullscreenLabels;
      onCommand: (command: 'previous' | 'play_pause' | 'next') => void;
      onSeek: (secs: number) => void;
      onClose: () => void;
    }
  ) {
    const { labels } = opts;
    this.view = new LyricsView({ onSeek: opts.onSeek, resumeLabel: labels.resume });
    this.root = createEl('div', { id: 'ytmd-lyrics-fs' });
    this.backdrop = createEl('div', { className: 'ytmd-fs-backdrop' });

    this.cover = createEl('img', { className: 'ytmd-fs-cover' });
    this.cover.alt = '';
    this.title = createEl('div', { className: 'ytmd-fs-title' });
    this.artist = createEl('div', { className: 'ytmd-fs-artist' });

    const seek = createEl('div', { className: 'ytmd-fs-seek' });
    const track = createEl('div', { className: 'ytmd-fs-track' });
    this.played = createEl('div', { className: 'ytmd-fs-played' });
    track.append(this.played);
    seek.append(track);
    seek.addEventListener('click', (e) => {
      const box = track.getBoundingClientRect();
      const target = seekTarget(e.clientX, box.left, box.width, this.durationSecs);
      if (target !== null) opts.onSeek(target);
    });
    this.elapsed = createEl('span', { text: '0:00' });
    this.total = createEl('span', { text: '0:00' });
    const times = createEl('div', { className: 'ytmd-fs-times' });
    times.append(this.elapsed, this.total);

    const previous = createIconButton({ label: labels.previous, iconPath: ICONS.skipPrevious });
    this.playButton = createIconButton({ label: labels.play, iconPath: ICONS.play });
    this.playButton.classList.add('ytmd-fs-play');
    const next = createIconButton({ label: labels.next, iconPath: ICONS.skipNext });
    previous.addEventListener('click', () => opts.onCommand('previous'));
    this.playButton.addEventListener('click', () => opts.onCommand('play_pause'));
    next.addEventListener('click', () => opts.onCommand('next'));
    const controls = createEl('div', { className: 'ytmd-fs-controls' });
    controls.append(previous, this.playButton, next);

    const side = createEl('div', { className: 'ytmd-fs-side' });
    side.append(this.cover, this.title, this.artist, seek, times, controls);

    this.status = createEl('div', { className: 'ytmd-native-lyrics-status' });
    const lyrics = createEl('div', { className: 'ytmd-fs-lyrics' });
    lyrics.append(this.status, this.view.root);

    const body = createEl('div', { className: 'ytmd-fs-body' });
    body.append(side, lyrics);

    const close = createIconButton({ label: labels.close, iconPath: ICONS.close });
    close.classList.add('ytmd-fs-close');
    close.addEventListener('click', () => this.close());

    this.root.append(this.backdrop, createEl('div', { className: 'ytmd-fs-veil' }), body, close);
    this.root.addEventListener('mousemove', this.wake);
  }

  get isOpen(): boolean {
    return this.open;
  }

  show(): void {
    if (this.open) return;
    this.open = true;
    this.shownSecond = -1;
    document.body.append(this.root);
    document.addEventListener('keydown', this.onKey, true);
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
    // Without the Fullscreen API it still covers the whole window.
    this.root.requestFullscreen?.().catch(() => undefined);
    this.wake();
    this.view.scrollToCurrent();
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    document.removeEventListener('keydown', this.onKey, true);
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
    if (this.idleTimer !== null) clearTimeout(this.idleTimer);
    this.idleTimer = null;
    if (document.fullscreenElement === this.root) void document.exitFullscreen().catch(() => undefined);
    this.root.remove();
    this.opts.onClose();
  }

  setTrack(track: FullscreenTrack | null): void {
    this.title.textContent = track?.title ?? '';
    this.artist.textContent = track?.artist ?? '';
    const coverUrl = track?.coverUrl ?? '';
    if (coverUrl === this.coverUrl) return;
    this.coverUrl = coverUrl;
    if (coverUrl) this.cover.src = coverUrl;
    else this.cover.removeAttribute('src');
    this.backdrop.style.backgroundImage = '';
    void renderAmbientWash(coverUrl, 0.5).then((wash) => {
      if (wash && this.coverUrl === coverUrl) this.backdrop.style.backgroundImage = `url("${wash}")`;
    });
  }

  setPlaying(playing: boolean): void {
    if (playing === this.playing) return;
    this.playing = playing;
    const label = playing ? this.opts.labels.pause : this.opts.labels.play;
    setIconButtonIcon(this.playButton, playing ? ICONS.pause : ICONS.play);
    this.playButton.setAttribute('aria-label', label);
  }

  setProgress(positionSecs: number, durationSecs: number): void {
    this.durationSecs = durationSecs;
    if (!this.open) return;
    const second = Math.floor(positionSecs);
    if (second === this.shownSecond) return;
    this.shownSecond = second;
    const fraction = durationSecs > 0 ? Math.max(0, Math.min(1, positionSecs / durationSecs)) : 0;
    this.played.style.transform = `scaleX(${fraction.toFixed(4)})`;
    this.elapsed.textContent = formatClock(positionSecs);
    this.total.textContent = formatClock(durationSecs);
  }

  /** "Loading…" / "no lyrics" instead of the lines; `null` shows the lines. */
  setStatus(text: string | null): void {
    this.status.textContent = text ?? '';
    this.status.hidden = text === null;
    this.view.root.hidden = text !== null;
  }

  private readonly wake = (): void => {
    this.root.classList.remove('ytmd-fs-idle');
    if (this.idleTimer !== null) clearTimeout(this.idleTimer);
    this.idleTimer = window.setTimeout(() => this.root.classList.add('ytmd-fs-idle'), IDLE_MS);
  };

  private readonly onKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    this.close();
  };

  /** Esc (or the system) ended the Fullscreen API's fullscreen: leave too. */
  private readonly onFullscreenChange = (): void => {
    if (this.open && document.fullscreenElement !== this.root) this.close();
  };
}
