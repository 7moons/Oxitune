/**
 * The YTM page's side of the phone remote. `remote_server.rs` sends phone
 * requests as `remote-action` events and waits for `remote_reply`; while a
 * phone is connected this also reports what the phone shows (volume, like
 * state, queue, ...) through `remote_publish`.
 *
 * Queue edits and enqueue go through the queue element's own store
 * (`#queue`'s `dispatch`), the way YTM's own queue UI changes it: no style
 * or property writes on Polymer elements, only the actions its reducer
 * already handles. Song lookups for enqueue use YTM's `music/get_queue`
 * through the app's `networkManager`, which signs requests like YTM does.
 */
import type { PluginContext } from '../types';
import { PlayerBridge } from '../../preload/bridge';
import { getPlayerVolumePercent, isPlayerMuted } from '../../preload/playerVolume';
import { navigateToVideo, routeRoomPlayVideo } from '../sync-room';
import {
  insertIndex,
  parseSearchResults,
  queueEntriesFromItems,
  resolveQueueIndex,
  shouldPublishState,
  VIDEO_ID_RE,
  type PublishedPageState
} from './ytm';

type RemoteAction =
  | { kind: 'command'; command: string }
  | { kind: 'seek'; position_secs: number }
  | { kind: 'volume'; volume: number }
  | { kind: 'queue_jump'; item_id: string }
  | { kind: 'queue_move'; item_id: string; to_index: number }
  | { kind: 'queue_remove'; item_id: string }
  | { kind: 'search'; query: string }
  | { kind: 'play'; video_id: string }
  | { kind: 'enqueue'; video_id: string; next: boolean };

interface RemoteActionEvent {
  id: number | null;
  action: RemoteAction;
}

interface QueueStore {
  getState(): { queue?: { items?: unknown[]; queueContextParams?: unknown; nextQueueItemId?: unknown } };
}

type QueueElement = HTMLElement & {
  dispatch?: (action: { type: string; payload?: unknown }) => void;
  queue?: { store?: { store?: QueueStore } };
};

type AppElement = HTMLElement & {
  networkManager?: { fetch: (path: string, body: Record<string, unknown>) => Promise<unknown> };
};

/** ytmusicapi's "Songs" search filter. */
const SONGS_FILTER = 'EgWKAQIIAWoMEA4QChADEAQQCRAF';
const STATE_POLL_MS = 1000;
const QUEUE_POLL_MS = 2000;

function queueElement(): QueueElement | null {
  return document.querySelector<QueueElement>('#queue');
}

function queueItems(): unknown[] {
  const items = queueElement()?.queue?.store?.store?.getState().queue?.items;
  return Array.isArray(items) ? items : [];
}

function dispatchQueue(type: string, payload?: unknown): void {
  const queue = queueElement();
  if (!queue?.dispatch) throw new Error('remote.error.noQueue');
  queue.dispatch({ type, payload });
}

function network(): NonNullable<AppElement['networkManager']> {
  const nm = document.querySelector<AppElement>('ytmusic-app')?.networkManager;
  if (!nm || typeof nm.fetch !== 'function') throw new Error('remote.error.unsupported');
  return nm;
}

async function search(query: string) {
  const nm = network();
  let results = parseSearchResults(await nm.fetch('/search', { query, params: SONGS_FILTER }));
  // A filter YTM stopped accepting comes back empty; the unfiltered
  // search still has the songs.
  if (results.length === 0) results = parseSearchResults(await nm.fetch('/search', { query }));
  return results;
}

async function enqueue(videoId: string, next: boolean): Promise<void> {
  const store = queueElement()?.queue?.store?.store;
  if (!store) throw new Error('remote.error.noQueue');
  const state = store.getState().queue ?? {};
  const response = await network().fetch('/music/get_queue', {
    queueContextParams: state.queueContextParams,
    queueInsertPosition: next ? 'INSERT_AFTER_CURRENT_VIDEO' : 'INSERT_AT_END',
    videoIds: [videoId]
  });
  const datas = (response as { queueDatas?: unknown[] } | null)?.queueDatas;
  const items = Array.isArray(datas)
    ? datas.map((d) => (d && typeof d === 'object' && 'content' in d ? (d as { content: unknown }).content : null)).filter(Boolean)
    : [];
  if (items.length === 0) throw new Error('remote.error.unsupported');
  const current = queueItems();
  dispatchQueue('ADD_ITEMS', {
    nextQueueItemId: store.getState().queue?.nextQueueItemId,
    index: insertIndex(current, next),
    items,
    shuffleEnabled: false,
    shouldAssignIds: true
  });
}

function queueIndex(itemId: string): number {
  const index = resolveQueueIndex(queueItems(), itemId);
  if (index < 0) throw new Error('remote.error.gone');
  return index;
}

function readAccent(): PublishedPageState['accent'] {
  const css = getComputedStyle(document.documentElement);
  const primary = css.getPropertyValue('--ytmd-accent-primary').trim();
  const secondary = css.getPropertyValue('--ytmd-accent-secondary').trim();
  const accent = css.getPropertyValue('--ytmd-accent').trim();
  return primary && secondary && accent ? { primary, secondary, accent } : null;
}

