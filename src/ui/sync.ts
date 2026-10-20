import { openDialog, showToast } from '../preload/ui/kit';
import { t } from '../preload/ui/i18n';
import { canControl, canKick, MemberRole, roleOf, SYNC_REACTIONS, votesNeeded } from '../preload/syncRoles';
import { DRAG_ICON, enableReorder, restoreReorderFocus } from '../preload/ui/reorder';
import { initAmbientBackdrop } from './ambient';
import { getInitials } from './format';
import { COMPANION_LOCALES, I18nKey, tr } from './i18n';
import { BrokerProbe, describeProbes } from './syncProbe';
import { initWindowChrome } from './window';

interface RoomMember {
  id: string;
  nickname: string;
  is_host: boolean;
  joined_at_ms: number;
  role?: MemberRole;
}

interface BannedMember {
  client_hash: string;
  nickname: string;
}

interface PendingMember {
  user_id: string;
  nickname: string;
}

interface QueueItem {
  id: string;
  video_id: string;
  title: string;
  artist: string;
  added_by: string;
  added_by_id: string;
}

interface RoomState {
  room_code: string;
  is_host: boolean;
  current_user_id: string;
  members: RoomMember[];
  default_role?: MemberRole;
  require_approval?: boolean;
  queue?: QueueItem[];
  skip_votes?: string[];
  banned?: BannedMember[];
  pending?: PendingMember[];
  reconnecting?: boolean;
}

type LeaveReason = 'left' | 'closed' | 'kicked' | 'lost';

const NAME_STORAGE_KEY = 'oxitune-sync-name';
const ASSIGNABLE_ROLES: MemberRole[] = ['moderator', 'dj', 'listener'];
const ICON = {
  remove: 'M14 8c0-2.21-1.79-4-4-4S6 5.79 6 8s1.79 4 4 4 4-1.79 4-4zm3 2v2h6v-2h-6zM2 18v2h16v-2c0-2.66-5.33-4-8-4s-8 1.34-8 4z',
  crown: 'M5 16 3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z',
  play: 'M8 5v14l11-7z',
  close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  drag: DRAG_ICON
};

function svgIcon(path: string): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const icon = document.createElementNS(ns, 'svg');
  icon.setAttribute('class', 'icon');
  icon.setAttribute('viewBox', '0 0 24 24');
  const p = document.createElementNS(ns, 'path');
  p.setAttribute('d', path);
  icon.appendChild(p);
  return icon;
}

function iconButton(iconPath: string, label: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'icon-btn sm';
  btn.setAttribute('aria-label', label);
  btn.dataset.oxituneTooltip = label;
  btn.appendChild(svgIcon(iconPath));
  btn.addEventListener('click', onClick);
  return btn;
}

let activeRoom: RoomState | null = null;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;
const show = (el: HTMLElement | null, visible: boolean) => el?.classList.toggle('is-hidden', !visible);

const isI18nKey = (s: string): s is I18nKey => s in COMPANION_LOCALES.en;

/** The backend reports sync failures as i18n keys (`sync.error.*`); anything
 * else is an OS/network message shown as is. */
function errorMessage(e: unknown): string {
  const raw = typeof e === 'string' ? e : e instanceof Error ? e.message : null;
  if (raw === null) return tr('common.unknownError');
  return isI18nKey(raw) ? tr(raw) : raw;
}

const ROLE_LABEL: Record<MemberRole, I18nKey> = {
  host: 'sync.role.host',
  moderator: 'sync.role.moderator',
  dj: 'sync.role.dj',
  listener: 'sync.role.listener'
};

const LEFT_MESSAGE: Partial<Record<LeaveReason, I18nKey>> = {
  kicked: 'sync.left.kicked',
  lost: 'sync.left.lost',
  closed: 'sync.left.closed'
};

async function refreshDiscordInvite(): Promise<void> {
  const toggle = $<HTMLInputElement>('discord-invite');
  if (!toggle || !window.__TAURI__?.core) return;
  try {
    toggle.checked = (await window.__TAURI__.core.invoke('get_discord_invite')) === true;
  } catch {
    toggle.checked = false;
  }
}

