import { EQ_FREQUENCIES, EQ_MAX_DB, EQ_PRESETS } from '../plugins/audio-dsp/presets';
import { openDialog, showToast } from '../preload/ui/kit';
import { initAmbientBackdrop } from './ambient';
import { formatDb, formatCrossfade } from './format';
import { COMPANION_LOCALES, I18nKey, tr } from './i18n';
import { syncRange } from './range';
import { acceleratorFromEvent, formatAccelerator, isMediaKey, SHORTCUT_ACTIONS, ShortcutAction } from './shortcuts';
import { CustomEqPreset, deletePreset, isCustomPresetId, MAX_PRESET_NAME_CHARS, savePreset } from './eqPresets';
import { initWindowChrome, onBeforeClose } from './window';
import { normalizeProviders, ProviderSetting, renderProviderList } from './lyricsProviders';

interface AppConfig {
  close_to_tray: boolean;
  discord_rpc_enabled: boolean;
  discord_clear_after_pause_min: number;
  mpris_enabled: boolean;
  notifications_enabled: boolean;
  adblock_enabled: boolean;
  sponsorblock_enabled: boolean;
  lyrics_enabled: boolean;
  lyrics_providers?: ProviderSetting[];
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
  local_music_dir: string;
  remote_enabled: boolean;
  remote_bind: string;
  remote_port: number;
  inhibit_sleep: boolean;
  pause_on_lock: boolean;
  resume_on_launch: boolean;
  resume_autoplay: boolean;
  equalizer_custom_presets?: CustomEqPreset[];
  shortcuts?: Record<string, string>;
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
  ['remote_enabled', false],
  ['inhibit_sleep', true],
  ['pause_on_lock', true],
  ['resume_on_launch', true],
  ['resume_autoplay', false]
];

const SAVE_DEBOUNCE_MS = 500;

let currentConfig: AppConfig | null = null;
let lyricsProviders: ProviderSetting[] = normalizeProviders(undefined);

function renderLyricsProviders() {
  const list = $('lyrics-providers-list');
  if (!list) return;
  renderProviderList(list, lyricsProviders, (next) => {
    lyricsProviders = next;
    renderLyricsProviders();
    scheduleSave();
  });
}
let currentGains: number[] = new Array(10).fill(0);
let customPresets: CustomEqPreset[] = [];
let saveTimer: ReturnType<typeof setTimeout> | null = null;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;

const isI18nKey = (s: string): s is I18nKey => s in COMPANION_LOCALES.en;