type MoviePlayer = HTMLElement & { getCurrentTime?: () => number };

function readPageState(): PublishedPageState {
  const video = PlayerBridge.getVideo();
  const player = document.getElementById('movie_player') as MoviePlayer | null;
  const t = player?.getCurrentTime?.();
  return {
    playing: !!video && !video.paused && !video.ended,
    position_secs: typeof t === 'number' && Number.isFinite(t) ? t : video?.currentTime ?? 0,
    sampled_at_ms: Date.now(),
    volume: video ? getPlayerVolumePercent(video) / 100 : 1,
    muted: video ? isPlayerMuted(video) : false,
    like: PlayerBridge.getLikeStatus(),
    shuffle: PlayerBridge.isShuffleOn(),
    repeat: PlayerBridge.getRepeatMode(),
    accent: readAccent()
  };
}

async function perform(ctx: PluginContext, action: RemoteAction): Promise<unknown> {
  switch (action.kind) {
    case 'command':
      if (action.command === 'shuffle') PlayerBridge.toggleShuffle();
      else if (action.command === 'repeat') PlayerBridge.cycleRepeat();
      // Room-aware: a guest's skip goes to the host.
      else ctx.sendPlayerCommand(action.command);
      return null;
    case 'seek':
      PlayerBridge.seekTo(action.position_secs);
      return null;
    case 'volume':
      PlayerBridge.setVolume(action.volume);
      return null;
    case 'play':
      if (!VIDEO_ID_RE.test(action.video_id)) throw new Error('remote.error.invalid');
      if (!routeRoomPlayVideo(action.video_id)) navigateToVideo(action.video_id);
      return null;
    case 'search':
      return search(action.query);
    case 'enqueue':
      await enqueue(action.video_id, action.next);
      return null;
    case 'queue_jump':
      dispatchQueue('SET_INDEX', queueIndex(action.item_id));
      return null;
    case 'queue_remove':
      dispatchQueue('REMOVE_ITEM', queueIndex(action.item_id));
      return null;
    case 'queue_move': {
      const fromIndex = queueIndex(action.item_id);
      const toIndex = Math.max(0, Math.min(action.to_index, queueItems().length - 1));
      dispatchQueue('MOVE_ITEM', { fromIndex, toIndex });
      return null;
    }
  }
}

let unlisteners: (() => void)[] = [];
let pollTimers: number[] = [];
let lastState: PublishedPageState | null = null;
let lastQueueJson = '';

function stopPublishing() {
  pollTimers.forEach((t) => clearInterval(t));
  pollTimers = [];
  lastState = null;
  lastQueueJson = '';
}

function startPublishing(ctx: PluginContext) {
  if (pollTimers.length > 0) return;
  const publishState = () => {
    const next = readPageState();
    if (!shouldPublishState(lastState, next)) return;
    lastState = next;
    ctx.invoke('remote_publish', { kind: 'state', data: next }).catch(() => undefined);
  };
  const publishQueue = () => {
    const entries = queueEntriesFromItems(queueItems());
    const json = JSON.stringify(entries);
    if (json === lastQueueJson) return;
    lastQueueJson = json;
    ctx.invoke('remote_publish', { kind: 'queue', data: entries }).catch(() => undefined);
  };
  publishState();
  publishQueue();
  pollTimers.push(window.setInterval(publishState, STATE_POLL_MS), window.setInterval(publishQueue, QUEUE_POLL_MS));
}

function setClients(ctx: PluginContext, count: number) {
  if (count > 0) startPublishing(ctx);
  else stopPublishing();
}

export function startRemoteHost(ctx: PluginContext): void {
  const events = ctx.events;
  if (!events) return;
  events
    .listen<RemoteActionEvent>('remote-action', ({ payload }) => {
      if (!payload?.action) return;
      perform(ctx, payload.action).then(
        (data) => {
          if (payload.id != null) ctx.invoke('remote_reply', { id: payload.id, ok: true, data: data ?? null }).catch(() => undefined);
          // Show the result right away instead of at the next poll.
          lastState = null;
          lastQueueJson = '';
        },
        (e: unknown) => {
          const error = e instanceof Error ? e.message : String(e);
          console.warn('[Oscilla Remote] action failed:', payload.action.kind, error);
          if (payload.id != null) ctx.invoke('remote_reply', { id: payload.id, ok: false, error }).catch(() => undefined);
        }
      );
    })
    .then((u) => unlisteners.push(u));
  events.listen<number>('remote-clients', ({ payload }) => setClients(ctx, payload)).then((u) => unlisteners.push(u));
  ctx
    .invoke('remote_clients')
    .then((count) => setClients(ctx, typeof count === 'number' ? count : 0))
    .catch(() => undefined);
}

export function stopRemoteHost(): void {
  unlisteners.forEach((u) => u());
  unlisteners = [];
  stopPublishing();
}
