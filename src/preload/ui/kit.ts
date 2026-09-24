/**
 * The shared building blocks for every piece of UI Oscilla injects into
 * YouTube Music: icon buttons, menus, toasts, dialogs, tooltips and chips.
 *
 * Everything is sized and colored after YTM's own components (Roboto 14px,
 * 40px round icon buttons, #212121 menus, bottom-left toasts), and colors
 * resolve through YTM's own `--yt-sys-color-baseline--*` custom properties
 * first. theme_engine overrides those same properties for the Ambient/Base
 * looks, so our components follow whichever theme is active for free,
 * exactly like YTM's native menus and dialogs do.
 *
 * All styling lives in one injected stylesheet (never inline style writes
 * on YTM's elements — see CLAUDE.md), and every builder uses plain DOM
 * APIs because YTM's Trusted Types policy blocks innerHTML.
 */
import { createEl, createSvg } from '../../utils/dom';

const STYLE_ID = 'ytmd-kit-styles';

export const KIT_CSS = `
  :root {
    --ytmd-font: Roboto, "Noto Naskh Arabic UI", Arial, sans-serif;
    --ytmd-font-display: "YouTube Sans", Roboto, Arial, sans-serif;
    --ytmd-text: var(--yt-sys-color-baseline--text-primary, #fff);
    --ytmd-text-secondary: var(--yt-sys-color-baseline--text-secondary, rgba(255, 255, 255, 0.7));
    --ytmd-text-disabled: rgba(255, 255, 255, 0.5);
    --ytmd-surface: var(--yt-sys-color-baseline--menu-background, #212121);
    --ytmd-hover: rgba(255, 255, 255, 0.1);
    --ytmd-pressed: rgba(255, 255, 255, 0.2);
    --ytmd-divider: rgba(255, 255, 255, 0.1);
    --ytmd-accent-color: var(--ytmd-accent, var(--yt-sys-color-baseline--call-to-action, #fff));
    --ytmd-player-bar-height: 72px;
  }

  .ytmd-icon-btn {
    all: unset;
    box-sizing: border-box;
    width: 40px;
    height: 40px;
    flex: 0 0 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: var(--ytmd-text);
    cursor: pointer;
    position: relative;
    transition: background-color 0.1s linear;
  }
  .ytmd-icon-btn:hover { background: var(--ytmd-hover); }
  .ytmd-icon-btn:active { background: var(--ytmd-pressed); }
  .ytmd-icon-btn:focus-visible { outline: 2px solid var(--ytmd-text); outline-offset: -2px; }
  .ytmd-icon-btn[aria-disabled="true"] { color: var(--ytmd-text-disabled); cursor: default; background: none; }
  .ytmd-icon-btn svg { width: 24px; height: 24px; pointer-events: none; }
  .ytmd-icon-btn.ytmd-icon-btn--muted { color: var(--ytmd-text-secondary); }
  .ytmd-icon-btn.ytmd-icon-btn--muted:hover { color: var(--ytmd-text); }

  /* Circular progress drawn around an icon button. */
  .ytmd-progress-ring {
    position: absolute;
    inset: 2px;
    width: calc(100% - 4px) !important;
    height: calc(100% - 4px) !important;
    transform: rotate(-90deg);
    pointer-events: none;
  }
  .ytmd-progress-ring circle { fill: none; stroke-width: 2.5; }
  .ytmd-progress-ring .ytmd-progress-track { stroke: var(--ytmd-divider); }
  .ytmd-progress-ring .ytmd-progress-value {
    stroke: var(--ytmd-accent-color);
    stroke-linecap: round;
    transition: stroke-dashoffset 0.3s ease;
  }

  .ytmd-menu {
    position: fixed;
    z-index: 2202;
    min-width: 240px;
    max-width: 320px;
    padding: 8px 0;
    box-sizing: border-box;
    background: var(--ytmd-surface);
    border-radius: 12px;
    box-shadow: 0 4px 32px rgba(0, 0, 0, 0.4);
    font-family: var(--ytmd-font);
    color: var(--ytmd-text);
    opacity: 0;
    transform: translateY(-4px);
    pointer-events: none;
    transition: opacity 0.12s ease, transform 0.12s ease;
  }
  .ytmd-menu.ytmd-open { opacity: 1; transform: none; pointer-events: auto; }
  .ytmd-menu-item {
    all: unset;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
    min-height: 40px;
    padding: 0 16px 0 12px;
    font: 400 14px/20px var(--ytmd-font);
    color: var(--ytmd-text);
    cursor: pointer;
  }
  .ytmd-menu-item:hover, .ytmd-menu-item:focus-visible { background: var(--ytmd-hover); }
  .ytmd-menu-item svg { width: 24px; height: 24px; flex: 0 0 24px; }
  .ytmd-menu-item-text { flex: 1; display: flex; flex-direction: column; padding: 8px 0; }
  .ytmd-menu-item-sub { font-size: 12px; line-height: 16px; color: var(--ytmd-text-secondary); }
  .ytmd-menu-item-hint { font-size: 12px; color: var(--ytmd-text-secondary); }
  .ytmd-menu-divider { height: 1px; margin: 8px 0; background: var(--ytmd-divider); }

  .ytmd-chip {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 12px;
    border-radius: 8px;
    background: var(--ytmd-hover);
    font: 500 14px/20px var(--ytmd-font);
    color: var(--ytmd-text);
    cursor: pointer;
    white-space: nowrap;
    transition: background-color 0.1s linear;
  }
  .ytmd-chip:hover { background: var(--ytmd-pressed); }
  .ytmd-chip:focus-visible { outline: 2px solid var(--ytmd-text); outline-offset: 2px; }
  .ytmd-chip svg { width: 18px; height: 18px; }
  .ytmd-chip-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--ytmd-accent-color);
  }

  .ytmd-button {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 36px;
    padding: 0 16px;
    border-radius: 18px;
    font: 500 14px/36px var(--ytmd-font);
    color: var(--ytmd-text);
    cursor: pointer;
    transition: background-color 0.1s linear;
  }
  .ytmd-button:hover { background: var(--ytmd-hover); }
  .ytmd-button:focus-visible { outline: 2px solid var(--ytmd-text); outline-offset: 2px; }
  .ytmd-button--filled { background: var(--ytmd-text); color: #0f0f0f; }
  .ytmd-button--filled:hover { background: rgba(255, 255, 255, 0.85); }

  #ytmd-toast-host {
    position: fixed;
    left: 24px;
    bottom: calc(var(--ytmd-player-bar-height) + 16px);
    z-index: 2202;
    pointer-events: none;
  }
  .ytmd-toast {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 16px;
    min-width: 288px;
    max-width: 568px;
    min-height: 48px;
    padding: 8px 8px 8px 16px;
    background: var(--ytmd-surface);
    border-radius: 8px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
    font: 400 14px/20px var(--ytmd-font);
    color: var(--ytmd-text);
    pointer-events: auto;
    animation: ytmd-toast-in 0.2s ease-out;
  }
  .ytmd-toast.ytmd-leaving { animation: ytmd-toast-out 0.15s ease-in forwards; }
  .ytmd-toast-text { flex: 1; padding: 6px 8px 6px 0; }
  .ytmd-toast .ytmd-button { color: var(--ytmd-accent-color); }
  @keyframes ytmd-toast-in { from { opacity: 0; transform: translateY(16px); } }
  @keyframes ytmd-toast-out { to { opacity: 0; transform: translateY(16px); } }

  .ytmd-scrim {
    position: fixed;
    inset: 0;
    z-index: 2203;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.6);
    animation: ytmd-fade-in 0.15s ease-out;
  }
  .ytmd-dialog {
    box-sizing: border-box;
    width: min(400px, calc(100vw - 48px));
    padding: 24px;
    background: var(--ytmd-surface);
    border-radius: 12px;
    box-shadow: 0 8px 48px rgba(0, 0, 0, 0.5);
    font-family: var(--ytmd-font);
    color: var(--ytmd-text);
  }
  .ytmd-dialog-title { margin: 0 0 8px; font: 700 20px/28px var(--ytmd-font-display); }
  .ytmd-dialog-body { font-size: 14px; line-height: 20px; color: var(--ytmd-text-secondary); }
  .ytmd-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; }
  @keyframes ytmd-fade-in { from { opacity: 0; } }

  #ytmd-tooltip {
    position: fixed;
    z-index: 2204;
    padding: 6px 8px;
    border-radius: 4px;
    background: rgba(97, 97, 97, 0.92);
    font: 400 12px/16px var(--ytmd-font);
    color: #fff;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.1s linear;
  }
  #ytmd-tooltip.ytmd-open { opacity: 1; }

  #ytmd-volume-indicator {
    position: fixed;
    z-index: 2201;
    visibility: hidden;
    opacity: 0;
    box-sizing: border-box;
    min-width: 58px;
    padding: 8px 12px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--ytmd-surface) 82%, transparent);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
    color: var(--ytmd-text);
    font: 700 24px/28px var(--ytmd-font-display);
    font-variant-numeric: tabular-nums;
    text-align: center;
    pointer-events: none;
    transition: opacity 0.35s ease, visibility 0s linear 0.35s;
  }
  #ytmd-volume-indicator.ytmd-visible {
    visibility: visible;
    opacity: 1;
    transition: opacity 0.12s ease, visibility 0s;
  }

  #ytmd-reaction-host {
    position: fixed;
    right: 24px;
    bottom: calc(var(--ytmd-player-bar-height) + 16px);
    z-index: 2202;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    pointer-events: none;
  }
  .ytmd-reaction {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 36px;
    padding: 0 14px 0 8px;
    border-radius: 18px;
    background: var(--ytmd-surface);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
    font: 500 14px/20px var(--ytmd-font);
    color: var(--ytmd-text);
    animation: ytmd-reaction 3s ease-out forwards;
  }
  .ytmd-reaction-emoji { font-size: 22px; line-height: 1; }
  @keyframes ytmd-reaction {
    0% { opacity: 0; transform: translateY(12px) scale(0.9); }
    10%, 75% { opacity: 1; transform: none; }
    100% { opacity: 0; transform: translateY(-24px); }
  }

  @media (prefers-reduced-motion: reduce) {
    .ytmd-menu, .ytmd-toast, .ytmd-toast.ytmd-leaving, .ytmd-scrim, .ytmd-reaction { transition: none; animation: none; }
    #ytmd-volume-indicator { transition: none; }
  }
`;

