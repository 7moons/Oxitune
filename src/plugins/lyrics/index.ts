import { YTMDPlugin, PluginContext, TrackInfo, PluginManifest } from '../types';
import manifest from './manifest.json';
import { createEl } from '../../utils/dom';
import { ICONS, ensureKitStyles, icon, openDialog, showToast } from '../../preload/ui/kit';
import { t } from '../../preload/ui/i18n';
import { PlayerBridge } from '../../preload/bridge';
import { isSyncGuest } from '../../preload/syncRole';
import { nextInQueue, songTags } from './songInfo';
import { CurrentLyrics, EMPTY_LYRICS, LyricsCandidate, providerName, toCurrentLyrics, toLineTexts } from '../../types/lyrics';
import { LYRICS_CSS } from './styles';
import { LyricsExtras, LyricsView, NO_EXTRAS } from './view';
import { LyricsFullscreen } from './fullscreen';

/** Lyrics come from the backend (src-tauri/src/lyrics), already parsed and
 * merged across providers; this plugin only shows them: in YTM's Lyrics
 * tab and in its own fullscreen view (view.ts, fullscreen.ts). */
let lyrics: CurrentLyrics = { ...EMPTY_LYRICS };
let loading = false;
let currentSongKey = '';
/** The view in the Lyrics tab, and the fullscreen one. */
let tabView: LyricsView | null = null;
let fullscreen: LyricsFullscreen | null = null;
/** The lyrics the fullscreen view was last built for (see `lyricsStamp`). */
let fullscreenStamp = '';
let extras: LyricsExtras = { ...NO_EXTRAS };
/** What the translation / romanization showing was asked for; '' = none. */
let translationFor = '';
let romanizationFor = '';
/** The song whose Lyrics tab is still to be opened (`lyrics_auto_open`). */
let autoOpenPending = '';

/** The lyrics settings the page uses (AppConfig's `lyrics_*` fields). */
export interface LyricsPrefs {
  translate: boolean;
  lang: string;
  romanize: boolean;
  autoOpen: boolean;
  effects: boolean;
}

export const DEFAULT_PREFS: LyricsPrefs = { translate: false, lang: 'en', romanize: false, autoOpen: false, effects: true };

/** `prev` with whatever lyrics settings `config` carries: the whole config
 * at start, only the changed fields in a `config-updated` event. */
export function readPrefs(config: Record<string, unknown>, prev: LyricsPrefs = DEFAULT_PREFS): LyricsPrefs {
  const bool = (key: string, fallback: boolean) => (typeof config[key] === 'boolean' ? (config[key] as boolean) : fallback);
  const lang = config.lyrics_translate_lang;
  return {
    translate: bool('lyrics_translate_enabled', prev.translate),
    lang: typeof lang === 'string' && /^[A-Za-z]{2,3}(-[A-Za-z]{2,4})?$/.test(lang) ? lang : prev.lang,
    romanize: bool('lyrics_romanize_enabled', prev.romanize),
    autoOpen: bool('lyrics_auto_open', prev.autoOpen),
    effects: bool('lyrics_effects', prev.effects)
  };
}

let prefs: LyricsPrefs = { ...DEFAULT_PREFS };

/** Identifies the lyrics showing, so a translation asked for other lyrics
 * (another song, or another pick for this one) is never shown under them. */
export const lyricsStamp = (l: Pick<CurrentLyrics, 'video_id' | 'provider' | 'synced' | 'plain'>, songKey: string): string =>
  `${songKey}|${l.video_id ?? ''}|${l.provider ?? ''}|${l.synced.length}|${l.plain?.length ?? 0}`;

