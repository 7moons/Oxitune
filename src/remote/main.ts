import '@fontsource/roboto/latin-400.css';
import '@fontsource/roboto/latin-ext-400.css';
import '@fontsource/roboto/latin-500.css';
import '@fontsource/roboto/latin-ext-500.css';
import '@fontsource/roboto/latin-700.css';
import '@fontsource/roboto/latin-ext-700.css';
import './remote.css';
import { renderAmbientWash } from '../plugins/ambient/color';
import { applyRemoteI18n, errorText, rt, setRemoteLocale, type RemoteKey } from './i18n';
import type { ClientMsg, PlayerCommand, QueueEntry, SearchResult, ServerMsg } from './protocol';
import {
  activeLineIndex,
  backoffMs,
  canControlRoom,
  currentPosition,
  formatTime,
  initialState,
  moveItem,
  reduce,
  syncedLines,
  type Action,
  type RemoteState
} from './store';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const REACTIONS = ['🔥', '❤️', '😂', '👏', '🎉', '😮', '💃', '👎'];
const REQUEST_TIMEOUT_MS = 10_000;
const VOLUME_SEND_EVERY_MS = 120;
const TAB_KEY = 'ytmd-remote-tab';

let state: RemoteState = initialState;
let socket: WebSocket | null = null;
let attempt = 0;
let reconnectTimer: number | undefined;
let nextId = 1;
const pending = new Map<number, (msg: ServerMsg) => void>();

function dispatch(action: Action) {
  const prev = state;
  state = reduce(state, action);
  render(prev);
}

// ---------- connection ----------

function connect() {
  clearTimeout(reconnectTimer);
  if (socket && socket.readyState <= WebSocket.OPEN) return;
  const ws = new WebSocket(`ws://${location.host}/ws`);
  socket = ws;
  ws.onopen = () => {
    attempt = 0;
    dispatch({ type: 'connected' });
  };
  ws.onmessage = (e) => {
    let msg: ServerMsg;
    try {
      msg = JSON.parse(String(e.data)) as ServerMsg;
    } catch {
      return;
    }
    if ((msg.type === 'result' || msg.type === 'search_results') && pending.has(msg.id)) {
      pending.get(msg.id)?.(msg);
      pending.delete(msg.id);
    }
    dispatch({ type: 'message', msg, now: performance.now() });
  };
  ws.onclose = () => {
    if (socket !== ws) return;
    socket = null;
    dispatch({ type: 'disconnected' });
    reconnectTimer = window.setTimeout(connect, backoffMs(attempt++));
  };
}

function send(msg: ClientMsg): boolean {
  if (socket?.readyState !== WebSocket.OPEN) {
    toast(rt('status.offline'));
    return false;
  }
  socket.send(JSON.stringify(msg));
  return true;
}

/** Sends a message with an id and waits for its answer. */
function request(build: (id: number) => ClientMsg): Promise<ServerMsg> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    if (!send(build(id))) return reject(new Error('offline'));
    const timer = window.setTimeout(() => {
      pending.delete(id);
      reject(new Error('remote.error.timeout'));
    }, REQUEST_TIMEOUT_MS);
    pending.set(id, (msg) => {
      clearTimeout(timer);
      if (msg.type === 'result' && !msg.ok) reject(new Error(msg.error ?? 'remote.error.failed'));
      else resolve(msg);
    });
  });
}

/** Fire an action; a failure the desktop reports becomes a toast. */
function act(build: (id: number) => ClientMsg, success?: RemoteKey) {
  request(build).then(
    () => success && toast(rt(success)),
    (e: Error) => e.message !== 'offline' && toast(errorText(e.message))
  );
}

const command = (cmd: PlayerCommand) => act((id) => ({ type: 'cmd', id, command: cmd }));

// ---------- ui helpers ----------

let toastTimer: number | undefined;
function toast(text: string) {
  const el = $('toast');
  el.textContent = text;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('is-visible'), 3000);
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function iconButton(path: string, label: string, onClick: () => void): HTMLButtonElement {
  const btn = el('button', 'icon-btn');
  btn.type = 'button';
  btn.setAttribute('aria-label', label);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', path);
  svg.append(p);
  btn.append(svg);
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  return btn;
}

function thumb(src: string | null | undefined): HTMLImageElement {
  const img = el('img', 'thumb');
  img.alt = '';
  img.loading = 'lazy';
  img.referrerPolicy = 'no-referrer';
  if (src) img.src = src;
  return img;
}

