/**
 * In a listening session, YTM's own "Up next" tab on the player page turns
 * into the room's shared queue. YTM's local queue means nothing there (the
 * host's player decides what plays, and the host takes its next songs from
 * the shared queue), so its tab is relabeled "Queue" and its content hidden
 * behind our panel, and YTM's "Add to queue" / "Play next" menu items feed
 * the shared queue instead (see `queueAddFromMenuData`).
 *
 * Everything here goes through one injected stylesheet plus attributes on
 * `<html>` and our own panel element: no style writes on YTM's Polymer
 * elements. The panel sits in YTM's `#side-panel` next to its
 * tab renderer and is re-mounted if YTM re-renders the page.
 */
import { createEl } from '../../utils/dom';
import { createIconButton, ensureKitStyles } from '../../preload/ui/kit';
import { t } from '../../preload/ui/i18n';
import { canControl, MemberRole } from '../../preload/syncRoles';
import { DRAG_ICON, enableReorder, restoreReorderFocus } from '../../preload/ui/reorder';
import type { QueueItemPayload } from './index';

const PANEL_ID = 'oxitune-sync-queue';
const STYLE_ID = 'oxitune-sync-queue-styles';
/** On `<html>` while in a session: relabels YTM's first tab. */
const IN_ROOM_ATTR = 'data-oxitune-sync-queue';
/** On `<html>` while that tab is selected: our panel replaces its content. */
const TAB_ATTR = 'data-oxitune-sync-queue-tab';

const PLAY_ICON = 'M8 5v14l11-7z';
const REMOVE_ICON = 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z';
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

export interface QueuePanelModel {
  queue: QueueItemPayload[];
  nowPlaying: { videoId: string; title: string; artist: string } | null;
  myId: string;
  myRole: MemberRole;
}

export interface QueuePanelActions {
  play: (itemId: string) => void;
  remove: (itemId: string) => void;
  /** `itemId` ends up at position `toIndex` of the queue. */
  move: (itemId: string, toIndex: number) => void;
}

/** What one of YTM's menu items would add to its queue, read from the
 * item's own `data` (a read, never a write, on YTM's element). `null` for
 * every other menu item. */
export function queueAddFromMenuData(
  data: unknown
): { videoId: string | null; next: boolean } | null {
  if (typeof data !== 'object' || data === null) return null;
  const endpoint = (data as { serviceEndpoint?: { queueAddEndpoint?: unknown } }).serviceEndpoint?.queueAddEndpoint;
  if (typeof endpoint !== 'object' || endpoint === null) return null;
  const { queueTarget, queueInsertPosition } = endpoint as {
    queueTarget?: { videoId?: unknown };
    queueInsertPosition?: unknown;
  };
  const videoId = typeof queueTarget?.videoId === 'string' && VIDEO_ID_RE.test(queueTarget.videoId) ? queueTarget.videoId : null;
  return { videoId, next: queueInsertPosition === 'INSERT_AFTER_CURRENT_VIDEO' };
}

