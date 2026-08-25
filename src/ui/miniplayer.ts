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
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

let lastDuration = 0;
let isAlwaysOnTop = true;

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
  if (artistEl) artistEl.textContent = track.artist || 'YouTube Music';
  if (coverEl && track.cover_url) coverEl.src = track.cover_url;

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
  const tauri = (window as any).__TAURI__;

  if (tauri?.event) {
    tauri.event.listen('track-changed', (e: any) => {
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
