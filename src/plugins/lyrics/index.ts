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
        gap: 14px;
        padding: 40px 24px 160px 24px;
        max-width: 760px;
        margin: 0 auto;
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        width: 100%;
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
      .ytmd-native-lyrics-status {
        padding: 60px 20px;
        color: #71717a;
        font-size: 14px;
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

    // YouTube Music's own tab-switch machinery can throw when its backend
    // request for the newly-selected tab's content fails (seen both as a
    // null-endpoint dereference and as a MutationObserver/Polymer render
    // race) — sometimes caused by YouTube's own API returning errors for
    // reasons unrelated to us. We can't prevent that from inside YT's own
    // code, but we don't have to wait up to 600ms to recover from it either:
    // re-run the mount/unlock immediately so the panel self-heals within the
    // same tick instead of sitting blank until the next poll.
    const onWindowError = (e: ErrorEvent) => {
      const msg = e.message || '';
      const looksLikeYtTabCrash =
        msg.includes('toCommand') ||
        msg.includes('no longer a child of this node') ||
        (typeof e.error?.stack === 'string' && e.error.stack.includes('onCurrentTabIndexChanged'));
      if (looksLikeYtTabCrash) {
        checkTab();
      }
    };
    window.addEventListener('error', onWindowError);

    (this as any)._cleanup = () => {
      clearInterval(pollInterval);
      window.removeEventListener('error', onWindowError);
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
            // 'nearest' (not 'center'): scrollIntoView walks up to the
            // nearest scrollable ancestor, which — since our wrapper has no
            // bounded height of its own — is the whole right-side panel.
            // 'center' would re-center on every line change, dragging the
            // Następny/Tekst/Komentarze/Podobne tab strip out of view;
            // 'nearest' only nudges the scroll when the line isn't already
            // visible.
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
    }
  });
}

function ensureLyricsMounted(ctx: PluginContext): void {
  const tabRenderer = document.querySelector<HTMLElement>(
    '#tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"], ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]'
  );
  if (!tabRenderer) {
    // Not on the lyrics tab right now. If our wrapper is still attached from
    // before the user switched away, remove it — otherwise it stays a child
    // of whatever container YouTube Music reuses for the newly-active tab
    // (Następny/Komentarze/Podobne), bleeding lyrics text onto them.
    document.querySelectorAll('#ytmd-native-lyrics-wrapper').forEach((w) => w.remove());
    return;
  }

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
