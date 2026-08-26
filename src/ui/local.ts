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
let currentFilteredTracks: LocalTrack[] = [];
let currentTrackIndex = -1;
let lastVolume = 1;

const audioElement = document.getElementById('local-audio-element') as HTMLAudioElement;

function formatDuration(secs: number): string {
  if (isNaN(secs) || secs <= 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function updatePlayPauseIcons(isPlaying: boolean) {
  const playIcon = document.getElementById('play-icon');
  const pauseIcon = document.getElementById('pause-icon');
  if (playIcon && pauseIcon) {
    if (isPlaying) {
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
    } else {
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
    }
  }
}

function updateTrackCountBadge(count: number, total: number) {
  const badge = document.getElementById('track-count-badge');
  if (badge) {
    if (count === total) {
      badge.textContent = `${total} ${total === 1 ? 'track' : 'tracks'}`;
    } else {
      badge.textContent = `Showing ${count} of ${total} tracks`;
    }
  }
}

/** Swaps the empty-state message/icon between "haven't scanned yet" (or
 * "no matches") and "the scan itself failed" — these look identical
 * otherwise, which reads as the app silently doing nothing on a real error
 * (e.g. a missing/unreadable music directory). */
function setEmptyStateError(message: string | null) {
  const text = document.getElementById('empty-state-text');
  const icon = document.getElementById('empty-state-icon');
  if (!text || !icon) return;

  if (message) {
    text.textContent = message;
    icon.innerHTML =
      '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>';
    icon.setAttribute('stroke', '#f87171');
  } else {
    text.textContent = 'No local music files found.';
    icon.innerHTML =
      '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="5"/>';
    icon.setAttribute('stroke', 'var(--text-muted)');
  }
}

function renderTable(tracks: LocalTrack[]) {
  currentFilteredTracks = tracks;
  const tbody = document.getElementById('tracks-body');
  const table = document.getElementById('tracks-table');
  const emptyState = document.getElementById('empty-state');
  const loadingState = document.getElementById('loading-state');

  if (loadingState) loadingState.style.display = 'none';
  if (!tbody || !table || !emptyState) return;

  updateTrackCountBadge(tracks.length, allTracks.length);

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
    const isCurrentPlaying = currentTrackIndex >= 0 && currentFilteredTracks[currentTrackIndex]?.file_path === t.file_path;
    if (isCurrentPlaying) {
      tr.classList.add('playing');
    }

    const formatClass = t.file_format?.toLowerCase() === 'flac' ? 'format-badge flac' : 'format-badge';

    const indexCellContent = isCurrentPlaying && !audioElement.paused
      ? `<div class="eq-bars"><div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div></div>`
      : `<span style="color: var(--text-muted); font-size: 11.5px; font-family: var(--font-mono);">${idx + 1}</span>`;

    tr.innerHTML = `
      <td style="text-align: center;">${indexCellContent}</td>
      <td class="title-col">${escapeHtml(t.title)}</td>
      <td>${escapeHtml(t.artist || 'Unknown Artist')}</td>
      <td>${escapeHtml(t.album || '—')}</td>
      <td><span class="${formatClass}">${escapeHtml(t.file_format || 'AUDIO')}</span></td>
      <td style="text-align: right; font-family: var(--font-mono); font-size: 11.5px;">${formatDuration(t.duration_secs)}</td>
    `;

    tr.addEventListener('click', () => {
      playTrackByIndex(idx);
    });

    tbody.appendChild(tr);
  });
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function playTrackByIndex(index: number) {
  if (index < 0 || index >= currentFilteredTracks.length) return;
  currentTrackIndex = index;
  const track = currentFilteredTracks[index];

  const titleEl = document.getElementById('playing-title');
  const artistEl = document.getElementById('playing-artist');

  if (titleEl) titleEl.textContent = track.title;
  if (artistEl) artistEl.textContent = `${track.artist || 'Unknown Artist'} ${track.album ? '• ' + track.album : ''}`;

  if (audioElement) {
    const fileUrl = window.__TAURI__?.core
      ? `asset://localhost/${encodeURIComponent(track.file_path)}`
      : track.file_path;

    audioElement.src = fileUrl;
    audioElement.play().then(() => {
      updatePlayPauseIcons(true);
      renderTable(currentFilteredTracks);
    }).catch(() => {
      updatePlayPauseIcons(false);
    });
  }
}

function playNextTrack() {
  if (currentFilteredTracks.length === 0) return;
  const nextIdx = (currentTrackIndex + 1) % currentFilteredTracks.length;
  playTrackByIndex(nextIdx);
}

function playPrevTrack() {
  if (currentFilteredTracks.length === 0) return;
  if (audioElement && audioElement.currentTime > 3) {
    audioElement.currentTime = 0;
    return;
  }
  const prevIdx = (currentTrackIndex - 1 + currentFilteredTracks.length) % currentFilteredTracks.length;
  playTrackByIndex(prevIdx);
}

let scanInFlight = false;

async function loadTracks() {
  if (scanInFlight) return;
  scanInFlight = true;

  const loadingState = document.getElementById('loading-state');
  const table = document.getElementById('tracks-table');
  const emptyState = document.getElementById('empty-state');
  const rescanIcon = document.getElementById('rescan-icon');
  const rescanBtn = document.getElementById('rescan-btn') as HTMLButtonElement | null;

  if (rescanBtn) rescanBtn.disabled = true;
  if (rescanIcon) rescanIcon.style.animation = 'spin 0.8s linear infinite';
  if (loadingState) loadingState.style.display = 'flex';
  if (table) table.style.display = 'none';
  if (emptyState) emptyState.style.display = 'none';

  const loadingLabel = loadingState?.querySelector('span:last-child') ?? null;
  const resetLoadingLabel = () => {
    if (loadingLabel) loadingLabel.textContent = 'Scanning music files…';
  };
  resetLoadingLabel();

  let unlistenProgress: (() => void) | null = null;

  try {
    if (window.__TAURI__?.core) {
      if (window.__TAURI__.event) {
        // Large libraries (10k+ files) can take a while to walk and tag-read;
        // without this the user just stares at an indefinite spinner with no
        // sign anything is happening.
        unlistenProgress = await window.__TAURI__.event.listen<{ scanned: number; found: number }>(
          'local-scan-progress',
          (e) => {
            if (loadingLabel) {
              loadingLabel.textContent = `Scanning music files… ${e.payload.found} found (${e.payload.scanned} checked)`;
            }
          },
        );
      }

      const tracks = (await window.__TAURI__.core.invoke('scan_local_music')) as LocalTrack[];
      allTracks = tracks || [];
      setEmptyStateError(null);
      renderTable(allTracks);
    } else {
      renderTable([]);
    }
  } catch (e) {
    console.error('[YTMD Local] Failed to scan directory:', e);
    allTracks = [];
    const reason = typeof e === 'string' ? e : e instanceof Error ? e.message : 'Unknown error.';
    setEmptyStateError(`Couldn't scan your music folder: ${reason}`);
    renderTable([]);
  } finally {
    unlistenProgress?.();
    resetLoadingLabel();
    scanInFlight = false;
    if (rescanBtn) rescanBtn.disabled = false;
    if (rescanIcon) rescanIcon.style.animation = 'none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadTracks();

  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  const clearSearchBtn = document.getElementById('clear-search-btn');

  const filterTracks = () => {
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    if (clearSearchBtn) {
      clearSearchBtn.style.display = query.length > 0 ? 'block' : 'none';
    }
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
  };

  if (searchInput) {
    searchInput.addEventListener('input', filterTracks);
  }

  if (clearSearchBtn && searchInput) {
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearSearchBtn.style.display = 'none';
      renderTable(allTracks);
      searchInput.focus();
    });
  }

  const rescanBtn = document.getElementById('rescan-btn');
  if (rescanBtn) rescanBtn.addEventListener('click', loadTracks);

  const scanNowBtn = document.getElementById('scan-now-btn');
  if (scanNowBtn) scanNowBtn.addEventListener('click', loadTracks);

  // Playback Controls
  const playPauseBtn = document.getElementById('play-pause-btn');
  const prevTrackBtn = document.getElementById('prev-track-btn');
  const nextTrackBtn = document.getElementById('next-track-btn');

  if (playPauseBtn && audioElement) {
    playPauseBtn.addEventListener('click', () => {
      if (!audioElement.src && currentFilteredTracks.length > 0) {
        playTrackByIndex(0);
        return;
      }
      if (audioElement.paused) {
        audioElement.play();
        updatePlayPauseIcons(true);
      } else {
        audioElement.pause();
        updatePlayPauseIcons(false);
      }
      renderTable(currentFilteredTracks);
    });
  }

  if (prevTrackBtn) {
    prevTrackBtn.addEventListener('click', playPrevTrack);
  }

  if (nextTrackBtn) {
    nextTrackBtn.addEventListener('click', playNextTrack);
  }

  // Audio Progress & Seek
  const progressTrack = document.getElementById('local-progress-track');
  const progressFill = document.getElementById('local-progress-fill');
  const currentTimeText = document.getElementById('current-time-text');
  const totalTimeText = document.getElementById('total-time-text');

  if (audioElement) {
    audioElement.addEventListener('timeupdate', () => {
      const cur = audioElement.currentTime || 0;
      const dur = audioElement.duration || 0;
      if (currentTimeText) currentTimeText.textContent = formatDuration(cur);
      if (totalTimeText && dur > 0) totalTimeText.textContent = formatDuration(dur);
      if (progressFill && dur > 0) {
        const pct = Math.min(100, Math.max(0, (cur / dur) * 100));
        progressFill.style.width = `${pct}%`;
      }
    });

    audioElement.addEventListener('play', () => {
      updatePlayPauseIcons(true);
      renderTable(currentFilteredTracks);
    });

    audioElement.addEventListener('pause', () => {
      updatePlayPauseIcons(false);
      renderTable(currentFilteredTracks);
    });

    audioElement.addEventListener('ended', () => {
      playNextTrack();
    });
  }

  if (progressTrack && audioElement) {
    progressTrack.addEventListener('click', (e) => {
      const dur = audioElement.duration;
      if (!dur || isNaN(dur)) return;
      const rect = progressTrack.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, clickX / rect.width));
      audioElement.currentTime = pct * dur;
    });
  }

  // Volume slider & mute
  const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
  const volumeIconBtn = document.getElementById('volume-icon-btn');

  if (volumeSlider && audioElement) {
    volumeSlider.addEventListener('input', () => {
      const val = parseFloat(volumeSlider.value);
      audioElement.volume = val;
      if (val > 0) lastVolume = val;
    });
  }

  if (volumeIconBtn && audioElement && volumeSlider) {
    volumeIconBtn.addEventListener('click', () => {
      if (audioElement.volume > 0) {
        lastVolume = audioElement.volume;
        audioElement.volume = 0;
        volumeSlider.value = '0';
      } else {
        audioElement.volume = lastVolume || 1;
        volumeSlider.value = String(audioElement.volume);
      }
    });
  }

  // Window Controls
  const minBtn = document.getElementById('win-min-btn');
  const maxBtn = document.getElementById('win-max-btn');
  const closeBtn = document.getElementById('win-close-btn');

  if (minBtn) minBtn.addEventListener('click', () => window.__TAURI__?.core.invoke('minimize_window'));
  if (maxBtn) maxBtn.addEventListener('click', () => window.__TAURI__?.core.invoke('toggle_maximize_window'));
  if (closeBtn) closeBtn.addEventListener('click', () => window.__TAURI__?.core.invoke('close_window'));
});