const hasText = (): boolean => lyrics.synced.length > 0 || !!lyrics.plain;
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
  description: 'Synchronized lyrics from several providers in the native Lyrics tab and in full screen: word by word, with translation, romanization and seek-on-click',
  defaultEnabled: true,

  onInit(ctx: PluginContext) {
    lyrics = { ...EMPTY_LYRICS };
    loading = false;
    currentSongKey = '';
    staleYtmText = '';
    ytmTextSent = false;
    currentTrack = null;
    extras = { ...NO_EXTRAS };
    translationFor = '';
    romanizationFor = '';
    fullscreenStamp = '';
    autoOpenPending = '';
    prefs = readPrefs(ctx.config);

    const seekTo = (secs: number) => PlayerBridge.seekTo(secs);
    tabView = new LyricsView({ onSeek: seekTo, resumeLabel: t().lyricsResumeSync });
    tabView.setEffects(prefs.effects);
    fullscreen = new LyricsFullscreen({
      labels: {
        close: t().close,
        previous: t().playerPrevious,
        next: t().playerNext,
        play: t().playerPlay,
        pause: t().playerPause,
        resume: t().lyricsResumeSync
      },
      onCommand: (command) => ctx.sendPlayerCommand(command),
      onSeek: seekTo,
      onClose: () => tabView?.scrollToCurrent()
    });
    fullscreen.view.setEffects(prefs.effects);

    const style = document.createElement('style');
    style.id = 'ytmd-native-lyrics-styles';
    style.textContent = LYRICS_CSS;
    document.head.appendChild(style);
    ensureKitStyles();

    const checkTab = () => {
      // Settings loaded late (or changed without an event) still arrive.
      applyPrefs(ctx, readPrefs(ctx.config, prefs));
      unlockLyricsTabHeader();
      ensureLyricsMounted(ctx);
      offerYtmText(ctx);
      openLyricsTabIfWanted();
      lyricsVisible = isLyricsTabVisible();
    };

    // Every frame while lyrics are on screen and playing; the classes and
    // the word fill only change when the line or word does.
    let frame = 0;
    const onFrame = () => {
      frame = requestAnimationFrame(onFrame);
      if ((!lyricsVisible && !fullscreen?.isOpen) || lyrics.synced.length === 0) return;
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
    // The lyrics settings, changed in Settings or by the switches under the lyrics.
    const unlistenConfig = ctx.events
      ? ctx.events.listen<unknown>('config-updated', (e) => {
          if (e.payload && typeof e.payload === 'object') applyPrefs(ctx, readPrefs(e.payload as Record<string, unknown>, prefs));
        })
      : null;

    cleanup = () => {
      cancelAnimationFrame(frame);
      clearInterval(pollInterval);
      document.removeEventListener('click', onTabClick, true);
      unlisten?.then((fn) => fn()).catch(() => undefined);
      unlistenConfig?.then((fn) => fn()).catch(() => undefined);
      fullscreen?.close();
      fullscreen = null;
      tabView = null;
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
    shownPosition = 0;
    staleYtmText = readYtmText();
    ytmTextSent = false;
    extras = { ...NO_EXTRAS };
    translationFor = '';
    romanizationFor = '';
    autoOpenPending = prefs.autoOpen ? songKey : '';

    unlockLyricsTabHeader();
    tabView?.setLyrics(lyrics, extras);
    renderCurrentLyrics(ctx);
    await requestLyrics(ctx, track, songKey, null);
  },

  onPlaybackChange(isPlaying: boolean) {
    fullscreen?.setPlaying(isPlaying);
  },

  onTick(currentTimeSecs: number, ctx: PluginContext) {
    lastPosition = currentTimeSecs;
    lastTickAt = performance.now();
    showPosition(currentTimeSecs, true);
    const duration = currentTrack?.durationSecs ?? 0;
    fullscreen?.setProgress(currentTimeSecs, duration);
    if (lyrics.synced.length === 0 && duration > 0) {
      const progress = currentTimeSecs / duration;
      tabView?.updatePlain(progress, lyricsVisible);
      if (fullscreen?.isOpen) fullscreen.view.updatePlain(progress, true);
    }
    if (currentTimeSecs >= PREFETCH_AFTER_SECS) prefetchNext(ctx);
  },

  onDestroy() {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  }
};

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
    tabView?.setOffset(next.offset_secs);
    fullscreen?.view.setOffset(next.offset_secs);
    highlight(lastPosition, false);
    return;
  }
  // Other lyrics: what was translated belongs to the ones before.
  extras = { ...NO_EXTRAS };
  translationFor = '';
  romanizationFor = '';
  tabView?.setLyrics(lyrics, extras);
  renderCurrentLyrics(ctx);
  highlight(lastPosition, false);
  void loadExtras(ctx);
}

/** New lyrics settings: the switches, the effects and the extra lines follow. */
function applyPrefs(ctx: PluginContext, next: LyricsPrefs) {
  const changed = (Object.keys(next) as (keyof LyricsPrefs)[]).some((k) => next[k] !== prefs[k]);
  prefs = next;
  if (!changed) return;
  tabView?.setEffects(prefs.effects);
  fullscreen?.view.setEffects(prefs.effects);
  renderCurrentLyrics(ctx);
  void loadExtras(ctx);
}

function showExtras() {
  tabView?.setExtras(extras);
  if (fullscreen?.isOpen) fullscreen.view.setExtras(extras);
}

/** Fetches the translation and the romanization the settings ask for, for
 * the lyrics showing; drops them when the settings no longer do. */
