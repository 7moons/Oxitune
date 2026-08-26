import { YTMDPlugin, PluginContext } from '../types';

// Module-level, not `this` — the registry calls each hook on the same
// singleton object (see CLAUDE.md plugin-system convention).
let cleanup: (() => void) | null = null;
let muteState: MuteSyncState = { adWasShowing: false, preAdMuted: false };
let clickedButtons = new WeakSet<Element>();
let playerClassObserver: MutationObserver | null = null;
let lastObservedPlayer: Element | null = null;
let lastTickSkipCheckMs = 0;

// Defaults true so response pruning (installed at module load, below) is
// active from the very first instant the page's own scripts can run — the
// plugin's config-driven enable/disable state isn't known synchronously at
// module load. onInit/onDestroy reconcile it with the real setting within
// milliseconds; the only gap is a sub-frame window at cold start where a
// user who has disabled the ad blocker gets one extra ad blocked, which is
// harmless in the direction it fails.
let responseAdBlockEnabled = true;

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

// `display: none` / `visibility: hidden` pull a <video> out of the render
// tree, and WebKit (this app's webview engine) suspends decode/paint for a
// video element in that state to save power. The ad's underlying stream
// keeps "playing" (currentTime advances, network stays open) but stops
// producing frames, so it never reaches a normal buffered state and its
// `ended` event can stall — from the user's side that reads as the player
// stuck on a loading spinner for the ad's whole length. `opacity: 0` keeps
// the video in the render tree (decode/paint continue normally, `ended`
// still fires on schedule) while making it fully invisible and inert.
export const AD_VIDEO_HIDE_STYLE = `
  .ad-showing video,
  .ad-interrupting video {
    opacity: 0 !important;
    pointer-events: none !important;
  }
`;

