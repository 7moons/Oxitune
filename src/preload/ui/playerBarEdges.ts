/**
 * The player bar reaches both edges of the window.
 *
 * YTM sizes the bar `calc(100vw - var(--ytmusic-scrollbar-width))` with that
 * width fixed at 12px on <html>. Here the page scrollbar is 15px on browse
 * pages and absent on the player page (and in fullscreen), so the bar stopped
 * short of the window's right edge and left a notch in the corner. The
 * property is set to the scrollbar actually shown, on <html>, which is where
 * YTM declares it (never on YTM's own elements).
 *
 * In its fullscreen player YTM also insets the progress bar by 20px on each
 * side (`--ytmusic-player-bar-fullscreen-progress-bar-inset`, which it writes
 * inline on the bar); a stylesheet rule zeroes that property, so the progress
 * bar runs edge to edge as it does outside fullscreen.
 */
const PROPERTY = '--ytmusic-scrollbar-width';
const STYLE_ID = 'ytmd-player-bar-edges';
const STYLE_CSS = `
  ytmusic-player-bar {
    --ytmusic-player-bar-fullscreen-progress-bar-inset: 0px !important;
  }
`;

let installed = false;
let last = '';

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID) || !document.head) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE_CSS;
  document.head.appendChild(style);
}

/** Cheap enough for the page's 1 s mount poll, which also restores the stylesheet if it is dropped. */
export function syncPlayerBarEdges(): void {
  ensureStyle();
  const root = document.documentElement;
  const value = `${Math.max(0, window.innerWidth - root.clientWidth)}px`;
  if (value === last && root.style.getPropertyValue(PROPERTY) === value) return;
  last = value;
  root.style.setProperty(PROPERTY, value);
}

/** Idempotent. The scrollbar comes and goes with the page's content, the player page and the window size. */
export function installPlayerBarEdges(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  syncPlayerBarEdges();
  window.addEventListener('resize', syncPlayerBarEdges);
  // <html>'s box narrows when the scrollbar appears and widens when it goes.
  new ResizeObserver(syncPlayerBarEdges).observe(document.documentElement);
}
