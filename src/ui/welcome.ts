import { showToast } from '../preload/ui/kit';
import { tr } from './i18n';
import { applyChoices, moveStep, toggleValue, WelcomeConfig, WELCOME_STEPS, WELCOME_TOGGLES } from './onboarding';
import { closeWindow, initWindowChrome, onBeforeClose } from './window';

const SAVE_DEBOUNCE_MS = 300;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;

let config: WelcomeConfig | null = null;
let step = 0;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let finished = false;

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function choices(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const [field] of WELCOME_TOGGLES) {
    const el = $<HTMLInputElement>(field);
    if (el) out[field] = el.checked;
  }
  return out;
}

async function save(): Promise<void> {
  if (saveTimer !== null) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (!config || !window.__TAURI__?.core) return;
  const next = applyChoices(config, choices());
  try {
    await window.__TAURI__.core.invoke('save_config', { config: next });
    config = next;
    // The player picks up lyrics, notifications and ambient lighting at once.
    await window.__TAURI__.event.emit('config-updated', next);
  } catch (e) {
    console.error('[Oxitune] Failed to save the welcome choices:', e);
    showToast(tr('settings.saveFailed', { reason: errorMessage(e) }), { durationMs: 8000 });
  }
}

function scheduleSave(): void {
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void save(), SAVE_DEBOUNCE_MS);
}

/** Saves what's pending and marks the welcome window done; the player
 * window shows up (and Settings over it with `openSettings`). Once. */
async function finish(openSettings: boolean): Promise<void> {
  if (finished) return;
  finished = true;
  await save();
  try {
    await window.__TAURI__?.core.invoke('finish_onboarding', { openSettings });
  } catch (e) {
    console.error('[Oxitune] finish_onboarding failed:', e);
  }
}

function render(): void {
  const current = WELCOME_STEPS[step];
  document.querySelectorAll<HTMLElement>('.welcome-step').forEach((el) => {
    el.classList.toggle('is-hidden', el.dataset.step !== current);
  });
  const last = step === WELCOME_STEPS.length - 1;
  $('welcome-back')?.classList.toggle('is-invisible', step === 0);
  $('welcome-skip')?.classList.toggle('is-hidden', last);
  $('welcome-next')?.classList.toggle('is-hidden', last);
  $('welcome-settings')?.classList.toggle('is-hidden', !last);
  $('welcome-finish')?.classList.toggle('is-hidden', !last);
  const dots = $('welcome-dots');
  if (dots) {
    dots.replaceChildren(
      ...WELCOME_STEPS.map((_, i) => {
        const dot = document.createElement('span');
        dot.className = i === step ? 'welcome-dot is-active' : 'welcome-dot';
        return dot;
      })
    );
  }
  document.querySelector<HTMLElement>('.welcome-page')?.scrollTo({ top: 0 });
  (last ? $('welcome-finish') : $('welcome-next'))?.focus();
}

function go(delta: number): void {
  step = moveStep(step, delta);
  render();
}

async function load(): Promise<void> {
  try {
    config = ((await window.__TAURI__?.core.invoke('get_config')) as WelcomeConfig | undefined) ?? null;
  } catch (e) {
    console.error('[Oxitune] Failed to load settings:', e);
    showToast(tr('settings.loadFailed', { reason: errorMessage(e) }), { durationMs: 8000 });
  }
  for (const [field] of WELCOME_TOGGLES) {
    const el = $<HTMLInputElement>(field);
    if (!el) continue;
    el.checked = toggleValue(config ?? {}, field);
    el.addEventListener('change', scheduleSave);
  }
}

function init(): void {
  initWindowChrome();
  $('welcome-back')?.addEventListener('click', () => go(-1));
  $('welcome-next')?.addEventListener('click', () => go(1));
  $('welcome-skip')?.addEventListener('click', () => void finish(false).then(closeWindow));
  $('welcome-finish')?.addEventListener('click', () => void finish(false).then(closeWindow));
  $('welcome-settings')?.addEventListener('click', () => void finish(true).then(closeWindow));
  // Closing the window (its button, Alt+F4) counts as done too, or it would
  // come back on every launch.
  onBeforeClose(() => finish(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement) && step < WELCOME_STEPS.length - 1) go(1);
  });
  render();
  void load();
}

init();
