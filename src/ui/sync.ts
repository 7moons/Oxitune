import { initAmbientBackdrop } from './ambient';
import { getInitials } from './format';

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

let activeRoom: RoomState | null = null;

function renderRoomView(room: RoomState | null) {
  const setupView = document.getElementById('setup-view');
  const activeView = document.getElementById('active-room-view');

  if (!setupView || !activeView) return;

  if (!room) {
    setupView.style.display = 'block';
    activeView.style.display = 'none';
    return;
  }

  setupView.style.display = 'none';
  activeView.style.display = 'flex';
  hideFormError('leave-room-error');

  const codeDisplay = document.getElementById('room-code-display');
  if (codeDisplay) codeDisplay.textContent = room.room_code;

  const countEl = document.getElementById('member-count');
  if (countEl) {
    const len = room.members.length;
    countEl.textContent = `${len} ${len === 1 ? 'listener' : 'listeners'}`;
  }

  const listEl = document.getElementById('members-list');
  if (listEl) {
    listEl.innerHTML = '';
    room.members.forEach((m) => {
      const item = document.createElement('div');
      item.className = 'member-item';
      const initials = getInitials(m.nickname);

      item.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="member-avatar">${escapeHtml(initials)}</div>
          <span style="font-weight: 500; color: var(--text-primary);">${escapeHtml(m.nickname)}</span>
        </div>
        ${m.is_host ? '<span class="badge-host">Host</span>' : '<span style="color: var(--text-muted); font-size: 11px;">Listener</span>'}
      `;
      listEl.appendChild(item);
    });
  }
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

const ERROR_ICON_SVG =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';

/**
 * Toggles a button between its normal label and a spinner + status text,
 * and disables/re-enables every input in `siblingsToLock` alongside it —
 * so a pending create/join request can't be double-submitted and the form
 * fields don't silently change under a request that's already in flight.
 */
function setButtonLoading(
  button: HTMLButtonElement | null,
  labelEl: HTMLElement | null,
  loading: boolean,
  loadingText: string,
  originalText: string,
  siblingsToLock: (HTMLElement | null)[]
) {
  if (!button || !labelEl) return;
  button.disabled = loading;
  siblingsToLock.forEach((el) => {
    if (el) (el as HTMLInputElement).disabled = loading;
  });
  labelEl.innerHTML = loading
    ? `<span class="spinner"></span><span>${escapeHtml(loadingText)}</span>`
    : escapeHtml(originalText);
}

function showFormError(bannerId: string, message: string) {
  const banner = document.getElementById(bannerId);
  if (!banner) return;
  banner.innerHTML = `${ERROR_ICON_SVG}<span>${escapeHtml(message)}</span>`;
  banner.style.display = 'flex';
}

function hideFormError(bannerId: string) {
  const banner = document.getElementById(bannerId);
  if (banner) banner.style.display = 'none';
}

function setStatusHint(hintId: string, text: string) {
  const hint = document.getElementById(hintId);
  if (!hint) return;
  if (text) {
    hint.textContent = text;
    hint.style.display = 'inline';
  } else {
    hint.style.display = 'none';
  }
}

/** Human-readable message for whatever `invoke()` rejects with — Tauri
 * commands that return `Result<T, String>` reject with that string
 * directly, but fall back gracefully if something else shows up. */
function errorMessage(e: unknown): string {
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message;
  return 'Something went wrong. Check the app logs for details.';
}

async function loadRoomState() {
  if (window.__TAURI__?.core) {
    try {
      const state = (await window.__TAURI__.core.invoke('get_sync_room_state')) as RoomState | null;
      activeRoom = state;
      renderRoomView(activeRoom);
    } catch {
      renderRoomView(null);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initAmbientBackdrop();
  loadRoomState();

  // Tab switching
  const tabHost = document.getElementById('tab-host');
  const tabGuest = document.getElementById('tab-guest');
  const panelHost = document.getElementById('panel-host');
  const panelGuest = document.getElementById('panel-guest');

  if (tabHost && tabGuest && panelHost && panelGuest) {
    tabHost.addEventListener('click', () => {
      tabHost.classList.add('active');
      tabGuest.classList.remove('active');
      panelHost.style.display = 'flex';
      panelGuest.style.display = 'none';
      hideFormError('guest-error');
    });

    tabGuest.addEventListener('click', () => {
      tabGuest.classList.add('active');
      tabHost.classList.remove('active');
      panelGuest.style.display = 'flex';
      panelHost.style.display = 'none';
      hideFormError('host-error');
    });
  }

  // Create Room
  const createBtn = document.getElementById('create-room-btn') as HTMLButtonElement | null;
  const createBtnLabel = document.getElementById('create-room-btn-label');
  const hostNickInput = document.getElementById('host-nickname') as HTMLInputElement;
  let createInFlight = false;

  const handleCreateRoom = async () => {
    if (createInFlight) return;
    const nick = hostNickInput?.value.trim() || 'Host';
    if (!window.__TAURI__?.core) return;

    createInFlight = true;
    hideFormError('host-error');
    setButtonLoading(createBtn, createBtnLabel, true, 'Creating room…', 'Create Listening Room', [hostNickInput]);

    try {
      const room = (await window.__TAURI__.core.invoke('create_sync_room', { nickname: nick })) as RoomState;
      activeRoom = room;
      renderRoomView(room);
    } catch (e) {
      console.error('[YTMD Sync] Failed to create room:', e);
      showFormError('host-error', errorMessage(e));
    } finally {
      createInFlight = false;
      setButtonLoading(createBtn, createBtnLabel, false, '', 'Create Listening Room', [hostNickInput]);
    }
  };

  if (createBtn) createBtn.addEventListener('click', handleCreateRoom);
  if (hostNickInput) {
    hostNickInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleCreateRoom();
    });
  }

  // Join Room
  const joinBtn = document.getElementById('join-room-btn') as HTMLButtonElement | null;
  const joinBtnLabel = document.getElementById('join-room-btn-label');
  const joinCodeInput = document.getElementById('join-code') as HTMLInputElement;
  const guestNickInput = document.getElementById('guest-nickname') as HTMLInputElement;
  let joinInFlight = false;

  // The Rust side tries the LAN beacon first (~4s) before falling back to
  // the internet (DHT) path, which can take up to ~20s more — see
  // p2p_sync.rs. There's no intermediate progress event from the backend,
  // so this is a client-side timer estimating when that fallback most
  // likely kicked in, purely so a 15s wait doesn't look like the app hung.
  const LAN_TIMEOUT_ESTIMATE_MS = 4500;
  let joinPhaseTimer: ReturnType<typeof setTimeout> | null = null;

  const handleJoinRoom = async () => {
    if (joinInFlight) return;
    const code = joinCodeInput?.value.trim().toUpperCase();
    const nick = guestNickInput?.value.trim() || 'Friend';

    hideFormError('guest-error');
    if (!code) {
      showFormError('guest-error', 'Enter a room code first.');
      return;
    }
    if (!window.__TAURI__?.core) return;

    joinInFlight = true;
    setButtonLoading(joinBtn, joinBtnLabel, true, 'Searching…', 'Join Listening Room', [joinCodeInput, guestNickInput]);
    setStatusHint('guest-status-hint', 'Looking for the room on your network…');
    joinPhaseTimer = setTimeout(() => {
      setStatusHint('guest-status-hint', "Not found nearby — trying the internet, this can take up to 20s…");
    }, LAN_TIMEOUT_ESTIMATE_MS);

    try {
      const room = (await window.__TAURI__.core.invoke('join_sync_room', {
        roomCode: code,
        nickname: nick
      })) as RoomState;
      activeRoom = room;
      renderRoomView(room);
    } catch (e) {
      console.error('[YTMD Sync] Failed to join room:', e);
      showFormError('guest-error', errorMessage(e));
    } finally {
      joinInFlight = false;
      if (joinPhaseTimer) clearTimeout(joinPhaseTimer);
      setStatusHint('guest-status-hint', '');
      setButtonLoading(joinBtn, joinBtnLabel, false, '', 'Join Listening Room', [joinCodeInput, guestNickInput]);
    }
  };

  if (joinBtn) joinBtn.addEventListener('click', handleJoinRoom);
  if (joinCodeInput) {
    joinCodeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleJoinRoom();
    });
  }
  if (guestNickInput) {
    guestNickInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleJoinRoom();
    });
  }

  // Copy Code
  const copyBtn = document.getElementById('copy-code-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (activeRoom) {
        navigator.clipboard.writeText(activeRoom.room_code);
        const originalHtml = copyBtn.innerHTML;
        copyBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span style="color: #22c55e;">Copied!</span>
        `;
        setTimeout(() => {
          copyBtn.innerHTML = originalHtml;
        }, 1800);
      }
    });
  }

  // Leave Room
  const leaveBtn = document.getElementById('leave-room-btn') as HTMLButtonElement | null;
  if (leaveBtn) {
    leaveBtn.addEventListener('click', async () => {
      if (window.__TAURI__?.core) {
        hideFormError('leave-room-error');
        leaveBtn.disabled = true;
        try {
          await window.__TAURI__.core.invoke('leave_sync_room');
          activeRoom = null;
          renderRoomView(null);
        } catch (e) {
          console.error('[YTMD Sync] Failed to leave room:', e);
          showFormError('leave-room-error', `Couldn't leave the room: ${errorMessage(e)}`);
        } finally {
          leaveBtn.disabled = false;
        }
      }
    });
  }

  // Listen to remote updates
  if (window.__TAURI__?.event) {
    window.__TAURI__.event.listen<RoomState>('sync-room-updated', (e) => {
      activeRoom = e.payload;
      renderRoomView(activeRoom);
    });

    window.__TAURI__.event.listen('sync-room-left', () => {
      activeRoom = null;
      renderRoomView(null);
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