export function ensureKitStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = KIT_CSS;
  (document.head || document.documentElement).appendChild(style);
  installTooltips();
}

/** Material icon paths (24x24), the same icon family YTM uses. */
export const ICONS = {
  apps: 'M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z',
  tune: 'M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z',
  folderMusic: 'M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-2 5h-3v5.5a2.5 2.5 0 1 1-2.5-2.5c.57 0 1.08.19 1.5.51V9h4v2z',
  group: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  phone: 'M17 1.01 7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z',
  miniPlayer: 'M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z',
  check: 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z',
  pip: 'M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z'
} as const;

export function icon(path: string, size = 24): SVGSVGElement {
  return createSvg(path, size, size);
}

/** Round 40px icon button, like the ones in YTM's player and nav bars. */
export function createIconButton(opts: { id?: string; label: string; iconPath: string; muted?: boolean }): HTMLButtonElement {
  const btn = createEl('button', {
    id: opts.id,
    className: `ytmd-icon-btn${opts.muted ? ' ytmd-icon-btn--muted' : ''}`
  });
  btn.type = 'button';
  btn.setAttribute('aria-label', opts.label);
  btn.dataset.ytmdTooltip = opts.label;
  btn.appendChild(icon(opts.iconPath));
  return btn;
}

export function setIconButtonIcon(btn: HTMLElement, iconPath: string): void {
  btn.querySelector('svg:not(.ytmd-progress-ring)')?.replaceWith(icon(iconPath));
}

