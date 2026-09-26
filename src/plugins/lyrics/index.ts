import { YTMDPlugin, PluginContext, TrackInfo, PluginManifest } from '../types';
import manifest from './manifest.json';
import { createEl } from '../../utils/dom';
import { ensureKitStyles, openDialog, showToast } from '../../preload/ui/kit';
import { t } from '../../preload/ui/i18n';
import { PlayerBridge } from '../../preload/bridge';
import { isSyncGuest } from '../../preload/syncRole';
import { nextInQueue, songTags } from './songInfo';
import {
  CurrentLyrics,
  EMPTY_LYRICS,
  LyricsCandidate,
  activeLineIndex,
  activeWordIndex,
  providerName,
  toCurrentLyrics
} from '../../types/lyrics';

/** Lyrics come from the backend (src-tauri/src/lyrics), already parsed and
 * merged across providers; this plugin only shows them in YTM's Lyrics tab. */
let lyrics: CurrentLyrics = { ...EMPTY_LYRICS };
let loading = false;
let currentActiveIdx = -1;
let currentWordIdx = -1;
let currentSongKey = '';
let lastPosition = 0;
/** When `lastPosition` was reported (`performance.now()`): between the
 * player's ticks (~4 a second) the position is carried forward every frame,
 * so lines and words light up on time instead of in 250 ms steps. */
let lastTickAt = 0;
/** The furthest position shown for this song, so a tick that lands a hair
 * behind the carried-forward one doesn't step a line back. */
let shownPosition = 0;
/** Whether the Lyrics tab is on screen (checked with the tab poll, not per
 * frame: it needs layout). */
let lyricsVisible = false;
/** The song whose next song's lyrics were already looked up ahead. */
let prefetchedAfter = '';
/** Looking the next song up this far into the current one: late enough that
 * skipped songs don't trigger lookups, early enough to be ready in time. */
const PREFETCH_AFTER_SECS = 15;
/** Never carried forward further than this past the last tick. */
const MAX_CARRY_SECS = 1;
/** A step back smaller than this is measurement noise, not a seek. */
const NOISE_BACK_SECS = 0.3;
/** YTM's own lyrics text as it was when the song started (possibly the
 * previous song's); only text that differs from it is sent as `ytmPlain`. */
let staleYtmText = '';
let ytmTextSent = false;
let currentTrack: TrackInfo | null = null;
let cleanup: (() => void) | null = null;

// Pure staleness check, covered directly by src/tests/lyrics.test.ts: a
// `fetch_lyrics` response for one song must never be applied once the user
// has already moved on to a different track while it was in flight.
export const isCurrentSongKey = (requestedKey: string, latestKey: string): boolean =>
  requestedKey === latestKey;

/** Identifies a lookup the same way the backend does: the video id and the
 * title it goes with. A song's title can arrive late (the previous song's
 * title was once reported with the new id); a corrected title for the same
 * id must look the lyrics up again, not keep the wrong ones. */
export const songKeyOf = (track: Pick<TrackInfo, 'videoId' | 'title' | 'artist'>): string =>
  track.videoId ? `${track.videoId}|${track.title.trim().toLowerCase()}` : `${track.title} - ${track.artist}`;