async function loadExtras(ctx: PluginContext) {
  const stamp = hasText() && !loading ? lyricsStamp(lyrics, currentSongKey) : '';
  const stillShowing = () => stamp !== '' && stamp === lyricsStamp(lyrics, currentSongKey);
  const sameSong = (videoId: string | null) => !videoId || !lyrics.video_id || videoId === lyrics.video_id;
  const anyLine = (lines: (string | null)[]) => (lines.some((l) => l !== null) ? lines : null);

  const wantTranslation = prefs.translate && stamp !== '' ? `${stamp}|${prefs.lang}` : '';
  if (wantTranslation !== translationFor) {
    translationFor = wantTranslation;
    extras = { ...extras, translation: null };
    showExtras();
    if (wantTranslation) {
      try {
        const reply = toLineTexts(await ctx.invoke('translate_lyrics', { lang: prefs.lang }, { timeoutMs: 20000 }));
        if (translationFor === wantTranslation && stillShowing() && sameSong(reply.video_id)) {
          extras = { ...extras, translation: anyLine(reply.lines) };
          showExtras();
        }
      } catch {
        if (translationFor === wantTranslation) showToast(t().lyricsTranslateFailed);
      }
    }
  }

  const wantRomanization = prefs.romanize && stamp !== '' ? stamp : '';
  if (wantRomanization !== romanizationFor) {
    romanizationFor = wantRomanization;
    extras = { ...extras, romanization: null };
    showExtras();
    if (wantRomanization) {
      try {
        const reply = toLineTexts(await ctx.invoke('romanize_lyrics', {}, { timeoutMs: 20000 }));
        if (romanizationFor === wantRomanization && stillShowing() && sameSong(reply.video_id)) {
          extras = { ...extras, romanization: anyLine(reply.lines) };
          showExtras();
        }
      } catch {
        if (romanizationFor === wantRomanization) showToast(t().lyricsRomanizeFailed);
      }
    }
  }
}

/** A switch under the lyrics: shown at once, then saved for every window. */
function toggleDisplay(ctx: PluginContext, key: 'translate' | 'romanize') {
  const value = !prefs[key];
  // The page's copy of the settings is what the poll below re-reads.
  ctx.config[key === 'translate' ? 'lyrics_translate_enabled' : 'lyrics_romanize_enabled'] = value;
  applyPrefs(ctx, { ...prefs, [key]: value });
  ctx.invoke('set_lyrics_display', { [key]: value }).catch(() => showToast(t().actionFailed));
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

/** Moves the highlight to `position` in both views; a view follows the
 * song by scrolling only while it is the one on screen. */
function highlight(position: number, scroll: boolean) {
  if (lyrics.synced.length === 0) return;
  const fullscreenOpen = fullscreen?.isOpen === true;
  tabView?.update(position, scroll && lyricsVisible && !fullscreenOpen);
  if (fullscreenOpen) fullscreen?.view.update(position, scroll);
}

function lyricsTabHeader(): HTMLElement | null {
  const tabs = document.querySelectorAll<HTMLElement>(
    '#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer'
  );
  return Array.from(tabs).find((tab) => /tekst|lyrics|paroles|letras/.test(tab.textContent?.toLowerCase() || '')) ?? null;
}

/** `lyrics_auto_open`: once per song that has lyrics, as soon as the player
 * page (and so the tab) is on screen, the same click the listener would make. */
function openLyricsTabIfWanted() {
  if (!autoOpenPending || autoOpenPending !== currentSongKey || loading || !hasText()) return;
  const tab = lyricsTabHeader();
  if (!tab || !isElementVisible(tab)) return;
  autoOpenPending = '';
  const selected = tab.classList.contains('iron-selected') || tab.getAttribute('aria-selected') === 'true';
  if (!selected) tab.click();
}

/** The fullscreen view shows what the tab shows. */
function syncFullscreen() {
  if (!fullscreen?.isOpen) return;
  fullscreen.setTrack(currentTrack);
  fullscreen.setStatus(loading ? t().lyricsLoading : hasText() ? null : t().lyricsNone);
  const stamp = `${lyricsStamp(lyrics, currentSongKey)}|${loading}`;
  if (stamp !== fullscreenStamp) {
    fullscreenStamp = stamp;
    fullscreen.view.setLyrics(loading ? { ...EMPTY_LYRICS } : lyrics, extras);
  } else {
    fullscreen.view.setExtras(extras);
  }
}

function openFullscreen(ctx: PluginContext) {
  if (!fullscreen) return;
  fullscreen.show();
  fullscreen.setPlaying(ctx.getVideoElement()?.paused === false);
  fullscreen.setProgress(lastPosition, currentTrack?.durationSecs ?? 0);
  syncFullscreen();
  highlight(lastPosition, false);
  fullscreen.view.scrollToCurrent();
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
    renderCurrentLyrics(ctx);
    highlight(lastPosition, false);
  }

  updateLyricsVisibility();
}

