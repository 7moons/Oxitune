import { YTMDPlugin, PluginContext } from '../types';

// Module-level, not `this` — the registry calls each hook on the same
// singleton object (see CLAUDE.md plugin-system convention).
let cleanup: (() => void) | null = null;
let muteState: MuteSyncState = { adWasShowing: false, preAdMuted: false };
let clickedButtons = new WeakSet<Element>();
let playerClassObserver: MutationObserver | null = null;
let lastObservedPlayer: Element | null = null;
let lastTickSkipCheckMs = 0;

/**
 * How often `onTick`'s safety-net `skipAndDismiss()` sweep is allowed to
 * run, in ms. `onTick` fires on every `PlayerObserver` tick (native
 * `timeupdate`, which can be many times a second, plus a 250ms fallback
 * poll) — without this throttle, the safety net re-runs `skipAndDismiss()`'s
 * `:has()` `querySelectorAll` calls that often on top of the already-present
 * rAF-throttled `MutationObserver` doing the same job. It exists to catch a
 * *missed* observer event, not to replace the observer, so a 1s cap still
 * bounds worst-case skip latency to something no user will notice while
 * cutting the redundant work by orders of magnitude.
 */
const TICK_SKIP_CHECK_INTERVAL_MS = 1000;

export const shouldRunTickSafetyNet = (nowMs: number, lastRunMs: number, intervalMs: number): boolean =>
  nowMs - lastRunMs >= intervalMs;

const SKIP_BUTTON_SELECTOR =
  '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button.ytp-ad-skip-button, .ytp-ad-skip-button-container button, .ytp-ad-skip-button-slot button';

const BANNER_SELECTOR =
  'ytmusic-mealbar-promo-renderer, ytmusic-upsell-dialog-renderer, ytd-popup-container ytmusic-mealbar-promo-renderer, tp-yt-paper-dialog:has(ytmusic-upsell-dialog-renderer)';

const AD_SHOWING_STYLE = `
  .ad-showing video,
  .ad-interrupting video,
  .ytp-ad-player-overlay,
  .ytp-ad-overlay-container,
  .ytp-ad-module,
  ytmusic-mealbar-promo-renderer,
  ytmusic-upsell-dialog-renderer,
  .ytmusic-popup-container:has(ytmusic-upsell-dialog-renderer),
  #premium-badge,
  .companion-ad-container {
    display: none !important;
    opacity: 0 !important;
    pointer-events: none !important;
    visibility: hidden !important;
  }
`;

/**
 * Pure decision logic below has no DOM dependency, so it's covered directly
 * by src/tests/adblock.test.ts without a DOM shim (this repo has none).
 */

export const isAdShowingFromClassList = (classList: Iterable<string>): boolean => {
  const classes = new Set(classList);
  return classes.has('ad-showing') || classes.has('ad-interrupting');
};

export interface MuteSyncState {
  adWasShowing: boolean;
  preAdMuted: boolean;
}

export interface MuteSyncResult {
  nextState: MuteSyncState;
  setMutedTo: boolean | null;
}

// Edge-triggered mute-only ad suppression. Never seeks or touches
// playbackRate: doing so forces the player to burst-fetch DASH segments at
// many multiples of realtime, a pattern no human playback produces. That
// anomaly is what invited BotGuard re-attestation / "sign in to confirm"
// blocks under the old implementation. Muting is a purely local media
// property with no network signal, so it carries none of that risk.
export const computeMuteSync = (
  showing: boolean,
  state: MuteSyncState,
  currentMuted: boolean
): MuteSyncResult => {
  if (showing && !state.adWasShowing) {
    return {
      nextState: { adWasShowing: true, preAdMuted: currentMuted },
      setMutedTo: true
    };
  }
  if (!showing && state.adWasShowing) {
    return {
      nextState: { adWasShowing: false, preAdMuted: state.preAdMuted },
      setMutedTo: state.preAdMuted
    };
  }
  return { nextState: state, setMutedTo: null };
};

const getMoviePlayer = (): Element | null => document.getElementById('movie_player');

const isAdShowing = (): boolean => {
  const moviePlayer = getMoviePlayer();
  if (!moviePlayer) return false;
  return isAdShowingFromClassList(moviePlayer.classList);
};