function panelCss(tabLabel: string): string {
  return `
  html[${IN_ROOM_ATTR}] ytmusic-player-page tp-yt-paper-tab:first-of-type .tab-content { font-size: 0 !important; }
  html[${IN_ROOM_ATTR}] ytmusic-player-page tp-yt-paper-tab:first-of-type .tab-content::after {
    content: ${JSON.stringify(tabLabel)};
    font-size: 14px;
  }
  html[${TAB_ATTR}] ytmusic-player-page #side-panel > #tab-renderer { display: none !important; }

  #${PANEL_ID} {
    display: none;
    flex: 1 1 0;
    min-height: 0;
    overflow-y: auto;
    padding: 8px 0 16px;
    font: 400 14px/20px var(--oxitune-font);
    color: var(--oxitune-text);
  }
  html[${TAB_ATTR}] #${PANEL_ID} { display: block; }
  .oxitune-sq-heading {
    margin: 16px 0 4px;
    font: 700 16px/24px var(--oxitune-font-display);
  }
  .oxitune-sq-heading:first-child { margin-top: 8px; }
  .oxitune-sq-hint { margin: 8px 0; color: var(--oxitune-text-secondary); }
  .oxitune-sq-row {
    display: flex;
    align-items: center;
    gap: 16px;
    min-height: 56px;
    padding: 0 8px;
    border-radius: 8px;
  }
  .oxitune-sq-row:hover { background: var(--oxitune-hover); }
  .oxitune-sq-thumb {
    flex: 0 0 40px;
    width: 40px;
    height: 40px;
    border-radius: 4px;
    object-fit: cover;
    background: var(--oxitune-hover);
  }
  .oxitune-sq-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .oxitune-sq-title, .oxitune-sq-sub { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .oxitune-sq-title { font-weight: 500; }
  .oxitune-sq-sub { color: var(--oxitune-text-secondary); }
  /* Like YTM's own queue rows: actions only take room on hover or focus,
     so titles use the full width otherwise (still reachable by Tab). */
  .oxitune-sq-handle.oxitune-icon-btn { flex: 0 0 24px; width: 24px; cursor: grab; touch-action: none; }
  .oxitune-sq-handle.oxitune-icon-btn:hover { background: none; }
  .oxitune-sq-row.is-dragging { opacity: 0.5; }
  .oxitune-sq-row.is-dragging .oxitune-sq-handle { cursor: grabbing; }
  .oxitune-sq-row.drop-before { box-shadow: inset 0 2px 0 var(--oxitune-accent-color); }
  .oxitune-sq-row.drop-after { box-shadow: inset 0 -2px 0 var(--oxitune-accent-color); }
  .oxitune-sq-actions { display: flex; flex: 0 0 auto; max-width: 0; overflow: hidden; }
  .oxitune-sq-row:hover .oxitune-sq-actions, .oxitune-sq-row:focus-within .oxitune-sq-actions { max-width: 80px; }
`;
}

function ensureStyles(tabLabel: string) {
  ensureKitStyles();
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = createEl('style', { id: STYLE_ID });
    document.head.appendChild(style);
  }
  const css = panelCss(tabLabel);
  if (style.textContent !== css) style.textContent = css;
}

const HANDLE_SELECTOR = '.oxitune-sq-handle';
const QUEUED_ROW_SELECTOR = '.oxitune-sq-queued';

function row(opts: {
  videoId: string;
  title: string;
  sub: string;
  actions: HTMLElement[];
  handle?: HTMLElement;
}): HTMLElement {
  const item = createEl('div', { className: 'oxitune-sq-row' });
  const thumb = createEl('img', { className: 'oxitune-sq-thumb' });
  thumb.alt = '';
  thumb.loading = 'lazy';
  thumb.src = `https://i.ytimg.com/vi/${opts.videoId}/default.jpg`;
  const text = createEl('div', { className: 'oxitune-sq-text' });
  text.append(createEl('span', { className: 'oxitune-sq-title', text: opts.title }), createEl('span', { className: 'oxitune-sq-sub', text: opts.sub }));
  if (opts.handle) item.appendChild(opts.handle);
  item.append(thumb, text);
  if (opts.actions.length) {
    const actions = createEl('div', { className: 'oxitune-sq-actions' });
    actions.append(...opts.actions);
    item.appendChild(actions);
  }
  return item;
}

function button(label: string, iconPath: string, onClick: () => void): HTMLButtonElement {
  const btn = createIconButton({ label, iconPath, muted: true });
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  return btn;
}