function chip(text: string, tooltip: string, onClick: () => void, iconPath?: string): HTMLButtonElement {
  const btn = createEl('button', { className: 'ytmd-chip', text });
  btn.type = 'button';
  if (iconPath) btn.prepend(icon(iconPath, 18));
  btn.dataset.ytmdTooltip = tooltip;
  btn.setAttribute('aria-label', tooltip);
  btn.addEventListener('click', onClick);
  return btn;
}

/** A chip that is a switch: on looks like YTM's selected chip. */
function switchChip(text: string, tooltip: string, on: boolean, iconPath: string, onClick: () => void): HTMLButtonElement {
  const btn = chip(text, tooltip, onClick, iconPath);
  btn.setAttribute('aria-pressed', String(on));
  return btn;
}

function group(...nodes: Node[]): HTMLElement {
  const el = createEl('span', { className: 'ytmd-lyrics-footer-group' });
  el.append(...nodes);
  return el;
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
  footer.append(
    sourceLabel(),
    group(
      switchChip(t().lyricsTranslate, t().lyricsTranslateTip, prefs.translate, ICONS.translate, () => toggleDisplay(ctx, 'translate')),
      switchChip(t().lyricsRomanize, t().lyricsRomanizeTip, prefs.romanize, ICONS.romanize, () => toggleDisplay(ctx, 'romanize')),
      chip(t().lyricsFullscreen, t().lyricsFullscreenTip, () => openFullscreen(ctx), ICONS.fullscreen)
    )
  );
  if (withOffset) {
    const valDisplay = createEl('span', { className: 'ytmd-lyrics-offset-value', text: formatOffset(lyrics.offset_secs) });
    const shift = (delta: number | null) => {
      const next = delta === null ? 0 : Math.round((lyrics.offset_secs + delta) * 10) / 10;
      ctx.invoke('set_lyrics_offset', { offsetSecs: next }).catch((e) => console.warn('[Oscilla Lyrics] offset:', e));
    };
    // Positive offset = lyrics run ahead of the audio (see LyricsView.update()).
    footer.append(
      group(
        createEl('span', { text: t().lyricsOffset }),
      chip('−0.5 s', t().lyricsLater, () => shift(-0.5)),
      valDisplay,
      chip('+0.5 s', t().lyricsEarlier, () => shift(0.5)),
        chip(t().lyricsReset, t().lyricsReset, () => shift(null))
      )
    );
  }
  footer.append(group(chip(t().lyricsWrong, t().lyricsPickTitle, () => void openPicker(ctx)), searchAgainChip(ctx)));
  return footer;
}

function searchAgainChip(ctx: PluginContext): HTMLButtonElement {
  return chip(t().lyricsSearchAgain, t().lyricsSearchAgainTip, () => void searchAgain(ctx));
}

/** Forgets the playing song's cached lyrics (a pick too) and looks again. */
async function searchAgain(ctx: PluginContext) {
  const songKey = currentSongKey;
  loading = true;
  renderCurrentLyrics(ctx);
  try {
    const result = toCurrentLyrics(await ctx.invoke('refresh_lyrics', {}, { timeoutMs: 15000 }));
    if (!isCurrentSongKey(songKey, currentSongKey)) return;
    loading = false;
    applyLyrics(ctx, result);
  } catch {
    if (!isCurrentSongKey(songKey, currentSongKey)) return;
    loading = false;
    renderCurrentLyrics(ctx);
    showToast(t().actionFailed);
  }
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

/** Lays out the Lyrics tab for the current state: "loading", the lines (the
 * view keeps them; they aren't rebuilt here) with the controls under them,
 * or "no lyrics". The fullscreen view follows. */
function renderCurrentLyrics(ctx: PluginContext): void {
  syncFullscreen();
  const wrapper = document.getElementById('ytmd-native-lyrics-wrapper');
  if (!wrapper) return;

  if (loading) {
    wrapper.replaceChildren(createEl('div', { className: 'ytmd-native-lyrics-status', text: t().lyricsLoading }));
  } else if (hasText() && tabView) {
    wrapper.replaceChildren(tabView.root, buildFooter(ctx, lyrics.synced.length > 0));
  } else {
    const nodes: Node[] = [createEl('div', { className: 'ytmd-native-lyrics-status', text: t().lyricsNone })];
    if (currentTrack) nodes.push(buildFooterNoSource(ctx));
    wrapper.replaceChildren(...nodes);
  }
}

/** Footer for "nothing found": no source, just the picker. */
function buildFooterNoSource(ctx: PluginContext): HTMLElement {
  const footer = createEl('div', { className: 'ytmd-native-lyrics-footer' });
  footer.append(
    createEl('span', { className: 'ytmd-lyrics-source' }),
    chip(t().lyricsWrong, t().lyricsPickTitle, () => void openPicker(ctx)),
    searchAgainChip(ctx)
  );
  return footer;
}
