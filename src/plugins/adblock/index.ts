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
  ];

  for (const key of adKeys) {
    if (key in obj) {
      delete obj[key];
    }
  }

  if (obj.playerResponse && typeof obj.playerResponse === 'object') {
    sanitizePlayerResponse(obj.playerResponse);
  }

  return data;
}

export function setupNetworkHooks() {
  if (typeof window === 'undefined') return;
  if ((window as any).__ytmd_network_hooks_installed) return;
  (window as any).__ytmd_network_hooks_installed = true;

  // 1. Hook window.ytInitialPlayerResponse
  try {
    let initialPlayerResponse = (window as any).ytInitialPlayerResponse;
    if (initialPlayerResponse) {
      sanitizePlayerResponse(initialPlayerResponse);
    }
    Object.defineProperty(window, 'ytInitialPlayerResponse', {
      configurable: true,
      enumerable: true,
      get() {
        return initialPlayerResponse;
      },
      set(val) {
        initialPlayerResponse = sanitizePlayerResponse(val);
      }
    });
  } catch (_) {}

  // 2. Hook window.fetch to prune ads from InnerTube responses before the player sees them
  const originalFetch = window.fetch;
  if (typeof originalFetch === 'function') {
    (window as any).fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
      const response = await originalFetch.call(this, input, init);

      if (url && (url.includes('/youtubei/v1/player') || url.includes('/youtubei/v1/next') || url.includes('/youtubei/v1/browse'))) {
        try {
          const clone = response.clone();
          const json = await clone.json();
          sanitizePlayerResponse(json);
          const sanitizedBody = JSON.stringify(json);
          return new Response(sanitizedBody, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        } catch (_) {
          return response;
        }
      }

      return response;
    };
  }

  // 3. Hook XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (
    this: XMLHttpRequest & { _ytmd_url?: string },
    _method: string,
    url: string | URL
  ) {
    this._ytmd_url = typeof url === 'string' ? url : url.href;
    return originalOpen.apply(this, arguments as any);
  };

  XMLHttpRequest.prototype.send = function (
    this: XMLHttpRequest & { _ytmd_url?: string },
    _body?: Document | XMLHttpRequestBodyInit | null
  ) {
    const url = this._ytmd_url;
    if (url && (url.includes('/youtubei/v1/player') || url.includes('/youtubei/v1/next'))) {
      this.addEventListener('readystatechange', () => {
        if (this.readyState === 4 && this.status === 200) {
          try {
            const rawText = this.responseText;
            if (rawText) {
              const json = JSON.parse(rawText);
              sanitizePlayerResponse(json);
              const sanitized = JSON.stringify(json);
              Object.defineProperty(this, 'responseText', { value: sanitized, configurable: true });
              Object.defineProperty(this, 'response', { value: sanitized, configurable: true });
            }
          } catch (_) {}
        }
      });
    }
    return originalSend.apply(this, arguments as any);
  };
}

export const AdblockPlugin: YTMDPlugin = {
  id: 'adblock',
  name: 'Ad Blocker & Anti-Nag',
  description: 'Blocks audio/video ads, auto-skips pre-rolls, and dismisses premium upsell banners',
  defaultEnabled: true,

  onInit(ctx: PluginContext) {
    setupNetworkHooks();
    if (typeof document === 'undefined') return;

    let adCheckInterval: number | null = null;
    let adHandled = false;
    let savedPlaybackRate = 1;
    let savedMuted = false;

    const blockAds = () => {
      const video = ctx.getVideoElement();
      const moviePlayer = document.getElementById('movie_player') as any;

      if (moviePlayer) {
        if (typeof moviePlayer.getAdState === 'function' && moviePlayer.getAdState() === 1) {
          try {
            moviePlayer.skipAd?.();
          } catch (_) {}
        }
        if (typeof moviePlayer.isAdPlaying === 'function' && moviePlayer.isAdPlaying()) {
          try {
            moviePlayer.skipAd?.();
          } catch (_) {}
        }
      }

      const isAdShowing = Boolean(
        document.querySelector('.ad-showing, .ad-interrupting, .ytp-ad-player-overlay, .ytp-ad-module') !== null ||
        moviePlayer?.classList?.contains('ad-showing') ||
        moviePlayer?.classList?.contains('ad-interrupting')
      );

      if (isAdShowing && video) {
        if (!adHandled) {
          savedPlaybackRate = video.playbackRate;
          savedMuted = video.muted;
        }
        video.muted = true;
        video.playbackRate = 16.0;
        if (video.duration && isFinite(video.duration)) {
          video.currentTime = video.duration;
        } else {
          video.currentTime = 99999;
        }
        adHandled = true;
      } else if (!isAdShowing && adHandled) {
        if (video) {
          video.muted = savedMuted;
          video.playbackRate = savedPlaybackRate;
        }
        adHandled = false;
      }

      // 2. Click skip buttons
      const skipButtons = document.querySelectorAll<HTMLElement>(
        '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button.ytp-ad-skip-button, .ytp-ad-skip-button-container button, .ytp-ad-skip-button-slot button, .ytp-ad-overlay-close-button'
      );
      skipButtons.forEach((btn) => btn.click());

      // 3. Remove popup modals & banners
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
