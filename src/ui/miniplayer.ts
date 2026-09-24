import { estimatePosition, formatDuration } from './format';
import { tr } from './i18n';
import { initWindowChrome } from './window';
import { CurrentLyrics, EMPTY_LYRICS, activeLineIndex, activeWordIndex, toCurrentLyrics } from '../types/lyrics';

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
let lyrics: CurrentLyrics = { ...EMPTY_LYRICS };
let showLyrics = false;
let shownLine = -2;
let shownWord = -2;

const LYRICS_PREF_KEY = 'ytmd-mini-lyrics';

function loadLyricsPref(): boolean {
  try {
    return localStorage.getItem(LYRICS_PREF_KEY) === '1';
  } catch {
    return false;
  }
}

function saveLyricsPref(on: boolean) {
  try {
    localStorage.setItem(LYRICS_PREF_KEY, on ? '1' : '0');
  } catch {
    // blocked storage: the toggle still works for this session
  }
}

/** Lyrics of another song than the one shown are ignored until it catches up. */
function lyricsMatchTrack(): boolean {
  return !lyrics.video_id || !current?.video_id || lyrics.video_id === current.video_id;
}

/** Current + next line over the cover; words already sung stay bright. */
function renderLyrics(force = false) {
  const box = $('mini-lyrics');
  const cur = $('mini-lyrics-current');
  const next = $('mini-lyrics-next');
  if (!box || !cur || !next) return;
  box.classList.toggle('is-hidden', !showLyrics);
  document.body.classList.toggle('show-lyrics', showLyrics);
  if (!showLyrics) return;

  // Lyrics for the previous song mean this one's are still loading; no
  // timed lines (nothing found, or plain text only) can't follow the song.
  const message = !lyricsMatchTrack() ? 'mini.lyricsLoading' : lyrics.synced.length === 0 ? 'mini.lyricsNone' : null;
  if (message) {
    cur.textContent = tr(message);
    next.textContent = '';
    shownLine = -2;
    shownWord = -2;
    return;
  }

  const pos = current ? estimatePosition(current, receivedAt, Date.now()) : 0;
  const idx = activeLineIndex(lyrics.synced, pos, lyrics.offset_secs);
  const line = lyrics.synced[idx];
  const wordIdx = activeWordIndex(line, pos, lyrics.offset_secs);
  if (!force && idx === shownLine && wordIdx === shownWord) return;

  if (line?.words?.length) {
    cur.replaceChildren(
      ...line.words.map((w, i) => {
        const span = document.createElement('span');
        span.className = i <= wordIdx ? 'mini-lyric-word' : 'mini-lyric-word is-upcoming';
        span.textContent = w.text;
        return span;
      })
    );
  } else {
    cur.textContent = line?.text ?? '♪';
  }
  next.textContent = lyrics.synced[idx + 1]?.text ?? '';
  shownLine = idx;
  shownWord = wordIdx;
}

function applyLyrics(next: CurrentLyrics) {
  lyrics = next;
  renderLyrics(true);
}

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
  renderLyrics(true);
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

  tauri?.event.listen<unknown>('lyrics-changed', (e) => applyLyrics(toCurrentLyrics(e.payload)));
  tauri?.core
    .invoke('get_current_lyrics')
    .then((l) => applyLyrics(toCurrentLyrics(l)))
    .catch(() => {});

  showLyrics = loadLyricsPref();
  const lyricsBtn = $('lyrics-btn');
  const syncLyricsBtn = () => {
    lyricsBtn?.classList.toggle('is-active', showLyrics);
    lyricsBtn?.setAttribute('aria-pressed', String(showLyrics));
  };
  syncLyricsBtn();
  renderLyrics(true);
  lyricsBtn?.addEventListener('click', () => {
    showLyrics = !showLyrics;
    saveLyricsPref(showLyrics);
    syncLyricsBtn();
    renderLyrics(true);
  });

  // Smooth progress between reports; cheap (a text node and a width).
  window.setInterval(() => {
    if (current?.is_playing) renderProgress();
  }, 500);
  // Lyrics follow the estimated position; only touches the DOM when the
  // line or word changes.
  window.setInterval(() => {
    if (showLyrics && current?.is_playing) renderLyrics();
  }, 200);

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
