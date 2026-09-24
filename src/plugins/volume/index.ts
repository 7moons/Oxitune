import { YTMDPlugin, PluginContext } from '../types';
import { getPlayerVolumePercent, isPlayerMuted, setPlayerVolumePercent } from '../../preload/playerVolume';
import { isResumeMuting } from '../../preload/resume';
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

/** `rect` limited to `frame`, or `frame` when they don't overlap. */
function clipRect(rect: DOMRect, frame: DOMRect): { left: number; top: number } {
  const left = Math.max(rect.left, frame.left);
  const top = Math.max(rect.top, frame.top);
  if (left >= Math.min(rect.right, frame.right) || top >= Math.min(rect.bottom, frame.bottom)) return frame;
  return { left, top };
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

    let followFrame: number | null = null;

    const stopFollowing = () => {
      if (followFrame !== null) window.cancelAnimationFrame(followFrame);
      followFrame = null;
    };

    const hideIndicator = () => {
      if (hideTimer !== null) window.clearTimeout(hideTimer);
      hideTimer = null;
      stopFollowing();
      indicator.classList.remove('ytmd-visible');
    };

    // Pins the badge to the media's top-left corner; false when there's nothing to pin it to.
    const placeIndicator = (): boolean => {
      const panel = document.querySelector('ytmusic-player-page #main-panel');
      if (!isPlayerFullscreen() && !visibleRect(panel)) return false;
      const artwork = visibleRect(document.querySelector('ytmusic-player-page #song-image'));
      const movie = visibleRect(document.querySelector('ytmusic-player-page video')) ||
        visibleRect(document.querySelector('ytmusic-player-page #movie_player'));
      const videoMode = document.querySelector('ytmusic-player-page[video-mode], ytmusic-player-page ytmusic-player[video-mode]');
      const media = (videoMode ? movie || artwork : artwork || movie) || visibleRect(panel);
      if (!media) return false;
      // A paused, never-played video (resume on launch) keeps a stale, taller box
      // than the frame that shows it; the frame is what the user sees.
      const frame = visibleRect(document.querySelector('ytmusic-player-page #player'));
      const rect = frame ? clipRect(media, frame) : media;
      const left = `${Math.max(8, rect.left + 12)}px`;
      const top = `${Math.max(8, rect.top + 12)}px`;
      if (indicator.style.left !== left) indicator.style.left = left;
      if (indicator.style.top !== top) indicator.style.top = top;
      return true;
    };

    // The player page animates open (and relayouts after a resize), so a
    // position read once can be off by the time the badge is seen: follow
    // the media every frame while the badge is up.
    const follow = () => {
      followFrame = null;
      if (!indicator.classList.contains('ytmd-visible')) return;
      if (!placeIndicator()) {
        hideIndicator();
        return;
      }
      followFrame = window.requestAnimationFrame(follow);
    };

    const showIndicator = () => {
      if (hideTimer !== null) window.clearTimeout(hideTimer);
      indicator.classList.add('ytmd-visible');
      if (followFrame === null) followFrame = window.requestAnimationFrame(follow);
      hideTimer = window.setTimeout(hideIndicator, 1800);
    };

    const syncIndicator = () => {
      const video = ctx.getVideoElement();
      if (!video) {
        lastVolume = null;
        hideIndicator();
        return;
      }
      const volume = isPlayerMuted(video) ? 0 : getPlayerVolumePercent(video);
      // Resume on launch mutes and unmutes the player itself; that's no change to announce.
      const changed = lastVolume !== null && volume !== lastVolume && !isResumeMuting();
      lastVolume = volume;

      if (indicator.textContent !== `${volume}%`) {
        indicator.textContent = `${volume}%`;
        indicator.setAttribute('aria-label', t().volumeLevel(volume));
      }
      if (!placeIndicator()) {
        hideIndicator();
        return;
      }
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