export const LyricsPlugin: YTMDPlugin = {
  id: 'lyrics',
  manifest: manifest as PluginManifest,
  name: 'Native Synced Lyrics',
  description: 'Synchronized lyrics from several providers in the native Lyrics tab, with active highlighting and seek-on-click',
  defaultEnabled: true,

  onInit(ctx: PluginContext) {
    lyrics = { ...EMPTY_LYRICS };
    loading = false;
    currentActiveIdx = -1;
    currentWordIdx = -1;
    currentSongKey = '';
    staleYtmText = '';
    ytmTextSent = false;
    currentTrack = null;

    const style = document.createElement('style');
    style.id = 'ytmd-native-lyrics-styles';
    style.textContent = LYRICS_CSS;
    document.head.appendChild(style);
    ensureKitStyles();

    const checkTab = () => {
      unlockLyricsTabHeader();
      ensureLyricsMounted(ctx);
      offerYtmText(ctx);
      lyricsVisible = isLyricsTabVisible();
    };

    // Every frame while lyrics are on screen and playing; the classes only
    // change when the line or word does.
    let frame = 0;
    const onFrame = () => {
      frame = requestAnimationFrame(onFrame);
      if (!lyricsVisible || lyrics.synced.length === 0) return;
      const video = ctx.getVideoElement();
      if (!video || video.paused) return;
      const carried = Math.min(MAX_CARRY_SECS, (performance.now() - lastTickAt) / 1000) * (video.playbackRate || 1);
      showPosition(lastPosition + carried, true);
    };
    frame = requestAnimationFrame(onFrame);

    const onTabClick = () => {
      setTimeout(() => {
        unlockLyricsTabHeader();
        updateLyricsVisibility();
      }, 50);
      setTimeout(() => {
        updateLyricsVisibility();
      }, 250);
    };

    document.addEventListener('click', onTabClick, true);

    const pollInterval = window.setInterval(checkTab, 600);
    checkTab();

    // Offsets once lived in this page's localStorage; hand them to the
    // backend once so every window uses the same correction.
    migrateOffsets(ctx);

    const unlisten = ctx.events
      ? ctx.events.listen<unknown>('lyrics-changed', (e) => {
          const next = toCurrentLyrics(e.payload);
          if (!isForCurrentSong(next)) return;
          applyLyrics(ctx, next);
        })
      : null;

    cleanup = () => {
      cancelAnimationFrame(frame);
      clearInterval(pollInterval);
      document.removeEventListener('click', onTabClick, true);
      unlisten?.then((fn) => fn());
      style.remove();
      document.querySelectorAll('#ytmd-native-lyrics-wrapper').forEach((w) => w.remove());
    };
  },

  async onTrackChange(track: TrackInfo, ctx: PluginContext) {
    const songKey = songKeyOf(track);
    currentTrack = track;
    if (songKey === currentSongKey) return;

    currentSongKey = songKey;
    lyrics = { ...EMPTY_LYRICS, video_id: track.videoId ?? null };
    loading = true;
    currentActiveIdx = -1;
    currentWordIdx = -1;
    shownPosition = 0;
    staleYtmText = readYtmText();
    ytmTextSent = false;

    unlockLyricsTabHeader();
    renderCurrentLyrics(ctx);
    await requestLyrics(ctx, track, songKey, null);
  },

  onTick(currentTimeSecs: number, ctx: PluginContext) {
    lastPosition = currentTimeSecs;
    lastTickAt = performance.now();
    showPosition(currentTimeSecs, true);
    if (currentTimeSecs >= PREFETCH_AFTER_SECS) prefetchNext(ctx);
  },

  onDestroy() {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  }
};

