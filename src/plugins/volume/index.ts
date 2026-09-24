import { YTMDPlugin, PluginContext } from '../types';
import { getPlayerVolumePercent, isPlayerMuted, setPlayerVolumePercent } from '../../preload/playerVolume';
import { ensureKitStyles } from '../../preload/ui/kit';
import { t } from '../../preload/ui/i18n';
import { createEl } from '../../utils/dom';

let cleanup: (() => void) | null = null;

function visibleRect(element: Element | null): DOMRect | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width < 80 || rect.height < 80 || rect.bottom <= 0 || rect.right <= 0 ||
    rect.top >= window.innerHeight || rect.left >= window.innerWidth) return null;

  for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
    const style = getComputedStyle(ancestor);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return null;
  }
  return rect;
}

// YTM's fullscreen player covers the whole window, and #main-panel keeps its
// old (or a hidden) box underneath it, so it can't be used for hit-testing.
function isPlayerFullscreen(): boolean {
  return document.fullscreenElement != null ||
    document.querySelector('ytmusic-player-page[player-fullscreened]') !== null;
}

export const VolumePlugin: YTMDPlugin = {
  id: 'volume',
  name: 'Wheel Volume Controller',
  description: 'Adjust volume by scrolling over the player bar or, when enabled, the main player panel',
  defaultEnabled: true,

  onInit(ctx: PluginContext) {
    cleanup?.();
    ensureKitStyles();
    document.getElementById('ytmd-volume-indicator')?.remove();
    const indicator = createEl('div', { id: 'ytmd-volume-indicator' });
    document.body.appendChild(indicator);
    let attachedVideo: HTMLVideoElement | null = null;
    let observedPage: Element | null = null;
    let pageObserver: MutationObserver | null = null;
    let lastVolume: number | null = null;
    let hideTimer: number | null = null;

    const hideIndicator = () => {
      if (hideTimer !== null) window.clearTimeout(hideTimer);
      hideTimer = null;
      indicator.classList.remove('ytmd-visible');
    };

    const showIndicator = () => {
      if (hideTimer !== null) window.clearTimeout(hideTimer);
      indicator.classList.add('ytmd-visible');
      hideTimer = window.setTimeout(() => {
        hideTimer = null;
        indicator.classList.remove('ytmd-visible');
      }, 1800);
    };

    const syncIndicator = () => {
      const video = ctx.getVideoElement();
      if (!video) {
        lastVolume = null;
        hideIndicator();
        return;
      }
      const volume = isPlayerMuted(video) ? 0 : getPlayerVolumePercent(video);
      const changed = lastVolume !== null && volume !== lastVolume;
      lastVolume = volume;
      const panel = document.querySelector('ytmusic-player-page #main-panel');
      const fullscreen = isPlayerFullscreen();
      if (!fullscreen && !visibleRect(panel)) {
        hideIndicator();
        return;
      }

      if (indicator.textContent !== `${volume}%`) {
        indicator.textContent = `${volume}%`;
        indicator.setAttribute('aria-label', t().volumeLevel(volume));
      }

      const artwork = visibleRect(document.querySelector('ytmusic-player-page #song-image'));
      const movie = visibleRect(document.querySelector('ytmusic-player-page video')) ||
        visibleRect(document.querySelector('ytmusic-player-page #movie_player'));
      const videoMode = document.querySelector('ytmusic-player-page[video-mode], ytmusic-player-page ytmusic-player[video-mode]');
      const rect = (videoMode ? movie || artwork : artwork || movie) || visibleRect(panel);
      if (!rect) {
        hideIndicator();
        return;
      }
      const left = `${Math.max(8, rect.left + 12)}px`;
      const top = `${Math.max(8, rect.top + 12)}px`;
      if (indicator.style.left !== left) indicator.style.left = left;
      if (indicator.style.top !== top) indicator.style.top = top;
      if (changed) showIndicator();
    };

    const syncVideoListener = () => {
      const video = ctx.getVideoElement();
      if (video === attachedVideo) return;
      attachedVideo?.removeEventListener('volumechange', syncIndicator);
      attachedVideo = video;
      attachedVideo?.addEventListener('volumechange', syncIndicator);
      syncIndicator();
    };

    const syncPageObserver = () => {
      const page = document.querySelector('ytmusic-player-page');
      if (page === observedPage) return;
      pageObserver?.disconnect();
      observedPage = page;
      if (page) {
        pageObserver = new MutationObserver(() => window.requestAnimationFrame(syncIndicator));
        pageObserver.observe(page, {
          attributes: true,
          subtree: true,
          attributeFilter: ['video-mode', 'player-ui-state', 'player-fullscreened', 'hidden']
        });
      }
    };

    const handleNativeVolumeInput = (event: Event) => {
      const target = event.target;
      if (target instanceof Element && target.closest('ytmusic-player-bar')) {
        window.requestAnimationFrame(syncIndicator);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY === 0 || e.ctrlKey) return;
      const target = e.target;
      const blocker = target instanceof Element
        ? target.closest('ytmusic-menu-popup-renderer, tp-yt-paper-dialog, [role="menu"], [role="dialog"], input, textarea, select')
        : null;
      // The fullscreen player itself gets role="dialog"; only real popups should block the wheel.
      if (blocker && blocker.tagName !== 'YTMUSIC-PLAYER') return;

      const containsPointer = (element: Element | null) => {
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        return e.clientX >= rect.left && e.clientX < rect.right && e.clientY >= rect.top && e.clientY < rect.bottom;
      };

      const overPlayerBar = containsPointer(document.querySelector('ytmusic-player-bar')) ||
        containsPointer(document.querySelector('#player-bar-background'));
      const overMainPanel = ctx.config.wheel_volume_on_player_page === true &&
        (isPlayerFullscreen() || containsPointer(document.querySelector('ytmusic-player-page #main-panel')));
      if (!overPlayerBar && !overMainPanel) return;

      const video = ctx.getVideoElement();
      if (!video) return;
      const configuredStep = ctx.config.wheel_volume_step;
      const step = typeof configuredStep === 'number' && Number.isFinite(configuredStep) && configuredStep > 0
        ? Math.min(configuredStep, 1)
        : 0.05;
      e.preventDefault();
      setPlayerVolumePercent(getPlayerVolumePercent(video) + (e.deltaY < 0 ? step : -step) * 100, video);
      syncIndicator();
    };

    // Capture phase, so a player handler that stops propagation can't swallow the wheel.
    window.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    window.addEventListener('resize', syncIndicator);
    document.addEventListener('scroll', syncIndicator, true);
    document.addEventListener('input', handleNativeVolumeInput, true);
    document.addEventListener('change', handleNativeVolumeInput, true);
    syncPageObserver();
    syncVideoListener();
    const interval = window.setInterval(() => {
      syncPageObserver();
      syncVideoListener();
      syncIndicator();
    }, 500);

    cleanup = () => {
      window.removeEventListener('wheel', handleWheel, { capture: true });
      window.removeEventListener('resize', syncIndicator);
      document.removeEventListener('scroll', syncIndicator, true);
      document.removeEventListener('input', handleNativeVolumeInput, true);
      document.removeEventListener('change', handleNativeVolumeInput, true);
      window.clearInterval(interval);
      pageObserver?.disconnect();
      attachedVideo?.removeEventListener('volumechange', syncIndicator);
      hideIndicator();
      indicator.remove();
    };
  },

  onDestroy() {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  }
};
