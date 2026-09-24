/**
 * The main window has no system title bar: YTM's own nav bar takes its place.
 * Minimize / maximize / close sit at its right end, and the bar's empty space
 * drags the window (double-click maximizes), like a native title bar.
 * The nav bar itself is never modified: dragging is read off a document-level
 * mousedown, and our buttons live in our own slot.
 */
import { createEl } from '../../utils/dom';
import { ensureKitStyles, createIconButton, setIconButtonIcon } from './kit';
import { t } from './i18n';

const SLOT_ID = 'ytmd-window-controls';

export const WINDOW_ICONS = {
  minimize: 'M5 11.5h14v1H5z',
  maximize: 'M5 5h14v14H5V5zm1 1v12h12V6H6z',
  restore: 'M8 5h11v11h-3v3H5V8h3V5zm1 1v2h7v7h2V6H9zM6 9v9h9V9H6z',
  close: 'M6.7 6 12 11.3 17.3 6l.7.7-5.3 5.3 5.3 5.3-.7.7-5.3-5.3L6.7 18l-.7-.7 5.3-5.3L6 6.7z'
} as const;

// The buttons are pinned to the window's corner, not placed in YTM's layout:
// YTM keeps its right-hand buttons 100px off the edge, by padding in narrow
// windows and by `right: 100px` in wide ones. That gap is given to our
// buttons instead (either way, via right/padding 0 plus a margin), and they
// hide with the nav bar in YTM's fullscreen player.
const BUTTONS_WIDTH = 3 * 40 + 2 * 4 + 4;
const SLOT_CSS = `
  html:has(#${SLOT_ID}) ytmusic-nav-bar #right-content {
    right: 0 !important;
    padding-right: 0 !important;
    margin-right: ${BUTTONS_WIDTH + 8}px !important;
  }
  #${SLOT_ID} {
    position: fixed;
    top: 0;
    right: 0;
    z-index: 6;
    height: var(--ytmusic-nav-bar-height, 64px);
    display: flex;
    align-items: center;
    gap: 4px;
    padding-right: 4px;
  }
  html:has(ytmusic-player-page[player-fullscreened]) #${SLOT_ID},
  html:has(:fullscreen) #${SLOT_ID} {
    display: none;
  }
  #${SLOT_ID} .ytmd-window-close:hover {
    background: #c42b1c;
    color: #fff;
  }
`;

/** Anything in the nav bar that has its own click; the rest of the bar is the drag area. */
const INTERACTIVE = [
  'a', 'button', 'input', 'textarea', 'select', '[role="button"]', '[role="tab"]',
  'tp-yt-paper-icon-button', 'yt-icon-button', 'ytmusic-search-box', 'ytmusic-settings-button',
  'ytmusic-cast-button', 'ytmusic-chip-cloud-renderer', `#${SLOT_ID}`, '#ytmd-nav-slot'
].join(', ');

type AppWindow = ReturnType<NonNullable<NonNullable<Window['__TAURI__']>['window']>['getCurrentWindow']>;

function appWindow(): AppWindow | null {
  return window.__TAURI__?.window?.getCurrentWindow() ?? null;
}

function run(action: (win: AppWindow) => Promise<unknown>): void {
  const win = appWindow();
  if (win) action(win).catch((e: unknown) => console.error('[YTMD] Window action failed:', e));
}

/** True when a press on `target` should move the window rather than click something. */
export function isDragTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (!target.closest('ytmusic-nav-bar, #nav-bar-background')) return false;
  return target.closest(INTERACTIVE) === null;
}

let maxButton: HTMLButtonElement | null = null;
let listenersInstalled = false;

async function syncMaximizeButton(): Promise<void> {
  const win = appWindow();
  if (!win || !maxButton) return;
  const maximized = await win.isMaximized().catch(() => false);
  const label = maximized ? t().windowRestore : t().windowMaximize;
  setIconButtonIcon(maxButton, maximized ? WINDOW_ICONS.restore : WINDOW_ICONS.maximize);
  maxButton.setAttribute('aria-label', label);
  maxButton.dataset.ytmdTooltip = label;
}

function installListeners(): void {
  if (listenersInstalled) return;
  listenersInstalled = true;
  document.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || !isDragTarget(e.target)) return;
    e.preventDefault();
    if (e.detail === 2) run((win) => win.toggleMaximize());
    else run((win) => win.startDragging());
  }, true);
  appWindow()?.onResized(() => void syncMaximizeButton()).catch(() => undefined);
}

/** Idempotent; called from the nav-menu poll, since YTM re-renders its nav bar. */
export function mountWindowControls(): void {
  if (!appWindow()) return;
  installListeners();
  if (document.getElementById(SLOT_ID)?.isConnected) return;

  if (!document.querySelector('ytmusic-nav-bar') || !document.body) return;

  ensureKitStyles();
  if (!document.getElementById('ytmd-window-controls-styles')) {
    const style = document.createElement('style');
    style.id = 'ytmd-window-controls-styles';
    style.textContent = SLOT_CSS;
    document.head.appendChild(style);
  }

  const slot = createEl('div', { id: SLOT_ID });
  const minimize = createIconButton({ label: t().windowMinimize, iconPath: WINDOW_ICONS.minimize });
  minimize.addEventListener('click', () => run((win) => win.minimize()));
  maxButton = createIconButton({ label: t().windowMaximize, iconPath: WINDOW_ICONS.maximize });
  maxButton.addEventListener('click', () => run((win) => win.toggleMaximize()));
  const close = createIconButton({ label: t().windowClose, iconPath: WINDOW_ICONS.close });
  close.classList.add('ytmd-window-close');
  // Goes through CloseRequested, so "close to tray" still applies.
  close.addEventListener('click', () => run((win) => win.close()));
  slot.append(minimize, maxButton, close);
  document.body.appendChild(slot);
  void syncMaximizeButton();
}
