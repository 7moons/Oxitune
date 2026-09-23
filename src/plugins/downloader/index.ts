import { YTMDPlugin, PluginContext, TrackInfo } from '../types';
import { createIconButton, setButtonProgress, setIconButtonIcon, showToast, ICONS } from '../../preload/ui/kit';
import { t } from '../../preload/ui/i18n';

/** Payload of the backend's `download-progress` event (downloader.rs). */
export interface DownloadProgress {
  video_id: string;
  title: string;
  percent: number;
  status: string;
  output_path: string | null;
  error?: string | null;
}

export type DownloadPhase = 'progress' | 'done' | 'failed';

/** Pure classification of a progress event, unit-tested. */
export function downloadPhase(p: DownloadProgress): DownloadPhase {
  if (p.error) return 'failed';
  if (p.output_path && p.percent >= 100) return 'done';
  return 'progress';
}

interface ActiveDownload {
  title: string;
  fraction: number;
}

const BUTTON_ID = 'ytmd-download-btn';
const DONE_ICON_MS = 3000;

const active = new Map<string, ActiveDownload>();
const recentlyDone = new Set<string>();
let currentTrack: TrackInfo | null = null;
let cleanup: (() => void) | null = null;

function renderButton() {
  const btn = document.getElementById(BUTTON_ID);
  if (!btn) return;
  const id = currentTrack?.videoId;
  const job = id ? active.get(id) : undefined;
  setButtonProgress(btn, job ? Math.max(0.05, job.fraction) : null);
  setIconButtonIcon(btn, id && recentlyDone.has(id) ? ICONS.check : ICONS.download);
  btn.setAttribute('aria-disabled', id ? 'false' : 'true');
  const label = job ? t().downloadInProgress : t().downloadButton;
  btn.setAttribute('aria-label', label);
  btn.dataset.ytmdTooltip = label;
}

function finish(videoId: string, outcome: { ok: true } | { ok: false; reason: string }) {
  const job = active.get(videoId);
  if (!job) return; // already finished (e.g. a late event after an invoke error)
  active.delete(videoId);
  if (outcome.ok) {
    recentlyDone.add(videoId);
    setTimeout(() => {
      recentlyDone.delete(videoId);
      renderButton();
    }, DONE_ICON_MS);
    showToast(t().downloadDone(job.title), { id: `download-${videoId}` });
  } else {
    showToast(t().downloadFailed(outcome.reason), { id: `download-${videoId}`, durationMs: 8000 });
  }
  renderButton();
}

function onProgress(p: DownloadProgress) {
  const job = active.get(p.video_id);
  if (!job) return;
  const phase = downloadPhase(p);
  if (phase === 'failed') finish(p.video_id, { ok: false, reason: p.error || p.status });
  else if (phase === 'done') finish(p.video_id, { ok: true });
  else {
    job.fraction = p.percent / 100;
    renderButton();
  }
}

/** Starts downloading `track`, driving the player-bar button and toasts.
 * Shared by the player-bar button and the YTMD menu entry. */
export function startDownload(ctx: PluginContext, track: TrackInfo | null): void {
  const videoId = track?.videoId;
  if (!track || !videoId) {
    showToast(t().downloadNoTrack);
    return;
  }
  if (active.has(videoId)) {
    showToast(t().downloadInProgress);
    return;
  }

  active.set(videoId, { title: track.title, fraction: 0 });
  renderButton();
  showToast(t().downloadStarted(track.title), { id: `download-${videoId}` });

  // The bridge replies as soon as the download is queued; progress,
  // completion and failure arrive only as `download-progress` events.
  ctx
    .invoke('download_track', {
      request: {
        video_id: videoId,
        title: track.title,
        artist: track.artist,
        album: track.album || undefined,
        cover_url: track.coverUrl || undefined,
        format: (ctx.config.download_format as string) || 'mp3',
        embed_lyrics: ctx.config.embed_lyrics !== false
      }
    })
    .catch((e: unknown) => {
      console.error('[YTMD Downloader] Download failed:', e);
      finish(videoId, { ok: false, reason: e instanceof Error ? e.message : String(e) });
    });
}

export const DownloaderPlugin: YTMDPlugin = {
  id: 'downloader',
  name: 'Built-in Audio Downloader',
  description: 'Download tracks or albums to MP3/FLAC/Opus with metadata, lyrics and 1080p artwork',
  defaultEnabled: true,

  onInit(ctx: PluginContext) {
    currentTrack = ctx.track;

    const mountButton = () => {
      if (document.getElementById(BUTTON_ID)) return;
      // Next to YTM's own like/dislike/menu buttons.
      const container = document.querySelector(
        'ytmusic-player-bar .middle-controls-buttons, ytmusic-player-bar .right-controls-buttons'
      );
      if (!container) return;
      const btn = createIconButton({ id: BUTTON_ID, label: t().downloadButton, iconPath: ICONS.download });
      btn.addEventListener('click', () => {
        if (btn.getAttribute('aria-disabled') === 'true') return;
        startDownload(ctx, currentTrack);
      });
      container.appendChild(btn);
      renderButton();
    };

    const pollInterval = window.setInterval(mountButton, 1000);
    mountButton();

    const unlisten = window.__TAURI__?.event
      ? window.__TAURI__.event.listen<DownloadProgress>('download-progress', (e) => onProgress(e.payload))
      : null;

    cleanup = () => {
      clearInterval(pollInterval);
      unlisten?.then((fn) => fn());
      document.getElementById(BUTTON_ID)?.remove();
    };
  },

  onTrackChange(track: TrackInfo) {
    currentTrack = track;
    renderButton();
  },

  onDestroy() {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  }
};
