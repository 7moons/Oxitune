import { EQ_FREQUENCIES, EQ_PRESETS } from '../plugins/audio-dsp/presets';

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
  theme: string;
  custom_css: string;
  custom_user_agent: string;
  quality: string;
  normalize_volume: boolean;
  equalizer_enabled: boolean;
  equalizer_preset: string;
  equalizer_gains: number[];
  preamp_gain: number;
  loudness_normalization: boolean;
  lastfm_enabled: boolean;
  lastfm_api_key: string;
  lastfm_secret: string;
}

let currentConfig: AppConfig | null = null;
let currentGains: number[] = new Array(10).fill(0);

function formatFreq(freq: number): string {
  if (freq >= 1000) {
    return `${freq / 1000}k`;
  }
  return `${freq}`;
}

function formatDb(db: number): string {
  const sign = db > 0 ? '+' : '';
  return `${sign}${db.toFixed(1)}`;
}

function renderEqSliders() {
  const container = document.getElementById('eq-faders-grid');
  if (!container) return;

  container.innerHTML = '';

  EQ_FREQUENCIES.forEach((freq, idx) => {
    const col = document.createElement('div');
    col.className = 'eq-band-col';

    const valBadge = document.createElement('span');
    valBadge.className = 'eq-gain-badge';
    valBadge.id = `eq-val-${idx}`;
    valBadge.textContent = formatDb(currentGains[idx] || 0);

    const sliderWrapper = document.createElement('div');
    sliderWrapper.className = 'eq-slider-wrapper';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'eq-v-slider';
    slider.id = `eq-slider-${idx}`;
    slider.min = '-12';
    slider.max = '12';
    slider.step = '0.5';
    slider.value = String(currentGains[idx] || 0);

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      currentGains[idx] = val;
      valBadge.textContent = formatDb(val);

      // Set preset dropdown to custom
      const presetSelect = document.getElementById('eq_preset') as HTMLSelectElement;
      if (presetSelect && presetSelect.value !== 'custom') {
        presetSelect.value = 'custom';
      }

      // Emit live event to webview
      emitLiveEvent('set-eq-band', { bandIndex: idx, gain: val });
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
    if (badge) badge.textContent = formatDb(gain);
  });
}

async function emitLiveEvent(event: string, payload: unknown) {
  const tauri = (window as unknown as { __TAURI__?: { event?: { emit: (event: string, payload: unknown) => Promise<void> } } }).__TAURI__;
  if (tauri?.event) {
    try {
      await tauri.event.emit(event, payload);
    } catch {
      // Event emission across webviews
    }
  }
}

async function loadSettings() {
  if (window.__TAURI__?.core) {
    try {
      const config = (await window.__TAURI__.core.invoke('get_config')) as AppConfig;
      currentConfig = config;

      // Populate UI values
      setCheckbox('discord_rpc_enabled', config.discord_rpc_enabled);
      setCheckbox('mpris_enabled', config.mpris_enabled);
      setCheckbox('notifications_enabled', config.notifications_enabled);
      setCheckbox('close_to_tray', config.close_to_tray);
      setCheckbox('adblock_enabled', config.adblock_enabled);
      setCheckbox('sponsorblock_enabled', config.sponsorblock_enabled);
      setCheckbox('lyrics_enabled', config.lyrics_enabled);
      setCheckbox('loudness_normalization', config.loudness_normalization);

      const themeSelect = document.getElementById('theme') as HTMLSelectElement;
      if (themeSelect) themeSelect.value = config.theme || 'default-dark';

      // Preamp slider
      const preampSlider = document.getElementById('preamp_gain') as HTMLInputElement;
      const preampVal = document.getElementById('preamp_val');
      if (preampSlider) {
        preampSlider.value = String(config.preamp_gain || 0);
      }
      if (preampVal) {
        preampVal.textContent = `${formatDb(config.preamp_gain || 0)} dB`;
      }

      // Equalizer preset & gains
      const presetSelect = document.getElementById('eq_preset') as HTMLSelectElement;
      if (presetSelect) presetSelect.value = config.equalizer_preset || 'flat';

      currentGains = config.equalizer_gains && config.equalizer_gains.length === 10
        ? config.equalizer_gains
        : new Array(10).fill(0);

      renderEqSliders();
    } catch (e) {
      console.error('[YTMD] Failed to load settings:', e);
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

  const themeSelect = document.getElementById('theme') as HTMLSelectElement;
  if (themeSelect) currentConfig.theme = themeSelect.value;

  const presetSelect = document.getElementById('eq_preset') as HTMLSelectElement;
  if (presetSelect) currentConfig.equalizer_preset = presetSelect.value;

  const preampSlider = document.getElementById('preamp_gain') as HTMLInputElement;
  if (preampSlider) currentConfig.preamp_gain = parseFloat(preampSlider.value);

  currentConfig.equalizer_gains = [...currentGains];

  try {
    await window.__TAURI__.core.invoke('save_config', { config: currentConfig });
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
      const oldText = saveBtn.textContent;
      saveBtn.textContent = 'Saved!';
      setTimeout(() => {
        saveBtn.textContent = oldText;
      }, 1500);
    }
  } catch (e) {
    console.error('[YTMD] Failed to save settings:', e);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();

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
        if (preset.preamp !== undefined) {
          const preampSlider = document.getElementById('preamp_gain') as HTMLInputElement;
          const preampVal = document.getElementById('preamp_val');
          if (preampSlider) preampSlider.value = String(preset.preamp);
          if (preampVal) preampVal.textContent = `${formatDb(preset.preamp)} dB`;
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
    });
  }

  // Reset EQ button
  const resetBtn = document.getElementById('eq-reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (presetSelect) presetSelect.value = 'flat';
      updateSlidersFromGains(EQ_PRESETS.flat.gains);
      if (preampSlider && preampVal) {
        preampSlider.value = '0';
        preampVal.textContent = '0.0 dB';
      }
    });
  }
});
