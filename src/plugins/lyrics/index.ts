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

    // Inject CSS for Native Lyrics Tab enhancement
    const style = document.createElement('style');
    style.id = 'ytmd-native-lyrics-styles';
    style.textContent = `
      #ytmd-native-lyrics-wrapper {
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 36px 24px 140px 24px;
        max-width: 760px;
        margin: 0 auto;
        box-sizing: border-box;
        font-family: inherit;
      }
      .ytmd-native-lyric-line {
        font-size: 22px;
        font-weight: 700;
        line-height: 1.5;
        color: rgba(255, 255, 255, 0.25);
        cursor: pointer;
        padding: 6px 12px;
        border-radius: 8px;
        transition: color 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), font-size 0.2s ease;
        user-select: none;
        word-break: break-word;
      }
      .ytmd-native-lyric-line:hover {
        color: rgba(255, 255, 255, 0.8);
        background: rgba(255, 255, 255, 0.04);
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
        border-top: 1px solid rgba(255, 255, 255, 0.08);
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
      /* Hide default un-synced text when our synced lyrics wrapper is active */
      ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-message-renderer,
      ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-description-shelf-renderer,
      ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] #description,
      ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] .description {
        display: none !important;
      }
    `;
    document.head.appendChild(style);

    // Watch for tab clicks to immediately mount lyrics
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('tp-yt-paper-tab, ytmusic-tab-header-renderer, .tab-header, ytmusic-player-page')) {
        setTimeout(() => ensureLyricsMounted(ctx), 100);
      }
    });

    // Periodic check to ensure wrapper remains mounted when navigating
    const pollInterval = window.setInterval(() => {
      ensureLyricsMounted(ctx);
    }, 1000);

    (this as any)._cleanup = () => {
      clearInterval(pollInterval);
      style.remove();
      const wrapper = document.getElementById('ytmd-native-lyrics-wrapper');
      if (wrapper) wrapper.remove();
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
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            el.classList.remove('active');
          }
        });
      }
    }
  },

  onDestroy() {
    if ((this as any)._cleanup) {
      (this as any)._cleanup();
    }
  }
};

function ensureLyricsMounted(ctx: PluginContext): void {
  const tab = findNativeLyricsTab();
  if (!tab) return;

  let wrapper = document.getElementById('ytmd-native-lyrics-wrapper');
  if (!wrapper || !tab.contains(wrapper)) {
    if (wrapper) wrapper.remove();
    wrapper = createEl('div', { id: 'ytmd-native-lyrics-wrapper' });
    tab.appendChild(wrapper);
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

function findNativeLyricsTab(): HTMLElement | null {
  // Try finding YouTube Music native Lyrics tab container
  const tab1 = document.querySelector<HTMLElement>(
    'ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] #contents, ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]'
  );
  if (tab1) return tab1;

  const shelf = document.querySelector<HTMLElement>(
    'ytmusic-player-page ytmusic-description-shelf-renderer, ytmusic-description-shelf-renderer'
  );
  if (shelf) return shelf;

  const playerTabs = document.querySelectorAll<HTMLElement>('ytmusic-player-page ytmusic-tab-renderer');
  if (playerTabs.length >= 2) {
    return playerTabs[1];
  }

  return null;
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
