/**
 * Shared setup every companion window runs on load: translated labels,
 * window-control buttons, range-slider fill, and the kit's tooltips.
 */
import { ensureKitStyles } from '../preload/ui/kit';
import { applyI18n } from './i18n';
import { initRanges } from './range';

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
  document.getElementById('win-close-btn')?.addEventListener('click', () => invoke('close_window'));
}