const LYRICS_CSS = `
  /* Scoped to tabs unlockLyricsTabHeader() has explicitly matched by
     label — NOT blind tab position (nth-of-type), since a layout where
     "Tekst"/"Lyrics" isn't the 2nd tab would otherwise force
     pointer-events:auto on some unrelated tab. */
  .ytmd-lyrics-tab-unlocked {
    pointer-events: auto !important;
    cursor: pointer !important;
  }
  .ytmd-lyrics-tab-unlocked[disabled],
  .ytmd-lyrics-tab-unlocked[aria-disabled="true"] {
    opacity: 1 !important;
    color: var(--ytmd-text, #fff) !important;
  }

  /* Hide default un-synced text, spinners and unavailable messages inside lyrics tab ONLY */
  #tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-description-shelf-renderer,
  #tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-message-renderer,
  #tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] tp-yt-paper-spinner,
  ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-description-shelf-renderer,
  ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-message-renderer,
  ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] tp-yt-paper-spinner {
    display: none !important;
  }

  #ytmd-native-lyrics-wrapper {
    display: none !important;
    flex-direction: column;
    gap: 8px;
    padding: 24px 0 160px;
    max-width: 760px;
    margin: 0 auto;
    box-sizing: border-box;
    width: 100%;
  }

  /* Strict visibility: show ONLY inside the active lyrics tab renderer */
  ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"].iron-selected #ytmd-native-lyrics-wrapper,
  ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]:not([hidden]):not([aria-hidden="true"]) #ytmd-native-lyrics-wrapper {
    display: flex !important;
  }

  /* Never show inside queue / related / hidden tabs */
  ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"][hidden] #ytmd-native-lyrics-wrapper,
  ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"][aria-hidden="true"] #ytmd-native-lyrics-wrapper,
  ytmusic-tab-renderer:not([page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]) #ytmd-native-lyrics-wrapper,
  ytmusic-player-page ytmusic-tab-renderer:not(.iron-selected) #ytmd-native-lyrics-wrapper {
    display: none !important;
  }
  /* Same treatment as YTM's own timed lyrics: large display type,
     upcoming/past lines dimmed, the current line full white. Size and
     weight never change between states, so the text doesn't reflow
     as the active line moves. */
  .ytmd-native-lyric-line {
    font: 700 24px/32px var(--ytmd-font-display, "YouTube Sans", Roboto, Arial, sans-serif);
    color: rgba(255, 255, 255, 0.4);
    cursor: pointer;
    padding: 4px 0;
    user-select: none;
    word-break: break-word;
    transition: color 0.2s ease;
  }
  .ytmd-native-lyric-line:hover { color: rgba(255, 255, 255, 0.7); }
  .ytmd-native-lyric-line.active { color: #fff; }
  .ytmd-native-lyric-line.ytmd-plain { cursor: default; color: #fff; }
  /* Word-by-word: in the active line, words light up as they are sung. */
  .ytmd-native-lyric-line.active.ytmd-has-words .ytmd-lyric-word { color: rgba(255, 255, 255, 0.4); transition: color 0.1s linear; }
  .ytmd-native-lyric-line.active.ytmd-has-words .ytmd-lyric-word.ytmd-sung { color: #fff; }
  .ytmd-native-lyrics-status {
    padding: 48px 0;
    text-align: center;
    font: 400 16px/24px var(--ytmd-font, Roboto, Arial, sans-serif);
    color: var(--ytmd-text-secondary, rgba(255, 255, 255, 0.7));
  }
  .ytmd-native-lyrics-footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-top: 32px;
    font: 400 12px/16px var(--ytmd-font, Roboto, Arial, sans-serif);
    color: var(--ytmd-text-secondary, rgba(255, 255, 255, 0.7));
  }
  .ytmd-native-lyrics-footer .ytmd-lyrics-source { flex: 1; min-width: 120px; }
  .ytmd-native-lyrics-footer a.ytmd-lyrics-source { color: inherit; text-decoration: none; }
  .ytmd-native-lyrics-footer a.ytmd-lyrics-source:hover { text-decoration: underline; }
  .ytmd-lyrics-offset-value {
    min-width: 56px;
    text-align: center;
    font-variant-numeric: tabular-nums;
    color: var(--ytmd-text, #fff);
  }
  .ytmd-lyrics-pick-list { display: flex; flex-direction: column; margin: 8px -24px 0; max-height: 50vh; overflow-y: auto; }
  .ytmd-lyrics-pick-list .ytmd-menu-item { width: 100%; text-align: left; }
`;

function isForCurrentSong(next: CurrentLyrics): boolean {
  if (!currentTrack) return false;
  if (next.video_id && currentTrack.videoId) return next.video_id === currentTrack.videoId;
  return !next.video_id || next.video_id === currentTrack.videoId;
}

async function requestLyrics(ctx: PluginContext, track: TrackInfo, songKey: string, ytmPlain: string | null) {
  try {
    const result = toCurrentLyrics(
      await ctx.invoke(
        'fetch_lyrics',
        {
          videoId: track.videoId || null,
          artist: track.artist,
          title: track.title,
          albumName: track.album || null,
          duration: track.durationSecs || null,
          ytmPlain,
          artistAliases: songTags(PlayerBridge.getMoviePlayer()?.getPlayerResponse?.(), track.videoId)
        },
        // Providers each get 6 s; leave room for the slowest one.
        { timeoutMs: 15000 }
      )
    );
    if (!isCurrentSongKey(songKey, currentSongKey)) return;
    // The reply is the definitive answer, including "nothing found".
    loading = false;
    applyLyrics(ctx, result);
  } catch {
    if (!isCurrentSongKey(songKey, currentSongKey)) return;
    loading = false;
    renderCurrentLyrics(ctx);
  }
}

