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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || 'U';
}

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
  const handleCreateRoom = async () => {
    const nick = hostNickInput?.value.trim() || 'Host';
    if (window.__TAURI__?.core) {
      try {
        const room = (await window.__TAURI__.core.invoke('create_sync_room', { nickname: nick })) as RoomState;
        activeRoom = room;
        renderRoomView(room);
      } catch (e) {
        console.error('[YTMD Sync] Failed to create room:', e);
      }
    }
  };

  if (createBtn) createBtn.addEventListener('click', handleCreateRoom);
  if (hostNickInput) {
    hostNickInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleCreateRoom();
    });
  }

  // Join Room
  const joinBtn = document.getElementById('join-room-btn');
  const joinCodeInput = document.getElementById('join-code') as HTMLInputElement;
  const guestNickInput = document.getElementById('guest-nickname') as HTMLInputElement;

  const handleJoinRoom = async () => {
    const code = joinCodeInput?.value.trim().toUpperCase();
    const nick = guestNickInput?.value.trim() || 'Friend';
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
