import { showToast } from '../preload/ui/kit';
import { t } from '../preload/ui/i18n';
import { initAmbientBackdrop } from './ambient';
import { getInitials } from './format';
import { tr } from './i18n';
import { initWindowChrome } from './window';

interface RoomMember {
  id: string;
  nickname: string;
  is_host: boolean;
  joined_at_ms: number;
}

interface RoomState {
  room_code: string;
  is_host: boolean;
  current_user_id: string;
  members: RoomMember[];
}

const NAME_STORAGE_KEY = 'ytmd-sync-name';

let activeRoom: RoomState | null = null;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;
const show = (el: HTMLElement | null, visible: boolean) => el?.classList.toggle('is-hidden', !visible);

function errorMessage(e: unknown): string {
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message;
  return tr('common.unknownError');
}

function rememberedName(): string {
  try {
    return localStorage.getItem(NAME_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function rememberName(name: string) {
  try {
    localStorage.setItem(NAME_STORAGE_KEY, name);
  } catch {
    // Storage blocked: the name just isn't prefilled next time.
  }
}

function renderRoomView(room: RoomState | null) {
  show($('setup-view'), !room);
  show($('active-room-view'), !!room);
  if (!room) return;
  hideFormError('leave-room-error');

  const code = $('room-code-display');
  if (code) code.textContent = room.room_code;
  const count = $('member-count');
  if (count) count.textContent = t().syncListeners(room.members.length);

  const list = $('members-list');
  if (!list) return;
  list.replaceChildren(
    ...room.members.map((m) => {
      const item = document.createElement('div');
      item.className = 'member-item';
      const avatar = document.createElement('span');
      avatar.className = 'member-avatar';
      avatar.textContent = getInitials(m.nickname);
      const name = document.createElement('span');
      name.className = 'member-name';
      name.textContent = m.id === room.current_user_id ? `${m.nickname} ${tr('sync.role.you')}` : m.nickname;
      const role = document.createElement('span');
      role.className = 'member-role';
      role.textContent = m.is_host ? tr('sync.role.host') : tr('sync.role.listener');
      item.append(avatar, name, role);
      return item;
    })
  );
}

function showFormError(id: string, message: string) {
  const banner = $(id);
  if (!banner) return;
  const ns = 'http://www.w3.org/2000/svg';
  const icon = document.createElementNS(ns, 'svg');
  icon.setAttribute('class', 'icon');
  icon.setAttribute('viewBox', '0 0 24 24');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', 'M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z');
  icon.appendChild(path);
  const text = document.createElement('span');
  text.textContent = message;
  banner.replaceChildren(icon, text);
  show(banner, true);
}

function hideFormError(id: string) {
  show($(id), false);
}

function setStatusHint(id: string, text: string) {
  const hint = $(id);
  if (!hint) return;
  hint.textContent = text;
  show(hint, !!text);
}

/** Swaps a button to spinner + text while a request is in flight and locks
 * the related inputs, so a pending create/join can't be double-submitted. */
function setButtonLoading(
  button: HTMLButtonElement | null,
  labelEl: HTMLElement | null,
  loadingText: string | null,
  idleText: string,
  lock: (HTMLInputElement | null)[]
) {
  if (!button || !labelEl) return;
  const loading = loadingText !== null;
  button.disabled = loading;
  lock.forEach((el) => {
    if (el) el.disabled = loading;
  });
  if (!loading) {
    labelEl.textContent = idleText;
    return;
  }
  const spinner = document.createElement('span');
  spinner.className = 'spinner';
  const text = document.createElement('span');
  text.textContent = loadingText;
  labelEl.replaceChildren(spinner, text);
}

async function loadRoomState() {
  if (!window.__TAURI__?.core) return;
  try {
    activeRoom = (await window.__TAURI__.core.invoke('get_sync_room_state')) as RoomState | null;
  } catch {
    activeRoom = null;
  }
  renderRoomView(activeRoom);
}

document.addEventListener('DOMContentLoaded', () => {
  initWindowChrome();
  initAmbientBackdrop();
  void loadRoomState();

  const hostNick = $<HTMLInputElement>('host-nickname');
  const guestNick = $<HTMLInputElement>('guest-nickname');
  const joinCode = $<HTMLInputElement>('join-code');
  for (const input of [hostNick, guestNick]) {
    if (!input) continue;
    input.value = rememberedName();
    input.placeholder = tr('sync.field.namePlaceholder');
  }
  const nameFrom = (input: HTMLInputElement | null) => {
    const name = input?.value.trim() || tr('sync.defaultName');
    rememberName(input?.value.trim() ?? '');
    return name;
  };

  // Tabs
  const tabHost = $('tab-host');
  const tabGuest = $('tab-guest');
  const selectTab = (host: boolean) => {
    tabHost?.classList.toggle('is-selected', host);
    tabGuest?.classList.toggle('is-selected', !host);
    tabHost?.setAttribute('aria-selected', String(host));
    tabGuest?.setAttribute('aria-selected', String(!host));
    show($('panel-host'), host);
    show($('panel-guest'), !host);
    hideFormError(host ? 'guest-error' : 'host-error');
    (host ? hostNick : joinCode)?.focus();
  };
  tabHost?.addEventListener('click', () => selectTab(true));
  tabGuest?.addEventListener('click', () => selectTab(false));

  // Create
  const createBtn = $<HTMLButtonElement>('create-room-btn');
  const createLabel = $('create-room-btn-label');
  let createInFlight = false;
  const handleCreate = async () => {
    if (createInFlight || !window.__TAURI__?.core) return;
    createInFlight = true;
    hideFormError('host-error');
    setButtonLoading(createBtn, createLabel, tr('sync.creating'), tr('sync.create'), [hostNick]);
    try {
      const room = (await window.__TAURI__.core.invoke('create_sync_room', { nickname: nameFrom(hostNick) })) as RoomState;
      activeRoom = room;
      renderRoomView(room);
    } catch (e) {
      console.error('[YTMD Sync] Failed to create room:', e);
      showFormError('host-error', errorMessage(e));
    } finally {
      createInFlight = false;
      setButtonLoading(createBtn, createLabel, null, tr('sync.create'), [hostNick]);
    }
  };
  createBtn?.addEventListener('click', handleCreate);
  hostNick?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') void handleCreate();
  });

  // Join. The backend tries the local network first (~2.5s), then the
  // internet brokers (up to ~15s) with no progress events in between, so
  // this timer only estimates when the internet phase began — enough that
  // a longer wait doesn't look like the app hung.
  const LAN_PHASE_ESTIMATE_MS = 3000;
  const joinBtn = $<HTMLButtonElement>('join-room-btn');
  const joinLabel = $('join-room-btn-label');
  let joinInFlight = false;
  const handleJoin = async () => {
    if (joinInFlight) return;
    const code = joinCode?.value.trim().toUpperCase() ?? '';
    hideFormError('guest-error');
    if (!code) {
      showFormError('guest-error', tr('sync.error.codeRequired'));
      joinCode?.focus();
      return;
    }
    if (!window.__TAURI__?.core) return;

    joinInFlight = true;
    setButtonLoading(joinBtn, joinLabel, tr('sync.joining'), tr('sync.join'), [joinCode, guestNick]);
    setStatusHint('guest-status-hint', tr('sync.hint.lan'));
    const phaseTimer = setTimeout(() => setStatusHint('guest-status-hint', tr('sync.hint.internet')), LAN_PHASE_ESTIMATE_MS);
    try {
      const room = (await window.__TAURI__.core.invoke('join_sync_room', {
        roomCode: code,
        nickname: nameFrom(guestNick)
      })) as RoomState;
      activeRoom = room;
      renderRoomView(room);
    } catch (e) {
      console.error('[YTMD Sync] Failed to join room:', e);
      showFormError('guest-error', errorMessage(e));
    } finally {
      joinInFlight = false;
      clearTimeout(phaseTimer);
      setStatusHint('guest-status-hint', '');
      setButtonLoading(joinBtn, joinLabel, null, tr('sync.join'), [joinCode, guestNick]);
    }
  };
  joinBtn?.addEventListener('click', handleJoin);
  for (const input of [joinCode, guestNick]) {
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') void handleJoin();
    });
  }

  $('copy-code-btn')?.addEventListener('click', async () => {
    if (!activeRoom) return;
    try {
      await navigator.clipboard.writeText(activeRoom.room_code);
      showToast(tr('sync.copied'));
    } catch (e) {
      console.error('[YTMD Sync] Copy failed:', e);
      showToast(tr('common.unknownError'));
    }
  });

  const leaveBtn = $<HTMLButtonElement>('leave-room-btn');
  leaveBtn?.addEventListener('click', async () => {
    if (!window.__TAURI__?.core) return;
    hideFormError('leave-room-error');
    leaveBtn.disabled = true;
    try {
      await window.__TAURI__.core.invoke('leave_sync_room');
      activeRoom = null;
      renderRoomView(null);
    } catch (e) {
      console.error('[YTMD Sync] Failed to leave room:', e);
      showFormError('leave-room-error', tr('sync.error.leave', { reason: errorMessage(e) }));
    } finally {
      leaveBtn.disabled = false;
    }
  });

  window.__TAURI__?.event.listen<RoomState>('sync-room-updated', (e) => {
    activeRoom = e.payload;
    renderRoomView(activeRoom);
  });
  window.__TAURI__?.event.listen('sync-room-left', () => {
    activeRoom = null;
    renderRoomView(null);
  });
});