function applyLyrics(ctx: PluginContext, next: CurrentLyrics) {
  const onlyOffsetChanged =
    next.provider !== null &&
    next.provider === lyrics.provider &&
    next.synced.length === lyrics.synced.length &&
    next.plain === lyrics.plain &&
    next.video_id === lyrics.video_id &&
    !loading;
  // A provider-less payload for this song while we're loading is the
  // backend's "loading" broadcast, not the answer.
  if (loading && !next.provider && next.offset_secs === lyrics.offset_secs) return;
  lyrics = next;
  loading = false;
  if (onlyOffsetChanged) {
    const value = document.querySelector('.ytmd-lyrics-offset-value');
    if (value) value.textContent = formatOffset(next.offset_secs);
    highlight(lastPosition, false);
    return;
  }
  currentActiveIdx = -1;
  currentWordIdx = -1;
  renderCurrentLyrics(ctx);
  highlight(lastPosition, false);
}

/** Highlights `position`, never stepping back for a tick that lands a hair
 * behind the carried-forward position; a real seek back goes through. */
function showPosition(position: number, scroll: boolean) {
  if (position < shownPosition && shownPosition - position < NOISE_BACK_SECS) return;
  shownPosition = position;
  highlight(position, scroll);
}

function isLyricsTabVisible(): boolean {
  if (typeof document === 'undefined' || document.hidden) return false;
  const tab = document.querySelector<HTMLElement>(
    'ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"], #tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]'
  );
  return !!tab && !!document.getElementById('ytmd-native-lyrics-wrapper') && isElementVisible(tab);
}

/** Looks the next song in YTM's queue up ahead, once per song, so its
 * lyrics are cached when it starts. A Listen Together guest doesn't: the
 * host decides what's next. */
function prefetchNext(ctx: PluginContext) {
  if (prefetchedAfter === currentSongKey || isSyncGuest()) return;
  prefetchedAfter = currentSongKey;
  const next = nextInQueue(document.querySelectorAll('ytmusic-player-queue-item'));
  if (!next || next.videoId === currentTrack?.videoId) return;
  ctx
    .invoke('prefetch_lyrics', {
      videoId: next.videoId,
      title: next.title,
      artist: next.artist,
      duration: next.durationSecs
    })
    .catch(() => undefined);
}

/** Moves the active-line and sung-word classes to `position`. */
function highlight(position: number, scroll: boolean) {
  if (lyrics.synced.length === 0) return;
  const wrapper = document.getElementById('ytmd-native-lyrics-wrapper');
  if (!wrapper) return;
  const lineEls = wrapper.querySelectorAll<HTMLElement>('.ytmd-native-lyric-line');
  const activeIdx = activeLineIndex(lyrics.synced, position, lyrics.offset_secs);

  if (activeIdx !== currentActiveIdx) {
    lineEls[currentActiveIdx]?.classList.remove('active');
    lineEls[currentActiveIdx]?.querySelectorAll('.ytmd-sung').forEach((w) => w.classList.remove('ytmd-sung'));
    currentActiveIdx = activeIdx;
    currentWordIdx = -1;
    const activeEl = lineEls[activeIdx];
    if (activeEl) {
      activeEl.classList.add('active');
      const lyricsTab = document.querySelector<HTMLElement>(
        '#tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"], ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]'
      );
      if (scroll && lyricsTab && isElementVisible(lyricsTab)) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }

  const wordIdx = activeWordIndex(lyrics.synced[activeIdx], position, lyrics.offset_secs);
  if (wordIdx !== currentWordIdx) {
    const words = lineEls[activeIdx]?.querySelectorAll('.ytmd-lyric-word');
    words?.forEach((w, i) => w.classList.toggle('ytmd-sung', i <= wordIdx));
    currentWordIdx = wordIdx;
  }
}

/** Text of YTM's own lyrics shelf, if it has rendered one. */
function readYtmText(): string {
  const el = document.querySelector<HTMLElement>(
    'ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-description-shelf-renderer .description'
  );
  return el?.textContent?.trim() || '';
}

/** When no provider had lyrics but YTM loads its own text for this song
 * (it only does once the Lyrics tab is opened), use that. */
function offerYtmText(ctx: PluginContext) {
  if (ytmTextSent || loading || !currentTrack || lyrics.provider) return;
  const text = readYtmText();
  if (!text || text === staleYtmText) return;
  ytmTextSent = true;
  void requestLyrics(ctx, currentTrack, currentSongKey, text);
}

async function migrateOffsets(ctx: PluginContext) {
  const storage = safeStorage();
  const entries = [...loadOffsets(storage)];
  if (entries.length === 0) return;
  try {
    await ctx.invoke('import_lyrics_offsets', { entries });
    storage?.removeItem?.(OFFSETS_STORAGE_KEY);
  } catch (e) {
    console.warn('[Oscilla Lyrics] Offset migration failed, will retry next start:', e);
  }
}

/** The page's old per-song offset store (localStorage). */
export const OFFSETS_STORAGE_KEY = 'ytmd-lyrics-offsets';

type StorageLike = Pick<Storage, 'getItem'> & Partial<Pick<Storage, 'removeItem'>>;

function safeStorage(): StorageLike | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null; // access can throw when site data is blocked
  }
}

