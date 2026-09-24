/**
 * Oscilla's entry point in YouTube Music's top bar: one round icon button next
 * to YTM's own cast/avatar buttons that opens a YTM-style menu, plus a
 * "listening together" chip that only exists while in a sync room.
 */
import { createEl } from '../../utils/dom';
import { ensureKitStyles, createIconButton, icon, ICONS } from './kit';
import { t } from './i18n';

export interface NavMenuItem {
  id: string;
  iconPath: string;
  label: string;
  hint?: string;
  onSelect: () => void;
  dividerBefore?: boolean;
}

export interface SyncStatus {
  listeners: number;
  isHost: boolean;
}

const SLOT_ID = 'ytmd-nav-slot';
const BUTTON_ID = 'ytmd-menu-btn';
const MENU_ID = 'ytmd-menu';
const CHIP_ID = 'ytmd-sync-chip';

let items: NavMenuItem[] = [];
let syncStatus: SyncStatus | null = null;
let onSyncChipClick: (() => void) | null = null;
let outsideClickInstalled = false;

const SLOT_CSS = `
  #${SLOT_ID} {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 0 8px;
    flex-shrink: 0;
  }
`;

function ensureSlotStyles() {
  if (document.getElementById('ytmd-nav-slot-styles')) return;
  const style = document.createElement('style');
  style.id = 'ytmd-nav-slot-styles';
  style.textContent = SLOT_CSS;
  document.head.appendChild(style);
}

/** Sub-label for the "Listen together" item while in a room. */
export function syncSubtitle(status: SyncStatus | null): string | undefined {
  if (!status) return undefined;
  return `${t().syncInRoom} · ${t().syncListeners(status.listeners)}`;
}

export function configureNavMenu(opts: { items: NavMenuItem[]; onSyncChipClick: () => void }): void {
  items = opts.items;
  onSyncChipClick = opts.onSyncChipClick;
}

/** Idempotent; safe to call from a poll — YTM re-renders its nav bar on
 * some navigations, which drops anything we'd put in it. */
export function mountNavMenu(): void {
  if (document.getElementById(SLOT_ID)?.isConnected) return;

  const container =
    document.querySelector('ytmusic-nav-bar #right-content, ytmusic-nav-bar .right-content') ||
    document.querySelector('ytmusic-nav-bar');
  if (!container) return;

  ensureKitStyles();
  ensureSlotStyles();

  const slot = createEl('div', { id: SLOT_ID });
  const button = createIconButton({ id: BUTTON_ID, label: t().menuLabel, iconPath: ICONS.apps });
  button.setAttribute('aria-haspopup', 'menu');
  button.setAttribute('aria-expanded', 'false');
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu(button);
  });
  slot.appendChild(button);
  container.prepend(slot);
  renderSyncChip();
  installOutsideClick();
}

export function setSyncStatus(status: SyncStatus | null): void {
  syncStatus = status;
  renderSyncChip();
  // Keep an open menu's subtitle current.
  const menu = document.getElementById(MENU_ID);
  if (menu?.classList.contains('ytmd-open')) renderMenu(menu);
}

function renderSyncChip() {
  const slot = document.getElementById(SLOT_ID);
  if (!slot) return;
  let chip = document.getElementById(CHIP_ID);
  if (!syncStatus) {
    chip?.remove();
    return;
  }
  if (!chip) {
    chip = createEl('button', { id: CHIP_ID, className: 'ytmd-chip' });
    (chip as HTMLButtonElement).type = 'button';
    chip.addEventListener('click', () => onSyncChipClick?.());
    slot.prepend(chip);
  }
  const label = t().syncListeners(syncStatus.listeners);
  chip.replaceChildren(createEl('span', { className: 'ytmd-chip-dot' }), icon(ICONS.group, 18), createEl('span', { text: label }));
  chip.dataset.ytmdTooltip = t().syncInRoom;
  chip.setAttribute('aria-label', `${t().syncInRoom}, ${label}`);
}

function renderMenu(menu: HTMLElement) {
  const nodes: Node[] = [];
  for (const item of items) {
    if (item.dividerBefore) nodes.push(createEl('div', { className: 'ytmd-menu-divider' }));
    const row = createEl('button', { className: 'ytmd-menu-item' });
    row.type = 'button';
    row.setAttribute('role', 'menuitem');
    row.dataset.itemId = item.id;
    const text = createEl('span', { className: 'ytmd-menu-item-text' });
    text.appendChild(createEl('span', { text: item.label }));
    const sub = item.id === 'sync' ? syncSubtitle(syncStatus) : undefined;
    if (sub) text.appendChild(createEl('span', { className: 'ytmd-menu-item-sub', text: sub }));
    row.append(icon(item.iconPath), text);
    if (item.hint) row.appendChild(createEl('span', { className: 'ytmd-menu-item-hint', text: item.hint }));
    row.addEventListener('click', () => {
      closeMenu();
      item.onSelect();
    });
    nodes.push(row);
  }
  menu.replaceChildren(...nodes);
}

function getMenu(): HTMLElement {
  let menu = document.getElementById(MENU_ID);
  if (!menu) {
    menu = createEl('div', { id: MENU_ID, className: 'ytmd-menu' });
    menu.setAttribute('role', 'menu');
    menu.addEventListener('keydown', onMenuKeydown);
    document.body.appendChild(menu);
  }
  return menu;
}

function toggleMenu(button: HTMLElement) {
  const menu = getMenu();
  if (menu.classList.contains('ytmd-open')) {
    closeMenu();
    return;
  }
  renderMenu(menu);
  const rect = button.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 4}px`;
  menu.style.right = `${Math.max(8, window.innerWidth - rect.right)}px`;
  menu.classList.add('ytmd-open');
  button.setAttribute('aria-expanded', 'true');
  menu.querySelector<HTMLElement>('.ytmd-menu-item')?.focus();
}

export function closeMenu(): void {
  const menu = document.getElementById(MENU_ID);
  if (!menu?.classList.contains('ytmd-open')) return;
  menu.classList.remove('ytmd-open');
  const button = document.getElementById(BUTTON_ID);
  button?.setAttribute('aria-expanded', 'false');
  if (menu.contains(document.activeElement)) button?.focus();
}

function onMenuKeydown(e: KeyboardEvent) {
  const menu = e.currentTarget as HTMLElement;
  const rows = Array.from(menu.querySelectorAll<HTMLElement>('.ytmd-menu-item'));
  const idx = rows.indexOf(document.activeElement as HTMLElement);
  if (e.key === 'Escape') {
    e.stopPropagation();
    closeMenu();
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    rows[(idx + 1) % rows.length]?.focus();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    rows[(idx - 1 + rows.length) % rows.length]?.focus();
  } else if (e.key === 'Tab') {
    closeMenu();
  }
}

function installOutsideClick() {
  if (outsideClickInstalled) return;
  outsideClickInstalled = true;
  document.addEventListener('mousedown', (e) => {
    const menu = document.getElementById(MENU_ID);
    if (!menu?.classList.contains('ytmd-open')) return;
    const target = e.target as Node;
    if (menu.contains(target) || document.getElementById(BUTTON_ID)?.contains(target)) return;
    closeMenu();
  });
  window.addEventListener('resize', closeMenu);
}
