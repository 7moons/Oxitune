console.log('[YTMD] Desktop launcher loaded.');

const settingsBtn = document.getElementById('open-settings-btn');
if (settingsBtn) {
  settingsBtn.addEventListener('click', async () => {
    if (window.__TAURI__?.core) {
      await window.__TAURI__.core.invoke('toggle_settings_window');
    }
  });
}
