export {};

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
      item.innerHTML = `
        <span style="font-weight: 500;">${escapeHtml(m.nickname)}</span>
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
    });

    tabGuest.addEventListener('click', () => {
      tabGuest.classList.add('active');
      tabHost.classList.remove('active');
      panelGuest.style.display = 'flex';
      panelHost.style.display = 'none';
    });
  }

  // Create Room
  const createBtn = document.getElementById('create-room-btn');
  const hostNickInput = document.getElementById('host-nickname') as HTMLInputElement;
  if (createBtn && hostNickInput) {
    createBtn.addEventListener('click', async () => {
      const nick = hostNickInput.value.trim() || 'Host';
      if (window.__TAURI__?.core) {
        try {
          const room = (await window.__TAURI__.core.invoke('create_sync_room', { nickname: nick })) as RoomState;
          activeRoom = room;
          renderRoomView(room);
        } catch (e) {
          console.error('[YTMD Sync] Failed to create room:', e);
        }
      }
    });
  }

  // Join Room
  const joinBtn = document.getElementById('join-room-btn');
  const joinCodeInput = document.getElementById('join-code') as HTMLInputElement;
  const guestNickInput = document.getElementById('guest-nickname') as HTMLInputElement;
  if (joinBtn && joinCodeInput && guestNickInput) {
    joinBtn.addEventListener('click', async () => {
      const code = joinCodeInput.value.trim().toUpperCase();
      const nick = guestNickInput.value.trim() || 'Friend';
      if (!code) return;

      if (window.__TAURI__?.core) {
        try {
          const room = (await window.__TAURI__.core.invoke('join_sync_room', {
            roomCode: code,
            nickname: nick
          })) as RoomState;
          activeRoom = room;
          renderRoomView(room);
        } catch (e) {
          console.error('[YTMD Sync] Failed to join room:', e);
        }
      }
    });
  }

  // Copy Code
  const copyBtn = document.getElementById('copy-code-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (activeRoom) {
        navigator.clipboard.writeText(activeRoom.room_code);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = 'Copy Code';
        }, 1500);
      }
    });
  }

  // Leave Room
  const leaveBtn = document.getElementById('leave-room-btn');
  if (leaveBtn) {
    leaveBtn.addEventListener('click', async () => {
      if (window.__TAURI__?.core) {
        try {
          await window.__TAURI__.core.invoke('leave_sync_room');
          activeRoom = null;
          renderRoomView(null);
        } catch (e) {
          console.error('[YTMD Sync] Failed to leave room:', e);
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
