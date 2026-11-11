import { pageLog } from './diagLog';

/**
 * Keeps YouTube Music from pausing with "Video paused. Continue watching?".
 *
 * YTM stamps the last keyboard/mouse activity into `window._lact` and, some
 * way into each song, asks whether anyone is there when that stamp is older
 * than a server-set threshold. A desktop player sits in the background or the
 * tray for hours with no input in its page, so the stamp went stale and the
 * prompt paused the music again and again.
 *
 * Two layers: the stamp is refreshed while a song plays (the prompt is never
 * scheduled), and a prompt that still shows up is confirmed right away (its
 * close handler resumes playback).
 */

/** Well below any idle threshold YTM uses (minutes), and next to free. */
export const ACTIVITY_REFRESH_MS = 10_000;
/** How often the page is checked for a prompt that got through anyway. */
export const PROMPT_CHECK_MS = 2_000;

type ActivityWindow = { _lact?: number; _fact?: number };

/** Marks "the user was active just now" the way YTM's own input listeners do. */
export function touchActivity(win: ActivityWindow, nowMs: number): void {
  win._lact = nowMs;
  // -1 means "no activity yet this session"; YTM's listener fills it in too.
  if (win._fact === -1) win._fact = nowMs;
}

interface PromptRoot {
  querySelectorAll(selector: string): ArrayLike<Element>;
}

const isShown = (el: Element): boolean => {
  if (el.closest('[aria-hidden="true"]')) return false;
  return el.getClientRects().length > 0;
};

/** The confirm button of a visible "are you still there" prompt, if any.
 * The renderer stays in the DOM (hidden) after it was answered once. */
export function findYouThereConfirm(root: PromptRoot): HTMLElement | null {
  const prompts = Array.from(root.querySelectorAll('ytmusic-you-there-renderer'));
  for (const prompt of prompts) {
    if (!isShown(prompt)) continue;
    const button =
      prompt.querySelector<HTMLElement>('.actions yt-button-renderer button, .actions button') ??
      prompt.querySelector<HTMLElement>('.actions yt-button-renderer, yt-button-renderer');
    if (button) return button;
  }
  return null;
}

let started = false;
let enabled = true;

/** The "Don't ask if I'm still listening" setting; on until the config says
 * otherwise, so the first song after launch is covered too. */
export function setKeepAliveEnabled(on: boolean): void {
  enabled = on;
}

export function startKeepAlive(): void {
  if (started) return;
  started = true;

  const activity = window as unknown as ActivityWindow;
  const isPlaying = () => {
    const video = document.querySelector('video');
    return !!video && !video.paused && !video.ended;
  };

  // Only while something plays: a paused, forgotten app is really idle.
  const refresh = () => {
    if (enabled && isPlaying()) touchActivity(activity, Date.now());
  };
  const refreshTimer = setInterval(refresh, ACTIVITY_REFRESH_MS);
  // The prompt is scheduled when a song starts; be fresh at that moment too.
  document.addEventListener('playing', refresh, true);

  const dismiss = () => {
    if (!enabled) return;
    const button = findYouThereConfirm(document);
    if (!button) return;
    touchActivity(activity, Date.now());
    button.click();
    pageLog('info', 'player', 'answered the "still there?" prompt');
    // YTM resumes when the prompt closes; make sure of it.
    setTimeout(() => {
      const video = document.querySelector('video');
      if (video?.paused && !findYouThereConfirm(document)) void video.play().catch(() => undefined);
    }, 500);
  };
  const promptTimer = setInterval(dismiss, PROMPT_CHECK_MS);
  // The prompt pauses the song as it opens: check right then as well.
  const onPause = () => setTimeout(dismiss, 250);
  document.addEventListener('pause', onPause, true);

  window.addEventListener('pagehide', () => {
    clearInterval(refreshTimer);
    clearInterval(promptTimer);
    document.removeEventListener('playing', refresh, true);
    document.removeEventListener('pause', onPause, true);
    started = false;
  });
}
