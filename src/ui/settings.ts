import { EQ_FREQUENCIES, EQ_PRESETS } from '../plugins/audio-dsp/presets';
import { initAmbientBackdrop } from './ambient';
import { formatDb, formatCrossfade } from './format';

interface AppConfig {
  autostart: boolean;
  minimize_to_tray: boolean;
  close_to_tray: boolean;
  discord_rpc_enabled: boolean;
  mpris_enabled: boolean;
  notifications_enabled: boolean;
  adblock_enabled: boolean;
  sponsorblock_enabled: boolean;
  lyrics_enabled: boolean;
  miniplayer_enabled: boolean;
  wheel_volume_step: number;
  custom_css: string;
  custom_user_agent: string;
  quality: string;
  normalize_volume: boolean;
  equalizer_enabled: boolean;
  equalizer_preset: string;
  equalizer_gains: number[];
  preamp_gain: number;
  loudness_normalization: boolean;
  crossfade_seconds: number;
  skip_silence_enabled: boolean;
  playback_speed: number;
  preserve_pitch: boolean;
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
  lastfm_enabled: boolean;
  lastfm_api_key: string;
  lastfm_secret: string;
}

interface UpdateInfo {
  version: string;
  current_version: string;
  body: string | null;
  date: string | null;
}

let currentConfig: AppConfig | null = null;
let currentGains: number[] = new Array(10).fill(0);

const ERROR_ICON_SVG =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';

/** Surfaces a backend failure as a self-dismissing toast in the corner —
 * settings' header has no room for an inline banner next to Save, unlike
 * Listen Together's room panels. */
