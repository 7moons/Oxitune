import { initAmbientBackdrop } from './ambient';
import { formatDuration, filterTracks } from './format';
import { tr } from './i18n';
import { syncRange } from './range';
import { initWindowChrome } from './window';

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
let visibleTracks: LocalTrack[] = [];
/** What next/previous walk through: the list as it looked when playback
 * started, so searching mid-song doesn't reshuffle what plays next. */
let queue: LocalTrack[] = [];
let playingPath: string | null = null;
let lastVolume = 1;
let scanInFlight = false;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;
const show = (el: Element | null, visible: boolean) => el?.classList.toggle('is-hidden', !visible);
const audio = document.getElementById('local-audio-element') as HTMLAudioElement;

function eqBars(): HTMLElement {
  const bars = document.createElement('span');
  bars.className = 'eq-bars';
  for (let i = 0; i < 3; i++) {
    const bar = document.createElement('span');
    bar.className = 'eq-bar';
    bars.appendChild(bar);
  }
  return bars;
}

function updateCount() {
  const badge = $('track-count-badge');
  if (!badge) return;
  badge.textContent =
    visibleTracks.length === allTracks.length
      ? tr('local.count', { count: allTracks.length })
      : tr('local.countFiltered', { shown: visibleTracks.length, total: allTracks.length });
}

/** Re-marks the playing row without rebuilding the table. */
function updatePlayingRow() {
  const playing = !audio.paused;
  document.querySelectorAll<HTMLTableRowElement>('#tracks-body tr').forEach((row, idx) => {
    const isCurrent = row.dataset.path === playingPath;
    row.classList.toggle('playing', isCurrent);
    const cell = row.firstElementChild as HTMLElement | null;
    if (!cell) return;
    if (isCurrent && playing) {
      if (!cell.querySelector('.eq-bars')) cell.replaceChildren(eqBars());
    } else if (cell.textContent !== String(idx + 1)) {
      cell.textContent = String(idx + 1);
    }
  });
}

function renderTable(tracks: LocalTrack[]) {
  visibleTracks = tracks;
  show($('loading-state'), false);
  updateCount();

  const tbody = $('tracks-body');
  if (!tbody) return;
  show($('tracks-table'), tracks.length > 0);
  show($('empty-state'), tracks.length === 0);

  tbody.replaceChildren(
    ...tracks.map((t, idx) => {
      const row = document.createElement('tr');
      row.className = 'track-row';
      row.dataset.path = t.file_path;
      const cell = (text: string, className?: string) => {
        const td = document.createElement('td');
        if (className) td.className = className;
        td.textContent = text;
        return td;
      };
      const format = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = 'format-badge';
      badge.textContent = t.file_format || '—';
      format.appendChild(badge);

      row.append(
        cell(String(idx + 1), 'num-col'),
        cell(t.title, 'title-col'),
        cell(t.artist || tr('local.unknownArtist')),
        cell(t.album || '—'),
        format,
        cell(formatDuration(t.duration_secs), 'time-col')
      );
      row.addEventListener('click', () => playTrack(t, tracks));
      return row;
    })
  );
  updatePlayingRow();
}

function setEmptyState(errorMessage: string | null) {
  const empty = $('empty-state');
  const text = $('empty-state-text');
  empty?.classList.toggle('is-error', errorMessage !== null);
  if (text) text.textContent = errorMessage ?? tr('local.empty');
}

function updatePlayIcons() {
  const playing = !audio.paused;
  show($('play-icon'), !playing);
  show($('pause-icon'), playing);
  const btn = $('play-pause-btn');
  const label = playing ? tr('player.pause') : tr('player.play');
  btn?.setAttribute('aria-label', label);
  if (btn) btn.dataset.ytmdTooltip = label;
}

function playTrack(track: LocalTrack, fromList: LocalTrack[]) {
  queue = fromList;
  playingPath = track.file_path;

  const title = $('playing-title');
  const subtitle = $('playing-artist');
  if (title) title.textContent = track.title;
  if (subtitle) subtitle.textContent = [track.artist || tr('local.unknownArtist'), track.album].filter(Boolean).join(' • ');

  // asset://localhost/... on Linux/macOS, http://asset.localhost/... on Windows.
  audio.src = window.__TAURI__?.core ? window.__TAURI__.core.convertFileSrc(track.file_path) : track.file_path;
  audio.play().catch((e) => console.error('[YTMD Local] Playback failed:', e));
  updatePlayingRow();
}

function step(delta: 1 | -1) {
  if (queue.length === 0) return;
  if (delta === -1 && audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }
  const idx = queue.findIndex((t) => t.file_path === playingPath);
  const next = queue[(idx + delta + queue.length) % queue.length];
  if (next) playTrack(next, queue);
}