// Non-video ad chrome (overlays, banners, upsell dialogs) has no decode
// pipeline to stall, so it's safe to fully remove from layout/paint.
const AD_CHROME_HIDE_STYLE = `
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

const AD_SHOWING_STYLE = AD_VIDEO_HIDE_STYLE + AD_CHROME_HIDE_STYLE;

/**
 * Response pruning — the real fix for "ads still play". Muting/hiding
 * (above) only ever suppresses an ad after YTM's player has already
 * decided to schedule one. This instead strips the ad-scheduling metadata
 * out of YouTube's own Innertube API responses before the page's own JS
 * ever reads them, so the player never learns an ad exists in the first
 * place — no dead air, no "loading" flash, nothing to detect or click.
 *
 * `adPlacements`/`adSlots`/`playerAds`/`adBreakHeartbeatParams` are the
 * fields the player reads to decide when/whether to insert an ad break;
 * this is the same technique (and largely the same field names/endpoints)
 * used by long-running independent YouTube ad-blocking projects — not a
 * guess at YTM's internals. It only deletes keys already present in a
 * response already destined for the page; it never blocks, delays, or
 * rewrites a *request*, so it carries none of the anomalous-traffic
 * signature that risks a BotGuard flag (unlike the old seek/speed hacks).
 *
 * Deliberately does NOT touch /youtubei/v1/log_event or /youtubei/v1/att/*
 * — those are telemetry/attestation, not ad-scheduling data, and
 * interfering with them is exactly the kind of thing that risks tripping
 * bot detection or breaking playback outright.
 *
 * Known gap: server-side-stitched (SSAI) ads bake the ad audio directly
 * into the same continuous media segments as the content. There is no
 * separate JSON field describing those — nothing here (or in any
 * DOM/response-based approach) can prune audio bytes out of a stream.
 */
export const AD_RESPONSE_ENDPOINTS = [
  '/youtubei/v1/player',
  '/youtubei/v1/next',
  '/youtubei/v1/get_watch',
  '/youtubei/v1/browse',
  '/youtubei/v1/guide'
];

export const AD_PRUNE_KEY_PATHS = [
  'adPlacements',
  'adSlots',
  'playerAds',
  'adBreakHeartbeatParams',
  'playerResponse.adPlacements',
  'playerResponse.adSlots',
  'playerResponse.playerAds',
  'playerResponse.adBreakHeartbeatParams',
  'playerResponse.auxiliaryUi.messageRenderers.upsellDialogRenderer',
  'auxiliaryUi.messageRenderers.upsellDialogRenderer'
];

export const isAdResponseUrl = (url: string): boolean => AD_RESPONSE_ENDPOINTS.some((endpoint) => url.includes(endpoint));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const deleteNestedKey = (obj: any, dottedPath: string): boolean => {
  const parts = dottedPath.split('.');
  let cursor = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cursor === null || typeof cursor !== 'object') return false;
    cursor = cursor[parts[i]];
  }
  const lastKey = parts[parts.length - 1];
  if (cursor !== null && typeof cursor === 'object' && Object.prototype.hasOwnProperty.call(cursor, lastKey)) {
    delete cursor[lastKey];
    return true;
  }
  return false;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const pruneAdFields = (obj: any): boolean => {
  if (obj === null || typeof obj !== 'object') return false;
  let pruned = false;
  for (const path of AD_PRUNE_KEY_PATHS) {
    if (deleteNestedKey(obj, path)) pruned = true;
  }
  return pruned;
};

const resolveFetchUrl = (input: RequestInfo | URL): string => {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
};

// Wraps window.fetch exactly once per page load (module-level guard, not
// per-plugin-init, since onInit/onDestroy can run many times across a
// session but the page's own fetch must only ever be wrapped once).
let fetchPruningInstalled = false;
const installFetchPruning = () => {
  if (fetchPruningInstalled) return;
  fetchPruningInstalled = true;

  const nativeFetch = window.fetch;
  const originalFetch = nativeFetch.bind(window);
  const wrappedFetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
    const response = await originalFetch(...args);
    if (!responseAdBlockEnabled || !isAdResponseUrl(resolveFetchUrl(args[0]))) return response;

    let json: unknown;
    try {
      json = await response.clone().json();
    } catch {
      return response;
    }
    if (!pruneAdFields(json)) return response;

    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    return new Response(JSON.stringify(json), {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  };
  // `typeof fetch` in modern lib.dom.d.ts also carries static members
  // (e.g. `fetch.preconnect`) that a plain async function doesn't have;
  // copy them across so the replacement stays structurally a `typeof fetch`.
  window.fetch = Object.assign(wrappedFetch, nativeFetch);
};

// Defense in depth for any code path that manually JSON.parse()s a
// response body (some XHR-based call sites do this) instead of going
// through `Response.json()`. `pruneAdFields` only ever touches the
// handful of dotted paths above, so this is cheap enough to run
// unconditionally on every JSON.parse call the page makes.
let jsonParsePruningInstalled = false;
const installJsonParsePruning = () => {
  if (jsonParsePruningInstalled) return;
  jsonParsePruningInstalled = true;

  const originalParse = JSON.parse;
  JSON.parse = (...args: Parameters<typeof JSON.parse>) => {
    const result = originalParse(...args);
    if (responseAdBlockEnabled) pruneAdFields(result);
    return result;
  };
};

// YTM's very first page load embeds the initial player response as a
// plain global assignment (`window.ytInitialPlayerResponse = {...}`) in an
// inline <script>, before any fetch/JSON.parse happens. Redefining the
// property as an accessor — installed before that inline script runs,
// guaranteed by Tauri's initialization_script executing ahead of page
// scripts — lets us prune the very first assignment too.
let playerResponseGuardInstalled = false;
const installGlobalPlayerResponseGuard = () => {
  if (playerResponseGuardInstalled) return;
  playerResponseGuardInstalled = true;

  let value: unknown;
  Object.defineProperty(window, 'ytInitialPlayerResponse', {
    configurable: true,
    enumerable: true,
    get: () => value,
    set: (next: unknown) => {
      if (responseAdBlockEnabled) pruneAdFields(next);
      value = next;
    }
  });
};

// Installed at module-evaluation time (not inside onInit, which only runs
// after DOMContentLoaded — too late for the page's own inline scripts and
// first fetch). Module top-level code in this bundle runs the instant
// Tauri's initialization_script evaluates it, which WebKit guarantees is
// before any page script — the earliest hook available. Guarded on
// `window` so importing this module in the DOM-less bun:test environment
// (see src/tests/adblock.test.ts) stays a no-op instead of throwing.
if (typeof window !== 'undefined') {
  installFetchPruning();
  installJsonParsePruning();
  installGlobalPlayerResponseGuard();
}

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
  description:
    'Strips ad scheduling data from YTM API responses so ads are never scheduled, and mutes/hides anything that slips through, without touching playback timing',
  defaultEnabled: true,

  onInit(ctx: PluginContext) {
    responseAdBlockEnabled = true;
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
      responseAdBlockEnabled = false;
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