function showToast(message: string) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `${ERROR_ICON_SVG}<span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 6000);
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function errorMessage(e: unknown): string {
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message;
  return 'Something went wrong. Check the app logs for details.';
}

function formatFreq(freq: number): string {
  if (freq >= 1000) {
    return `${freq / 1000}k`;
  }
  return `${freq}`;
}

function updateBadgeClass(badge: HTMLElement, val: number) {
  badge.classList.remove('positive', 'negative', 'zero');
  if (val > 0) {
    badge.classList.add('positive');
  } else if (val < 0) {
    badge.classList.add('negative');
  } else {
    badge.classList.add('zero');
  }
}

function renderEqSliders() {
  const container = document.getElementById('eq-faders-grid');
  if (!container) return;

  container.innerHTML = '';

  EQ_FREQUENCIES.forEach((freq, idx) => {
    const col = document.createElement('div');
    col.className = 'eq-band-col';

    const val = currentGains[idx] || 0;
    const valBadge = document.createElement('span');
    valBadge.className = 'eq-gain-badge';
    updateBadgeClass(valBadge, val);
    valBadge.id = `eq-val-${idx}`;
    valBadge.textContent = formatDb(val);

    const sliderWrapper = document.createElement('div');
    sliderWrapper.className = 'eq-slider-wrapper';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'eq-v-slider';
    slider.id = `eq-slider-${idx}`;
    slider.min = '-12';
    slider.max = '12';
    slider.step = '0.5';
    slider.value = String(val);

    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      currentGains[idx] = v;
      valBadge.textContent = formatDb(v);
      updateBadgeClass(valBadge, v);

      const presetSelect = document.getElementById('eq_preset') as HTMLSelectElement;
      if (presetSelect && presetSelect.value !== 'custom') {
        presetSelect.value = 'custom';
      }

      emitLiveEvent('set-eq-band', { bandIndex: idx, gain: v });
    });

    sliderWrapper.appendChild(slider);

    const freqLabel = document.createElement('span');
    freqLabel.className = 'eq-freq-label';
    freqLabel.textContent = formatFreq(freq);

    col.appendChild(valBadge);
    col.appendChild(sliderWrapper);
    col.appendChild(freqLabel);
    container.appendChild(col);
  });
}

function updateSlidersFromGains(gains: number[]) {
  currentGains = [...gains];
  gains.forEach((gain, idx) => {
    const slider = document.getElementById(`eq-slider-${idx}`) as HTMLInputElement;
    const badge = document.getElementById(`eq-val-${idx}`);
    if (slider) slider.value = String(gain);
    if (badge) {
      badge.textContent = formatDb(gain);
      updateBadgeClass(badge, gain);
    }
  });
}

function updateSpeedPresetButtons(currentSpeed: number) {
  document.querySelectorAll<HTMLButtonElement>('.speed-preset-btn').forEach((btn) => {
    const speed = parseFloat(btn.dataset.speed || '1.0');
    if (Math.abs(speed - currentSpeed) < 0.01) {
      btn.style.background = 'var(--accent)';
      btn.style.color = '#ffffff';
      btn.style.borderColor = 'var(--accent)';
    } else {
      btn.style.background = 'var(--bg-subtle)';
      btn.style.color = 'var(--text-primary)';
      btn.style.borderColor = 'var(--border)';
    }
  });
}

async function emitLiveEvent(event: string, payload: unknown) {
  const tauri = window.__TAURI__;
  if (tauri?.event) {
    try {
      await tauri.event.emit(event, payload);
    } catch {
      // Cross-webview event
    }
  }
}

async function loadSettings() {
  if (window.__TAURI__?.core) {
    try {
      const config = (await window.__TAURI__.core.invoke('get_config')) as AppConfig;
      currentConfig = config;

      // Populate basic UI values
      setCheckbox('discord_rpc_enabled', config.discord_rpc_enabled);
      setCheckbox('mpris_enabled', config.mpris_enabled);
      setCheckbox('notifications_enabled', config.notifications_enabled);
      setCheckbox('close_to_tray', config.close_to_tray);
      setCheckbox('adblock_enabled', config.adblock_enabled);
      setCheckbox('sponsorblock_enabled', config.sponsorblock_enabled);
      setCheckbox('lyrics_enabled', config.lyrics_enabled);
      setCheckbox('loudness_normalization', config.loudness_normalization);
      setCheckbox('skip_silence_enabled', config.skip_silence_enabled);
      setCheckbox('preserve_pitch', config.preserve_pitch !== false);
      setCheckbox('ambient_lighting_enabled', config.ambient_lighting_enabled !== false);
      setCheckbox('embed_lyrics', config.embed_lyrics !== false);
      setCheckbox('remote_enabled', config.remote_enabled !== false);
      setCheckbox('inhibit_sleep', config.inhibit_sleep !== false);
      setCheckbox('pause_on_lock', config.pause_on_lock !== false);

      const remotePortInput = document.getElementById('remote_port') as HTMLInputElement;
      if (remotePortInput) remotePortInput.value = String(config.remote_port || 9863);

      // Downloader & Local Music fields
      const downloadFormatSelect = document.getElementById('download_format') as HTMLSelectElement;
      if (downloadFormatSelect) downloadFormatSelect.value = config.download_format || 'mp3';

      const downloadDirInput = document.getElementById('download_dir') as HTMLInputElement;
      if (downloadDirInput) downloadDirInput.value = config.download_dir || '';

      const localDirInput = document.getElementById('local_music_dir') as HTMLInputElement;
      if (localDirInput) localDirInput.value = config.local_music_dir || '';

      // Ambient intensity slider
      const intensitySlider = document.getElementById('ambient_intensity') as HTMLInputElement;
      const intensityVal = document.getElementById('ambient_intensity_val');
      if (intensitySlider) {
        const intVal = config.ambient_intensity !== undefined ? config.ambient_intensity : 0.6;
        intensitySlider.value = String(intVal);
        if (intensityVal) intensityVal.textContent = `${Math.round(intVal * 100)}%`;
      }

      // Custom CSS
      const cssEditor = document.getElementById('custom_css') as HTMLTextAreaElement;
      if (cssEditor) {
        cssEditor.value = config.custom_css || '';
      }

      // Preamp slider
      const preampSlider = document.getElementById('preamp_gain') as HTMLInputElement;
      const preampVal = document.getElementById('preamp_val');
      if (preampSlider) {
        preampSlider.value = String(config.preamp_gain || 0);
      }
      if (preampVal) {
        preampVal.textContent = `${formatDb(config.preamp_gain || 0)} dB`;
      }

      // Crossfade slider
      const crossfadeSlider = document.getElementById('crossfade_seconds') as HTMLInputElement;
      const crossfadeVal = document.getElementById('crossfade_val');
      if (crossfadeSlider) {
        crossfadeSlider.value = String(config.crossfade_seconds || 0);
      }
      if (crossfadeVal) {
        crossfadeVal.textContent = formatCrossfade(config.crossfade_seconds || 0);
      }

      // Playback speed slider
      const speedSlider = document.getElementById('playback_speed') as HTMLInputElement;
      const speedVal = document.getElementById('speed_val');
      const initialSpeed = config.playback_speed || 1.0;
      if (speedSlider) {
        speedSlider.value = String(initialSpeed);
      }
      if (speedVal) {
        speedVal.textContent = `${initialSpeed.toFixed(2)}x`;
      }
      updateSpeedPresetButtons(initialSpeed);

      // Equalizer preset & gains
      const presetSelect = document.getElementById('eq_preset') as HTMLSelectElement;
      if (presetSelect) presetSelect.value = config.equalizer_preset || 'flat';

      currentGains = config.equalizer_gains && config.equalizer_gains.length === 10
        ? config.equalizer_gains
        : new Array(10).fill(0);

      renderEqSliders();
    } catch (e) {
      console.error('[YTMD] Failed to load settings:', e);
      showToast(`Couldn't load your settings: ${errorMessage(e)}`);
    }
  } else {
    renderEqSliders();
  }
}

