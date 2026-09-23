import { EQ_FREQUENCIES, EQ_PRESETS } from '../plugins/audio-dsp/presets';
import { showToast } from '../preload/ui/kit';
import { initAmbientBackdrop } from './ambient';
import { formatDb, formatCrossfade } from './format';
import { tr } from './i18n';
import { syncRange } from './range';
import { initWindowChrome } from './window';

interface AppConfig {
  close_to_tray: boolean;
  discord_rpc_enabled: boolean;
  mpris_enabled: boolean;
  notifications_enabled: boolean;
  adblock_enabled: boolean;
  sponsorblock_enabled: boolean;
  lyrics_enabled: boolean;
  custom_css: string;
  equalizer_preset: string;
  equalizer_gains: number[];
  preamp_gain: number;
  loudness_normalization: boolean;
  crossfade_seconds: number;
  skip_silence_enabled: boolean;
  playback_speed: number;
  preserve_pitch: boolean;
  wheel_volume_on_player_page: boolean;
  wheel_volume_step: number;
  ambient_lighting_enabled: boolean;
  ambient_intensity: number;
  download_dir: string;
  download_format: string;
  embed_lyrics: boolean;
  local_music_dir: string;
  remote_enabled: boolean;
  remote_port: number;
  inhibit_sleep: boolean;
  pause_on_lock: boolean;
  // Every other field of the backend's AppConfig round-trips untouched.
  [key: string]: unknown;
}

interface UpdateInfo {
  version: string;
  current_version: string;
  body: string | null;
  date: string | null;
}

/** Checkbox ids that map 1:1 to boolean AppConfig fields, with the value
 * to show when the field is missing (matches AppConfig::default()). */
const TOGGLES: [keyof AppConfig & string, boolean][] = [
  ['discord_rpc_enabled', true],
  ['mpris_enabled', true],
  ['notifications_enabled', false],
  ['close_to_tray', true],
  ['adblock_enabled', true],
  ['sponsorblock_enabled', true],
  ['lyrics_enabled', true],
  ['loudness_normalization', false],
  ['skip_silence_enabled', false],
  ['preserve_pitch', true],
  ['wheel_volume_on_player_page', false],
  ['ambient_lighting_enabled', true],
  ['embed_lyrics', true],
  ['remote_enabled', true],
  ['inhibit_sleep', true],
  ['pause_on_lock', true]
];

const SAVE_DEBOUNCE_MS = 500;

let currentConfig: AppConfig | null = null;
let currentGains: number[] = new Array(10).fill(0);
let saveTimer: ReturnType<typeof setTimeout> | null = null;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;

function errorMessage(e: unknown): string {
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message;
  return tr('common.unknownError');
}

function formatFreq(freq: number): string {
  return freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
}

function formatSpeed(speed: number): string {
  return `${speed.toFixed(2)}×`;
}

function setRange(id: string, value: number) {
  const el = $<HTMLInputElement>(id);
  if (!el) return;
  el.value = String(value);
  syncRange(el);
}

function updateBadgeClass(badge: HTMLElement, val: number) {
  badge.classList.remove('positive', 'negative', 'zero');
  badge.classList.add(val > 0 ? 'positive' : val < 0 ? 'negative' : 'zero');
}

async function emitLiveEvent(event: string, payload: unknown) {
  try {
    await window.__TAURI__?.event.emit(event, payload);
  } catch (e) {
    console.error(`[YTMD] Failed to emit ${event}:`, e);
  }
}

// ------------------------------------------------------------------ EQ

function renderEqSliders() {
  const container = $('eq-faders-grid');
  if (!container) return;
  container.replaceChildren();

  EQ_FREQUENCIES.forEach((freq, idx) => {
    const col = document.createElement('div');
    col.className = 'eq-band-col';

    const val = currentGains[idx] || 0;
    const badge = document.createElement('span');
    badge.className = 'eq-gain-badge';
    badge.id = `eq-val-${idx}`;
    badge.textContent = formatDb(val);
    updateBadgeClass(badge, val);

    const wrapper = document.createElement('div');
    wrapper.className = 'eq-slider-wrapper';
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'range eq-v-slider';
    slider.id = `eq-slider-${idx}`;
    slider.min = '-12';
    slider.max = '12';
    slider.step = '0.5';
    slider.value = String(val);
    slider.setAttribute('aria-label', `${formatFreq(freq)} Hz`);
    syncRange(slider);

    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      currentGains[idx] = v;
      badge.textContent = formatDb(v);
      updateBadgeClass(badge, v);
      syncRange(slider);
      const preset = $<HTMLSelectElement>('eq_preset');
      if (preset) preset.value = 'custom';
      emitLiveEvent('set-eq-band', { bandIndex: idx, gain: v });
    });

    wrapper.appendChild(slider);
    const label = document.createElement('span');
    label.className = 'eq-freq-label';
    label.textContent = formatFreq(freq);

    col.append(badge, wrapper, label);
    container.appendChild(col);
  });
}

