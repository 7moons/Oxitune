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
  crossfade_seconds: number;
  skip_silence_enabled: boolean;
  playback_speed: number;
  preserve_pitch: boolean;
  ambient_lighting_enabled: boolean;
  ambient_intensity: number;
  theme_preset: string;
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

function formatCrossfade(secs: number): string {
  if (secs <= 0) return 'Disabled';
  return `${secs.toFixed(1)}s`;
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

      const presetSelect = document.getElementById('eq_preset') as HTMLSelectElement;
      if (presetSelect && presetSelect.value !== 'custom') {
        presetSelect.value = 'custom';
      }

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

      // Ambient intensity slider
      const intensitySlider = document.getElementById('ambient_intensity') as HTMLInputElement;
      const intensityVal = document.getElementById('ambient_intensity_val');
      if (intensitySlider) {
        const intVal = config.ambient_intensity !== undefined ? config.ambient_intensity : 0.6;
        intensitySlider.value = String(intVal);
        if (intensityVal) intensityVal.textContent = `${Math.round(intVal * 100)}%`;
      }

      // Theme Preset & Custom CSS
      const themePresetSelect = document.getElementById('theme_preset') as HTMLSelectElement;
      if (themePresetSelect) {
        themePresetSelect.value = config.theme_preset || config.theme || 'default';
      }

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
      if (speedSlider) {
        speedSlider.value = String(config.playback_speed || 1.0);
      }
      if (speedVal) {
        speedVal.textContent = `${(config.playback_speed || 1.0).toFixed(2)}x`;
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
  currentConfig.skip_silence_enabled = getCheckbox('skip_silence_enabled');
  currentConfig.preserve_pitch = getCheckbox('preserve_pitch');
  currentConfig.ambient_lighting_enabled = getCheckbox('ambient_lighting_enabled');

  const intensitySlider = document.getElementById('ambient_intensity') as HTMLInputElement;
  if (intensitySlider) currentConfig.ambient_intensity = parseFloat(intensitySlider.value);

  const themePresetSelect = document.getElementById('theme_preset') as HTMLSelectElement;
  if (themePresetSelect) currentConfig.theme_preset = themePresetSelect.value;

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
      emitLiveEvent('set-playback-rate', val);
    });
  }

  // Speed preset buttons
  document.querySelectorAll<HTMLButtonElement>('.speed-preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const speed = parseFloat(btn.dataset.speed || '1.0');
      if (speedSlider) speedSlider.value = String(speed);
      if (speedVal) speedVal.textContent = `${speed.toFixed(2)}x`;
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

  // Theme Preset select listener (Live Reload)
  const themeSelect = document.getElementById('theme_preset') as HTMLSelectElement;
  if (themeSelect) {
    themeSelect.addEventListener('change', () => {
      emitLiveEvent('set-theme-preset', themeSelect.value);
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
});
