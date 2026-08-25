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
      /* Force enable TEKST / LYRICS tab button so it is always clickable and bright */
      tp-yt-paper-tab[disabled],
      tp-yt-paper-tab[aria-disabled="true"],
      ytmusic-tab-header-renderer[disabled],
      ytmusic-tab-header-renderer[aria-disabled="true"],
      .tab-header[disabled] {
        pointer-events: auto !important;
        cursor: pointer !important;
        opacity: 1 !important;
        color: #d4d4d8 !important;
      }
      tp-yt-paper-tab[disabled]:hover,
      ytmusic-tab-header-renderer[disabled]:hover {
        color: #ffffff !important;
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
      /* Hide default un-synced text and unavailable messages inside lyrics tab */
      ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-message-renderer,
      ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-message-renderer #text,
      ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-message-renderer #subtext,
      ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-description-shelf-renderer #description,
      ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-description-shelf-renderer .description,
      ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-description-shelf-renderer yt-formatted-string.description {
        display: none !important;
      }
    `;
    document.head.appendChild(style);

    // Controlled Tab Switching to correctly switch tabs even when YouTube disabled them
    document.addEventListener(
      'click',
      (e) => {
        const tabBtn = (e.target as HTMLElement | null)?.closest(
          'tp-yt-paper-tab, ytmusic-tab-header-renderer'
        ) as HTMLElement | null;
        if (!tabBtn) return;
        const text = tabBtn.textContent?.toLowerCase() || '';

        if (
          text.includes('tekst') ||
          text.includes('lyrics') ||
          text.includes('paroles') ||
          text.includes('letras')
        ) {
          // Switch to Lyrics Tab
          const paperTabs = document.querySelector(
            'ytmusic-player-page tp-yt-paper-tabs, ytmusic-tab-header-shelf-renderer tp-yt-paper-tabs'
          ) as any;
          if (paperTabs) {
            paperTabs.selected = 1;
          }
          const allTabs = document.querySelectorAll(
            'ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-shelf-renderer tp-yt-paper-tab'
          );
          allTabs.forEach((t, i) => {
            if (i === 1 || t === tabBtn) {
              t.classList.add('iron-selected');
              t.setAttribute('aria-selected', 'true');
            } else {
              t.classList.remove('iron-selected');
              t.setAttribute('aria-selected', 'false');
            }
          });

          const tabRenderers = document.querySelectorAll<HTMLElement>('ytmusic-player-page ytmusic-tab-renderer');
          tabRenderers.forEach((tr, i) => {
            const isLyrics =
              tr.getAttribute('page-type') === 'MUSIC_PAGE_TYPE_TRACK_LYRICS' ||
              (i === 1 && tr.getAttribute('page-type') !== 'MUSIC_PAGE_TYPE_TRACK_UP_NEXT');
            if (isLyrics) {
              tr.removeAttribute('hidden');
              tr.style.display = 'block';
            } else {
              tr.setAttribute('hidden', '');
              tr.style.display = 'none';
            }
          });

          setTimeout(() => {
            ensureLyricsMounted(ctx);
          }, 50);
        } else if (
          text.includes('następn') ||
          text.includes('up next') ||
          text.includes('kolejk') ||
          text.includes('queue')
        ) {
          // Switch to Up Next Tab
          const paperTabs = document.querySelector(
            'ytmusic-player-page tp-yt-paper-tabs, ytmusic-tab-header-shelf-renderer tp-yt-paper-tabs'
          ) as any;
          if (paperTabs) {
            paperTabs.selected = 0;
          }
          const allTabs = document.querySelectorAll(
            'ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-shelf-renderer tp-yt-paper-tab'
          );
          allTabs.forEach((t, i) => {
            if (i === 0 || t === tabBtn) {
              t.classList.add('iron-selected');
              t.setAttribute('aria-selected', 'true');
            } else {
              t.classList.remove('iron-selected');
              t.setAttribute('aria-selected', 'false');
            }
          });

          const tabRenderers = document.querySelectorAll<HTMLElement>('ytmusic-player-page ytmusic-tab-renderer');
          tabRenderers.forEach((tr, i) => {
            const isUpNext = tr.getAttribute('page-type') === 'MUSIC_PAGE_TYPE_TRACK_UP_NEXT' || i === 0;
            if (isUpNext) {
              tr.removeAttribute('hidden');
              tr.style.display = 'block';
            } else {
              tr.setAttribute('hidden', '');
              tr.style.display = 'none';
            }
          });
        } else if (text.includes('podobn') || text.includes('related')) {
          // Switch to Related Tab
          const paperTabs = document.querySelector(
            'ytmusic-player-page tp-yt-paper-tabs, ytmusic-tab-header-shelf-renderer tp-yt-paper-tabs'
          ) as any;
          if (paperTabs) {
            paperTabs.selected = 2;
          }
          const allTabs = document.querySelectorAll(
            'ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-shelf-renderer tp-yt-paper-tab'
          );
          allTabs.forEach((t, i) => {
            if (i === 2 || t === tabBtn) {
              t.classList.add('iron-selected');
              t.setAttribute('aria-selected', 'true');
            } else {
              t.classList.remove('iron-selected');
              t.setAttribute('aria-selected', 'false');
            }
          });

          const tabRenderers = document.querySelectorAll<HTMLElement>('ytmusic-player-page ytmusic-tab-renderer');
          tabRenderers.forEach((tr, i) => {
            const isRelated = tr.getAttribute('page-type') === 'MUSIC_PAGE_TYPE_TRACK_RELATED' || i === 2;
            if (isRelated) {
              tr.removeAttribute('hidden');
              tr.style.display = 'block';
            } else {
              tr.setAttribute('hidden', '');
              tr.style.display = 'none';
            }
          });
        }
      },
      true
    );

    const checkTabButtons = () => {
      enableLyricsTabButton();
      ensureLyricsMounted(ctx);
    };

    const pollInterval = window.setInterval(checkTabButtons, 800);
    checkTabButtons();

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

    enableLyricsTabButton();

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

      enableLyricsTabButton();
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
        // Highlight active lyric line
        const lineEls = wrapper.querySelectorAll('.ytmd-native-lyric-line');
        lineEls.forEach((el, idx) => {
          if (idx === activeIdx) {
            el.classList.add('active');
          } else {
            el.classList.remove('active');
          }
        });

        // ONLY scroll if the lyrics tab is currently active and visible to the user!
        const lyricsTab = findNativeLyricsTabElement();
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

function enableLyricsTabButton(): void {
  const tabs = document.querySelectorAll<HTMLElement>(
    'ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer, .tab-header, tp-yt-paper-tab'
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
      tab.style.pointerEvents = 'auto';
      tab.style.cursor = 'pointer';
      tab.style.opacity = '1';
      tab.style.color = '#d4d4d8';
    }
  });
}

function findNativeLyricsTabElement(): HTMLElement | null {
  // 1. Primary: Explicit page-type attribute on lyrics tab renderer
  const tabByType = document.querySelector<HTMLElement>(
    'ytmusic-player-page ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]'
  );
  if (tabByType) return tabByType;

  // 2. Secondary: Tab renderer at index 1 (never index 0 which is Up Next)
  const allTabs = Array.from(document.querySelectorAll<HTMLElement>('ytmusic-player-page ytmusic-tab-renderer'));
  if (allTabs.length >= 2) {
    const tab1 = allTabs[1];
    if (tab1.getAttribute('page-type') !== 'MUSIC_PAGE_TYPE_TRACK_UP_NEXT') {
      return tab1;
    }
  }

  return null;
}

function findNativeLyricsTab(): HTMLElement | null {
  const tabEl = findNativeLyricsTabElement();
  if (!tabEl) return null;
  const contents = tabEl.querySelector<HTMLElement>('#contents') || tabEl;
  return contents;
}

function ensureLyricsMounted(ctx: PluginContext): void {
  // Strict cleanup: Remove any wrapper that is in Up Next or first tab
  const rogueWrappers = document.querySelectorAll(
    'ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_UP_NEXT"] #ytmd-native-lyrics-wrapper, ytmusic-player-page ytmusic-tab-renderer:first-child #ytmd-native-lyrics-wrapper'
  );
  rogueWrappers.forEach((w) => w.remove());

  const targetContainer = findNativeLyricsTab();
  if (!targetContainer) return;

  // SAFETY CHECK: Ensure targetContainer is NOT in Up Next tab or first child
  const parentTab = targetContainer.closest('ytmusic-tab-renderer');
  if (parentTab) {
    if (parentTab.getAttribute('page-type') === 'MUSIC_PAGE_TYPE_TRACK_UP_NEXT') {
      return;
    }
    const allTabs = Array.from(document.querySelectorAll('ytmusic-player-page ytmusic-tab-renderer'));
    if (allTabs.indexOf(parentTab) === 0) {
      return;
    }
  }

  // Hide YouTube Music's default "unavailable" message element
  const msgRenderer = targetContainer.querySelector('ytmusic-message-renderer');
  if (msgRenderer) {
    (msgRenderer as HTMLElement).style.display = 'none';
  }

  let wrapper = document.getElementById('ytmd-native-lyrics-wrapper');
  if (!wrapper || !targetContainer.contains(wrapper)) {
    if (wrapper) wrapper.remove();
    wrapper = createEl('div', { id: 'ytmd-native-lyrics-wrapper' });
    targetContainer.prepend(wrapper);
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