/** Progress ring on an icon button; `null` removes it. `fraction` in 0..1. */
export function setButtonProgress(btn: HTMLElement, fraction: number | null): void {
  let ring = btn.querySelector<SVGSVGElement>('svg.ytmd-progress-ring');
  if (fraction === null) {
    ring?.remove();
    return;
  }
  const r = 17;
  const circumference = 2 * Math.PI * r;
  if (!ring) {
    const ns = 'http://www.w3.org/2000/svg';
    ring = document.createElementNS(ns, 'svg');
    ring.setAttribute('class', 'ytmd-progress-ring');
    ring.setAttribute('viewBox', '0 0 36 36');
    for (const cls of ['ytmd-progress-track', 'ytmd-progress-value']) {
      const c = document.createElementNS(ns, 'circle');
      c.setAttribute('class', cls);
      c.setAttribute('cx', '18');
      c.setAttribute('cy', '18');
      c.setAttribute('r', String(r));
      c.setAttribute('stroke-dasharray', String(circumference));
      ring.appendChild(c);
    }
    btn.appendChild(ring);
  }
  const clamped = Math.max(0, Math.min(1, fraction));
  ring.querySelector('.ytmd-progress-value')?.setAttribute('stroke-dashoffset', String(circumference * (1 - clamped)));
}