async function invokeSync(cmd: string, args: Record<string, unknown>): Promise<boolean> {
  if (!window.__TAURI__?.core) return false;
  try {
    await window.__TAURI__.core.invoke(cmd, args);
    return true;
  } catch (e) {
    console.error(`[Oxitune Sync] ${cmd} failed:`, e);
    showToast(errorMessage(e));
    return false;
  }
}

function confirmKick(member: RoomMember) {
  openDialog({
    id: 'oxitune-kick-dialog',
    title: tr('sync.kick.confirmTitle', { name: member.nickname }),
    body: [document.createTextNode(tr('sync.kick.confirmBody'))],
    actions: [
      { label: tr('sync.kick.cancel') },
      {
        label: tr('sync.kick.confirm'),
        filled: true,
        onClick: (close) => {
          close();
          void invokeSync('kick_sync_member', { memberId: member.id }).then((ok) => {
            if (ok) showToast(tr('sync.kick.done', { name: member.nickname }));
          });
        }
      }
    ]
  });
}

function memberRow(m: RoomMember, room: RoomState, myRole: MemberRole): HTMLElement {
  const item = document.createElement('div');
  item.className = 'member-item';
  const avatar = document.createElement('span');
  avatar.className = 'member-avatar';
  avatar.textContent = getInitials(m.nickname);
  const name = document.createElement('span');
  name.className = 'member-name';
  const isMe = m.id === room.current_user_id;
  name.textContent = isMe ? `${m.nickname} ${tr('sync.role.you')}` : m.nickname;
  item.append(avatar, name);

  const role = roleOf(m);
  if (room.is_host && role !== 'host') {
    const select = document.createElement('select');
    select.className = 'select member-role-select';
    const label = tr('sync.role.change', { name: m.nickname });
    select.setAttribute('aria-label', label);
    select.dataset.oxituneTooltip = label;
    for (const r of ASSIGNABLE_ROLES) {
      const option = document.createElement('option');
      option.value = r;
      option.textContent = tr(ROLE_LABEL[r]);
      select.appendChild(option);
    }
    select.value = role;
    select.addEventListener('change', () => {
      void invokeSync('set_sync_member_role', { memberId: m.id, role: select.value }).then((ok) => {
        if (!ok) select.value = role;
      });
    });
    item.appendChild(select);
  } else {
    const label = document.createElement('span');
    label.className = 'member-role';
    label.textContent = tr(ROLE_LABEL[role]);
    item.appendChild(label);
  }

  if (room.is_host && role !== 'host') {
    item.appendChild(iconButton(ICON.crown, tr('sync.transfer', { name: m.nickname }), () => confirmTransfer(m)));
  }
  if (!isMe && canKick(myRole, role)) {
    item.appendChild(iconButton(ICON.remove, tr('sync.kick', { name: m.nickname }), () => confirmKick(m)));
  }
  return item;
}

function confirmTransfer(member: RoomMember) {
  openDialog({
    id: 'oxitune-transfer-dialog',
    title: tr('sync.transfer.confirmTitle', { name: member.nickname }),
    body: [document.createTextNode(tr('sync.transfer.confirmBody'))],
    actions: [
      { label: tr('sync.kick.cancel') },
      {
        label: tr('sync.transfer.confirm'),
        filled: true,
        onClick: (close) => {
          close();
          void invokeSync('transfer_sync_host', { memberId: member.id });
        }
      }
    ]
  });
}

function pendingRow(p: PendingMember): HTMLElement {
  const item = document.createElement('div');
  item.className = 'member-item';
  const avatar = document.createElement('span');
  avatar.className = 'member-avatar is-muted';
  avatar.textContent = getInitials(p.nickname);
  const name = document.createElement('span');
  name.className = 'member-name';
  name.textContent = p.nickname;
  const decide = (approve: boolean) => () => {
    approveBtn.disabled = denyBtn.disabled = true;
    void invokeSync('decide_sync_join', { userId: p.user_id, approve });
  };
  const denyBtn = document.createElement('button');
  denyBtn.className = 'btn btn-tonal';
  denyBtn.textContent = tr('sync.pending.deny');
  denyBtn.addEventListener('click', decide(false));
  const approveBtn = document.createElement('button');
  approveBtn.className = 'btn btn-filled';
  approveBtn.textContent = tr('sync.pending.approve');
  approveBtn.addEventListener('click', decide(true));
  item.append(avatar, name, denyBtn, approveBtn);
  return item;
}