function setFill(input: HTMLInputElement) {
  const min = Number(input.min) || 0;
  const max = Number(input.max) || 1;
  const pct = max > min ? ((Number(input.value) - min) / (max - min)) * 100 : 0;
  input.style.setProperty('--fill', `${Math.max(0, Math.min(100, pct))}%`);
}

const ICON = {
  remove: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  drag: 'M20 9H4v2h16V9zM4 15h16v-2H4v2z',
  play: 'M8 5v14l11-7z',
  next: 'M19 9H2v2h17V9zm0-4H2v2h17V5zM2 15h13v-2H2v2zm15-2v6l5-3-5-3z',
  add: 'M14 10H2v2h12v-2zm0-4H2v2h12V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM2 16h8v-2H2v2z'
};

// ---------- now playing ----------

let seeking = false;
let volumeDragging = false;
let lastCover: string | null | undefined;

function renderPlayer() {
  const p = state.player;
  const track = p?.track ?? null;
  const title = $('title');
  if (track) {
    title.textContent = track.title;
    title.removeAttribute('data-i18n');
  } else {
    title.dataset.i18n = 'status.nothing';
    title.textContent = rt('status.nothing');
  }
  $('artist').textContent = track ? [track.artist, track.album].filter(Boolean).join(' • ') : '';

  const cover = track?.cover_url ?? null;
  if (cover !== lastCover) {
    lastCover = cover;
    const img = $<HTMLImageElement>('cover');
    if (cover) img.src = cover;
    else img.removeAttribute('src');
    const wash = $<HTMLImageElement>('wash');
    wash.classList.remove('is-visible');
    if (cover) {
      renderAmbientWash(cover, 0.5).then((url) => {
        if (!url || cover !== lastCover) return;
        wash.src = url;
        wash.classList.add('is-visible');
      });
    }
  }
  if (p?.accent) document.documentElement.style.setProperty('--accent', p.accent.accent);

  const playing = !!p?.playing;
  $('icon-play').classList.toggle('is-hidden', playing);
  $('icon-pause').classList.toggle('is-hidden', !playing);
  $('btn-play').setAttribute('aria-label', rt(playing ? 'player.pause' : 'player.play'));
  $('btn-like').setAttribute('aria-pressed', String(p?.like === 'like'));
  $('btn-dislike').setAttribute('aria-pressed', String(p?.like === 'dislike'));
  $('btn-shuffle').setAttribute('aria-pressed', String(!!p?.shuffle));
  const repeat = p?.repeat ?? 'none';
  $('btn-repeat').setAttribute('aria-pressed', String(repeat !== 'none'));
  $('btn-repeat').setAttribute('aria-label', rt(repeat === 'one' ? 'player.repeatOne' : 'player.repeat'));
  $('icon-repeat').classList.toggle('is-hidden', repeat === 'one');
  $('icon-repeat-one').classList.toggle('is-hidden', repeat !== 'one');
  const muted = !!p?.muted;
  $('btn-mute').setAttribute('aria-pressed', String(muted));
  $('icon-vol').classList.toggle('is-hidden', muted);
  $('icon-muted').classList.toggle('is-hidden', !muted);
  if (!volumeDragging && p) {
    const vol = $<HTMLInputElement>('volume');
    vol.value = String(p.volume);
    setFill(vol);
  }
  const duration = track?.duration_secs ?? 0;
  const seek = $<HTMLInputElement>('seek');
  seek.max = String(Math.max(duration, 1));
  seek.disabled = !track || duration <= 0;
  $('time-dur').textContent = formatTime(duration);
  tick();
}

/** Position-driven bits: the seek bar and the active lyric line. */
function tick() {
  const pos = currentPosition(state.player, state.playerReceivedAt, performance.now());
  if (!seeking) {
    const seek = $<HTMLInputElement>('seek');
    seek.value = String(pos);
    setFill(seek);
    $('time-cur').textContent = formatTime(pos);
  }
  tickLyrics(pos);
}