/** Backend errors are either i18n keys (`settings.*`) or OS messages. */
function errorMessage(e: unknown): string {
  const raw = typeof e === 'string' ? e : e instanceof Error ? e.message : null;
  if (raw === null) return tr('common.unknownError');
  return isI18nKey(raw) ? tr(raw) : raw;
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
    slider.min = String(-EQ_MAX_DB);
    slider.max = String(EQ_MAX_DB);
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
      updatePresetButtons();
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

// -------------------------------------------------------- custom presets

/** The user's presets go in their own group of the preset list. */
function renderPresetOptions(selected: string) {
  const group = $('eq-user-presets') as HTMLOptGroupElement | null;
  const select = $<HTMLSelectElement>('eq_preset');
  if (!group || !select) return;
  group.label = tr('settings.eq.userGroup');
  group.replaceChildren(
    ...customPresets.map((p) => {
      const option = document.createElement('option');
      option.value = p.id;
      option.textContent = p.name;
      return option;
    })
  );
  group.classList.toggle('is-hidden', customPresets.length === 0);
  select.value = [...select.options].some((o) => o.value === selected) ? selected : 'custom';
  updatePresetButtons();
}

function updatePresetButtons() {
  const selected = $<HTMLSelectElement>('eq_preset')?.value ?? '';
  $('eq-delete-preset-btn')?.classList.toggle('is-hidden', !isCustomPresetId(selected));
}

/** Gains and preamp of any preset, built-in or the user's. */
function presetCurve(id: string): { gains: number[]; preamp: number } | null {
  const custom = customPresets.find((p) => p.id === id);
  if (custom) return { gains: custom.gains, preamp: custom.preamp };
  const builtIn = EQ_PRESETS[id];
  return builtIn ? { gains: builtIn.gains, preamp: builtIn.preamp ?? 0 } : null;
}

function currentPreamp(): number {
  return parseFloat($<HTMLInputElement>('preamp_gain')?.value ?? '0') || 0;
}

function promptSavePreset() {
  const selected = customPresets.find((p) => p.id === $<HTMLSelectElement>('eq_preset')?.value);
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'input';
  input.maxLength = MAX_PRESET_NAME_CHARS;
  input.placeholder = tr('settings.eq.namePlaceholder');
  input.setAttribute('aria-label', tr('settings.eq.nameLabel'));
  input.value = selected?.name ?? '';
  const save = (close: () => void) => {
    const result = savePreset(customPresets, input.value, currentGains, currentPreamp());
    if (!result) {
      showToast(input.value.trim() ? tr('settings.eq.limit') : tr('settings.eq.nameRequired'));
      return;
    }
    close();
    customPresets = result.presets;
    renderPresetOptions(result.id);
    showToast(tr('settings.eq.saved', { name: input.value.trim() }));
    scheduleSave();
  };
  const dialog = openDialog({
    id: 'ytmd-save-preset',
    title: tr('settings.eq.saveTitle'),
    body: [input],
    actions: [{ label: tr('settings.eq.cancel') }, { label: tr('settings.eq.saveConfirm'), filled: true, onClick: save }]
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') save(dialog.close);
  });
  input.focus();
  input.select();
}

function deleteSelectedPreset() {
  const select = $<HTMLSelectElement>('eq_preset');
  const preset = customPresets.find((p) => p.id === select?.value);
  if (!preset) return;
  customPresets = deletePreset(customPresets, preset.id);
  // The curve stays as it is, now unnamed.
  renderPresetOptions('custom');
  showToast(tr('settings.eq.deleted', { name: preset.name }));
  scheduleSave();
}

// ------------------------------------------------------------ shortcuts

let shortcuts: Record<string, string> = {};
/** The action whose new keys we're waiting for. */
let recording: ShortcutAction | null = null;

function shortcutLabel(accelerator: string): string {
  if (!accelerator) return tr('settings.shortcuts.none');
  if (isMediaKey(accelerator)) {
    const key = `settings.shortcuts.key.${accelerator}`;
    return isI18nKey(key) ? tr(key) : accelerator;
  }
  return formatAccelerator(accelerator);
}

function renderShortcuts() {
  const list = $('shortcuts-list');
  if (!list) return;
  list.replaceChildren(
    ...SHORTCUT_ACTIONS.map((action) => {
      const row = document.createElement('div');
      row.className = 'shortcut-row';
      const name = document.createElement('span');
      name.className = 'shortcut-name';
      name.textContent = tr(`settings.shortcuts.action.${action}`);
      const keys = document.createElement('button');
      keys.className = 'btn btn-tonal shortcut-keys';
      keys.classList.toggle('is-recording', recording === action);
      keys.textContent = recording === action ? tr('settings.shortcuts.recording') : shortcutLabel(shortcuts[action] ?? '');
      keys.addEventListener('click', () => {
        recording = recording === action ? null : action;
        renderShortcuts();
      });
      row.append(name, keys);
      {
        // Always there (hidden when there's nothing to clear) so the key
        // pills line up.
        const clear = document.createElement('button');
        clear.className = 'icon-btn sm';
        clear.classList.toggle('is-placeholder', !shortcuts[action]);
        clear.disabled = !shortcuts[action];
        const label = tr('settings.shortcuts.clear', { action: tr(`settings.shortcuts.action.${action}`) });
        clear.setAttribute('aria-label', label);
        clear.dataset.ytmdTooltip = label;
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('class', 'icon');
        svg.setAttribute('viewBox', '0 0 24 24');
        const path = document.createElementNS(ns, 'path');
        path.setAttribute('d', 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z');
        svg.appendChild(path);
        clear.appendChild(svg);
        clear.addEventListener('click', () => void storeShortcut(action, ''));
        row.appendChild(clear);
      }
      return row;
    })
  );
}

async function storeShortcut(action: ShortcutAction, accelerator: string) {
  recording = null;
  if (!window.__TAURI__?.core) return;
  try {
    shortcuts = (await window.__TAURI__.core.invoke('set_shortcut', { action, accelerator })) as Record<string, string>;
    if (currentConfig) currentConfig.shortcuts = shortcuts;
  } catch (e) {
    showToast(errorMessage(e), { durationMs: 6000 });
  }
  renderShortcuts();
}

/** While recording, the next real key combination becomes the shortcut. */
function onShortcutKeydown(e: KeyboardEvent) {
  if (!recording) return;
  e.preventDefault();
  e.stopPropagation();
  const noModifiers = !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey;
  if (e.key === 'Escape' && noModifiers) {
    recording = null;
    renderShortcuts();
    return;
  }
  if ((e.key === 'Backspace' || e.key === 'Delete') && noModifiers) {
    void storeShortcut(recording, '');
    return;
  }
  const accelerator = acceleratorFromEvent(e);
  if (accelerator) void storeShortcut(recording, accelerator);
}

// ------------------------------------------------------------ load/save

async function loadSettings() {
  if (!window.__TAURI__?.core) {
    renderEqSliders();
    return;
  }
  try {
    applyConfig((await window.__TAURI__.core.invoke('get_config')) as AppConfig);
  } catch (e) {
    console.error('[YTMD] Failed to load settings:', e);
    showToast(tr('settings.loadFailed', { reason: errorMessage(e) }), { durationMs: 8000 });
    renderEqSliders();
  }
}

/** Shows `config` in every control. */
function applyConfig(config: AppConfig) {
  currentConfig = config;

  for (const [id, fallback] of TOGGLES) {
    const el = $<HTMLInputElement>(id);
    if (el) el.checked = typeof config[id] === 'boolean' ? (config[id] as boolean) : fallback;
  }

  const port = $<HTMLInputElement>('remote_port');
  if (port) port.value = String(config.remote_port || 9863);
  const remoteBind = $<HTMLSelectElement>('remote_bind');
  if (remoteBind) remoteBind.value = config.remote_bind === 'all' ? 'all' : 'lan';
  const discordPause = $<HTMLSelectElement>('discord_clear_after_pause_min');
  if (discordPause) discordPause.value = String(config.discord_clear_after_pause_min ?? 5);
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

  customPresets = config.equalizer_custom_presets ?? [];
  renderPresetOptions(config.equalizer_preset || 'flat');
  currentGains =
    config.equalizer_gains && config.equalizer_gains.length === 10 ? [...config.equalizer_gains] : new Array(10).fill(0);
  renderEqSliders();

  shortcuts = config.shortcuts ?? {};
  renderShortcuts();

  lyricsProviders = normalizeProviders(config.lyrics_providers);
  renderLyricsProviders();
}

/** After an import: every live effect the settings drive, pushed to the
 * player at once, as if each control had been changed by hand. */
function pushLiveState(config: AppConfig) {
  emitLiveEvent('set-eq-all', { gains: config.equalizer_gains, preset: config.equalizer_preset });
  emitLiveEvent('set-preamp', config.preamp_gain);
  emitLiveEvent('set-crossfade-seconds', config.crossfade_seconds);
  emitLiveEvent('set-playback-rate', config.playback_speed);
  emitLiveEvent('set-preserves-pitch', config.preserve_pitch);
  emitLiveEvent('set-ambient-enabled', config.ambient_lighting_enabled);
  emitLiveEvent('set-ambient-intensity', config.ambient_intensity);
  emitLiveEvent('set-loudness-normalization', config.loudness_normalization);
  emitLiveEvent('set-skip-silence', config.skip_silence_enabled);
  emitLiveEvent('set-custom-css', config.custom_css);
  emitLiveEvent('config-updated', config);
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
  next.remote_bind = $<HTMLSelectElement>('remote_bind')?.value === 'all' ? 'all' : 'lan';
  const discordPause = parseInt($<HTMLSelectElement>('discord_clear_after_pause_min')?.value ?? '', 10);
  if (Number.isFinite(discordPause)) next.discord_clear_after_pause_min = discordPause;
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
  next.equalizer_custom_presets = customPresets;
  next.shortcuts = shortcuts;
  next.lyrics_providers = lyricsProviders;
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

/** A backup's custom CSS is applied only if the user says so: it runs
 * inside YouTube Music and can load outside resources (fonts, images,
 * `@import`), which tells that server you use YTMD and when. */
function confirmImportedCss(css: string) {
  const preview = document.createElement('pre');
  preview.className = 'css-preview';
  preview.textContent = css.length > 600 ? `${css.slice(0, 600)}…` : css;
  openDialog({
    id: 'ytmd-import-css',
    title: tr('settings.backup.cssTitle'),
    body: [document.createTextNode(tr('settings.backup.cssBody')), preview],
    actions: [
      { label: tr('settings.backup.cssKeep') },
      {
        label: tr('settings.backup.cssUse'),
        filled: true,
        onClick: (close) => {
          close();
          const textarea = $<HTMLTextAreaElement>('custom_css');
          if (textarea) textarea.value = css;
          emitLiveEvent('set-custom-css', css);
          scheduleSave();
        }
      }
    ]
  });
}

// --------------------------------------------------------- phone remote

interface RemoteInfo {
  url: string;
  qr_svg: string;
}

/** The pairing QR lives here, not in the YouTube Music page: it carries
 * the remote's token. */
async function loadRemotePairing(): Promise<void> {
  const frame = $('remote-qr');
  const url = $('remote-url');
  if (!frame || !url) return;
  try {
    const info = (await window.__TAURI__?.core.invoke('get_remote_info')) as RemoteInfo | null;
    if (!info?.qr_svg) return;
    const img = document.createElement('img');
    img.src = `data:image/svg+xml;utf8,${encodeURIComponent(info.qr_svg)}`;
    img.alt = tr('settings.remotePair.title');
    frame.replaceChildren(img);
    url.textContent = info.url;
  } catch {
    // Remote off or not bound: the frame keeps its "not running" text.
  }
}

function showSection(sectionId: string) {
  document.querySelector<HTMLButtonElement>(`.settings-nav-item[data-section="${CSS.escape(sectionId)}"]`)?.click();
  if (sectionId === 'sec-remote') void loadRemotePairing();
}

// --------------------------------------------------------------- wiring

document.addEventListener('DOMContentLoaded', () => {
  initWindowChrome();
  initAmbientBackdrop();
  initSectionNav();
  void loadRemotePairing();
  // Opened on a section (`settings.html#sec-remote`, see windows.rs).
  const initialSection = decodeURIComponent(location.hash.slice(1));
  if (/^sec-[a-z-]+$/.test(initialSection)) requestAnimationFrame(() => showSection(initialSection));
  // Closing destroys this window: save what the debounce still holds.
  onBeforeClose(async () => {
    if (saveTimer === null) return;
    clearTimeout(saveTimer);
    saveTimer = null;
    await saveSettings();
  });
  void window.__TAURI__?.event.listen<string>('settings-open-section', (e) => {
    if (typeof e.payload === 'string') showSection(e.payload);
  });
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
    updatePresetButtons();
    const curve = presetCurve(presetSelect.value);
    if (!curve) return;
    updateSlidersFromGains(curve.gains);
    emitLiveEvent('set-eq-all', { gains: curve.gains, preset: presetSelect.value });
    setPreamp(curve.preamp);
    emitLiveEvent('set-preamp', curve.preamp);
  });
  $('eq-save-preset-btn')?.addEventListener('click', promptSavePreset);
  $('eq-delete-preset-btn')?.addEventListener('click', deleteSelectedPreset);

  // Shortcuts: record on keydown anywhere while a shortcut button waits.
  window.addEventListener('keydown', onShortcutKeydown, true);
  $('shortcuts-reset-btn')?.addEventListener('click', async () => {
    recording = null;
    if (!window.__TAURI__?.core) return;
    try {
      shortcuts = (await window.__TAURI__.core.invoke('reset_shortcuts')) as Record<string, string>;
      if (currentConfig) currentConfig.shortcuts = shortcuts;
    } catch (e) {
      showToast(errorMessage(e));
    }
    renderShortcuts();
  });

  $('export-settings-btn')?.addEventListener('click', async () => {
    if (!window.__TAURI__?.core) return;
    // Pending edits first, so the file has what's on screen.
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
      saveTimer = null;
      await saveSettings();
    }
    try {
      if (await window.__TAURI__.core.invoke('export_settings')) showToast(tr('settings.backup.exported'));
    } catch (e) {
      showToast(errorMessage(e), { durationMs: 8000 });
    }
  });
  $('import-settings-btn')?.addEventListener('click', async () => {
    if (!window.__TAURI__?.core) return;
    try {
      const imported = (await window.__TAURI__.core.invoke('import_settings')) as {
        config: AppConfig;
        custom_css: string | null;
      } | null;
      if (!imported) return;
      applyConfig(imported.config);
      pushLiveState(imported.config);
      showToast(tr('settings.backup.imported'));
      if (imported.custom_css) confirmImportedCss(imported.custom_css);
    } catch (e) {
      showToast(errorMessage(e), { durationMs: 8000 });
    }
  });
  $('remote-revoke-btn')?.addEventListener('click', async () => {
    try {
      await window.__TAURI__?.core.invoke('regenerate_remote_token');
      showToast(tr('settings.remoteRevoke.done'));
      void loadRemotePairing();
    } catch (e) {
      showToast(errorMessage(e));
    }
  });
  $('open-logs-btn')?.addEventListener('click', async () => {
    try {
      await window.__TAURI__?.core.invoke('open_logs_folder');
    } catch (e) {
      showToast(errorMessage(e));
    }
  });

  $('eq-reset-btn')?.addEventListener('click', () => {
    if (presetSelect) presetSelect.value = 'flat';
    updatePresetButtons();
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
