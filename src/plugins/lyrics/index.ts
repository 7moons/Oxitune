import { YTMDPlugin, PluginContext, TrackInfo } from '../types';

interface LrcLine {
  timeSecs: number;
  text: string;
}

export const LyricsPlugin: YTMDPlugin = {
  id: 'lyrics',
  name: 'Synchronized Lyrics (LRCLIB)',
  description: 'Fetches synchronized scrolling lyrics and displays them with real-time highlighting and seek-on-click',
  defaultEnabled: true,

  onInit() {
    (this as any)._lines = [] as LrcLine[];
    (this as any)._currentActiveIdx = -1;

    // Create lyrics sidebar overlay container
    const container = document.createElement('div');
    container.id = 'ytmd-lyrics-container';
    container.innerHTML = `
      <div class="ytmd-lyrics-header">
        <span class="ytmd-lyrics-title">Synchronized Lyrics</span>
        <button id="ytmd-lyrics-close">✕</button>
      </div>
      <div class="ytmd-lyrics-body" id="ytmd-lyrics-body">
        <div class="ytmd-lyrics-placeholder">Play a song to load lyrics</div>
      </div>
    `;

    const style = document.createElement('style');
    style.id = 'ytmd-lyrics-styles';
    style.textContent = `
      #ytmd-lyrics-container {
        position: fixed;
        right: 16px;
        bottom: 84px;
        width: 340px;
        max-height: 480px;
        background: #111113;
        border: 1px solid #27272a;
        border-radius: 12px;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);
        z-index: 99999;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #f4f4f5;
        transition: opacity 0.2s ease, transform 0.2s ease;
      }
      #ytmd-lyrics-container.hidden {
        display: none;
      }
      .ytmd-lyrics-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid #27272a;
        background: #18181b;
      }
      .ytmd-lyrics-title {
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        color: #a1a1aa;
      }
      #ytmd-lyrics-close {
        background: none;
        border: none;
        color: #71717a;
        cursor: pointer;
        font-size: 14px;
        padding: 4px 8px;
        border-radius: 4px;
      }
      #ytmd-lyrics-close:hover {
        background: #27272a;
        color: #fff;
      }
      .ytmd-lyrics-body {
        padding: 16px;
        overflow-y: auto;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 12px;
        scroll-behavior: smooth;
      }
      .ytmd-lyric-line {
        font-size: 15px;
        line-height: 1.5;
        color: #71717a;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 6px;
        transition: color 0.15s ease, background-color 0.15s ease, transform 0.15s ease;
      }
      .ytmd-lyric-line:hover {
        color: #e4e4e7;
        background: #1c1c20;
      }
      .ytmd-lyric-line.active {
        color: #ffffff;
        font-weight: 600;
        font-size: 17px;
        background: #27272a;
      }
      .ytmd-lyrics-placeholder {
        color: #71717a;
        font-size: 14px;
        text-align: center;
        margin: auto;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(container);

    const closeBtn = document.getElementById('ytmd-lyrics-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        container.classList.toggle('hidden');
      });
    }

    (this as any)._cleanup = () => {
      style.remove();
      container.remove();
    };
  },

  async onTrackChange(track: TrackInfo, ctx: PluginContext) {
    const body = document.getElementById('ytmd-lyrics-body');
    if (body) {
      body.innerHTML = '<div class="ytmd-lyrics-placeholder">Loading synced lyrics...</div>';
    }
    (this as any)._lines = [];
    (this as any)._currentActiveIdx = -1;

    try {
      const lyricsData = (await ctx.invoke('fetch_lyrics', {
        artist: track.artist,
        title: track.title,
        albumName: track.album || null,
        duration: track.durationSecs || null
      })) as { syncedLyrics?: string; plainLyrics?: string };

      if (lyricsData?.syncedLyrics) {
        const parsed = parseLrc(lyricsData.syncedLyrics);
        (this as any)._lines = parsed;
        renderLyrics(parsed, ctx);
      } else if (lyricsData?.plainLyrics) {
        if (body) {
          body.innerHTML = lyricsData.plainLyrics
            .split('\n')
            .map((line) => `<div class="ytmd-lyric-line">${escapeHtml(line)}</div>`)
            .join('');
        }
      } else {
        if (body) {
          body.innerHTML = '<div class="ytmd-lyrics-placeholder">No lyrics available for this song.</div>';
        }
      }
    } catch (e) {
      if (body) {
        body.innerHTML = '<div class="ytmd-lyrics-placeholder">Lyrics not found.</div>';
      }
    }
  },

  onTick(currentTimeSecs: number) {
    const lines = (this as any)._lines as LrcLine[];
    if (!lines || lines.length === 0) return;

    let activeIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (currentTimeSecs >= lines[i].timeSecs) {
        activeIdx = i;
      } else {
        break;
      }
    }

    if (activeIdx !== (this as any)._currentActiveIdx) {
      (this as any)._currentActiveIdx = activeIdx;
      const elements = document.querySelectorAll('.ytmd-lyric-line');
      elements.forEach((el, idx) => {
        if (idx === activeIdx) {
          el.classList.add('active');
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          el.classList.remove('active');
        }
      });
    }
  },

  onDestroy() {
    if ((this as any)._cleanup) {
      (this as any)._cleanup();
    }
  }
};

function parseLrc(lrcText: string): LrcLine[] {
  const lines = lrcText.split('\n');
  const result: LrcLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;

  for (const line of lines) {
    const match = line.match(timeRegex);
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

function renderLyrics(lines: LrcLine[], ctx: PluginContext): void {
  const body = document.getElementById('ytmd-lyrics-body');
  if (!body) return;

  body.innerHTML = '';
  lines.forEach((line) => {
    const el = document.createElement('div');
    el.className = 'ytmd-lyric-line';
    el.textContent = line.text;
    el.addEventListener('click', () => {
      const video = ctx.getVideoElement();
      if (video) {
        video.currentTime = line.timeSecs;
      }
    });
    body.appendChild(el);
  });
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