function wirePlayer() {
  $('btn-play').addEventListener('click', () => command('play_pause'));
  $('btn-prev').addEventListener('click', () => command('previous'));
  $('btn-next').addEventListener('click', () => command('next'));
  $('btn-like').addEventListener('click', () => command('like'));
  $('btn-dislike').addEventListener('click', () => command('dislike'));
  $('btn-shuffle').addEventListener('click', () => command('shuffle'));
  $('btn-repeat').addEventListener('click', () => command('repeat'));
  $('btn-mute').addEventListener('click', () => command('mute'));

  const seek = $<HTMLInputElement>('seek');
  seek.addEventListener('input', () => {
    seeking = true;
    setFill(seek);
    $('time-cur').textContent = formatTime(Number(seek.value));
  });
  seek.addEventListener('change', () => {
    const position = Number(seek.value);
    act((id) => ({ type: 'seek', id, position_secs: position }));
    // Show the new position until the desktop confirms it.
    if (state.player) {
      state = {
        ...state,
        player: { ...state.player, position_secs: position, sampled_at_ms: state.player.server_time_ms },
        playerReceivedAt: performance.now()
      };
    }
    seeking = false;
  });

  const vol = $<HTMLInputElement>('volume');
  let lastSent = 0;
  let trailing: number | undefined;
  const sendVolume = () => {
    lastSent = Date.now();
    send({ type: 'volume', volume: Number(vol.value) });
  };
  vol.addEventListener('input', () => {
    volumeDragging = true;
    setFill(vol);
    clearTimeout(trailing);
    if (Date.now() - lastSent >= VOLUME_SEND_EVERY_MS) sendVolume();
    else trailing = window.setTimeout(sendVolume, VOLUME_SEND_EVERY_MS);
  });
  vol.addEventListener('change', () => {
    clearTimeout(trailing);
    sendVolume();
    volumeDragging = false;
  });
}

// ---------- lyrics ----------

let renderedLyricsKey = '';
let activeLyric = -1;

function renderLyrics() {
  const lyrics = state.lyrics;
  const videoId = state.player?.track?.video_id;
  const lines = syncedLines(lyrics, videoId);
  const plain = !lines && lyrics?.plain && (!lyrics.video_id || !videoId || lyrics.video_id === videoId) ? lyrics.plain : null;
  const key = JSON.stringify([videoId, lyrics?.provider, lines?.length, plain?.length]);
  if (key === renderedLyricsKey) return;
  renderedLyricsKey = key;
  activeLyric = -1;

  const box = $('lyrics');
  box.replaceChildren();
  if (lines) {
    for (const line of lines) box.append(el('div', 'lyric-line', line.text || '♪'));
  } else if (plain) {
    for (const text of plain.split('\n')) box.append(el('div', 'lyric-line is-plain', text));
  }
  $('lyrics-empty').classList.toggle('is-hidden', !!(lines || plain));
  $('lyrics-source').textContent = lyrics?.provider && (lines || plain) ? rt('lyrics.source', { provider: lyrics.provider }) : '';
}