function updateSlidersFromGains(gains: number[]) {
  currentGains = [...gains];
  gains.forEach((gain, idx) => {
    setRange(`eq-slider-${idx}`, gain);
    const badge = $(`eq-val-${idx}`);
    if (badge) {
      badge.textContent = formatDb(gain);
      updateBadgeClass(badge, gain);
    }
  });
}

function setPreamp(value: number) {
  setRange('preamp_gain', value);
  const label = $('preamp_val');
  if (label) label.textContent = `${formatDb(value)} dB`;
}

function setSpeed(speed: number) {
  setRange('playback_speed', speed);
  const label = $('speed_val');
  if (label) label.textContent = formatSpeed(speed);
  document.querySelectorAll<HTMLButtonElement>('.speed-preset-btn').forEach((btn) => {
    const selected = Math.abs(parseFloat(btn.dataset.speed || '1') - speed) < 0.01;
    btn.classList.toggle('is-selected', selected);
    btn.setAttribute('aria-pressed', String(selected));
  });
}

function setCrossfade(secs: number) {
  setRange('crossfade_seconds', secs);
  const label = $('crossfade_val');
  if (label) label.textContent = formatCrossfade(secs, tr('settings.crossfade.off'));
}

function setIntensity(value: number) {
  setRange('ambient_intensity', value);
  const label = $('ambient_intensity_val');
  if (label) label.textContent = `${Math.round(value * 100)}%`;
}

// ------------------------------------------------------------ load/save

async function loadSettings() {
  if (!window.__TAURI__?.core) {
    renderEqSliders();
    return;
  }
  try {
    const config = (await window.__TAURI__.core.invoke('get_config')) as AppConfig;
    currentConfig = config;

    for (const [id, fallback] of TOGGLES) {
      const el = $<HTMLInputElement>(id);
      if (el) el.checked = typeof config[id] === 'boolean' ? (config[id] as boolean) : fallback;
    }

    const port = $<HTMLInputElement>('remote_port');
    if (port) port.value = String(config.remote_port || 9863);
    const format = $<HTMLSelectElement>('download_format');
    if (format) format.value = config.download_format || 'mp3';
    const downloadDir = $<HTMLInputElement>('download_dir');
    if (downloadDir) downloadDir.value = config.download_dir || '';
    const localDir = $<HTMLInputElement>('local_music_dir');
    if (localDir) localDir.value = config.local_music_dir || '';
    const css = $<HTMLTextAreaElement>('custom_css');
    if (css) css.value = config.custom_css || '';
    const wheelStep = $<HTMLInputElement>('wheel_volume_step_points');
    if (wheelStep) wheelStep.value = String(Math.max(1, Math.min(100, Math.round((config.wheel_volume_step ?? 0.05) * 100))));

    setIntensity(config.ambient_intensity ?? 0.6);
    setPreamp(config.preamp_gain || 0);
    setCrossfade(config.crossfade_seconds || 0);
    setSpeed(config.playback_speed || 1.0);

    const preset = $<HTMLSelectElement>('eq_preset');
    if (preset) preset.value = config.equalizer_preset || 'flat';
    currentGains =
      config.equalizer_gains && config.equalizer_gains.length === 10 ? [...config.equalizer_gains] : new Array(10).fill(0);
    renderEqSliders();
  } catch (e) {
    console.error('[YTMD] Failed to load settings:', e);
    showToast(tr('settings.loadFailed', { reason: errorMessage(e) }), { durationMs: 8000 });
    renderEqSliders();
  }
}

