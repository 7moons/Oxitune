/**
 * Shared setup every companion window runs on load: translated labels,
 * window-control buttons, range-slider fill, and the kit's tooltips.
 */
// Roboto ships with the app: Windows doesn't have it installed, and YTM's
// look depends on it. latin + latin-ext covers English and Polish.
import '@fontsource/roboto/latin-400.css';
import '@fontsource/roboto/latin-ext-400.css';
import '@fontsource/roboto/latin-500.css';
import '@fontsource/roboto/latin-ext-500.css';
import '@fontsource/roboto/latin-700.css';
import '@fontsource/roboto/latin-ext-700.css';
import { ensureKitStyles } from '../preload/ui/kit';
import { applyI18n } from './i18n';
import { initRanges } from './range';

const beforeCloseHooks: (() => Promise<void> | void)[] = [];

/** Runs before the window closes (Settings and the library are destroyed on
 * close, see src-tauri/src/windows.rs): e.g. save what's still pending. */
export function onBeforeClose(hook: () => Promise<void> | void): void {
  beforeCloseHooks.push(hook);
}

async function closeWindow(): Promise<void> {
  for (const hook of beforeCloseHooks) {
    try {
      await hook();
    } catch (e) {
      console.error('[YTMD] before-close hook failed:', e);
    }
  }
  await window.__TAURI__?.core.invoke('close_window').catch((e: unknown) => console.error('[YTMD] close_window failed:', e));
}

export function initWindowChrome(): void {
  applyI18n(document);
  initRanges(document);
  // Tooltips (data-ytmd-tooltip) and toasts shared with the injected page.
  ensureKitStyles();

  const invoke = (cmd: string) => {
    window.__TAURI__?.core.invoke(cmd).catch((e: unknown) => console.error(`[YTMD] ${cmd} failed:`, e));
  };
  document.getElementById('win-min-btn')?.addEventListener('click', () => invoke('minimize_window'));
  document.getElementById('win-max-btn')?.addEventListener('click', () => invoke('toggle_maximize_window'));
  document.getElementById('win-close-btn')?.addEventListener('click', () => void closeWindow());
  // The window manager's close (Alt+F4, taskbar) goes through Rust first.
  void window.__TAURI__?.event.listen('ytmd-close-requested', () => void closeWindow());
}
