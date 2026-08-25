import { YTMDPlugin, PluginContext, TrackInfo } from '../types';
import { createEl } from '../../utils/dom';

export interface LrcLine {
  timeSecs: number;
  text: string;
}

let pluginLines: LrcLine[] = [];
let currentActiveIdx = -1;
let cachedLyricsData: { syncedLyrics?: string; plainLyrics?: string } | null = null;
let currentSongKey = '';
let fetchInProgressKey = '';

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
      .ytmd-lyrics-tab-unlocked[disabled],
      .ytmd-lyrics-tab-unlocked[aria-disabled="true"] {
        pointer-events: auto !important;
        cursor: pointer !important;
        opacity: 1 !important;
        color: #d4d4d8 !important;
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
        gap: 14px;
        padding: 40px 24px 160px 24px;
        max-width: 760px;
        margin: 0 auto;
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
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
      .ytmd-native-lyric-line {
        font-size: 22px;
        font-weight: 700;
        line-height: 1.45;
        color: rgba(255, 255, 255, 0.32);
        cursor: pointer;
        padding: 6px 12px;
        border-radius: 8px;
        transition: color 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), font-size 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        user-select: none;
        word-break: break-word;
        letter-spacing: -0.2px;
      }
      .ytmd-native-lyric-line:hover {
        color: rgba(255, 255, 255, 0.8);
        background: rgba(255, 255, 255, 0.04);
      }
      .ytmd-native-lyric-line.active {
        color: #ffffff !important;
        font-size: 25px !important;
        font-weight: 800 !important;
        transform: scale(1.02);
        transform-origin: left center;
        opacity: 1 !important;
      }
      .ytmd-native-lyrics-footer {
        margin-top: 48px;
        padding: 16px 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        font-size: 11px;
        color: #71717a;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        font-weight: 600;
      }
      .ytmd-native-lyrics-sync-bar {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin-top: 24px;
        padding: 10px 16px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 20px;
        width: fit-content;
        margin-left: auto;
        margin-right: auto;
      }
      .ytmd-sync-label {
        font-size: 11px;
        color: #a1a1aa;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .ytmd-sync-btn {
        background: #27272a;
        color: #f4f4f5;
        border: 1px solid rgba(255, 255, 255, 0.12);
        padding: 3px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s ease, transform 0.1s ease;
      }
      .ytmd-sync-btn:hover {
        background: #3f3f46;
        transform: scale(1.05);
      }
      .ytmd-sync-val {
        font-size: 12px;
        font-weight: 700;
        color: #38bdf8;
        min-width: 42px;
        text-align: center;
      }
    `;
    document.head.appendChild(style);

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

    (this as any)._cleanup = () => {
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
        createEl('div', { className: 'ytmd-native-lyrics-status', text: 'Loading synchronized lyrics...' })
      );
    }

    try {
      const lyricsData = (await ctx.invoke('fetch_lyrics', {
        artist: track.artist,
        title: track.title,
        albumName: track.album || null,
        duration: track.durationSecs || null
      })) as { syncedLyrics?: string; plainLyrics?: string };

      if (currentSongKey !== songKey) {
        return;
      }

      cachedLyricsData = lyricsData;

      if (lyricsData?.syncedLyrics) {
        const parsed = parseLrc(lyricsData.syncedLyrics);
        pluginLines = parsed;
      }

      unlockLyricsTabHeader();
      ensureLyricsMounted(ctx);
      renderCurrentLyrics(ctx);
    } catch {
      if (currentSongKey === songKey && wrapper) {
        wrapper.replaceChildren(
          createEl('div', { className: 'ytmd-native-lyrics-status', text: 'No lyrics available for this track.' })
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
    if ((this as any)._cleanup) {
      (this as any)._cleanup();
    }
  }
};

const syncOffsetMap = new Map<string, number>();

function getTrackSyncOffset(songKey: string): number {
  return syncOffsetMap.get(songKey) || 0;
}

function setTrackSyncOffset(songKey: string, offsetSecs: number): void {
  syncOffsetMap.set(songKey, offsetSecs);
}

function isElementVisible(el: HTMLElement): boolean {
  if (!el || el.offsetParent === null || el.hasAttribute('hidden')) return false;
  const style = window.getComputedStyle(el);
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
}

function unlockLyricsTabHeader(): void {
  const tabs = document.querySelectorAll<HTMLElement>(
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
      (tab as any).disabled = false;
      tab.removeAttribute('disabled');
      tab.removeAttribute('aria-disabled');
      tab.classList.remove('disabled');
      tab.classList.add('ytmd-lyrics-tab-unlocked');
      tab.style.pointerEvents = 'auto';
      tab.style.cursor = 'pointer';

      // Supply a dummy endpoint so Polymer's toCommand() never crashes when selecting the tab on songs without native lyrics
      const dummyEndpoint = {
        toCommand: () => ({}),
        browseEndpoint: { browseId: 'FEmusic_lyrics' }
      };
      if (!(tab as any).endpoint) {
        (tab as any).endpoint = dummyEndpoint;
      }
      if ((tab as any).data && !(tab as any).data.endpoint) {
        (tab as any).data.endpoint = dummyEndpoint;
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

    const syncBar = createEl('div', { className: 'ytmd-native-lyrics-sync-bar' });
    const label = createEl('span', { className: 'ytmd-sync-label', text: 'Sync:' });
    const minusBtn = createEl('button', { className: 'ytmd-sync-btn', text: '-0.5s', title: 'Shift lyrics 0.5s earlier' });
    const valDisplay = createEl('span', {
      className: 'ytmd-sync-val',
      text: `${currentOffset >= 0 ? '+' : ''}${currentOffset.toFixed(1)}s`
    });
    const plusBtn = createEl('button', { className: 'ytmd-sync-btn', text: '+0.5s', title: 'Shift lyrics 0.5s later' });
    const resetBtn = createEl('button', { className: 'ytmd-sync-btn', text: 'Reset', title: 'Reset offset to 0.0s' });

    minusBtn.addEventListener('click', () => {
      const newOff = Math.round((getTrackSyncOffset(currentSongKey) - 0.5) * 10) / 10;
      setTrackSyncOffset(currentSongKey, newOff);
      valDisplay.textContent = `${newOff >= 0 ? '+' : ''}${newOff.toFixed(1)}s`;
    });

    plusBtn.addEventListener('click', () => {
      const newOff = Math.round((getTrackSyncOffset(currentSongKey) + 0.5) * 10) / 10;
      setTrackSyncOffset(currentSongKey, newOff);
      valDisplay.textContent = `${newOff >= 0 ? '+' : ''}${newOff.toFixed(1)}s`;
    });

    resetBtn.addEventListener('click', () => {
      setTrackSyncOffset(currentSongKey, 0);
      valDisplay.textContent = '+0.0s';
    });

    syncBar.appendChild(label);
    syncBar.appendChild(minusBtn);
    syncBar.appendChild(valDisplay);
    syncBar.appendChild(plusBtn);
    syncBar.appendChild(resetBtn);

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
      syncBar,
      createEl('div', {
        className: 'ytmd-native-lyrics-footer',
        text: 'Lyrics provided by LRCLIB'
      })
    );
  } else if (cachedLyricsData?.plainLyrics) {
    const plainLines = cachedLyricsData.plainLyrics.split('\n');
    wrapper.replaceChildren(
      ...plainLines.map((line: string) =>
        createEl('div', { className: 'ytmd-native-lyric-line active', text: line, style: 'cursor: default;' })
      ),
      createEl('div', {
        className: 'ytmd-native-lyrics-footer',
        text: 'Lyrics provided by LRCLIB'
      })
    );
  } else {
    wrapper.replaceChildren(
      createEl('div', {
        className: 'ytmd-native-lyrics-status',
        text: 'Synced lyrics unavailable for this track.'
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
