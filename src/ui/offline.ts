/**
 * Shown in the main window when YouTube Music can't be reached at startup
 * (see src-tauri/src/connectivity.rs). Its capability allows exactly one
 * command, `retry_connection`, which navigates back to YouTube Music once
 * it answers.
 */
import '@fontsource/roboto/latin-400.css';
import '@fontsource/roboto/latin-ext-400.css';
import '@fontsource/roboto/latin-500.css';
import '@fontsource/roboto/latin-ext-500.css';
import { applyI18n, tr } from './i18n';

const AUTO_RETRY_MS = 10_000;

let busy = false;

async function retry(): Promise<void> {
  if (busy) return;
  busy = true;
  const status = document.getElementById('offline-status');
  const button = document.getElementById('retry-btn') as HTMLButtonElement | null;
  if (button) button.disabled = true;
  if (status) status.textContent = tr('offline.checking');
  try {
    await window.__TAURI__?.core.invoke('retry_connection');
    // Navigating away: nothing more to do here.
  } catch {
    if (status) status.textContent = tr('offline.stillOffline');
  } finally {
    busy = false;
    if (button) button.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  applyI18n(document);
  document.getElementById('retry-btn')?.addEventListener('click', () => void retry());
  window.addEventListener('online', () => void retry());
  setInterval(() => void retry(), AUTO_RETRY_MS);
});