async function loadTracks() {
  if (scanInFlight || !window.__TAURI__?.core) return;
  scanInFlight = true;

  const rescanBtn = $<HTMLButtonElement>('rescan-btn');
  const label = $('loading-label');
  if (rescanBtn) rescanBtn.disabled = true;
  show($('loading-state'), true);
  show($('tracks-table'), false);
  show($('empty-state'), false);
  if (label) label.textContent = tr('local.scanning');

  let unlistenProgress: (() => void) | null = null;
  try {
    // Large libraries take a while; show that something is happening.
    unlistenProgress = await window.__TAURI__.event.listen<{ scanned: number; found: number }>('local-scan-progress', (e) => {
      if (label) label.textContent = tr('local.scanProgress', { found: e.payload.found, scanned: e.payload.scanned });
    });
    const tracks = (await window.__TAURI__.core.invoke('scan_local_music')) as LocalTrack[];
    allTracks = tracks || [];
    setEmptyState(null);
  } catch (e) {
    console.error('[YTMD Local] Failed to scan directory:', e);
    allTracks = [];
    const reason = typeof e === 'string' ? e : e instanceof Error ? e.message : tr('common.unknownError');
    setEmptyState(tr('local.scanFailed', { reason }));
  } finally {
    unlistenProgress?.();
    scanInFlight = false;
    if (rescanBtn) rescanBtn.disabled = false;
  }
  applySearch();
}

function applySearch() {
  const input = $<HTMLInputElement>('search-input');
  const query = input?.value ?? '';
  show($('clear-search-btn'), query.length > 0);
  renderTable(filterTracks(allTracks, query));
}

function updateVolumeUi() {
  const slider = $<HTMLInputElement>('volume-slider');
  if (slider) {
    slider.value = String(audio.muted ? 0 : audio.volume);
    syncRange(slider);
  }
  const muted = audio.muted || audio.volume === 0;
  show($('volume-on-icon'), !muted);
  show($('volume-off-icon'), muted);
}

document.addEventListener('DOMContentLoaded', () => {
  initWindowChrome();
  initAmbientBackdrop();
  setEmptyState(null);
  updatePlayIcons();
  void loadTracks();

  const search = $<HTMLInputElement>('search-input');
  search?.addEventListener('input', applySearch);
  $('clear-search-btn')?.addEventListener('click', () => {
    if (!search) return;
    search.value = '';
    applySearch();
    search.focus();
  });

  $('rescan-btn')?.addEventListener('click', loadTracks);
  $('scan-now-btn')?.addEventListener('click', loadTracks);

  $('play-pause-btn')?.addEventListener('click', () => {
    if (!audio.src) {
      if (visibleTracks[0]) playTrack(visibleTracks[0], visibleTracks);
      return;
    }
    if (audio.paused) audio.play().catch((e) => console.error('[YTMD Local] Playback failed:', e));
    else audio.pause();
  });
  $('prev-track-btn')?.addEventListener('click', () => step(-1));
  $('next-track-btn')?.addEventListener('click', () => step(1));

  const progress = $('local-progress-track');
  const fill = $('local-progress-fill');
  audio.addEventListener('timeupdate', () => {
    const cur = audio.currentTime || 0;
    const dur = audio.duration || 0;
    const curText = $('current-time-text');
    const durText = $('total-time-text');
    if (curText) curText.textContent = formatDuration(cur);
    if (durText && dur > 0) durText.textContent = formatDuration(dur);
    const pct = dur > 0 ? Math.min(100, Math.max(0, (cur / dur) * 100)) : 0;
    if (fill) fill.style.width = `${pct}%`;
    progress?.setAttribute('aria-valuenow', String(Math.round(pct)));
  });
  audio.addEventListener('play', () => {
    updatePlayIcons();
    updatePlayingRow();
  });
  audio.addEventListener('pause', () => {
    updatePlayIcons();
    updatePlayingRow();
  });
  audio.addEventListener('ended', () => step(1));

  progress?.addEventListener('click', (e) => {
    const dur = audio.duration;
    if (!dur || isNaN(dur)) return;
    const rect = progress.getBoundingClientRect();
    audio.currentTime = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * dur;
  });

  const volume = $<HTMLInputElement>('volume-slider');
  volume?.addEventListener('input', () => {
    const val = parseFloat(volume.value);
    audio.muted = false;
    audio.volume = val;
    if (val > 0) lastVolume = val;
    updateVolumeUi();
  });
  $('volume-icon-btn')?.addEventListener('click', () => {
    if (audio.muted || audio.volume === 0) {
      audio.muted = false;
      audio.volume = lastVolume || 1;
    } else {
      lastVolume = audio.volume;
      audio.muted = true;
    }
    updateVolumeUi();
  });

  window.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement | null)?.closest('input, textarea')) return;
    if (e.code === 'Space') {
      e.preventDefault();
      $('play-pause-btn')?.click();
    }
  });
});