export function loadOffsets(storage: StorageLike | null): Map<string, number> {
  try {
    const raw = storage?.getItem(OFFSETS_STORAGE_KEY);
    if (!raw) return new Map();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Map();
    return new Map(
      parsed.filter(
        (e): e is [string, number] => Array.isArray(e) && typeof e[0] === 'string' && typeof e[1] === 'number'
      )
    );
  } catch {
    return new Map();
  }
}

export function formatOffset(offsetSecs: number): string {
  const sign = offsetSecs > 0 ? '+' : offsetSecs < 0 ? '−' : '';
  return `${sign}${Math.abs(offsetSecs).toFixed(1)} s`;
}

function isElementVisible(el: HTMLElement): boolean {
  if (!el || el.offsetParent === null || el.hasAttribute('hidden')) return false;
  const style = window.getComputedStyle(el);
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
}

type LyricsTabElement = HTMLElement & {
  disabled?: boolean;
  endpoint?: unknown;
  data?: { endpoint?: unknown };
};

/** True once the tab is already usable, so the 600ms poll doesn't keep
 * rewriting attributes on a Polymer element that's already in the state we
 * want (each write can re-trigger YTM's own property effects). */
export function isLyricsTabUnlocked(tab: {
  disabled?: boolean;
  hasAttribute(name: string): boolean;
  getAttribute(name: string): string | null;
  classList: { contains(token: string): boolean };
}): boolean {
  return (
    tab.disabled !== true &&
    !tab.hasAttribute('disabled') &&
    tab.getAttribute('aria-disabled') !== 'true' &&
    !tab.classList.contains('disabled') &&
    tab.classList.contains('ytmd-lyrics-tab-unlocked')
  );
}

function unlockLyricsTabHeader(): void {
  const tabs = document.querySelectorAll<LyricsTabElement>(
    '#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer'
  );
  tabs.forEach((tab) => {
    const text = tab.textContent?.toLowerCase() || '';
    if (
      text.includes('tekst') ||
      text.includes('lyrics') ||
      text.includes('paroles') ||
      text.includes('letras')
    ) {
      if (isLyricsTabUnlocked(tab)) return;
      tab.disabled = false;
      tab.removeAttribute('disabled');
      tab.removeAttribute('aria-disabled');
      tab.classList.remove('disabled');
      // pointer-events/cursor come from the .ytmd-lyrics-tab-unlocked rule
      // in this plugin's stylesheet, not inline style writes.
      tab.classList.add('ytmd-lyrics-tab-unlocked');

      // Supply a dummy endpoint so Polymer's toCommand() never crashes when selecting the tab on songs without native lyrics
      const dummyEndpoint = {
        toCommand: () => ({}),
        browseEndpoint: { browseId: 'FEmusic_lyrics' }
      };
      if (!tab.endpoint) {
        tab.endpoint = dummyEndpoint;
      }
      if (tab.data && !tab.data.endpoint) {
        tab.data.endpoint = dummyEndpoint;
      }
    }
  });
}

