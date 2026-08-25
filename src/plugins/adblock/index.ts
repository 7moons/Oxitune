import { YTMDPlugin, PluginContext } from '../types';

export function sanitizePlayerResponse<T>(data: T): T {
  if (!data || typeof data !== 'object') return data;

  const obj = data as Record<string, any>;

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      sanitizePlayerResponse(obj[i]);
    }
    return data;
  }

  const adKeys = [
    'adPlacements',
    'playerAds',
    'adSlots',
    'adBreakHeartbeatParams',
    'adBreakParams',
    'adTimeout',
    'instreamAdPlayerConfig',
    'adParams',
    'adTagUrl',
    'adBreakConfig',
    'instreamAdConfig',
  ];

  for (const key of adKeys) {
    if (key in obj) {
      delete obj[key];
    }
  }

  if (obj.playerResponse && typeof obj.playerResponse === 'object') {
    sanitizePlayerResponse(obj.playerResponse);
  }

  if (obj.playerConfig && typeof obj.playerConfig === 'object') {
    delete obj.playerConfig.adBreakConfig;
    delete obj.playerConfig.instreamAdConfig;
  }

  return data;
}

export const AdblockPlugin: YTMDPlugin = {
  id: 'adblock',
  name: 'Ad Blocker & Anti-Nag',
  description: 'Blocks audio/video ads, auto-skips pre-rolls, and dismisses premium upsell banners',
  defaultEnabled: true,

  onInit(ctx: PluginContext) {
    if (typeof document === 'undefined') return;

    let adCheckInterval: number | null = null;
    let adHandled = false;
    let savedMuted = false;

    const blockAds = () => {
      const video = ctx.getVideoElement();
      const moviePlayer = document.getElementById('movie_player') as any;

      const isAdActive = Boolean(
        moviePlayer && (
          (typeof moviePlayer.getAdState === 'function' && moviePlayer.getAdState() === 1) ||
          (typeof moviePlayer.isAdPlaying === 'function' && moviePlayer.isAdPlaying()) ||
          moviePlayer.classList?.contains('ad-showing') ||
          moviePlayer.classList?.contains('ad-interrupting')
        )
      );

      if (isAdActive) {
        try {
          if (moviePlayer && typeof moviePlayer.skipAd === 'function') {
            moviePlayer.skipAd(true);
          }
        } catch (_) {}

        const skipButtons = document.querySelectorAll<HTMLElement>(
          '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button.ytp-ad-skip-button, .ytp-ad-skip-button-container button, .ytp-ad-skip-button-slot button, .ytp-ad-overlay-close-button'
        );
        skipButtons.forEach((btn) => btn.click());

        if (video) {
          if (!adHandled) {
            savedMuted = video.muted;
          }
          video.muted = true;
          adHandled = true;
        }
      } else if (adHandled) {
        if (video) {
          video.muted = savedMuted;
        }
        adHandled = false;
      }

      // Remove popup modals & banners
      const banners = document.querySelectorAll<HTMLElement>(
        'ytmusic-mealbar-promo-renderer, ytmusic-upsell-dialog-renderer, ytd-popup-container ytmusic-mealbar-promo-renderer, tp-yt-paper-dialog:has(ytmusic-upsell-dialog-renderer)'
      );
      banners.forEach((el) => {
        el.style.display = 'none';
        const dismissBtn = el.querySelector<HTMLElement>(
          '#dismiss-button, button[aria-label*="Dismiss"], #secondary-button'
        );
        if (dismissBtn) dismissBtn.click();
      });
    };

    // Inject CSS to make ads completely invisible and silent
    const style = document.createElement('style');
    style.id = 'ytmd-adblock-styles';
    style.textContent = `
      .ad-showing video,
      .ad-interrupting video,
      .ytp-ad-player-overlay,
      .ytp-ad-overlay-container,
      .ytp-ad-module,
      ytmusic-mealbar-promo-renderer,
      ytmusic-upsell-dialog-renderer,
      .ytmusic-popup-container:has(ytmusic-upsell-dialog-renderer),
      ytmusic-guide-entry-renderer:has(path[d*="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93"]),
      #premium-badge,
      .companion-ad-container {
        display: none !important;
        opacity: 0 !important;
        pointer-events: none !important;
        visibility: hidden !important;
      }
    `;
    document.head.appendChild(style);

    // Attach native event listeners to video element
    const attachVideoEvents = () => {
      const video = ctx.getVideoElement();
      if (video) {
        video.addEventListener('timeupdate', blockAds);
        video.addEventListener('play', blockAds);
        video.addEventListener('loadedmetadata', blockAds);
      }
    };
    attachVideoEvents();

    adCheckInterval = window.setInterval(blockAds, 100);

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
