import { YTMDPlugin, PluginContext } from '../types';

export const AdblockPlugin: YTMDPlugin = {
  id: 'adblock',
  name: 'Ad Blocker & Anti-Nag',
  description: 'Blocks audio/video ads, auto-skips pre-rolls, and dismisses premium upsell banners',
  defaultEnabled: true,

  onInit(ctx: PluginContext) {
    let adCheckInterval: number | null = null;

    const blockAds = () => {
      const video = ctx.getVideoElement();
      const adShowing = document.querySelector('.ad-showing, .ad-interrupting');
      
      // 1. Skip video ad instantly
      if (adShowing && video) {
        video.muted = true;
        video.currentTime = video.duration || 99999;
      }

      // 2. Click skip buttons
      const skipButtons = document.querySelectorAll<HTMLElement>(
        '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button.ytp-ad-skip-button'
      );
      skipButtons.forEach((btn) => btn.click());

      // 3. Remove popup modals & banners
      const banners = document.querySelectorAll<HTMLElement>(
        'ytmusic-mealbar-promo-renderer, ytmusic-upsell-dialog-renderer, ytd-popup-container ytmusic-mealbar-promo-renderer, tp-yt-paper-dialog:has(ytmusic-upsell-dialog-renderer)'
      );
      banners.forEach((el) => {
        el.style.display = 'none';
        const dismissBtn = el.querySelector<HTMLElement>('#dismiss-button, button[aria-label*="Dismiss"], #secondary-button');
        if (dismissBtn) dismissBtn.click();
      });
    };

    // Inject CSS to hide ad slots permanently
    const style = document.createElement('style');
    style.id = 'ytmd-adblock-styles';
    style.textContent = `
      ytmusic-mealbar-promo-renderer,
      ytmusic-upsell-dialog-renderer,
      .ytmusic-popup-container:has(ytmusic-upsell-dialog-renderer),
      ytmusic-guide-entry-renderer:has(path[d*="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93"]),
      #premium-badge,
      .companion-ad-container {
        display: none !important;
      }
    `;
    document.head.appendChild(style);

    adCheckInterval = window.setInterval(blockAds, 500);

    (this as any)._cleanup = () => {
      if (adCheckInterval) clearInterval(adCheckInterval);
      const injected = document.getElementById('ytmd-adblock-styles');
      if (injected) injected.remove();
    };
  },

  onDestroy() {
    if ((this as any)._cleanup) {
      (this as any)._cleanup();
    }
  }
};