function setCheckbox(id: string, value: boolean) {
  const el = document.getElementById(id) as HTMLInputElement;
  if (el) el.checked = value;
}

function getCheckbox(id: string): boolean {
  const el = document.getElementById(id) as HTMLInputElement;
  return el ? el.checked : false;
}

async function saveSettings() {
  if (!currentConfig || !window.__TAURI__?.core) return;

  currentConfig.discord_rpc_enabled = getCheckbox('discord_rpc_enabled');
  currentConfig.mpris_enabled = getCheckbox('mpris_enabled');
  currentConfig.notifications_enabled = getCheckbox('notifications_enabled');
  currentConfig.close_to_tray = getCheckbox('close_to_tray');
  currentConfig.adblock_enabled = getCheckbox('adblock_enabled');
  currentConfig.sponsorblock_enabled = getCheckbox('sponsorblock_enabled');
  currentConfig.lyrics_enabled = getCheckbox('lyrics_enabled');
  currentConfig.loudness_normalization = getCheckbox('loudness_normalization');
  currentConfig.skip_silence_enabled = getCheckbox('skip_silence_enabled');
  currentConfig.preserve_pitch = getCheckbox('preserve_pitch');
  currentConfig.ambient_lighting_enabled = getCheckbox('ambient_lighting_enabled');
  currentConfig.embed_lyrics = getCheckbox('embed_lyrics');
  currentConfig.remote_enabled = getCheckbox('remote_enabled');
  currentConfig.inhibit_sleep = getCheckbox('inhibit_sleep');
  currentConfig.pause_on_lock = getCheckbox('pause_on_lock');

  const remotePortInput = document.getElementById('remote_port') as HTMLInputElement;
  if (remotePortInput) currentConfig.remote_port = parseInt(remotePortInput.value, 10) || 9863;

  const downloadFormatSelect = document.getElementById('download_format') as HTMLSelectElement;
  if (downloadFormatSelect) currentConfig.download_format = downloadFormatSelect.value;

  const downloadDirInput = document.getElementById('download_dir') as HTMLInputElement;
  if (downloadDirInput) currentConfig.download_dir = downloadDirInput.value;

  const localDirInput = document.getElementById('local_music_dir') as HTMLInputElement;
  if (localDirInput) currentConfig.local_music_dir = localDirInput.value;

  const intensitySlider = document.getElementById('ambient_intensity') as HTMLInputElement;
  if (intensitySlider) currentConfig.ambient_intensity = parseFloat(intensitySlider.value);

  const cssEditor = document.getElementById('custom_css') as HTMLTextAreaElement;
  if (cssEditor) currentConfig.custom_css = cssEditor.value;

  const presetSelect = document.getElementById('eq_preset') as HTMLSelectElement;
  if (presetSelect) currentConfig.equalizer_preset = presetSelect.value;

  const preampSlider = document.getElementById('preamp_gain') as HTMLInputElement;
  if (preampSlider) currentConfig.preamp_gain = parseFloat(preampSlider.value);

  const crossfadeSlider = document.getElementById('crossfade_seconds') as HTMLInputElement;
  if (crossfadeSlider) currentConfig.crossfade_seconds = parseFloat(crossfadeSlider.value);

  const speedSlider = document.getElementById('playback_speed') as HTMLInputElement;
  if (speedSlider) currentConfig.playback_speed = parseFloat(speedSlider.value);

  currentConfig.equalizer_gains = [...currentGains];

  const saveBtn = document.getElementById('save-btn') as HTMLButtonElement | null;
  const savingHtml = '<span class="spinner"></span><span>Saving…</span>';
  const idleText = 'Save Changes';
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = savingHtml;
  }

  try {
    await window.__TAURI__.core.invoke('save_config', { config: currentConfig });
    // Lets the main window's plugin registry re-check toggles
    // (adblock/sponsorblock/lyrics/notifications/remote/...) immediately
    // instead of only picking up the change on next app restart.
    emitLiveEvent('config-updated', currentConfig);
    if (saveBtn) {
      saveBtn.textContent = 'Saved!';
      setTimeout(() => {
        saveBtn.textContent = idleText;
      }, 1500);
    }
  } catch (e) {
    console.error('[YTMD] Failed to save settings:', e);
    showToast(`Couldn't save your settings: ${errorMessage(e)}`);
    if (saveBtn) saveBtn.textContent = idleText;
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

async function loadAppVersion() {
  const versionDesc = document.getElementById('app-version-desc');
  if (!versionDesc || !window.__TAURI__?.core) return;
  try {
    const version = (await window.__TAURI__.core.invoke('get_app_version')) as string;
    versionDesc.textContent = `Version ${version}`;
  } catch {
    // Leave the placeholder text if the version can't be read.
  }
}

function showUpdateAvailable(info: UpdateInfo) {
  const card = document.getElementById('update-available-card');
  const desc = document.getElementById('update-available-desc');
  if (card) card.style.display = 'flex';
  if (desc) {
    desc.textContent = info.body
      ? `Version ${info.version}: ${info.body}`
      : `Version ${info.version} is ready to install.`;
  }
}

async function checkForUpdates(showUpToDateToast: boolean) {
  if (!window.__TAURI__?.core) return;
  const btn = document.getElementById('check-update-btn') as HTMLButtonElement | null;
  const idleText = 'Check for Updates';

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span><span>Checking…</span>';
  }

  try {
    const info = (await window.__TAURI__.core.invoke('check_for_updates')) as UpdateInfo | null;
    if (info) {
      showUpdateAvailable(info);
    } else if (showUpToDateToast) {
      showToast("You're already on the latest version.");
    }
  } catch (e) {
    console.error('[YTMD] Update check failed:', e);
    if (showUpToDateToast) {
      showToast(`Couldn't check for updates: ${errorMessage(e)}`);
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = idleText;
    }
  }
}