function isLyricsTabSelected(): boolean {
  const tabs = document.querySelectorAll<HTMLElement>(
    '#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer'
  );
  for (const tab of Array.from(tabs)) {
    const text = tab.textContent?.toLowerCase() || '';
    if (
      text.includes('tekst') ||
      text.includes('lyrics') ||
      text.includes('paroles') ||
      text.includes('letras')
    ) {
      if (
        tab.classList.contains('iron-selected') ||
        tab.getAttribute('aria-selected') === 'true' ||
        tab.classList.contains('selected')
      ) {
        return true;
      }
    }
  }

  const tabRenderer = document.querySelector<HTMLElement>(
    'ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]'
  );
  if (tabRenderer) {
    if (
      (tabRenderer.classList.contains('iron-selected') || !tabRenderer.hasAttribute('hidden')) &&
      tabRenderer.getAttribute('aria-hidden') !== 'true'
    ) {
      return true;
    }
  }

  return false;
}

function updateLyricsVisibility(): void {
  const wrapper = document.getElementById('ytmd-native-lyrics-wrapper');
  if (!wrapper) return;
  const isSelected = isLyricsTabSelected();
  wrapper.style.setProperty('display', isSelected ? 'flex' : 'none', 'important');
}

function ensureLyricsMounted(ctx: PluginContext): void {
  const tabRenderer = document.querySelector<HTMLElement>(
    'ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]'
  );
  if (!tabRenderer) {
    return;
  }

  let wrapper = document.getElementById('ytmd-native-lyrics-wrapper');
  if (!wrapper || !tabRenderer.contains(wrapper)) {
    if (!wrapper) {
      wrapper = createEl('div', { id: 'ytmd-native-lyrics-wrapper' });
    }
    tabRenderer.appendChild(wrapper);
    currentActiveIdx = -1;
    currentWordIdx = -1;
    renderCurrentLyrics(ctx);
    highlight(lastPosition, false);
  }

  updateLyricsVisibility();
}

function chip(text: string, tooltip: string, onClick: () => void): HTMLButtonElement {
  const btn = createEl('button', { className: 'ytmd-chip', text });
  btn.type = 'button';
  btn.dataset.ytmdTooltip = tooltip;
  btn.setAttribute('aria-label', tooltip);
  btn.addEventListener('click', onClick);
  return btn;
}

function sourceLabel(): HTMLElement {
  const text = t().lyricsSource(providerName(lyrics.provider, t().lyricsLocalFiles));
  if (lyrics.source_url) {
    const link = createEl('a', { className: 'ytmd-lyrics-source', text });
    link.href = lyrics.source_url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return link;
  }
  return createEl('span', { className: 'ytmd-lyrics-source', text });
}

function buildFooter(ctx: PluginContext, withOffset: boolean): HTMLElement {
  const footer = createEl('div', { className: 'ytmd-native-lyrics-footer' });
  footer.append(sourceLabel());
  if (withOffset) {
    const valDisplay = createEl('span', { className: 'ytmd-lyrics-offset-value', text: formatOffset(lyrics.offset_secs) });
    const shift = (delta: number | null) => {
      const next = delta === null ? 0 : Math.round((lyrics.offset_secs + delta) * 10) / 10;
      ctx.invoke('set_lyrics_offset', { offsetSecs: next }).catch((e) => console.warn('[Oscilla Lyrics] offset:', e));
    };
    // Positive offset = lyrics run ahead of the audio (see highlight()).
    footer.append(
      createEl('span', { text: t().lyricsOffset }),
      chip('−0.5 s', t().lyricsLater, () => shift(-0.5)),
      valDisplay,
      chip('+0.5 s', t().lyricsEarlier, () => shift(0.5)),
      chip(t().lyricsReset, t().lyricsReset, () => shift(null))
    );
  }
  footer.append(chip(t().lyricsWrong, t().lyricsPickTitle, () => void openPicker(ctx)));
  return footer;
}