function collectConfig(config: AppConfig): AppConfig {
  const next: AppConfig = { ...config };
  for (const [id] of TOGGLES) {
    const el = $<HTMLInputElement>(id);
    if (el) next[id] = el.checked;
  }
  const num = (id: string) => parseFloat($<HTMLInputElement>(id)?.value ?? '0');
  const port = parseInt($<HTMLInputElement>('remote_port')?.value ?? '', 10);
  next.remote_port = Number.isFinite(port) && port >= 1024 && port <= 65535 ? port : config.remote_port || 9863;
  next.download_format = $<HTMLSelectElement>('download_format')?.value ?? next.download_format;
  next.download_dir = $<HTMLInputElement>('download_dir')?.value ?? next.download_dir;
  next.local_music_dir = $<HTMLInputElement>('local_music_dir')?.value ?? next.local_music_dir;
  next.custom_css = $<HTMLTextAreaElement>('custom_css')?.value ?? next.custom_css;
  next.equalizer_preset = $<HTMLSelectElement>('eq_preset')?.value ?? next.equalizer_preset;
  next.ambient_intensity = num('ambient_intensity');
  next.preamp_gain = num('preamp_gain');
  next.crossfade_seconds = num('crossfade_seconds');
  next.playback_speed = num('playback_speed');
  const wheelStepPoints = Number($<HTMLInputElement>('wheel_volume_step_points')?.value);
  next.wheel_volume_step = Number.isFinite(wheelStepPoints) && wheelStepPoints >= 1 && wheelStepPoints <= 100
    ? Math.round(wheelStepPoints) / 100
    : config.wheel_volume_step ?? 0.05;
  next.equalizer_gains = [...currentGains];
  return next;
}

/** Settings apply as you change them, like YouTube Music's own settings —
 * no Save button. Live effects are pushed immediately through the
 * set-* events; persisting to disk is debounced. */
function scheduleSave() {
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void saveSettings();
  }, SAVE_DEBOUNCE_MS);
}

async function saveSettings() {
  if (!currentConfig || !window.__TAURI__?.core) return;
  const next = collectConfig(currentConfig);
  try {
    await window.__TAURI__.core.invoke('save_config', { config: next });
    currentConfig = next;
    // Lets the main window's plugin registry re-check toggles
    // (adblock/sponsorblock/lyrics/notifications/remote/...) right away.
    emitLiveEvent('config-updated', next);
    const status = $('save-status');
    if (status) {
      status.textContent = tr('settings.saved');
      setTimeout(() => {
        if (status.textContent === tr('settings.saved')) status.textContent = '';
      }, 1500);
    }
  } catch (e) {
    console.error('[YTMD] Failed to save settings:', e);
    showToast(tr('settings.saveFailed', { reason: errorMessage(e) }), { durationMs: 8000 });
  }
}

// -------------------------------------------------------------- updates

async function loadAppVersion() {
  const desc = $('app-version-desc');
  if (!desc || !window.__TAURI__?.core) return;
  try {
    const version = (await window.__TAURI__.core.invoke('get_app_version')) as string;
    desc.textContent = tr('settings.version', { version });
  } catch {
    // Leave the placeholder if the version can't be read.
  }
}

function setBusy(btn: HTMLButtonElement | null, busyLabel: string | null, idleLabel: string) {
  if (!btn) return;
  btn.disabled = busyLabel !== null;
  if (busyLabel === null) {
    btn.textContent = idleLabel;
    return;
  }
  const spinner = document.createElement('span');
  spinner.className = 'spinner';
  const text = document.createElement('span');
  text.textContent = busyLabel;
  btn.replaceChildren(spinner, text);
}

async function checkForUpdates(userInitiated: boolean) {
  if (!window.__TAURI__?.core) return;
  const btn = $<HTMLButtonElement>('check-update-btn');
  setBusy(btn, tr('settings.update.checking'), tr('settings.update.check'));
  try {
    const info = (await window.__TAURI__.core.invoke('check_for_updates')) as UpdateInfo | null;
    if (info) {
      $('update-available-card')?.classList.remove('is-hidden');
      const desc = $('update-available-desc');
      if (desc) {
        desc.textContent = info.body
          ? tr('settings.update.notes', { version: info.version, notes: info.body })
          : tr('settings.update.ready', { version: info.version });
      }
    } else if (userInitiated) {
      showToast(tr('settings.update.upToDate'));
    }
  } catch (e) {
    console.error('[YTMD] Update check failed:', e);
    if (userInitiated) showToast(tr('settings.update.checkFailed', { reason: errorMessage(e) }), { durationMs: 8000 });
  } finally {
    setBusy(btn, null, tr('settings.update.check'));
  }
}

