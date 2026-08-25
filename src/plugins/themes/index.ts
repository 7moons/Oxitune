import { YTMDPlugin, PluginContext } from '../types';
import { THEME_PRESETS } from './presets';

export const ThemeEnginePlugin: YTMDPlugin = {
  id: 'theme_engine',
  name: 'Theme Engine & Live CSS',
  description: 'Applies curated aesthetic themes and injects user custom CSS with instant hot-reload',
  defaultEnabled: true,

  onInit(ctx: PluginContext) {
    const ensureHead = () => document.head || document.documentElement;

    const getOrCreateStyle = (id: string) => {
      let el = document.getElementById(id) as HTMLStyleElement;
      if (!el) {
        el = document.createElement('style');
        el.id = id;
        const target = ensureHead();
        if (target) target.appendChild(el);
      }
      return el;
    };

    const applyTheme = (themeId: string) => {
      const preset = THEME_PRESETS[themeId] || THEME_PRESETS.default;
      const themeStyle = getOrCreateStyle('ytmd-active-theme');
      if (themeStyle) {
        themeStyle.textContent = preset.css;
      }
    };

    const applyCustomCss = (cssText: string) => {
      const customStyle = getOrCreateStyle('ytmd-custom-css');
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
