import { estimatePosition, formatDuration } from './format';
import { tr } from './i18n';
import { initWindowChrome } from './window';

interface TrackPayload {
  title: string;
  artist: string;
  album?: string | null;
  cover_url?: string | null;
  duration_secs: number;
  current_time_secs: number;
  is_playing: boolean;
  video_id?: string | null;
}

const FALLBACK_COVER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='320' viewBox='0 0 320 320'%3E%3Crect width='320' height='320' fill='%23212121'/%3E%3Cpath transform='translate(136 136) scale(2)' fill='%23ffffff55' d='M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z'/%3E%3C/svg%3E";

let current: TrackPayload | null = null;
let receivedAt = 0;
let isAlwaysOnTop = true;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;

function renderProgress() {
  if (!current) return;
  const pos = estimatePosition(current, receivedAt, Date.now());
  const cur = $('current-time');
  if (cur) cur.textContent = formatDuration(pos);
  const pct = current.duration_secs > 0 ? Math.min(100, (pos / current.duration_secs) * 100) : 0;
  const fill = $('progress-fill');
  if (fill) fill.style.width = `${pct}%`;
  $('progress-track')?.setAttribute('aria-valuenow', String(Math.round(pct)));
}

function applyTrack(track: TrackPayload) {
  current = track;
  receivedAt = Date.now();

  const title = $('mini-title');
  const artist = $('mini-artist');
  if (title) title.textContent = track.title || tr('mini.nothingPlaying');
  if (artist) artist.textContent = track.artist || 'YouTube Music';

  const cover = $<HTMLImageElement>('mini-cover');
  const src = track.cover_url || FALLBACK_COVER;
  if (cover && cover.src !== src) {
    cover.onerror = () => {
      cover.src = FALLBACK_COVER;
    };
    cover.src = src;
  }

  const duration = $('duration-time');
  if (duration) duration.textContent = formatDuration(track.duration_secs);

  $('play-icon')?.classList.toggle('is-hidden', track.is_playing);
  $('pause-icon')?.classList.toggle('is-hidden', !track.is_playing);
  const playBtn = $('play-pause-btn');
  const label = track.is_playing ? tr('player.pause') : tr('player.play');
  playBtn?.setAttribute('aria-label', label);
  if (playBtn) playBtn.dataset.ytmdTooltip = label;

  renderProgress();
}

function initMiniPlayer() {
  initWindowChrome();
  const tauri = window.__TAURI__;

  const cover = $<HTMLImageElement>('mini-cover');
  if (cover) cover.src = FALLBACK_COVER;

  tauri?.event.listen<TrackPayload>('track-changed', (e) => {
    if (e.payload) applyTrack(e.payload);
  });
  // Opened mid-song: show what's playing now instead of waiting for the next report.
  tauri?.core
    .invoke('get_current_track')
    .then((track) => {
      if (track) applyTrack(track as TrackPayload);
    })
    .catch(() => {});

  // Smooth progress between reports; cheap (a text node and a width).
  window.setInterval(() => {
    if (current?.is_playing) renderProgress();
  }, 500);

  const send = (cmd: string) => {
    tauri?.event.emit('player-command', cmd).catch((e: unknown) => console.error('[YTMD Mini] command failed:', e));
  };
  $('prev-btn')?.addEventListener('click', () => send('previous'));
  $('play-pause-btn')?.addEventListener('click', () => send('play_pause'));
  $('next-btn')?.addEventListener('click', () => send('next'));

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      send('play_pause');
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      send('previous');
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      send('next');
    }
  });

  const track = $('progress-track');
  track?.addEventListener('click', (e) => {
    if (!current || current.duration_secs <= 0) return;
    const rect = track.getBoundingClientRect();
    const target = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * current.duration_secs;
    tauri?.event.emit('player-seek', target).catch(() => {});
    // Reflect the seek immediately rather than after the round trip.
    applyTrack({ ...current, current_time_secs: target });
  });

  const pin = $('pin-btn');
  pin?.addEventListener('click', async () => {
    isAlwaysOnTop = !isAlwaysOnTop;
    pin.classList.toggle('is-active', isAlwaysOnTop);
    pin.setAttribute('aria-pressed', String(isAlwaysOnTop));
    try {
      await tauri?.window?.getCurrentWindow().setAlwaysOnTop(isAlwaysOnTop);
    } catch (e) {
      console.error('[YTMD Mini] setAlwaysOnTop failed:', e);
    }
  });
}

document.addEventListener('DOMContentLoaded', initMiniPlayer);