/** The panel's contents for `model`: now playing, then the shared queue. */
function renderPanel(panel: HTMLElement, model: QueuePanelModel, actions: QueuePanelActions) {
  const s = t();
  const nodes: Node[] = [];
  if (model.nowPlaying) {
    nodes.push(createEl('div', { className: 'oxitune-sq-heading', text: s.syncQueueNowPlaying }));
    nodes.push(row({ ...model.nowPlaying, sub: model.nowPlaying.artist, actions: [] }));
  }
  nodes.push(createEl('div', { className: 'oxitune-sq-heading', text: s.syncQueueTitle }));
  if (model.queue.length === 0) {
    nodes.push(createEl('p', { className: 'oxitune-sq-hint', text: canControl(model.myRole) ? s.syncQueueEmpty : s.syncQueueListenerHint }));
  }
  const moderates = model.myRole === 'host' || model.myRole === 'moderator';
  for (const item of model.queue) {
    const buttons: HTMLElement[] = [];
    if (canControl(model.myRole)) buttons.push(button(s.syncQueuePlayNow(item.title), PLAY_ICON, () => actions.play(item.id)));
    if (moderates || item.added_by_id === model.myId) {
      buttons.push(button(s.syncQueueRemove(item.title), REMOVE_ICON, () => actions.remove(item.id)));
    }
    let handle: HTMLElement | undefined;
    if (canControl(model.myRole) && model.queue.length > 1) {
      handle = createIconButton({ label: s.syncQueueDrag(item.title), iconPath: DRAG_ICON, muted: true });
      handle.classList.add('oxitune-sq-handle');
      handle.dataset.itemId = item.id;
    }
    const from = s.syncQueueFrom(item.added_by);
    const queued = row({
      videoId: item.video_id,
      title: item.title,
      sub: item.artist ? `${item.artist} · ${from}` : from,
      actions: buttons,
      handle
    });
    queued.classList.add('oxitune-sq-queued');
    nodes.push(queued);
  }
  panel.replaceChildren(...nodes);
  restoreReorderFocus(panel, HANDLE_SELECTOR);
}

let current: { model: QueuePanelModel; actions: QueuePanelActions } | null = null;

/** Puts the panel in YTM's side panel if it isn't there (YTM re-renders the
 * player page on some navigations) and mirrors which tab is selected. */
export function syncQueuePanel(): void {
  const root = document.documentElement;
  if (!current) {
    root.removeAttribute(TAB_ATTR);
    return;
  }
  const side = document.querySelector('ytmusic-player-page #side-panel');
  let panel = document.getElementById(PANEL_ID);
  if (side && panel?.parentElement !== side) {
    if (!panel) {
      panel = createEl('div', { id: PANEL_ID });
      enableReorder({
        list: panel,
        rowSelector: QUEUED_ROW_SELECTOR,
        handleSelector: HANDLE_SELECTOR,
        onMove: (_from, to, itemId) => current?.actions.move(itemId, to)
      });
    }
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', t().syncQueueTitle);
    renderPanel(panel, current.model, current.actions);
    side.insertBefore(panel, side.querySelector(':scope > #tab-renderer'));
  }
  const firstTab = document.querySelector('ytmusic-player-page tp-yt-paper-tab');
  root.toggleAttribute(TAB_ATTR, !!panel?.isConnected && firstTab?.getAttribute('aria-selected') === 'true');
}

export function showQueuePanel(model: QueuePanelModel, actions: QueuePanelActions): void {
  current = { model, actions };
  ensureStyles(t().syncQueueTab);
  document.documentElement.setAttribute(IN_ROOM_ATTR, '');
  const panel = document.getElementById(PANEL_ID);
  if (panel) renderPanel(panel, model, actions);
  syncQueuePanel();
}

/** Back to YTM's own "Up next" tab, untouched. */
export function hideQueuePanel(): void {
  current = null;
  document.documentElement.removeAttribute(IN_ROOM_ATTR);
  document.documentElement.removeAttribute(TAB_ATTR);
  document.getElementById(PANEL_ID)?.remove();
  document.getElementById(STYLE_ID)?.remove();
}
