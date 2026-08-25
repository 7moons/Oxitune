import { YTMDPlugin, PluginContext } from '../types';
import { THEME_PRESETS } from './presets';

export const ThemeEnginePlugin: YTMDPlugin = {
  id: 'theme_engine',
  name: 'Theme Engine & Live CSS',
  description: 'Applies curated aesthetic themes and injects user custom CSS with instant hot-reload',
  defaultEnabled: true,

  onInit(ctx: PluginContext) {
    let themeStyle = document.getElementById('ytmd-active-theme');
    if (!themeStyle) {
      themeStyle = document.createElement('style');
      themeStyle.id = 'ytmd-active-theme';
      document.head.appendChild(themeStyle);
    }

    let customStyle = document.getElementById('ytmd-custom-css');
    if (!customStyle) {
      customStyle = document.createElement('style');
      customStyle.id = 'ytmd-custom-css';
      document.head.appendChild(customStyle);
    }

    const applyTheme = (themeId: string) => {
      const preset = THEME_PRESETS[themeId] || THEME_PRESETS.default;
      if (themeStyle) {
        themeStyle.textContent = preset.css;
      }
    };

    const applyCustomCss = (cssText: string) => {
      if (customStyle) {
        customStyle.textContent = cssText;
      }
    };

    // Initial load
    const initialTheme = (ctx.config.theme_preset as string) || (ctx.config.theme as string) || 'default';
    applyTheme(initialTheme);

    const initialCustomCss = (ctx.config.custom_css as string) || '';
    applyCustomCss(initialCustomCss);

    // Listen to live theme updates from settings
    if (window.__TAURI__?.event) {
      window.__TAURI__.event.listen<string>('set-theme-preset', (e) => {
        applyTheme(e.payload);
      });

      window.__TAURI__.event.listen<string>('set-custom-css', (e) => {
        applyCustomCss(e.payload);
      });
    }

    console.log('[YTMD] Theme engine active.');
  }
};
