import { YTMDPlugin, PluginContext, TrackInfo } from '../types';
import { createEl } from '../../utils/dom';
import { ensureKitStyles } from '../../preload/ui/kit';
import { t } from '../../preload/ui/i18n';

export interface LrcLine {
  timeSecs: number;
  text: string;
}

let pluginLines: LrcLine[] = [];
let currentActiveIdx = -1;
let cachedLyricsData: { syncedLyrics?: string; plainLyrics?: string } | null = null;
let currentSongKey = '';
let cleanup: (() => void) | null = null;
let fetchInProgressKey = '';

// Pure staleness check, covered directly by src/tests/lyrics.test.ts: a
// `fetch_lyrics` response for one song must never be applied once the user
// has already moved on to a different track while it was in flight.
export const isCurrentSongKey = (requestedKey: string, latestKey: string): boolean =>
  requestedKey === latestKey;

export const LyricsPlugin: YTMDPlugin = {
  id: 'lyrics',
  name: 'Native Synced Lyrics (LRCLIB)',
  description: 'Injects synchronized scrolling lyrics directly into YouTube Music native Lyrics tab with active highlighting and seek-on-click',
  defaultEnabled: true,

  onInit(ctx: PluginContext) {
    pluginLines = [];
    currentActiveIdx = -1;
    cachedLyricsData = null;
    currentSongKey = '';
    fetchInProgressKey = '';

    // Inject CSS for Native Lyrics Tab styling
    const style = document.createElement('style');
    style.id = 'ytmd-native-lyrics-styles';
    style.textContent = `
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
      .ytmd-lyrics-offset-value {
        min-width: 56px;
        text-align: center;
        font-variant-numeric: tabular-nums;
        color: var(--ytmd-text, #fff);
      }
    `;
    document.head.appendChild(style);
    ensureKitStyles();

    const checkTab = () => {
      unlockLyricsTabHeader();
      ensureLyricsMounted(ctx);
    };

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

    cleanup = () => {
      clearInterval(pollInterval);
      document.removeEventListener('click', onTabClick, true);
      style.remove();
      const wrappers = document.querySelectorAll('#ytmd-native-lyrics-wrapper');
      wrappers.forEach((w) => w.remove());
    };
  },

  async onTrackChange(track: TrackInfo, ctx: PluginContext) {
    const songKey = `${track.title} - ${track.artist}`;
    if ((currentSongKey === songKey && pluginLines.length > 0) || fetchInProgressKey === songKey) {
      return;
    }

    currentSongKey = songKey;
    fetchInProgressKey = songKey;
    pluginLines = [];
    currentActiveIdx = -1;
    cachedLyricsData = null;

    unlockLyricsTabHeader();

    const wrapper = document.getElementById('ytmd-native-lyrics-wrapper');
    if (wrapper) {
      wrapper.replaceChildren(
        createEl('div', { className: 'ytmd-native-lyrics-status', text: t().lyricsLoading })
      );
    }

    try {
      const lyricsData = (await ctx.invoke('fetch_lyrics', {
        artist: track.artist,
        title: track.title,
        albumName: track.album || null,
        duration: track.durationSecs || null
      })) as { syncedLyrics?: string; plainLyrics?: string };

      // The track may have changed again while this request was in flight —
      // a stale response for a previous song must never clobber the lyrics
      // of whatever is now playing.
      if (!isCurrentSongKey(songKey, currentSongKey)) return;

      cachedLyricsData = lyricsData;

      if (lyricsData?.syncedLyrics) {
        const parsed = parseLrc(lyricsData.syncedLyrics);
        pluginLines = parsed;
      }

      unlockLyricsTabHeader();
      ensureLyricsMounted(ctx);
      renderCurrentLyrics(ctx);
    } catch {
      if (!isCurrentSongKey(songKey, currentSongKey)) return;
      const staleWrapper = document.getElementById('ytmd-native-lyrics-wrapper');
      if (staleWrapper) {
        staleWrapper.replaceChildren(
          createEl('div', { className: 'ytmd-native-lyrics-status', text: t().lyricsNone })
        );
      }
    } finally {
      if (fetchInProgressKey === songKey) {
        fetchInProgressKey = '';
      }
    }
  },

  onTick(currentTimeSecs: number) {
    if (!pluginLines || pluginLines.length === 0) return;

    const savedOffset = getTrackSyncOffset(currentSongKey);
    const effectiveTime = currentTimeSecs + savedOffset;

    let activeIdx = -1;
    for (let i = 0; i < pluginLines.length; i++) {
      if (effectiveTime >= pluginLines[i].timeSecs) {
        activeIdx = i;
      } else {
        break;
      }
    }

    if (activeIdx !== currentActiveIdx && activeIdx >= 0) {
      currentActiveIdx = activeIdx;
      const wrapper = document.getElementById('ytmd-native-lyrics-wrapper');
      if (wrapper) {
        const lineEls = wrapper.querySelectorAll('.ytmd-native-lyric-line');
        lineEls.forEach((el, idx) => {
          if (idx === activeIdx) {
            el.classList.add('active');
          } else {
            el.classList.remove('active');
          }
        });

        const lyricsTab = document.querySelector<HTMLElement>(
          '#tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"], ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]'
        );
        if (lyricsTab && isElementVisible(lyricsTab)) {
          const activeEl = lineEls[activeIdx];
          if (activeEl) {
            activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      }
    }
  },

  onDestroy() {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  }
};

/** Per-song lyrics timing corrections, kept across restarts. */
const OFFSETS_STORAGE_KEY = 'ytmd-lyrics-offsets';
/** Oldest entries are dropped past this, so the store can't grow forever. */
export const MAX_STORED_OFFSETS = 500;

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

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

/** Updates `map` (insertion order = recency) and persists it. A zero offset
 * is the default, so it's removed rather than stored. */
export function storeOffset(map: Map<string, number>, key: string, offsetSecs: number, storage: StorageLike | null): void {
  map.delete(key);
  if (offsetSecs !== 0) map.set(key, offsetSecs);
  while (map.size > MAX_STORED_OFFSETS) {
    const oldest = map.keys().next().value;
    if (oldest === undefined) break;
    map.delete(oldest);
  }
  try {
    storage?.setItem(OFFSETS_STORAGE_KEY, JSON.stringify([...map]));
  } catch {
    // quota/blocked storage: the offset still applies for this session
  }
}

let syncOffsetMap: Map<string, number> | null = null;
function offsets(): Map<string, number> {
  if (!syncOffsetMap) syncOffsetMap = loadOffsets(safeStorage());
  return syncOffsetMap;
}

function getTrackSyncOffset(songKey: string): number {
  return offsets().get(songKey) || 0;
}

function setTrackSyncOffset(songKey: string, offsetSecs: number): void {
  storeOffset(offsets(), songKey, offsetSecs, safeStorage());
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
  }

  updateLyricsVisibility();
}

function renderCurrentLyrics(ctx: PluginContext): void {
  const wrapper = document.getElementById('ytmd-native-lyrics-wrapper');
  if (!wrapper) return;

  if (pluginLines && pluginLines.length > 0) {
    const currentOffset = getTrackSyncOffset(currentSongKey);

    const valDisplay = createEl('span', { className: 'ytmd-lyrics-offset-value', text: formatOffset(currentOffset) });
    const shift = (delta: number | null) => {
      const next = delta === null ? 0 : Math.round((getTrackSyncOffset(currentSongKey) + delta) * 10) / 10;
      setTrackSyncOffset(currentSongKey, next);
      valDisplay.textContent = formatOffset(next);
    };
    const chip = (text: string, tooltip: string, onClick: () => void) => {
      const btn = createEl('button', { className: 'ytmd-chip', text });
      btn.type = 'button';
      btn.dataset.ytmdTooltip = tooltip;
      btn.setAttribute('aria-label', tooltip);
      btn.addEventListener('click', onClick);
      return btn;
    };

    // Positive offset = lyrics run ahead of the audio (see onTick).
    const footer = createEl('div', { className: 'ytmd-native-lyrics-footer' });
    footer.append(
      createEl('span', { className: 'ytmd-lyrics-source', text: t().lyricsSource }),
      createEl('span', { text: t().lyricsOffset }),
      chip('−0.5 s', t().lyricsLater, () => shift(-0.5)),
      valDisplay,
      chip('+0.5 s', t().lyricsEarlier, () => shift(0.5)),
      chip(t().lyricsReset, t().lyricsReset, () => shift(null))
    );

    wrapper.replaceChildren(
      ...pluginLines.map((line, idx) => {
        const el = createEl('div', {
          className: `ytmd-native-lyric-line${idx === currentActiveIdx ? ' active' : ''}`,
          text: line.text
        });
        el.addEventListener('click', () => {
          const video = ctx.getVideoElement();
          if (video) {
            const curOffset = getTrackSyncOffset(currentSongKey);
            video.currentTime = Math.max(0, line.timeSecs - curOffset);
          }
        });
        return el;
      }),
      footer
    );
  } else if (cachedLyricsData?.plainLyrics) {
    const plainLines = cachedLyricsData.plainLyrics.split('\n');
    wrapper.replaceChildren(
      ...plainLines.map((line: string) =>
        createEl('div', { className: 'ytmd-native-lyric-line ytmd-plain', text: line })
      ),
      createEl('div', { className: 'ytmd-native-lyrics-footer', text: t().lyricsSource })
    );
  } else {
    wrapper.replaceChildren(
      createEl('div', {
        className: 'ytmd-native-lyrics-status',
        text: t().lyricsNone
      })
    );
  }
}

export function parseLrc(lrcContent: string): LrcLine[] {
  const rawLines = lrcContent.split('\n');
  const lines: LrcLine[] = [];
  let globalOffsetSecs = 0;

  const timeTagRegex = /\[(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?\]/g;
  const offsetRegex = /\[offset:\s*([+-]?\d+)\s*\]/i;

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const offsetMatch = offsetRegex.exec(trimmed);
    if (offsetMatch) {
      const ms = parseInt(offsetMatch[1], 10);
      if (!isNaN(ms)) {
        globalOffsetSecs = ms / 1000;
      }
      continue;
    }

    const timestamps: number[] = [];
    let match: RegExpExecArray | null;
    timeTagRegex.lastIndex = 0;

    while ((match = timeTagRegex.exec(trimmed)) !== null) {
      const mins = parseInt(match[1], 10);
      const secs = parseInt(match[2], 10);
      let millis = 0;
      if (match[3]) {
        millis = parseInt(match[3].padEnd(3, '0').slice(0, 3), 10);
      }
      timestamps.push(mins * 60 + secs + millis / 1000);
    }

    if (timestamps.length > 0) {
      const text = trimmed.replace(timeTagRegex, '').trim();
      if (text) {
        for (const t of timestamps) {
          lines.push({ timeSecs: Math.max(0, t - globalOffsetSecs), text });
        }
      }
    }
  }

  return lines.sort((a, b) => a.timeSecs - b.timeSecs);
}
