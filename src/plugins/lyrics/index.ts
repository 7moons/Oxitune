import { YTMDPlugin, PluginContext, TrackInfo } from '../types';
import { createEl } from '../../utils/dom';

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
    const container = createEl('div', { id: 'ytmd-lyrics-container' });
    const header = createEl('div', { className: 'ytmd-lyrics-header' });
    const title = createEl('span', { className: 'ytmd-lyrics-title', text: 'Synchronized Lyrics' });
    const closeBtn = createEl('button', { id: 'ytmd-lyrics-close', text: '✕' });
    header.appendChild(title);
    header.appendChild(closeBtn);

    const body = createEl('div', { id: 'ytmd-lyrics-body', className: 'ytmd-lyrics-body' });
    const placeholder = createEl('div', { className: 'ytmd-lyrics-placeholder', text: 'Play a song to load lyrics' });
    body.appendChild(placeholder);

    container.appendChild(header);
    container.appendChild(body);

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
        box-shadow: 0 16px 36px rgba(0,0,0,0.6);
        z-index: 9999;
        display: none;
        flex-direction: column;
        overflow: hidden;
        font-family: inherit;
        backdrop-filter: blur(12px);
      }
      .ytmd-lyrics-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: #18181b;
        border-bottom: 1px solid #27272a;
      }
      .ytmd-lyrics-title {
        font-weight: 600;
        font-size: 13px;
        color: #f4f4f5;
      }
      #ytmd-lyrics-close {
        background: none;
        border: none;
        color: #a1a1aa;
        cursor: pointer;
        font-size: 14px;
        padding: 2px 6px;
      }
      #ytmd-lyrics-close:hover {
        color: #fff;
      }
      .ytmd-lyrics-body {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .ytmd-lyric-line {
        font-size: 15px;
        line-height: 1.4;
        color: #71717a;
        cursor: pointer;
        transition: color 0.15s ease, transform 0.15s ease;
        padding: 4px 6px;
        border-radius: 4px;
      }
      .ytmd-lyric-line:hover {
        color: #d4d4d8;
        background: rgba(255,255,255,0.04);
      }
      .ytmd-lyric-line.active {
        color: #38bdf8;
        font-weight: 600;
        transform: scale(1.02);
      }
      .ytmd-lyrics-placeholder {
        color: #71717a;
        font-size: 13px;
        text-align: center;
        margin-top: 40px;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(container);

    closeBtn.addEventListener('click', () => {
      container.style.display = 'none';
    });

    const injectLyricsButton = () => {
      if (document.getElementById('ytmd-lyrics-nav-btn')) return;

      const playerBarMiddle = document.querySelector(
        'ytmusic-player-bar .middle-controls-buttons, ytmusic-player-bar .right-controls-buttons'
      );

      if (playerBarMiddle) {
        const lyricsBtn = createEl('button', {
          id: 'ytmd-lyrics-nav-btn',
          title: 'Synced Lyrics',
          style: 'background:none; border:none; color:#a1a1aa; cursor:pointer; padding:6px; font-size:13px; font-weight:700;'
        });
        lyricsBtn.textContent = 'LRC';

        lyricsBtn.addEventListener('mouseenter', () => {
          lyricsBtn.style.color = '#fff';
        });
        lyricsBtn.addEventListener('mouseleave', () => {
          lyricsBtn.style.color = '#a1a1aa';
        });

        lyricsBtn.addEventListener('click', () => {
          container.style.display = container.style.display === 'flex' ? 'none' : 'flex';
        });

        playerBarMiddle.appendChild(lyricsBtn);
      }
    };

    setInterval(injectLyricsButton, 1000);
    injectLyricsButton();

    (this as any)._cleanup = () => {
      style.remove();
      container.remove();
    };
  },

  async onTrackChange(track: TrackInfo, ctx: PluginContext) {
    const body = document.getElementById('ytmd-lyrics-body');
    if (body) {
      body.replaceChildren(createEl('div', { className: 'ytmd-lyrics-placeholder', text: 'Loading synced lyrics...' }));
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
          const lines = lyricsData.plainLyrics.split('\n');
          body.replaceChildren(
            ...lines.map((line) => createEl('div', { className: 'ytmd-lyric-line', text: line }))
          );
        }
      } else {
        if (body) {
          body.replaceChildren(createEl('div', { className: 'ytmd-lyrics-placeholder', text: 'No lyrics available for this song.' }));
        }
      }
    } catch {
      if (body) {
        body.replaceChildren(createEl('div', { className: 'ytmd-lyrics-placeholder', text: 'Lyrics not found.' }));
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

    if (activeIdx !== (this as any)._currentActiveIdx && activeIdx >= 0) {
      (this as any)._currentActiveIdx = activeIdx;
      const body = document.getElementById('ytmd-lyrics-body');
      if (body) {
        const lineEls = body.querySelectorAll('.ytmd-lyric-line');
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
  }
};

function parseLrc(lrcContent: string): LrcLine[] {
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

function renderLyrics(lines: LrcLine[], ctx: PluginContext): void {
  const body = document.getElementById('ytmd-lyrics-body');
  if (!body) return;

  body.replaceChildren(
    ...lines.map((line) => {
      const el = createEl('div', { className: 'ytmd-lyric-line', text: line.text });
      el.addEventListener('click', () => {
        const video = ctx.getVideoElement();
        if (video) {
          video.currentTime = line.timeSecs;
        }
      });
      return el;
    })
  );
}