function tickLyrics(pos: number) {
  const lines = syncedLines(state.lyrics, state.player?.track?.video_id);
  if (!lines) return;
  const idx = activeLineIndex(lines, pos, state.lyrics?.offset_secs ?? 0);
  if (idx === activeLyric) return;
  const box = $('lyrics');
  box.children[activeLyric]?.classList.remove('is-active');
  activeLyric = idx;
  const line = box.children[idx] as HTMLElement | undefined;
  if (!line) return;
  line.classList.add('is-active');
  if ($('view-lyrics').classList.contains('is-active')) line.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

// ---------- queue ----------

function renderQueue() {
  const list = $('queue-list');
  const editable = !state.queueShared || canControlRoom(state.room);
  $('queue-shared').classList.toggle('is-hidden', !state.queueShared);
  $('queue-empty').classList.toggle('is-hidden', state.queue.length > 0);
  list.replaceChildren(...state.queue.map((item, index) => queueRow(item, index, editable)));
  if (!state.queueShared) list.querySelector('.is-current')?.scrollIntoView({ block: 'nearest' });
}

function queueRow(item: QueueEntry, index: number, editable: boolean): HTMLLIElement {
  const row = el('li', `row${item.current ? ' is-current' : ''}`);
  const text = el('div', 'row-text');
  text.append(el('div', 'row-title', item.title || item.video_id), el('div', 'row-sub', item.current ? rt('queue.playing') : item.artist));
  row.append(thumb(item.thumbnail), text);
  if (!editable) return row;

  const remove = iconButton(ICON.remove, rt('queue.remove'), () => removeItem(item));
  const handle = iconButton(ICON.drag, rt('queue.drag'), () => undefined);
  handle.classList.add('drag-handle');
  row.append(remove, handle);
  wireSwipe(row, text, item);
  wireDrag(row, handle, item, index);
  return row;
}

function removeItem(item: QueueEntry) {
  state = { ...state, queue: state.queue.filter((q) => q.id !== item.id) };
  renderQueue();
  act((id) => ({ type: 'queue_remove', id, item_id: item.id }));
}

/** Tap plays the song; a swipe left removes it. */
function wireSwipe(row: HTMLElement, area: HTMLElement, item: QueueEntry) {
  let start: { x: number; y: number } | null = null;
  let dx = 0;
  let horizontal: boolean | null = null;
  area.addEventListener('pointerdown', (e) => {
    start = { x: e.clientX, y: e.clientY };
    dx = 0;
    horizontal = null;
  });
  area.addEventListener('pointermove', (e) => {
    if (!start) return;
    const mx = e.clientX - start.x;
    const my = e.clientY - start.y;
    if (horizontal === null && Math.hypot(mx, my) > 8) {
      horizontal = Math.abs(mx) > Math.abs(my);
      if (horizontal) area.setPointerCapture(e.pointerId);
    }
    if (!horizontal) return;
    dx = Math.min(0, mx);
    row.classList.add('is-swiping');
    row.style.transform = `translateX(${dx}px)`;
    row.style.opacity = String(1 + dx / 300);
  });
  const end = () => {
    if (!start) return;
    const wasTap = horizontal === null;
    start = null;
    row.classList.remove('is-swiping');
    if (horizontal && dx < -96) {
      removeItem(item);
      return;
    }
    row.style.transform = '';
    row.style.opacity = '';
    if (wasTap) act((id) => ({ type: 'queue_jump', id, item_id: item.id }));
  };
  area.addEventListener('pointerup', end);
  area.addEventListener('pointercancel', () => {
    horizontal = false;
    end();
  });
}

/** Drag the handle up or down to move the song. */
function wireDrag(row: HTMLElement, handle: HTMLElement, item: QueueEntry, index: number) {
  let startY = 0;
  let height = 64;
  let dragging = false;
  handle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    dragging = true;
    startY = e.clientY;
    height = row.getBoundingClientRect().height || 64;
    handle.setPointerCapture(e.pointerId);
    row.classList.add('is-dragging');
  });
  handle.addEventListener('pointermove', (e) => {
    if (dragging) row.style.transform = `translateY(${e.clientY - startY}px)`;
  });
  const drop = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    row.classList.remove('is-dragging');
    row.style.transform = '';
    const to = Math.max(0, Math.min(state.queue.length - 1, index + Math.round((e.clientY - startY) / height)));
    if (to === index) return;
    state = { ...state, queue: moveItem(state.queue, index, to) };
    renderQueue();
    act((id) => ({ type: 'queue_move', id, item_id: item.id, to_index: to }));
  };
  handle.addEventListener('pointerup', drop);
  handle.addEventListener('pointercancel', drop);
}

// ---------- search ----------

let searchSeq = 0;

function wireSearch() {
  const input = $<HTMLInputElement>('search-input');
  $('search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query) return;
    input.blur();
    const seq = ++searchSeq;
    request((id) => ({ type: 'search', id, query })).then(
      (msg) => {
        if (seq !== searchSeq || msg.type !== 'search_results') return;
        renderResults(msg.results);
      },
      (e: Error) => e.message !== 'offline' && toast(errorText(e.message))
    );
  });
}

function renderResults(results: SearchResult[]) {
  const canControl = canControlRoom(state.room);
  $('search-empty').classList.toggle('is-hidden', results.length > 0);
  $('search-results').replaceChildren(
    ...results.map((r) => {
      const row = el('li', 'row');
      const text = el('div', 'row-text');
      text.append(el('div', 'row-title', r.title), el('div', 'row-sub', r.subtitle));
      row.append(thumb(r.thumbnail), text);
      if (canControl) {
        const play = () => act((id) => ({ type: 'play', id, video_id: r.video_id }));
        text.addEventListener('click', play);
        row.append(
          iconButton(ICON.play, rt('search.play'), play),
          iconButton(ICON.next, rt('search.next'), () =>
            act((id) => ({ type: 'enqueue', id, video_id: r.video_id, next: true }), 'search.added')
          ),
          iconButton(ICON.add, rt('search.add'), () =>
            act((id) => ({ type: 'enqueue', id, video_id: r.video_id, next: false }), 'search.added')
          )
        );
      }
      return row;
    })
  );
}

// ---------- room ----------

