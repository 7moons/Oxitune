/**
 * Reading YouTube Music's own data for the phone remote: search responses
 * and the player queue's store. Pure functions over the JSON YTM already
 * has, so they're unit-tested with fixtures (src/tests/remote_page.test.ts).
 */

export interface RemoteSearchResult {
  video_id: string;
  title: string;
  subtitle: string;
  thumbnail: string | null;
}

export interface RemoteQueueEntry {
  id: string;
  video_id: string;
  title: string;
  artist: string;
  thumbnail: string | null;
  current: boolean;
}

type Json = Record<string, unknown>;

const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const get = (v: unknown, ...path: (string | number)[]): unknown =>
  path.reduce<unknown>((cur, key) => (cur == null ? undefined : (cur as Record<string | number, unknown>)[key]), v);

export const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

function runsText(text: unknown): string {
  const runs = get(text, 'runs');
  if (Array.isArray(runs)) return runs.map((r) => (typeof get(r, 'text') === 'string' ? get(r, 'text') : '')).join('');
  const simple = get(text, 'simpleText');
  return typeof simple === 'string' ? simple : '';
}

function lastThumbnail(thumbnails: unknown): string | null {
  if (!Array.isArray(thumbnails) || thumbnails.length === 0) return null;
  const url = get(thumbnails[thumbnails.length - 1], 'url');
  return typeof url === 'string' ? url : null;
}

function flexText(renderer: unknown, column: number): string {
  return runsText(get(renderer, 'flexColumns', column, 'musicResponsiveListItemFlexColumnRenderer', 'text'));
}

function fromListItem(r: unknown): RemoteSearchResult | null {
  const videoId =
    get(r, 'playlistItemData', 'videoId') ??
    get(r, 'overlay', 'musicItemThumbnailOverlayRenderer', 'content', 'musicPlayButtonRenderer', 'playNavigationEndpoint', 'watchEndpoint', 'videoId');
  if (typeof videoId !== 'string' || !VIDEO_ID_RE.test(videoId)) return null;
  return {
    video_id: videoId,
    title: flexText(r, 0),
    subtitle: flexText(r, 1),
    thumbnail: lastThumbnail(get(r, 'thumbnail', 'musicThumbnailRenderer', 'thumbnail', 'thumbnails'))
  };
}

function fromTopCard(r: unknown): RemoteSearchResult | null {
  const videoId = get(r, 'title', 'runs', 0, 'navigationEndpoint', 'watchEndpoint', 'videoId');
  if (typeof videoId !== 'string' || !VIDEO_ID_RE.test(videoId)) return null;
  return {
    video_id: videoId,
    title: runsText(get(r, 'title')),
    subtitle: runsText(get(r, 'subtitle')),
    thumbnail: lastThumbnail(get(r, 'thumbnail', 'musicThumbnailRenderer', 'thumbnail', 'thumbnails'))
  };
}

/** Playable songs/videos in a YTM `search` response, in page order,
 * without duplicates. Albums, artists and playlists (no video id) are left
 * out: the phone can only play or queue a song. */
export function parseSearchResults(response: unknown, limit = 20): RemoteSearchResult[] {
  const out: RemoteSearchResult[] = [];
  const seen = new Set<string>();
  const visit = (node: unknown, depth: number) => {
    if (out.length >= limit || depth > 40) return;
    if (Array.isArray(node)) {
      for (const child of node) visit(child, depth + 1);
      return;
    }
    if (!isObj(node)) return;
    for (const [key, value] of Object.entries(node)) {
      let hit: RemoteSearchResult | null = null;
      if (key === 'musicResponsiveListItemRenderer') hit = fromListItem(value);
      else if (key === 'musicCardShelfRenderer') hit = fromTopCard(value);
      if (hit && !seen.has(hit.video_id)) {
        seen.add(hit.video_id);
        out.push(hit);
        if (out.length >= limit) return;
      }
      visit(value, depth + 1);
    }
  };
  visit(response, 0);
  return out;
}

/** The video renderer inside one queue store item (plain or wrapped, the
 * wrapped form being a song with an alternate music-video version). */
export function queueItemRenderer(item: unknown): Json | null {
  const r =
    get(item, 'playlistPanelVideoRenderer') ??
    get(item, 'playlistPanelVideoWrapperRenderer', 'primaryRenderer', 'playlistPanelVideoRenderer');
  return isObj(r) ? r : null;
}

/** Queue store items as phone entries. The id pairs the index with the
 * video id so an action on a queue that changed meanwhile can be caught. */
export function queueEntriesFromItems(items: unknown[]): RemoteQueueEntry[] {
  const out: RemoteQueueEntry[] = [];
  items.forEach((item, index) => {
    const r = queueItemRenderer(item);
    const videoId = get(r, 'videoId');
    if (!r || typeof videoId !== 'string') return;
    out.push({
      id: `${index}:${videoId}`,
      video_id: videoId,
      title: runsText(get(r, 'title')),
      artist: runsText(get(r, 'shortBylineText')) || runsText(get(r, 'longBylineText')),
      thumbnail: lastThumbnail(get(r, 'thumbnail', 'thumbnails')),
      current: get(r, 'selected') === true
    });
  });
  return out;
}

/** The current index of the queue item a phone referred to, or -1 when it
 * is gone. The index is trusted only while the same song is still there;
 * otherwise the song is looked up (the queue shifted meanwhile). */
export function resolveQueueIndex(items: unknown[], itemId: string): number {
  const sep = itemId.indexOf(':');
  if (sep <= 0) return -1;
  const index = Number(itemId.slice(0, sep));
  const videoId = itemId.slice(sep + 1);
  const at = Number.isInteger(index) ? queueItemRenderer(items[index]) : null;
  if (at && get(at, 'videoId') === videoId) return index;
  return items.findIndex((item) => get(queueItemRenderer(item), 'videoId') === videoId);
}

/** Where `ADD_ITEMS` inserts: after the playing song for "play next",
 * else at the end. */
export function insertIndex(items: unknown[], next: boolean): number {
  if (!next) return items.length;
  const current = items.findIndex((item) => get(queueItemRenderer(item), 'selected') === true);
  return current >= 0 ? current + 1 : items.length;
}

/** The page state a phone shows, minus the position, which moves on its
 * own; see `shouldPublishState`. */
export interface PublishedPageState {
  playing: boolean;
  position_secs: number;
  sampled_at_ms: number;
  volume: number;
  muted: boolean;
  like: 'like' | 'dislike' | 'none';
  shuffle: boolean;
  repeat: 'none' | 'all' | 'one';
  accent: { primary: string; secondary: string; accent: string } | null;
}

/** Send only when something visible changed, the position jumped (a
 * seek), or a while has passed; the phone extrapolates in between. */
export function shouldPublishState(prev: PublishedPageState | null, next: PublishedPageState, maxAgeMs = 15_000): boolean {
  if (!prev) return true;
  const { position_secs: p0, sampled_at_ms: t0, ...a } = prev;
  const { position_secs: p1, sampled_at_ms: t1, ...b } = next;
  if (JSON.stringify(a) !== JSON.stringify(b)) return true;
  if (t1 - t0 >= maxAgeMs) return true;
  const expected = prev.playing ? p0 + (t1 - t0) / 1000 : p0;
  return Math.abs(p1 - expected) > 1.5;
}
