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

/** Automatic retries back off (10 s, 20 s, ... up to 5 min) and change
 * nothing on screen, so an app left offline stays idle. */
const FIRST_RETRY_MS = 10_000;
const MAX_RETRY_MS = 5 * 60_000;

let busy = false;
let delay = FIRST_RETRY_MS;
let timer: ReturnType<typeof setTimeout> | null = null;

async function retry(manual: boolean): Promise<void> {
  if (busy) return;
  busy = true;
  const status = document.getElementById('offline-status');
  const button = document.getElementById('retry-btn') as HTMLButtonElement | null;
  if (manual) {
    if (button) button.disabled = true;
    if (status) status.textContent = tr('offline.checking');
  }
  try {
    await window.__TAURI__?.core.invoke('retry_connection');
    // Navigating away: nothing more to do here.
  } catch {
    if (manual && status) status.textContent = tr('offline.stillOffline');
  } finally {
    busy = false;
    if (button) button.disabled = false;
  }
}

function schedule(): void {
  if (timer !== null) clearTimeout(timer);
  timer = setTimeout(async () => {
    await retry(false);
    delay = Math.min(delay * 2, MAX_RETRY_MS);
    schedule();
  }, delay);
}

document.addEventListener('DOMContentLoaded', () => {
  applyI18n(document);
  document.getElementById('retry-btn')?.addEventListener('click', () => void retry(true));
  window.addEventListener('online', () => {
    delay = FIRST_RETRY_MS;
    void retry(false);
  });
  schedule();
});
