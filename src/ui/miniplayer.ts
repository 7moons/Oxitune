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

function updateTrackUI(track: TrackPayload) {
  const titleEl = document.getElementById('mini-title');
  const artistEl = document.getElementById('mini-artist');
  const coverEl = document.getElementById('mini-cover') as HTMLImageElement;
  const currentEl = document.getElementById('current-time');
  const durationEl = document.getElementById('duration-time');
  const fillEl = document.getElementById('progress-fill');
  const playIcon = document.getElementById('play-icon');
  const pauseIcon = document.getElementById('pause-icon');

  if (titleEl) titleEl.textContent = track.title || 'No Track';
  if (artistEl) artistEl.textContent = track.artist || 'YouTube Music';
  if (coverEl && track.cover_url) coverEl.src = track.cover_url;

  lastDuration = track.duration_secs;
  if (durationEl) durationEl.textContent = formatSeconds(track.duration_secs);
  if (currentEl) currentEl.textContent = formatSeconds(track.current_time_secs);

  if (fillEl && track.duration_secs > 0) {
    const pct = (track.current_time_secs / track.duration_secs) * 100;
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
  if (window.__TAURI__?.event) {
    window.__TAURI__.event.listen<TrackPayload>('track-changed', (e) => {
      updateTrackUI(e.payload);
    });
  }

  const prevBtn = document.getElementById('prev-btn');
  const playPauseBtn = document.getElementById('play-pause-btn');
  const nextBtn = document.getElementById('next-btn');
  const progressTrack = document.getElementById('progress-track');

  prevBtn?.addEventListener('click', async () => {
    if (window.__TAURI__?.core) {
      await window.__TAURI__.core.invoke('send_player_command', { command: 'previous' });
    }
  });

  playPauseBtn?.addEventListener('click', async () => {
    if (window.__TAURI__?.core) {
      await window.__TAURI__.core.invoke('send_player_command', { command: 'play-pause' });
    }
  });

  nextBtn?.addEventListener('click', async () => {
    if (window.__TAURI__?.core) {
      await window.__TAURI__.core.invoke('send_player_command', { command: 'next' });
    }
  });

  progressTrack?.addEventListener('click', async (e) => {
    if (!lastDuration || !window.__TAURI__?.core) return;
    const rect = progressTrack.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const seekTime = pct * lastDuration;
    await window.__TAURI__.core.invoke('send_seek_command', { position: seekTime });
  });
}

document.addEventListener('DOMContentLoaded', initMiniPlayer);