function queueRow(q: QueueItem, room: RoomState, myRole: MemberRole): HTMLElement {
  const item = document.createElement('div');
  item.className = 'member-item queue-item';
  if (canControl(myRole) && (room.queue?.length ?? 0) > 1) {
    const handle = iconButton(ICON.drag, tr('sync.queue.drag', { title: q.title }), () => {});
    handle.classList.add('queue-handle');
    handle.dataset.itemId = q.id;
    item.appendChild(handle);
  }
  const thumb = document.createElement('img');
  thumb.className = 'queue-thumb';
  thumb.alt = '';
  thumb.loading = 'lazy';
  thumb.src = `https://i.ytimg.com/vi/${q.video_id}/default.jpg`;
  const text = document.createElement('div');
  text.className = 'queue-text';
  const title = document.createElement('span');
  title.className = 'queue-title';
  title.textContent = q.title;
  const sub = document.createElement('span');
  sub.className = 'hint queue-sub';
  const from = tr('sync.queue.from', { name: q.added_by });
  sub.textContent = q.artist ? `${q.artist} · ${from}` : from;
  text.append(title, sub);
  item.append(thumb, text);
  if (canControl(myRole)) {
    item.appendChild(
      iconButton(ICON.play, tr('sync.queue.play', { title: q.title }), () => {
        void invokeSync('sync_queue_play', { itemId: q.id });
      })
    );
  }
  const mine = q.added_by_id === room.current_user_id;
  if (mine || myRole === 'host' || myRole === 'moderator') {
    item.appendChild(
      iconButton(ICON.close, tr('sync.queue.remove', { title: q.title }), () => {
        void invokeSync('sync_queue_remove', { itemId: q.id });
      })
    );
  }
  return item;
}

/** The emoji chips never change; built once. */
function renderReactionChips() {
  const row = $('reaction-chips');
  if (!row || row.childElementCount > 0) return;
  for (const emoji of SYNC_REACTIONS) {
    const chip = document.createElement('button');
    chip.className = 'chip reaction-chip';
    chip.textContent = emoji;
    const label = tr('sync.react', { emoji });
    chip.setAttribute('aria-label', label);
    chip.dataset.oxituneTooltip = label;
    chip.addEventListener('click', () => void invokeSync('send_sync_reaction', { emoji }));
    row.appendChild(chip);
  }
}

