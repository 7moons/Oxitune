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
  lastfm_enabled: boolean;
  lastfm_api_key: string;
  lastfm_secret: string;
}

let currentConfig: AppConfig | null = null;

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

      const themeSelect = document.getElementById('theme') as HTMLSelectElement;
      if (themeSelect) themeSelect.value = config.theme || 'default-dark';
    } catch (e) {
      console.error('[YTMD] Failed to load settings:', e);
    }
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

  const themeSelect = document.getElementById('theme') as HTMLSelectElement;
  if (themeSelect) currentConfig.theme = themeSelect.value;

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
});
