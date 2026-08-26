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

function formatSeconds(secs: number): string {
  if (isNaN(secs) || secs <= 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

let lastDuration = 0;
let isAlwaysOnTop = true;

const FALLBACK_COVER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='320' viewBox='0 0 320 320'%3E%3Crect width='320' height='320' fill='%23121216'/%3E%3Ccircle cx='160' cy='160' r='50' fill='%2327272a'/%3E%3Cpolygon points='150,140 180,160 150,180' fill='%2371717a'/%3E%3C/svg%3E";

function updateTrackUI(track: TrackPayload) {
  const titleEl = document.getElementById('mini-title');
  const artistEl = document.getElementById('mini-artist');
  const coverEl = document.getElementById('mini-cover') as HTMLImageElement;
  const currentEl = document.getElementById('current-time');
  const durationEl = document.getElementById('duration-time');
  const fillEl = document.getElementById('progress-fill');
  const playIcon = document.getElementById('play-icon');
  const pauseIcon = document.getElementById('pause-icon');

  if (titleEl) titleEl.textContent = track.title || 'No Track Playing';
  if (artistEl) artistEl.textContent = track.artist || 'YTMD';
  if (coverEl) {
    coverEl.src = track.cover_url || FALLBACK_COVER;
    coverEl.onerror = () => {
      coverEl.src = FALLBACK_COVER;
    };
  }

  lastDuration = track.duration_secs;
  if (durationEl) durationEl.textContent = formatSeconds(track.duration_secs);
  if (currentEl) currentEl.textContent = formatSeconds(track.current_time_secs);

  if (fillEl && track.duration_secs > 0) {
    const pct = Math.min(100, Math.max(0, (track.current_time_secs / track.duration_secs) * 100));
    fillEl.style.width = `${pct}%`;
  }

  if (playIcon && pauseIcon) {
    if (track.is_playing) {
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
    } else {
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
    }
  }
}

async function initMiniPlayer() {
  const tauri = window.__TAURI__;

  if (tauri?.event) {
    tauri.event.listen<TrackPayload>('track-changed', (e) => {
      if (e.payload) updateTrackUI(e.payload);
    });
  }

  // Playback Control Buttons
  const prevBtn = document.getElementById('prev-btn');
  const playPauseBtn = document.getElementById('play-pause-btn');
  const nextBtn = document.getElementById('next-btn');

  const sendCommand = (cmd: string) => {
    if (tauri?.event?.emit) {
      tauri.event.emit('player-command', cmd);
    }
  };

  if (prevBtn) prevBtn.addEventListener('click', () => sendCommand('previous'));
  if (playPauseBtn) playPauseBtn.addEventListener('click', () => sendCommand('play_pause'));
  if (nextBtn) nextBtn.addEventListener('click', () => sendCommand('next'));

  // Keyboard Shortcuts for Mini Player (Space = Play/Pause, Arrows = Skip)
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      sendCommand('play_pause');
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      sendCommand('previous');
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      sendCommand('next');
    }
  });

  // Seek bar click
  const progressTrack = document.getElementById('progress-track');
  if (progressTrack) {
    progressTrack.addEventListener('click', (e) => {
      if (lastDuration <= 0) return;
      const rect = progressTrack.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, clickX / rect.width));
      const targetSecs = pct * lastDuration;
      if (tauri?.event?.emit) {
        tauri.event.emit('player-seek', targetSecs);
      }
    });
  }

  // Window Controls
  const pinBtn = document.getElementById('pin-btn');
  const minBtn = document.getElementById('win-min-btn');
  const closeBtn = document.getElementById('win-close-btn');

  if (pinBtn) {
    pinBtn.addEventListener('click', async () => {
      isAlwaysOnTop = !isAlwaysOnTop;
      pinBtn.classList.toggle('active', isAlwaysOnTop);
      if (tauri?.window?.getCurrentWindow) {
        await tauri.window.getCurrentWindow().setAlwaysOnTop(isAlwaysOnTop);
      }
    });
  }

  if (minBtn) {
    minBtn.addEventListener('click', () => {
      tauri?.core?.invoke('minimize_window');
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      tauri?.core?.invoke('close_window');
    });
  }
}

document.addEventListener('DOMContentLoaded', initMiniPlayer);
