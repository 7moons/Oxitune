/**
 * One-time tips in YouTube Music after the welcome window: a small card
 * next to each of Oxitune's entry points, one at a time. Shown once per
 * install of the page (localStorage on music.youtube.com), and again
 * whenever the welcome window is finished ("Run setup again" in Settings).
 * The page only reads `onboarding_done`; it can't change any setting.
 */
import { createEl } from '../../utils/dom';
import { ensureKitStyles } from './kit';
import { t } from './i18n';

export const TIPS_SEEN_KEY = 'oxitune.tips.v1';
const TIP_ID = 'oxitune-tip';
const STYLE_ID = 'oxitune-tip-styles';
/** How long the first anchor may take to appear (YTM renders its top bar late). */
const ANCHOR_WAIT_MS = 15000;
const MARGIN = 12;

export interface TipStep {
  anchor: string;
  title: () => string;
  body: () => string;
}

export const TIP_STEPS: TipStep[] = [
  { anchor: '#oxitune-menu-btn', title: () => t().tipMenuTitle, body: () => t().tipMenuBody },
  { anchor: 'ytmusic-player-bar', title: () => t().tipPlayerTitle, body: () => t().tipPlayerBody },
  { anchor: '#oxitune-menu-btn', title: () => t().tipShortcutsTitle, body: () => t().tipShortcutsBody }
];

export interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Tips show on load only once the welcome window is done, and only once. */
export function shouldShowOnLoad(config: Record<string, unknown>, seen: boolean): boolean {
  return config.onboarding_done === true && !seen;
}

/** Where a `tip` sized card goes next to `anchor`: below it if it fits,
 * else above, kept inside the viewport. */
export function placeTip(anchor: Box, tip: { width: number; height: number }, viewport: { width: number; height: number }): { top: number; left: number; below: boolean } {
  const below = anchor.top + anchor.height + MARGIN + tip.height <= viewport.height || anchor.top < tip.height + MARGIN;
  const top = below ? anchor.top + anchor.height + MARGIN : anchor.top - tip.height - MARGIN;
  const centered = anchor.left + anchor.width / 2 - tip.width / 2;
  const left = Math.min(Math.max(MARGIN, centered), Math.max(MARGIN, viewport.width - tip.width - MARGIN));
  return { top: Math.max(MARGIN, top), left, below };
}

/** The steps whose anchor is on screen (a hidden player bar has no size). */
export function visibleSteps(doc: Pick<Document, 'querySelector'>, steps: TipStep[] = TIP_STEPS): TipStep[] {
  return steps.filter((s) => {
    const el = doc.querySelector(s.anchor);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
}

function seen(): boolean {
  try {
    return localStorage.getItem(TIPS_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function markSeen(): void {
  try {
    localStorage.setItem(TIPS_SEEN_KEY, '1');
  } catch {
    // Storage blocked: the tips may come back next launch, nothing worse.
  }
}

const TIP_CSS = `
  #${TIP_ID} {
    position: fixed;
    z-index: 2204;
    box-sizing: border-box;
    width: 320px;
    padding: 16px 16px 8px;
    background: var(--oxitune-surface);
    border-radius: 12px;
    box-shadow: 0 4px 32px rgba(0, 0, 0, 0.5);
    font: 400 14px/20px var(--oxitune-font);
    color: var(--oxitune-text);
    animation: oxitune-tip-in 0.15s ease-out;
  }
  #${TIP_ID} .oxitune-tip-title { display: block; font: 500 16px/24px var(--oxitune-font); margin-bottom: 4px; }
  #${TIP_ID} .oxitune-tip-body { display: block; color: var(--oxitune-text-secondary); }
  #${TIP_ID} .oxitune-tip-actions { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
  #${TIP_ID} .oxitune-tip-count { flex: 1; font-size: 12px; color: var(--oxitune-text-secondary); }
  .oxitune-tip-target { outline: 2px solid var(--oxitune-accent-color) !important; outline-offset: 2px; border-radius: 20px; }
  @keyframes oxitune-tip-in { from { opacity: 0; transform: translateY(-4px); } }
  @media (prefers-reduced-motion: reduce) { #${TIP_ID} { animation: none; } }
`;

function ensureStyles(): void {
  ensureKitStyles();
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = TIP_CSS;
  (document.head || document.documentElement).appendChild(style);
}

let running = false;

function clear(): void {
  document.getElementById(TIP_ID)?.remove();
  document.querySelectorAll('.oxitune-tip-target').forEach((el) => el.classList.remove('oxitune-tip-target'));
}

function show(steps: TipStep[], index: number, done: () => void): void {
  clear();
  const step = steps[index];
  const anchor = step ? document.querySelector<HTMLElement>(step.anchor) : null;
  if (!step || !anchor) {
    done();
    return;
  }
  const last = index === steps.length - 1;
  const card = createEl('div', { id: TIP_ID });
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', step.title());
  const next = createEl('button', { className: 'oxitune-button oxitune-button--filled', text: last ? t().tipDone : t().tipNext });
  const skip = createEl('button', { className: 'oxitune-button', text: t().tipSkip });
  const actions = createEl('div', { className: 'oxitune-tip-actions' });
  actions.append(createEl('span', { className: 'oxitune-tip-count', text: `${index + 1}/${steps.length}` }));
  if (!last) actions.append(skip);
  actions.append(next);
  card.append(createEl('span', { className: 'oxitune-tip-title', text: step.title() }), createEl('span', { className: 'oxitune-tip-body', text: step.body() }), actions);
  document.body.appendChild(card);
  anchor.classList.add('oxitune-tip-target');

  const r = anchor.getBoundingClientRect();
  const pos = placeTip({ top: r.top, left: r.left, width: r.width, height: r.height }, { width: card.offsetWidth, height: card.offsetHeight }, { width: window.innerWidth, height: window.innerHeight });
  card.style.top = `${pos.top}px`;
  card.style.left = `${pos.left}px`;

  next.addEventListener('click', () => show(steps, index + 1, done));
  skip.addEventListener('click', done);
  next.focus();
}

/** Runs the tips now (once the first anchor shows up). `force` ignores
 * whether they were seen: the welcome window was just finished. */
export function startTips(force = false): void {
  if (running || (!force && seen())) return;
  running = true;
  ensureStyles();
  const started = Date.now();
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') finish();
  };
  const finish = () => {
    clear();
    markSeen();
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', finish);
    running = false;
  };
  const attempt = () => {
    const steps = visibleSteps(document);
    if (steps.length === 0 || steps[0].anchor !== TIP_STEPS[0].anchor) {
      if (Date.now() - started < ANCHOR_WAIT_MS) {
        setTimeout(attempt, 500);
      } else {
        running = false;
      }
      return;
    }
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', finish);
    show(steps, 0, finish);
  };
  attempt();
}

/** On page load: the tips, if the welcome window is done and they haven't
 * been shown on this page yet. */
export function maybeStartTips(config: Record<string, unknown>): void {
  if (shouldShowOnLoad(config, seen())) startTips();
}