async function installUpdate() {
  if (!window.__TAURI__?.core) return;
  const btn = document.getElementById('install-update-btn') as HTMLButtonElement | null;
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span><span>Installing…</span>';
  }

  try {
    // On success the app restarts itself — this promise never resolves in practice.
    await window.__TAURI__.core.invoke('install_update');
  } catch (e) {
    console.error('[YTMD] Update install failed:', e);
    showToast(`Couldn't install the update: ${errorMessage(e)}`);
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Install & Restart';
    }
  }
}

function initUpdateChecker() {
  loadAppVersion();
  checkForUpdates(false);

  const checkBtn = document.getElementById('check-update-btn');
  if (checkBtn) {
    checkBtn.addEventListener('click', () => checkForUpdates(true));
  }

  const installBtn = document.getElementById('install-update-btn');
  if (installBtn) {
    installBtn.addEventListener('click', installUpdate);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initAmbientBackdrop();
  loadSettings();
  initUpdateChecker();

  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveSettings);
  }

  // Preset dropdown listener
  const presetSelect = document.getElementById('eq_preset') as HTMLSelectElement;
  if (presetSelect) {
    presetSelect.addEventListener('change', () => {
      const presetId = presetSelect.value;
      if (presetId !== 'custom' && EQ_PRESETS[presetId]) {
        const preset = EQ_PRESETS[presetId];
        updateSlidersFromGains(preset.gains);
        emitLiveEvent('set-eq-all', { gains: preset.gains, preset: presetId });

        if (preset.preamp !== undefined) {
          const preampSlider = document.getElementById('preamp_gain') as HTMLInputElement;
          const preampVal = document.getElementById('preamp_val');
          if (preampSlider) preampSlider.value = String(preset.preamp);
          if (preampVal) preampVal.textContent = `${formatDb(preset.preamp)} dB`;
          emitLiveEvent('set-preamp', preset.preamp);
        }
      }
    });
  }

  // Preamp slider listener
  const preampSlider = document.getElementById('preamp_gain') as HTMLInputElement;
  const preampVal = document.getElementById('preamp_val');
  if (preampSlider && preampVal) {
    preampSlider.addEventListener('input', () => {
      const val = parseFloat(preampSlider.value);
      preampVal.textContent = `${formatDb(val)} dB`;
      emitLiveEvent('set-preamp', val);
    });
  }

  // Crossfade slider listener
  const crossfadeSlider = document.getElementById('crossfade_seconds') as HTMLInputElement;
  const crossfadeVal = document.getElementById('crossfade_val');
  if (crossfadeSlider && crossfadeVal) {
    crossfadeSlider.addEventListener('input', () => {
      const val = parseFloat(crossfadeSlider.value);
      crossfadeVal.textContent = formatCrossfade(val);
      emitLiveEvent('set-crossfade-seconds', val);
    });
  }

  // Playback speed slider listener
  const speedSlider = document.getElementById('playback_speed') as HTMLInputElement;
  const speedVal = document.getElementById('speed_val');
  if (speedSlider && speedVal) {
    speedSlider.addEventListener('input', () => {
      const val = parseFloat(speedSlider.value);
      speedVal.textContent = `${val.toFixed(2)}x`;
      updateSpeedPresetButtons(val);
      emitLiveEvent('set-playback-rate', val);
    });
  }

  // Speed preset buttons
  document.querySelectorAll<HTMLButtonElement>('.speed-preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const speed = parseFloat(btn.dataset.speed || '1.0');
      if (speedSlider) speedSlider.value = String(speed);
      if (speedVal) speedVal.textContent = `${speed.toFixed(2)}x`;
      updateSpeedPresetButtons(speed);
      emitLiveEvent('set-playback-rate', speed);
    });
  });

  // Preserve pitch toggle listener
  const pitchCheck = document.getElementById('preserve_pitch') as HTMLInputElement;
  if (pitchCheck) {
    pitchCheck.addEventListener('change', () => {
      emitLiveEvent('set-preserves-pitch', pitchCheck.checked);
    });
  }

  // Ambient Lighting listeners
  const ambientCheck = document.getElementById('ambient_lighting_enabled') as HTMLInputElement;
  if (ambientCheck) {
    ambientCheck.addEventListener('change', () => {
      emitLiveEvent('set-ambient-enabled', ambientCheck.checked);
    });
  }

  const ambientSlider = document.getElementById('ambient_intensity') as HTMLInputElement;
  const ambientVal = document.getElementById('ambient_intensity_val');
  if (ambientSlider && ambientVal) {
    ambientSlider.addEventListener('input', () => {
      const val = parseFloat(ambientSlider.value);
      ambientVal.textContent = `${Math.round(val * 100)}%`;
      emitLiveEvent('set-ambient-intensity', val);
    });
  }

  // Custom CSS textarea listener (Live Reload)
  const cssEditor = document.getElementById('custom_css') as HTMLTextAreaElement;
  if (cssEditor) {
    cssEditor.addEventListener('input', () => {
      emitLiveEvent('set-custom-css', cssEditor.value);
    });
  }

  // Loudness Normalization switch listener
  const normCheck = document.getElementById('loudness_normalization') as HTMLInputElement;
  if (normCheck) {
    normCheck.addEventListener('change', () => {
      emitLiveEvent('set-loudness-normalization', normCheck.checked);
    });
  }

  // Skip silence switch listener
  const silenceCheck = document.getElementById('skip_silence_enabled') as HTMLInputElement;
  if (silenceCheck) {
    silenceCheck.addEventListener('change', () => {
      emitLiveEvent('set-skip-silence', silenceCheck.checked);
    });
  }

  // Reset EQ button
  const resetBtn = document.getElementById('eq-reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (presetSelect) presetSelect.value = 'flat';
      updateSlidersFromGains(EQ_PRESETS.flat.gains);
      emitLiveEvent('set-eq-all', { gains: EQ_PRESETS.flat.gains, preset: 'flat' });
      if (preampSlider && preampVal) {
        preampSlider.value = '0';
        preampVal.textContent = '0.0 dB';
        emitLiveEvent('set-preamp', 0);
      }
    });
  }

  // Window Controls
  const minBtn = document.getElementById('win-min-btn');
  const maxBtn = document.getElementById('win-max-btn');
  const closeBtn = document.getElementById('win-close-btn');

  if (minBtn) {
    minBtn.addEventListener('click', () => {
      window.__TAURI__?.core.invoke('minimize_window');
    });
  }

  if (maxBtn) {
    maxBtn.addEventListener('click', () => {
      window.__TAURI__?.core.invoke('toggle_maximize_window');
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      window.__TAURI__?.core.invoke('close_window');
    });
  }
});
