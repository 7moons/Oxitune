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

    // Inject CSS for Native Lyrics Tab styling
    const style = document.createElement('style');
    style.id = 'ytmd-native-lyrics-styles';
    style.textContent = `
      /* Force enable TEKST / LYRICS tab header (2nd tab) */
      #tabsContent > .tab-header:nth-of-type(2)[disabled],
      #tabsContent > .tab-header:nth-of-type(2)[aria-disabled="true"],
      tp-yt-paper-tab:nth-of-type(2)[disabled],
      tp-yt-paper-tab:nth-of-type(2)[aria-disabled="true"],
      ytmusic-tab-header-renderer:nth-of-type(2)[disabled] {
        pointer-events: auto !important;
        cursor: pointer !important;
        opacity: 1 !important;
        color: #d4d4d8 !important;
      }

      /* Hide default un-synced text and unavailable messages inside lyrics tab ONLY */
      #tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-description-shelf-renderer,
      #tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-message-renderer,
      ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-description-shelf-renderer,
      ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-message-renderer {
        display: none !important;
      }

      #ytmd-native-lyrics-wrapper {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 32px 20px 140px 20px;
        max-width: 760px;
        margin: 0 auto;
        box-sizing: border-box;
        font-family: inherit;
        width: 100%;
      }
      .ytmd-native-lyric-line {
        font-size: 22px;
        font-weight: 700;
        line-height: 1.5;
        color: rgba(255, 255, 255, 0.28);
        cursor: pointer;
        padding: 8px 12px;
        border-radius: 8px;
        transition: color 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), font-size 0.2s ease;
        user-select: none;
        word-break: break-word;
      }
      .ytmd-native-lyric-line:hover {
        color: rgba(255, 255, 255, 0.85);
        background: rgba(255, 255, 255, 0.05);
      }
      .ytmd-native-lyric-line.active {
        color: #ffffff !important;
        font-size: 26px !important;
        transform: scale(1.02);
        transform-origin: left center;
        text-shadow: 0 0 28px rgba(255, 255, 255, 0.4);
      }
      .ytmd-native-lyrics-footer {
        margin-top: 48px;
        padding: 16px 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        font-size: 11px;
        color: #71717a;
        text-transform: uppercase;
        letter-spacing: 0.8px;
      }
      .ytmd-native-lyrics-status {
        padding: 48px 20px;
        color: #71717a;
        font-size: 15px;
        font-weight: 500;
        text-align: center;
      }
    `;
    document.head.appendChild(style);

    const checkTab = () => {
      unlockLyricsTabHeader();
      ensureLyricsMounted(ctx);
    };

    const pollInterval = window.setInterval(checkTab, 600);
    checkTab();

    (this as any)._cleanup = () => {
      clearInterval(pollInterval);
      style.remove();
      const wrappers = document.querySelectorAll('#ytmd-native-lyrics-wrapper');
      wrappers.forEach((w) => w.remove());
    };
  },

  async onTrackChange(track: TrackInfo, ctx: PluginContext) {
    const songKey = `${track.title} - ${track.artist}`;
    if (currentSongKey === songKey && pluginLines.length > 0) {
      return;
    }

    currentSongKey = songKey;
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

      cachedLyricsData = lyricsData;

      if (lyricsData?.syncedLyrics) {
        const parsed = parseLrc(lyricsData.syncedLyrics);
        pluginLines = parsed;
      }

      unlockLyricsTabHeader();
      ensureLyricsMounted(ctx);
      renderCurrentLyrics(ctx);
    } catch {
      if (wrapper) {
        wrapper.replaceChildren(
          createEl('div', { className: 'ytmd-native-lyrics-status', text: 'No lyrics available for this track.' })
        );
      }
    }
  },

  onTick(currentTimeSecs: number) {
    if (!pluginLines || pluginLines.length === 0) return;

    let activeIdx = -1;
    for (let i = 0; i < pluginLines.length; i++) {
      if (currentTimeSecs >= pluginLines[i].timeSecs) {
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
            activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

function isElementVisible(el: HTMLElement): boolean {
  if (!el || el.offsetParent === null || el.hasAttribute('hidden')) return false;
  const style = window.getComputedStyle(el);
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
}

function unlockLyricsTabHeader(): void {
  const tabs = document.querySelectorAll<HTMLElement>(
    '#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer'
  );
  tabs.forEach((tab, idx) => {
    const text = tab.textContent?.toLowerCase() || '';
    if (
      idx === 1 ||
      text.includes('tekst') ||
      text.includes('lyrics') ||
      text.includes('paroles') ||
      text.includes('letras')
    ) {
      (tab as any).disabled = false;
      tab.removeAttribute('disabled');
      tab.removeAttribute('aria-disabled');
      tab.classList.remove('disabled');
      tab.style.pointerEvents = 'auto';
      tab.style.cursor = 'pointer';
    }
  });
}

function ensureLyricsMounted(ctx: PluginContext): void {
  const tabRenderer = document.querySelector<HTMLElement>(
    '#tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"], ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]'
  );
  if (!tabRenderer) return;

  // Hide default description or unavailable messages inside this tab renderer
  const defaultDesc = tabRenderer.querySelector('ytmusic-description-shelf-renderer, ytmusic-message-renderer');
  if (defaultDesc) {
    (defaultDesc as HTMLElement).style.display = 'none';
  }

  let wrapper = document.getElementById('ytmd-native-lyrics-wrapper');
  if (!wrapper || !tabRenderer.contains(wrapper)) {
    if (wrapper) wrapper.remove();
    wrapper = createEl('div', { id: 'ytmd-native-lyrics-wrapper' });
    tabRenderer.appendChild(wrapper);
    renderCurrentLyrics(ctx);
  }
}

function renderCurrentLyrics(ctx: PluginContext): void {
  const wrapper = document.getElementById('ytmd-native-lyrics-wrapper');
  if (!wrapper) return;

  if (pluginLines && pluginLines.length > 0) {
    wrapper.replaceChildren(
      ...pluginLines.map((line, idx) => {
        const el = createEl('div', {
          className: `ytmd-native-lyric-line${idx === currentActiveIdx ? ' active' : ''}`,
          text: line.text
        });
        el.addEventListener('click', () => {
          const video = ctx.getVideoElement();
          if (video) {
            video.currentTime = line.timeSecs;
          }
        });
        return el;
      }),
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
  const lines = lrcContent.split('\n');
  const result: LrcLine[] = [];
  const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;

  for (const line of lines) {
    const match = regex.exec(line.trim());
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const millis = parseInt(match[3].padEnd(3, '0').slice(0, 3), 10);
      const timeSecs = minutes * 60 + seconds + millis / 1000;
      const text = match[4].trim();
      if (text) {
        result.push({ timeSecs, text });
      }
    }
  }

  return result.sort((a, b) => a.timeSecs - b.timeSecs);
}