// ---------------------------------------------------------------------
// Tooltips: one shared element, driven by `data-ytmd-tooltip` through
// delegated listeners, so no component has to wire its own.
// ---------------------------------------------------------------------

let tooltipsInstalled = false;
function installTooltips(): void {
  if (tooltipsInstalled) return;
  tooltipsInstalled = true;

  let tip: HTMLElement | null = null;
  let showTimer: ReturnType<typeof setTimeout> | null = null;
  let anchor: HTMLElement | null = null;

  const hide = () => {
    if (showTimer !== null) clearTimeout(showTimer);
    showTimer = null;
    anchor = null;
    tip?.classList.remove('ytmd-open');
  };

  const show = (target: HTMLElement) => {
    const text = target.dataset.ytmdTooltip;
    if (!text) return;
    if (!tip) {
      tip = createEl('div', { id: 'ytmd-tooltip' });
      tip.setAttribute('role', 'tooltip');
      document.body.appendChild(tip);
    }
    tip.textContent = text;
    const rect = target.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    const below = rect.bottom + 8 + tipRect.height < window.innerHeight;
    const top = below ? rect.bottom + 8 : rect.top - 8 - tipRect.height;
    const left = Math.max(8, Math.min(window.innerWidth - tipRect.width - 8, rect.left + rect.width / 2 - tipRect.width / 2));
    tip.style.top = `${top}px`;
    tip.style.left = `${left}px`;
    tip.classList.add('ytmd-open');
  };

  const onEnter = (e: Event) => {
    const target = (e.target as Element | null)?.closest?.<HTMLElement>('[data-ytmd-tooltip]');
    if (!target || target === anchor) return;
    hide();
    anchor = target;
    showTimer = setTimeout(() => show(target), 250);
  };
  const onLeave = (e: Event) => {
    const related = (e as MouseEvent).relatedTarget as Node | null;
    if (anchor && related && anchor.contains(related)) return;
    hide();
  };

  document.addEventListener('mouseover', onEnter, true);
  document.addEventListener('mouseout', onLeave, true);
  document.addEventListener('focusin', onEnter, true);
  document.addEventListener('focusout', hide, true);
  document.addEventListener('mousedown', hide, true);
}

// ---------------------------------------------------------------------
// Toasts: YTM shows one at a time, bottom-left above the player bar.
// Reusing an `id` updates the visible toast in place (progress)
// instead of stacking a new one.
// ---------------------------------------------------------------------

