export {};

interface LocalTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration_secs: number;
  file_path: string;
  file_format: string;
  file_size_bytes: number;
}

let allTracks: LocalTrack[] = [];
const audioElement = document.getElementById('local-audio-element') as HTMLAudioElement;

function formatDuration(secs: number): string {
  if (secs <= 0) return '--:--';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function renderTable(tracks: LocalTrack[]) {
  const tbody = document.getElementById('tracks-body');
  const table = document.getElementById('tracks-table');
  const emptyState = document.getElementById('empty-state');
  const loadingState = document.getElementById('loading-state');

  if (loadingState) loadingState.style.display = 'none';

  if (!tbody || !table || !emptyState) return;

  if (tracks.length === 0) {
    table.style.display = 'none';
    emptyState.style.display = 'flex';
    return;
  }

  table.style.display = 'table';
  emptyState.style.display = 'none';
  tbody.innerHTML = '';

  tracks.forEach((t, idx) => {
    const tr = document.createElement('tr');
    tr.className = 'track-row';

    tr.innerHTML = `
      <td style="color: var(--text-muted);">${idx + 1}</td>
      <td class="title-col">${escapeHtml(t.title)}</td>
      <td>${escapeHtml(t.artist)}</td>
      <td>${escapeHtml(t.album || '—')}</td>
      <td><span style="background: var(--bg-subtle); padding: 2px 6px; border-radius: 4px; font-size: 11px; text-transform: uppercase;">${escapeHtml(t.file_format)}</span></td>
      <td style="text-align: right; font-family: var(--font-mono); font-size: 12px;">${formatDuration(t.duration_secs)}</td>
    `;

    tr.addEventListener('click', () => {
      playTrack(t);
    });

    tbody.appendChild(tr);
  });
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function playTrack(track: LocalTrack) {
  const titleEl = document.getElementById('playing-title');
  const artistEl = document.getElementById('playing-artist');
  const playBtn = document.getElementById('play-pause-btn');

  if (titleEl) titleEl.textContent = track.title;
  if (artistEl) artistEl.textContent = `${track.artist} ${track.album ? '• ' + track.album : ''}`;

  if (audioElement) {
    // Format path to safe webview asset URL
    const fileUrl = window.__TAURI__?.core
      ? `asset://localhost/${encodeURIComponent(track.file_path)}`
      : track.file_path;

    audioElement.src = fileUrl;
    audioElement.play().catch(() => {
      // Direct playback
    });

    if (playBtn) playBtn.textContent = 'Pause';
  }
}

async function loadTracks() {
  const loadingState = document.getElementById('loading-state');
  const table = document.getElementById('tracks-table');
  const emptyState = document.getElementById('empty-state');

  if (loadingState) loadingState.style.display = 'flex';
  if (table) table.style.display = 'none';
  if (emptyState) emptyState.style.display = 'none';

  try {
    if (window.__TAURI__?.core) {
      const tracks = (await window.__TAURI__.core.invoke('scan_local_music')) as LocalTrack[];
      allTracks = tracks || [];
      renderTable(allTracks);
    } else {
      renderTable([]);
    }
  } catch (e) {
    console.error('[YTMD Local] Failed to scan directory:', e);
    renderTable([]);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadTracks();

  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase().trim();
      if (!query) {
        renderTable(allTracks);
        return;
      }
      const filtered = allTracks.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.artist.toLowerCase().includes(query) ||
          (t.album && t.album.toLowerCase().includes(query))
      );
      renderTable(filtered);
    });
  }

  const rescanBtn = document.getElementById('rescan-btn');
  if (rescanBtn) rescanBtn.addEventListener('click', loadTracks);

  const scanNowBtn = document.getElementById('scan-now-btn');
  if (scanNowBtn) scanNowBtn.addEventListener('click', loadTracks);

  const playPauseBtn = document.getElementById('play-pause-btn');
  if (playPauseBtn && audioElement) {
    playPauseBtn.addEventListener('click', () => {
      if (!audioElement.src) return;
      if (audioElement.paused) {
        audioElement.play();
        playPauseBtn.textContent = 'Pause';
      } else {
        audioElement.pause();
        playPauseBtn.textContent = 'Play';
      }
    });

    audioElement.addEventListener('ended', () => {
      playPauseBtn.textContent = 'Play';
    });
  }
});