function bannedRow(b: BannedMember): HTMLElement {
  const item = document.createElement('div');
  item.className = 'member-item';
  const avatar = document.createElement('span');
  avatar.className = 'member-avatar is-muted';
  avatar.textContent = getInitials(b.nickname);
  const name = document.createElement('span');
  name.className = 'member-name';
  name.textContent = b.nickname;
  const unban = document.createElement('button');
  unban.className = 'btn btn-tonal';
  unban.textContent = tr('sync.unban');
  unban.addEventListener('click', () => {
    unban.disabled = true;
    void invokeSync('unban_sync_member', { clientHash: b.client_hash }).then((ok) => {
      if (ok) showToast(tr('sync.unban.done', { name: b.nickname }));
      else unban.disabled = false;
    });
  });
  item.append(avatar, name, unban);
  return item;
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

  const status = $('sync-status-label');
  if (status) status.textContent = tr(room.reconnecting ? 'sync.active.reconnecting' : 'sync.active.status');
  $('sync-status-dot')?.classList.toggle('is-waiting', !!room.reconnecting);

  const me = room.members.find((m) => m.id === room.current_user_id);
  const myRole = me ? roleOf(me) : room.is_host ? 'host' : 'listener';
  $('members-list')?.replaceChildren(...room.members.map((m) => memberRow(m, room, myRole)));

  renderReactionChips();
  const votes = room.skip_votes ?? [];
  const need = votesNeeded(room.members.length);
  const voted = votes.includes(room.current_user_id);
  const voteLabel = $('vote-skip-label');
  if (voteLabel) {
    voteLabel.textContent =
      votes.length === 0
        ? tr('sync.vote')
        : tr(voted ? 'sync.vote.voted' : 'sync.vote.count', { have: votes.length, need });
  }
  const voteBtn = $<HTMLButtonElement>('vote-skip-btn');
  if (voteBtn) voteBtn.disabled = voted || !!room.reconnecting;

  const queue = room.queue ?? [];
  // Songs are added from YTM's own ⋮ menu (redirected by the sync plugin).
  show($('queue-how'), canControl(myRole));
  show($('queue-listener-hint'), !canControl(myRole));
  const queueCount = $('queue-count');
  if (queueCount) queueCount.textContent = queue.length ? tr('sync.queue.count', { count: queue.length }) : '';
  const queueList = $('queue-list');
  if (queueList) {
    queueList.replaceChildren(...queue.map((q) => queueRow(q, room, myRole)));
    restoreReorderFocus(queueList, '.queue-handle');
  }

  const pending = room.is_host ? (room.pending ?? []) : [];
  show($('pending-section'), pending.length > 0);
  $('pending-list')?.replaceChildren(...pending.map(pendingRow));

  show($('host-settings'), room.is_host);
  const defaultRole = $<HTMLSelectElement>('default-role');
  if (defaultRole && document.activeElement !== defaultRole) defaultRole.value = room.default_role ?? 'dj';
  const approval = $<HTMLInputElement>('require-approval');
  if (approval) approval.checked = !!room.require_approval;
  if (room.is_host) void refreshDiscordInvite();

  const banned = room.is_host ? (room.banned ?? []) : [];
  show($('banned-section'), banned.length > 0);
  $('banned-list')?.replaceChildren(...banned.map(bannedRow));

  show($('end-room-btn'), room.is_host);
  show($('leave-host-hint'), room.is_host && room.members.length > 1);
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
      console.error('[Oxitune Sync] Failed to create room:', e);
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
  /** The host must let us in; the phase hint below must not replace that. */
  let joinPending = false;
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
    joinPending = false;
    setButtonLoading(joinBtn, joinLabel, tr('sync.joining'), tr('sync.join'), [joinCode, guestNick]);
    setStatusHint('guest-status-hint', tr('sync.hint.lan'));
    const phaseTimer = setTimeout(() => {
      if (!joinPending) setStatusHint('guest-status-hint', tr('sync.hint.internet'));
    }, LAN_PHASE_ESTIMATE_MS);
    try {
      const room = (await window.__TAURI__.core.invoke('join_sync_room', {
        roomCode: code,
        nickname: nameFrom(guestNick)
      })) as RoomState;
      activeRoom = room;
      renderRoomView(room);
    } catch (e) {
      console.error('[Oxitune Sync] Failed to join room:', e);
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
      console.error('[Oxitune Sync] Copy failed:', e);
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
      console.error('[Oxitune Sync] Failed to leave room:', e);
      showFormError('leave-room-error', tr('sync.error.leave', { reason: errorMessage(e) }));
    } finally {
      leaveBtn.disabled = false;
    }
  });

  const defaultRole = $<HTMLSelectElement>('default-role');
  defaultRole?.addEventListener('change', () => {
    const previous = activeRoom?.default_role ?? 'dj';
    void invokeSync('set_sync_default_role', { role: defaultRole.value }).then((ok) => {
      if (!ok) defaultRole.value = previous;
    });
  });

  $<HTMLInputElement>('require-approval')?.addEventListener('change', (e) => {
    const toggle = e.currentTarget as HTMLInputElement;
    void invokeSync('set_sync_require_approval', { enabled: toggle.checked }).then((ok) => {
      if (!ok) toggle.checked = !toggle.checked;
    });
  });

  $<HTMLInputElement>('discord-invite')?.addEventListener('change', (e) => {
    const toggle = e.currentTarget as HTMLInputElement;
    void invokeSync('set_discord_invite', { enabled: toggle.checked }).then((ok) => {
      if (!ok) toggle.checked = !toggle.checked;
    });
  });

  // An `oxitune://join/<code>` link: fill in the code, the user still joins.
  const useJoinLink = (code: string | null | undefined) => {
    if (!code || activeRoom || !joinCode) return;
    selectTab(false);
    joinCode.value = code;
    setStatusHint('guest-status-hint', tr('sync.joinLink'));
    guestNick?.focus();
  };
  window.__TAURI__?.event.listen<string>('sync-join-link', (e) => useJoinLink(e.payload));
  window.__TAURI__?.event.listen<boolean>('sync-discord-invite', (e) => {
    const toggle = $<HTMLInputElement>('discord-invite');
    if (toggle) toggle.checked = e.payload;
  });
  void window.__TAURI__?.core
    .invoke('take_pending_join_code')
    .then((code) => useJoinLink(typeof code === 'string' ? code : null))
    .catch(() => {});

  $('vote-skip-btn')?.addEventListener('click', () => {
    void invokeSync('vote_sync_skip', {}).then((ok) => {
      if (ok) showToast(tr('sync.vote.done'));
    });
  });

  const endBtn = $<HTMLButtonElement>('end-room-btn');
  endBtn?.addEventListener('click', async () => {
    endBtn.disabled = true;
    if (await invokeSync('end_sync_room', {})) {
      activeRoom = null;
      renderRoomView(null);
    }
    endBtn.disabled = false;
  });

  // Shared queue: drag a row's handle (or arrow keys on it) to reorder.
  const queueList = $('queue-list');
  if (queueList) {
    enableReorder({
      list: queueList,
      rowSelector: '.queue-item',
      handleSelector: '.queue-handle',
      onMove: (_from, to, itemId) => void invokeSync('sync_queue_move', { itemId, toIndex: to })
    });
  }

  // Connection test: which brokers this network reaches, and what that means.
  const testBtn = $<HTMLButtonElement>('test-connection-btn');
  const testLabel = $('test-connection-label');
  testBtn?.addEventListener('click', async () => {
    if (!window.__TAURI__?.core) return;
    const results = $('test-results');
    setButtonLoading(testBtn, testLabel, tr('sync.test.running'), tr('sync.test'), []);
    try {
      const probes = (await window.__TAURI__.core.invoke('test_sync_connection')) as BrokerProbe[];
      const { verdict, lines } = describeProbes(probes);
      const verdictEl = document.createElement('p');
      verdictEl.className = 'test-verdict';
      verdictEl.textContent = tr(verdict);
      const list = document.createElement('ul');
      list.className = 'test-lines';
      probes.forEach((p, i) => {
        const li = document.createElement('li');
        li.className = p.reachable ? 'is-ok' : 'is-fail';
        li.textContent = lines[i];
        list.appendChild(li);
      });
      const note = document.createElement('p');
      note.className = 'hint';
      note.textContent = tr('sync.test.lanNote');
      results?.replaceChildren(verdictEl, list, note);
      show(results, true);
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setButtonLoading(testBtn, testLabel, null, tr('sync.test'), []);
    }
  });

  window.__TAURI__?.event.listen('sync-join-pending', () => {
    if (!joinInFlight) return;
    joinPending = true;
    setStatusHint('guest-status-hint', tr('sync.hint.pending'));
  });
  window.__TAURI__?.event.listen<{ from: string; emoji: string }>('sync-reaction', (e) => {
    showToast(`${e.payload.emoji} ${e.payload.from}`, { id: 'sync-reaction', durationMs: 2000 });
  });

  window.__TAURI__?.event.listen<RoomState>('sync-room-updated', (e) => {
    activeRoom = e.payload;
    renderRoomView(activeRoom);
  });
  window.__TAURI__?.event.listen<{ reason?: LeaveReason } | null>('sync-room-left', (e) => {
    activeRoom = null;
    renderRoomView(null);
    // Say why we're back at the start, unless we left ourselves.
    const message = LEFT_MESSAGE[e.payload?.reason ?? 'left'];
    if (message) {
      selectTab(false);
      showFormError('guest-error', tr(message));
    }
  });
});