function renderRoom() {
  const room = state.room;
  $('room-none').classList.toggle('is-hidden', !!room);
  $('room-body').classList.toggle('is-hidden', !room);
  if (!room) return;
  $('room-count').textContent = rt('room.members', { count: room.members.length });
  $('room-members').replaceChildren(
    ...room.members.map((m) => {
      const row = el('li', 'row');
      const text = el('div', 'row-text');
      text.append(el('div', 'row-title', m.id === room.me ? `${m.nickname} ${rt('room.you')}` : m.nickname));
      const roleKey = `room.${m.role}` as RemoteKey;
      row.append(text, el('span', 'chip', rt(roleKey)));
      return row;
    })
  );
  $('room-listener').classList.toggle('is-hidden', canControlRoom(room));
  const voted = room.skip_votes.includes(room.me);
  $<HTMLButtonElement>('btn-vote').disabled = voted;
  $('room-votes').textContent = room.skip_votes.length
    ? rt('room.votes', { votes: room.skip_votes.length, needed: room.votes_needed })
    : '';
}

function wireRoom() {
  $('btn-vote').addEventListener('click', () => act((id) => ({ type: 'vote_skip', id })));
  $('reactions').replaceChildren(
    ...REACTIONS.map((emoji) => {
      const btn = el('button', 'reaction-btn', emoji);
      btn.type = 'button';
      btn.addEventListener('click', () => act((id) => ({ type: 'react', id, emoji })));
      return btn;
    })
  );
}

function showReaction(from: string, emoji: string) {
  const item = el('div', 'float-reaction');
  item.append(el('small', undefined, from), document.createTextNode(emoji));
  $('floating').append(item);
  window.setTimeout(() => item.remove(), 2500);
}

// ---------- tabs, wake lock ----------

function showView(viewId: string) {
  document.querySelectorAll<HTMLElement>('.view').forEach((v) => v.classList.toggle('is-active', v.id === viewId));
  document.querySelectorAll<HTMLElement>('.tab').forEach((t) => {
    const on = t.dataset.view === viewId;
    t.classList.toggle('is-active', on);
    t.setAttribute('aria-selected', String(on));
  });
  try {
    localStorage.setItem(TAB_KEY, viewId);
  } catch {
    // Storage blocked: the tab just isn't remembered.
  }
  if (viewId === 'view-lyrics') {
    ($('lyrics').children[activeLyric] as HTMLElement | undefined)?.scrollIntoView({ block: 'center' });
  }
}

type WakeLockSentinelLike = { release: () => Promise<void>; released: boolean };
type NavigatorWithWakeLock = Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> } };
let wakeLock: WakeLockSentinelLike | null = null;

/** Keeps the phone's screen on while the remote is open. Browsers only
 * allow it in a secure context, which a plain-HTTP LAN page usually isn't,
 * so this quietly does nothing there. */
async function keepAwake() {
  const nav = navigator as NavigatorWithWakeLock;
  if (!nav.wakeLock || document.visibilityState !== 'visible' || (wakeLock && !wakeLock.released)) return;
  try {
    wakeLock = await nav.wakeLock.request('screen');
  } catch {
    wakeLock = null;
  }
}

// ---------- render ----------

function render(prev: RemoteState) {
  $('offline').classList.toggle('is-hidden', state.connected);
  if (state.player !== prev.player) renderPlayer();
  if (state.lyrics !== prev.lyrics || state.player?.track?.video_id !== prev.player?.track?.video_id) renderLyrics();
  if (state.queue !== prev.queue || state.queueShared !== prev.queueShared || state.room !== prev.room) renderQueue();
  if (state.room !== prev.room) renderRoom();
  const newest = state.reactions[state.reactions.length - 1];
  if (newest && newest !== prev.reactions[prev.reactions.length - 1]) showReaction(newest.from, newest.emoji);
}

function init() {
  setRemoteLocale(navigator.language);
  applyRemoteI18n(document);
  wirePlayer();
  wireSearch();
  wireRoom();
  document.querySelectorAll<HTMLElement>('.tab').forEach((t) => t.addEventListener('click', () => showView(t.dataset.view ?? 'view-player')));
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(TAB_KEY);
  } catch {
    saved = null;
  }
  if (saved && document.getElementById(saved)?.classList.contains('view')) showView(saved);

  renderPlayer();
  renderLyrics();
  renderQueue();
  renderRoom();
  window.setInterval(tick, 250);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    void keepAwake();
    if (!state.connected) {
      attempt = 0;
      connect();
    }
  });
  void keepAwake();
  connect();
}

init();
