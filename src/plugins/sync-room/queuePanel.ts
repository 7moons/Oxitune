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
 * elements (CLAUDE.md). The panel sits in YTM's `#side-panel` next to its
 * tab renderer and is re-mounted if YTM re-renders the page.
 */
import { createEl } from '../../utils/dom';
import { createIconButton, ensureKitStyles } from '../../preload/ui/kit';
import { t } from '../../preload/ui/i18n';
import { canControl, MemberRole } from '../../preload/syncRoles';
import type { QueueItemPayload } from './index';

const PANEL_ID = 'ytmd-sync-queue';
const STYLE_ID = 'ytmd-sync-queue-styles';
/** On `<html>` while in a session: relabels YTM's first tab. */
const IN_ROOM_ATTR = 'data-ytmd-sync-queue';
/** On `<html>` while that tab is selected: our panel replaces its content. */
const TAB_ATTR = 'data-ytmd-sync-queue-tab';

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
    font: 400 14px/20px var(--ytmd-font);
    color: var(--ytmd-text);
  }
  html[${TAB_ATTR}] #${PANEL_ID} { display: block; }
  .ytmd-sq-heading {
    margin: 16px 0 4px;
    font: 700 16px/24px var(--ytmd-font-display);
  }
  .ytmd-sq-heading:first-child { margin-top: 8px; }
  .ytmd-sq-hint { margin: 8px 0; color: var(--ytmd-text-secondary); }
  .ytmd-sq-row {
    display: flex;
    align-items: center;
    gap: 16px;
    min-height: 56px;
    padding: 0 8px;
    border-radius: 8px;
  }
  .ytmd-sq-row:hover { background: var(--ytmd-hover); }
  .ytmd-sq-thumb {
    flex: 0 0 40px;
    width: 40px;
    height: 40px;
    border-radius: 4px;
    object-fit: cover;
    background: var(--ytmd-hover);
  }
  .ytmd-sq-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .ytmd-sq-title, .ytmd-sq-sub { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ytmd-sq-title { font-weight: 500; }
  .ytmd-sq-sub { color: var(--ytmd-text-secondary); }
  /* Like YTM's own queue rows: actions only take room on hover or focus,
     so titles use the full width otherwise (still reachable by Tab). */
  .ytmd-sq-actions { display: flex; flex: 0 0 auto; max-width: 0; overflow: hidden; }
  .ytmd-sq-row:hover .ytmd-sq-actions, .ytmd-sq-row:focus-within .ytmd-sq-actions { max-width: 80px; }
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

function row(opts: { videoId: string; title: string; sub: string; actions: HTMLElement[] }): HTMLElement {
  const item = createEl('div', { className: 'ytmd-sq-row' });
  const thumb = createEl('img', { className: 'ytmd-sq-thumb' });
  thumb.alt = '';
  thumb.loading = 'lazy';
  thumb.src = `https://i.ytimg.com/vi/${opts.videoId}/default.jpg`;
  const text = createEl('div', { className: 'ytmd-sq-text' });
  text.append(createEl('span', { className: 'ytmd-sq-title', text: opts.title }), createEl('span', { className: 'ytmd-sq-sub', text: opts.sub }));
  item.append(thumb, text);
  if (opts.actions.length) {
    const actions = createEl('div', { className: 'ytmd-sq-actions' });
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
    nodes.push(createEl('div', { className: 'ytmd-sq-heading', text: s.syncQueueNowPlaying }));
    nodes.push(row({ ...model.nowPlaying, sub: model.nowPlaying.artist, actions: [] }));
  }
  nodes.push(createEl('div', { className: 'ytmd-sq-heading', text: s.syncQueueTitle }));
  if (model.queue.length === 0) {
    nodes.push(createEl('p', { className: 'ytmd-sq-hint', text: canControl(model.myRole) ? s.syncQueueEmpty : s.syncQueueListenerHint }));
  }
  const moderates = model.myRole === 'host' || model.myRole === 'moderator';
  for (const item of model.queue) {
    const buttons: HTMLElement[] = [];
    if (canControl(model.myRole)) buttons.push(button(s.syncQueuePlayNow(item.title), PLAY_ICON, () => actions.play(item.id)));
    if (moderates || item.added_by_id === model.myId) {
      buttons.push(button(s.syncQueueRemove(item.title), REMOVE_ICON, () => actions.remove(item.id)));
    }
    const from = s.syncQueueFrom(item.added_by);
    nodes.push(row({ videoId: item.video_id, title: item.title, sub: item.artist ? `${item.artist} · ${from}` : from, actions: buttons }));
  }
  panel.replaceChildren(...nodes);
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
    panel ??= createEl('div', { id: PANEL_ID });
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