const syncMuteForAdState = (ctx: PluginContext) => {
  const video = ctx.getVideoElement();
  if (!video) return;

  const { nextState, setMutedTo } = computeMuteSync(isAdShowing(), muteState, video.muted);
  muteState = nextState;
  if (setMutedTo !== null) video.muted = setMutedTo;
};

// Click each skip/dismiss button exactly once — same as a real user would,
// as opposed to the old 100ms loop that re-dispatched `.click()` on the
// same element dozens of times per ad.
const clickOnce = (el: Element) => {
  if (clickedButtons.has(el)) return;
  clickedButtons.add(el);
  (el as HTMLElement).click();
};

const skipAndDismiss = () => {
  document.querySelectorAll<HTMLElement>(SKIP_BUTTON_SELECTOR).forEach(clickOnce);

  document.querySelectorAll<HTMLElement>(BANNER_SELECTOR).forEach((el) => {
    el.style.display = 'none';
    const dismissBtn = el.querySelector<HTMLElement>(
      '#dismiss-button, button[aria-label*="Dismiss"], #secondary-button'
    );
    if (dismissBtn) clickOnce(dismissBtn);
  });
};

// Fires the instant the player itself flips the ad-showing class — same
// tick as YouTube's own player, no polling lag.
const attachPlayerClassObserver = (ctx: PluginContext) => {
  const moviePlayer = getMoviePlayer();
  lastObservedPlayer = moviePlayer;
  if (!moviePlayer) return;

  playerClassObserver?.disconnect();
  playerClassObserver = new MutationObserver(() => {
    syncMuteForAdState(ctx);
    skipAndDismiss();
  });
  playerClassObserver.observe(moviePlayer, { attributes: true, attributeFilter: ['class'] });
};

export const AdblockPlugin: YTMDPlugin = {
  id: 'adblock',
  name: 'Ad Blocker & Anti-Nag',
  description: 'Mutes/hides audio & video ads and dismisses premium upsell banners without touching playback timing',
  defaultEnabled: true,

  onInit(ctx: PluginContext) {
    muteState = { adWasShowing: false, preAdMuted: false };
    clickedButtons = new WeakSet<Element>();
    lastTickSkipCheckMs = 0;

    const style = document.createElement('style');
    style.id = 'ytmd-adblock-styles';
    style.textContent = AD_SHOWING_STYLE;
    document.head.appendChild(style);

    // Catches skip-button/banner insertion, throttled to one check per
    // animation frame — same pattern PlayerObserver already uses for track
    // updates — so a burst of unrelated DOM churn doesn't fan out into work.
    let rafScheduled = false;
    const domObserver = new MutationObserver(() => {
      if (rafScheduled) return;
      rafScheduled = true;
      requestAnimationFrame(() => {
        rafScheduled = false;
        skipAndDismiss();
      });
    });
    domObserver.observe(document.body, { childList: true, subtree: true });

    attachPlayerClassObserver(ctx);
    skipAndDismiss();
    syncMuteForAdState(ctx);

    cleanup = () => {
      playerClassObserver?.disconnect();
      playerClassObserver = null;
      domObserver.disconnect();
      document.getElementById('ytmd-adblock-styles')?.remove();
      const video = ctx.getVideoElement();
      if (video && muteState.adWasShowing) video.muted = muteState.preAdMuted;
      muteState = { adWasShowing: false, preAdMuted: false };
    };
  },

  // Safety net riding the app's existing shared tick (native `timeupdate`
  // plus a 250ms fallback poll already run by PlayerObserver) instead of a
  // dedicated interval: re-attaches the class observer if YTM ever swaps
  // out #movie_player, and re-syncs mute/skip state if an observer tick was
  // ever missed. Never seeks or touches playbackRate.
  onTick(_currentTimeSecs: number, ctx: PluginContext) {
    if (getMoviePlayer() !== lastObservedPlayer) {
      attachPlayerClassObserver(ctx);
    }
    syncMuteForAdState(ctx);

    const now = Date.now();
    if (shouldRunTickSafetyNet(now, lastTickSkipCheckMs, TICK_SKIP_CHECK_INTERVAL_MS)) {
      lastTickSkipCheckMs = now;
      skipAndDismiss();
    }
  },

  onDestroy() {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  }
};
