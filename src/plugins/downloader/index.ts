import { YTMDPlugin, PluginContext, TrackInfo } from '../types';
import { createEl, createSvg } from '../../utils/dom';

let setCurrentTrack: ((t: TrackInfo) => void) | null = null;
let cleanup: (() => void) | null = null;

export const DownloaderPlugin: YTMDPlugin = {
  id: 'downloader',
  name: 'Built-in Audio Downloader',
  description: 'Download tracks or albums to MP3/FLAC/Opus with metadata, lyrics and 1080p artwork',
  defaultEnabled: true,

  onInit(ctx: PluginContext) {
    let currentTrack: TrackInfo | null = null;
    let isDownloading = false;

    const injectDownloadButton = () => {
      if (document.getElementById('ytmd-download-btn')) return;

      const playerBarMiddle = document.querySelector(
        'ytmusic-player-bar .middle-controls-buttons, ytmusic-player-bar .right-controls-buttons'
      );

      if (playerBarMiddle) {
        const downloadBtn = createEl('button', {
          id: 'ytmd-download-btn',
          title: 'Download Track (MP3/FLAC with ID3 Tags & Lyrics)',
          style: 'background:none; border:none; color:#a1a1aa; cursor:pointer; padding:6px; border-radius:6px; display:flex; align-items:center; justify-content:center; margin:0 4px; transition:color 0.15s ease, background-color 0.15s ease;'
        });

        const downloadIcon = createSvg('M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z', 20, 20);
        downloadBtn.appendChild(downloadIcon);
        downloadBtn.style.cssText = `
          background: none;
          border: none;
          color: #a1a1aa;
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 4px;
          transition: color 0.15s ease, background-color 0.15s ease;
        `;
        downloadBtn.addEventListener('mouseenter', () => {
          if (!isDownloading) {
            downloadBtn.style.color = '#fafafa';
            downloadBtn.style.backgroundColor = '#27272a';
          }
        });
        downloadBtn.addEventListener('mouseleave', () => {
          if (!isDownloading) {
            downloadBtn.style.color = '#a1a1aa';
            downloadBtn.style.backgroundColor = 'transparent';
          }
        });

        downloadBtn.addEventListener('click', async () => {
          if (!currentTrack || !currentTrack.videoId || isDownloading) return;

          isDownloading = true;
          downloadBtn.style.color = '#38bdf8';
          downloadBtn.title = 'Downloading...';

          try {
            const format = (ctx.config.download_format as string) || 'mp3';
            const embedLyrics = ctx.config.embed_lyrics !== false;

            await ctx.invoke('download_track', {
              request: {
                video_id: currentTrack.videoId,
                title: currentTrack.title,
                artist: currentTrack.artist,
                album: currentTrack.album || undefined,
                cover_url: currentTrack.coverUrl || undefined,
                format,
                embed_lyrics: embedLyrics
              }
            });

            downloadBtn.style.color = '#22c55e';
            downloadBtn.title = 'Downloaded!';
            setTimeout(() => {
              isDownloading = false;
              downloadBtn.style.color = '#a1a1aa';
              downloadBtn.title = 'Download Track';
            }, 3000);
          } catch (e) {
            console.error('[YTMD Downloader] Download failed:', e);
            downloadBtn.style.color = '#ef4444';
            setTimeout(() => {
              isDownloading = false;
              downloadBtn.style.color = '#a1a1aa';
              downloadBtn.title = 'Download Track';
            }, 3000);
          }
        });

        playerBarMiddle.appendChild(downloadBtn);
      }
    };

    const pollInterval = window.setInterval(injectDownloadButton, 1000);
    injectDownloadButton();

    setCurrentTrack = (t: TrackInfo) => {
      currentTrack = t;
    };

    cleanup = () => {
      clearInterval(pollInterval);
      document.getElementById('ytmd-download-btn')?.remove();
      setCurrentTrack = null;
    };
  },

  onTrackChange(track: TrackInfo) {
    setCurrentTrack?.(track);
  },

  onDestroy() {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  }
};