export interface ToastOptions {
  id?: string;
  durationMs?: number;
  action?: { label: string; onClick: () => void };
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export function showToast(message: string, opts: ToastOptions = {}): void {
  ensureKitStyles();
  let host = document.getElementById('ytmd-toast-host');
  if (!host) {
    host = createEl('div', { id: 'ytmd-toast-host' });
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
  }

  const current = host.querySelector<HTMLElement>('.ytmd-toast');
  // A toast already animating out is on a removal timer; never reuse it.
  const reuse =
    current && opts.id && current.dataset.toastId === opts.id && !current.classList.contains('ytmd-leaving');
  const toast = reuse ? current : createEl('div', { className: 'ytmd-toast' });
  if (opts.id) toast.dataset.toastId = opts.id;

  const text = createEl('span', { className: 'ytmd-toast-text', text: message });
  const children: Node[] = [text];
  if (opts.action) {
    const { label, onClick } = opts.action;
    const btn = createEl('button', { className: 'ytmd-button', text: label });
    btn.type = 'button';
    btn.addEventListener('click', () => {
      dismissToast();
      onClick();
    });
    children.push(btn);
  }
  toast.replaceChildren(...children);
  if (!reuse) host.replaceChildren(toast);

  if (toastTimer !== null) clearTimeout(toastTimer);
  toastTimer = null;
  const duration = opts.durationMs ?? 4000;
  if (duration > 0) toastTimer = setTimeout(dismissToast, duration);
}

const MAX_REACTIONS_SHOWN = 5;
const REACTION_SHOWN_MS = 3000;

/** A listening-session reaction: a small bubble above the player bar's
 * right end that floats up and fades, so a burst of them doesn't queue up
 * behind toasts. */
export function showReaction(emoji: string, from: string): void {
  ensureKitStyles();
  let host = document.getElementById('ytmd-reaction-host');
  if (!host) {
    host = createEl('div', { id: 'ytmd-reaction-host' });
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
  }
  const bubble = createEl('div', { className: 'ytmd-reaction' });
  bubble.append(createEl('span', { className: 'ytmd-reaction-emoji', text: emoji }), createEl('span', { text: from }));
  host.appendChild(bubble);
  while (host.children.length > MAX_REACTIONS_SHOWN) host.firstElementChild?.remove();
  setTimeout(() => bubble.remove(), REACTION_SHOWN_MS);
}

export function dismissToast(): void {
  if (toastTimer !== null) clearTimeout(toastTimer);
  toastTimer = null;
  const toast = document.querySelector<HTMLElement>('#ytmd-toast-host .ytmd-toast');
  if (!toast) return;
  toast.classList.add('ytmd-leaving');
  setTimeout(() => toast.remove(), 150);
}

// ---------------------------------------------------------------------
// Dialog: rebuilt on every open and removed from the DOM on close, never
// hidden and reused — a lingering full-viewport overlay is exactly the
// kind of element that can end up silently eating clicks.
// ---------------------------------------------------------------------

export interface DialogHandle {
  close: () => void;
  body: HTMLElement;
}

export function openDialog(opts: {
  id: string;
  title: string;
  body?: Node[];
  actions: { label: string; filled?: boolean; onClick?: (close: () => void) => void }[];
}): DialogHandle {
  ensureKitStyles();
  document.getElementById(opts.id)?.remove();

  const scrim = createEl('div', { id: opts.id, className: 'ytmd-scrim' });
  const dialog = createEl('div', { className: 'ytmd-dialog' });
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  const titleId = `${opts.id}-title`;
  dialog.setAttribute('aria-labelledby', titleId);

  const title = createEl('h2', { id: titleId, className: 'ytmd-dialog-title', text: opts.title });
  const body = createEl('div', { className: 'ytmd-dialog-body' });
  if (opts.body) body.append(...opts.body);

  const previouslyFocused = document.activeElement as HTMLElement | null;
  const close = () => {
    document.removeEventListener('keydown', onKeydown, true);
    scrim.remove();
    previouslyFocused?.focus?.();
  };
  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  };
  document.addEventListener('keydown', onKeydown, true);
  scrim.addEventListener('click', (e) => {
    if (e.target === scrim) close();
  });

  const actions = createEl('div', { className: 'ytmd-dialog-actions' });
  for (const action of opts.actions) {
    const btn = createEl('button', {
      className: `ytmd-button${action.filled ? ' ytmd-button--filled' : ''}`,
      text: action.label
    });
    btn.type = 'button';
    btn.addEventListener('click', () => (action.onClick ? action.onClick(close) : close()));
    actions.appendChild(btn);
  }

  dialog.append(title, body, actions);
  scrim.appendChild(dialog);
  document.body.appendChild(scrim);
  actions.querySelector<HTMLElement>('button')?.focus();

  return { close, body };
}