async function installUpdate() {
  if (!window.__TAURI__?.core) return;
  const btn = $<HTMLButtonElement>('install-update-btn');
  setBusy(btn, tr('settings.update.installing'), tr('settings.update.install'));
  try {
    // On success the app restarts itself; this promise never resolves.
    await window.__TAURI__.core.invoke('install_update');
  } catch (e) {
    console.error('[YTMD] Update install failed:', e);
    showToast(tr('settings.update.installFailed', { reason: errorMessage(e) }), { durationMs: 8000 });
    setBusy(btn, null, tr('settings.update.install'));
  }
}

// ---------------------------------------------------------- navigation

/** Left-hand categories like YouTube Music's settings: click to jump, and
 * the category you're scrolled to stays highlighted. */
function initSectionNav() {
  const content = $('settings-content');
  const items = Array.from(document.querySelectorAll<HTMLButtonElement>('.settings-nav-item'));
  if (!content || items.length === 0) return;

  const setActive = (sectionId: string) => {
    items.forEach((item) => item.classList.toggle('is-active', item.dataset.section === sectionId));
  };

  items.forEach((item) => {
    item.addEventListener('click', () => {
      const section = item.dataset.section ? $(item.dataset.section) : null;
      section?.scrollIntoView({ block: 'start' });
      if (item.dataset.section) setActive(item.dataset.section);
    });
  });

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id);
    },
    { root: content, rootMargin: '0px 0px -70% 0px' }
  );
  content.querySelectorAll('.settings-section').forEach((s) => observer.observe(s));
}

// --------------------------------------------------------------- wiring

document.addEventListener('DOMContentLoaded', () => {
  initWindowChrome();
  initAmbientBackdrop();
  initSectionNav();
  void loadSettings();
  void loadAppVersion();
  void checkForUpdates(false);

  $('check-update-btn')?.addEventListener('click', () => checkForUpdates(true));
  $('install-update-btn')?.addEventListener('click', installUpdate);

  // Any edit anywhere in the settings persists (debounced).
  const content = $('settings-content');
  content?.addEventListener('change', scheduleSave);
  content?.addEventListener('input', scheduleSave);

  const presetSelect = $<HTMLSelectElement>('eq_preset');
  presetSelect?.addEventListener('change', () => {
    const preset = EQ_PRESETS[presetSelect.value];
    if (presetSelect.value === 'custom' || !preset) return;
    updateSlidersFromGains(preset.gains);
    emitLiveEvent('set-eq-all', { gains: preset.gains, preset: presetSelect.value });
    if (preset.preamp !== undefined) {
      setPreamp(preset.preamp);
      emitLiveEvent('set-preamp', preset.preamp);
    }
  });

  $('eq-reset-btn')?.addEventListener('click', () => {
    if (presetSelect) presetSelect.value = 'flat';
    updateSlidersFromGains(EQ_PRESETS.flat.gains);
    emitLiveEvent('set-eq-all', { gains: EQ_PRESETS.flat.gains, preset: 'flat' });
    setPreamp(0);
    emitLiveEvent('set-preamp', 0);
    scheduleSave();
  });

  $<HTMLInputElement>('preamp_gain')?.addEventListener('input', (e) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    setPreamp(val);
    emitLiveEvent('set-preamp', val);
  });

  $<HTMLInputElement>('crossfade_seconds')?.addEventListener('input', (e) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    setCrossfade(val);
    emitLiveEvent('set-crossfade-seconds', val);
  });

  $<HTMLInputElement>('playback_speed')?.addEventListener('input', (e) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    setSpeed(val);
    emitLiveEvent('set-playback-rate', val);
  });

  document.querySelectorAll<HTMLButtonElement>('.speed-preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const speed = parseFloat(btn.dataset.speed || '1');
      setSpeed(speed);
      emitLiveEvent('set-playback-rate', speed);
      scheduleSave();
    });
  });

  const liveToggle = (id: string, event: string) => {
    const el = $<HTMLInputElement>(id);
    el?.addEventListener('change', () => emitLiveEvent(event, el.checked));
  };
  liveToggle('preserve_pitch', 'set-preserves-pitch');
  liveToggle('ambient_lighting_enabled', 'set-ambient-enabled');
  liveToggle('loudness_normalization', 'set-loudness-normalization');
  liveToggle('skip_silence_enabled', 'set-skip-silence');

  $<HTMLInputElement>('ambient_intensity')?.addEventListener('input', (e) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    setIntensity(val);
    emitLiveEvent('set-ambient-intensity', val);
  });

  $<HTMLTextAreaElement>('custom_css')?.addEventListener('input', (e) => {
    emitLiveEvent('set-custom-css', (e.target as HTMLTextAreaElement).value);
  });
});