async function openPicker(ctx: PluginContext) {
  const list = createEl('div', { className: 'ytmd-lyrics-pick-list' });
  list.append(createEl('div', { className: 'ytmd-native-lyrics-status', text: t().lyricsPickLoading }));
  const dialog = openDialog({
    id: 'ytmd-lyrics-picker',
    title: t().lyricsPickTitle,
    body: [list],
    actions: [{ label: t().close }]
  });

  let candidates: LyricsCandidate[] = [];
  try {
    candidates = ((await ctx.invoke('list_lyrics_candidates', {}, { timeoutMs: 15000 })) as LyricsCandidate[]) || [];
  } catch {
    candidates = [];
  }
  if (!list.isConnected) return;
  if (candidates.length === 0) {
    list.replaceChildren(createEl('div', { className: 'ytmd-native-lyrics-status', text: t().lyricsPickNone }));
    return;
  }

  list.replaceChildren(
    ...candidates.map((c) => {
      const row = createEl('button', { className: 'ytmd-menu-item' });
      row.type = 'button';
      const text = createEl('span', { className: 'ytmd-menu-item-text' });
      const kind = c.synced ? t().lyricsTimed : t().lyricsTextOnly;
      text.append(
        createEl('span', { text: `${providerName(c.provider, t().lyricsLocalFiles)} · ${kind}` }),
        createEl('span', { className: 'ytmd-menu-item-sub', text: `${c.title} — ${c.artist}` }),
        createEl('span', { className: 'ytmd-menu-item-sub', text: c.preview })
      );
      row.append(text);
      if (c.selected) row.append(createEl('span', { className: 'ytmd-menu-item-hint', text: t().lyricsCurrent }));
      row.addEventListener('click', async () => {
        dialog.close();
        try {
          applyLyrics(ctx, toCurrentLyrics(await ctx.invoke('pick_lyrics', { provider: c.provider, id: c.id })));
        } catch {
          showToast(t().lyricsPickFailed);
        }
      });
      return row;
    })
  );
}

function renderCurrentLyrics(ctx: PluginContext): void {
  const wrapper = document.getElementById('ytmd-native-lyrics-wrapper');
  if (!wrapper) return;

  if (loading) {
    wrapper.replaceChildren(createEl('div', { className: 'ytmd-native-lyrics-status', text: t().lyricsLoading }));
  } else if (lyrics.synced.length > 0) {
    wrapper.replaceChildren(
      ...lyrics.synced.map((line) => {
        const el = createEl('div', { className: 'ytmd-native-lyric-line' });
        if (line.words?.length) {
          el.classList.add('ytmd-has-words');
          el.append(...line.words.map((w) => createEl('span', { className: 'ytmd-lyric-word', text: w.text })));
        } else {
          el.textContent = line.text;
        }
        el.addEventListener('click', () => PlayerBridge.seekTo(Math.max(0, line.t - lyrics.offset_secs)));
        return el;
      }),
      buildFooter(ctx, true)
    );
  } else if (lyrics.plain) {
    wrapper.replaceChildren(
      ...lyrics.plain
        .split('\n')
        .map((line) => createEl('div', { className: 'ytmd-native-lyric-line ytmd-plain', text: line })),
      buildFooter(ctx, false)
    );
  } else {
    const nodes: Node[] = [createEl('div', { className: 'ytmd-native-lyrics-status', text: t().lyricsNone })];
    if (currentTrack) nodes.push(buildFooterNoSource(ctx));
    wrapper.replaceChildren(...nodes);
  }
}

/** Footer for "nothing found": no source, just the picker. */
function buildFooterNoSource(ctx: PluginContext): HTMLElement {
  const footer = createEl('div', { className: 'ytmd-native-lyrics-footer' });
  footer.append(createEl('span', { className: 'ytmd-lyrics-source' }), chip(t().lyricsWrong, t().lyricsPickTitle, () => void openPicker(ctx)));
  return footer;
}
