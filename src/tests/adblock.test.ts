import { describe, expect, test } from 'bun:test';
import { computeMuteSync, isAdShowingFromClassList, MuteSyncState, AdblockPlugin } from '../plugins/adblock';
import { PluginRegistry } from '../plugins/registry';
import { PluginContext } from '../plugins/types';

describe('isAdShowingFromClassList', () => {
  test('detects ad-showing class', () => {
    expect(isAdShowingFromClassList(['html5-video-player', 'ad-showing'])).toBe(true);
  });

  test('detects ad-interrupting class', () => {
    expect(isAdShowingFromClassList(['html5-video-player', 'ad-interrupting'])).toBe(true);
  });

  test('returns false when no ad classes present', () => {
    expect(isAdShowingFromClassList(['html5-video-player', 'playing-mode'])).toBe(false);
  });

  test('returns false for an empty class list', () => {
    expect(isAdShowingFromClassList([])).toBe(false);
  });
});

describe('computeMuteSync — edge-triggered mute-only ad suppression', () => {
  const initial: MuteSyncState = { adWasShowing: false, preAdMuted: false };

  test('ad starts while unmuted: mutes and remembers prior state', () => {
    const result = computeMuteSync(true, initial, false);
    expect(result.setMutedTo).toBe(true);
    expect(result.nextState).toEqual({ adWasShowing: true, preAdMuted: false });
  });

  test('ad starts while already muted: mutes (no-op) and remembers prior state', () => {
    const result = computeMuteSync(true, initial, true);
    expect(result.setMutedTo).toBe(true);
    expect(result.nextState).toEqual({ adWasShowing: true, preAdMuted: true });
  });

  test('ad continues showing: no repeated action (edge-triggered, not level-triggered)', () => {
    const midAd: MuteSyncState = { adWasShowing: true, preAdMuted: false };
    const result = computeMuteSync(true, midAd, true);
    expect(result.setMutedTo).toBeNull();
    expect(result.nextState).toBe(midAd);
  });

  test('ad ends: restores the mute state from before the ad', () => {
    const midAd: MuteSyncState = { adWasShowing: true, preAdMuted: false };
    const result = computeMuteSync(false, midAd, true);
    expect(result.setMutedTo).toBe(false);
    expect(result.nextState).toEqual({ adWasShowing: false, preAdMuted: false });
  });

  test('ad ends when the user was muted beforehand: stays muted, does not unmute', () => {
    const midAd: MuteSyncState = { adWasShowing: true, preAdMuted: true };
    const result = computeMuteSync(false, midAd, true);
    expect(result.setMutedTo).toBe(true);
    expect(result.nextState).toEqual({ adWasShowing: false, preAdMuted: true });
  });

  test('no ad, no ad: steady state does nothing', () => {
    const result = computeMuteSync(false, initial, false);
    expect(result.setMutedTo).toBeNull();
    expect(result.nextState).toBe(initial);
  });

  test('back-to-back ads: second ad correctly re-captures the restored state', () => {
    // Ad #1: user was unmuted, ad mutes, then ad ends and restores unmuted.
    let state = initial;
    let r = computeMuteSync(true, state, false);
    state = r.nextState;
    r = computeMuteSync(false, state, true);
    state = r.nextState;
    expect(state).toEqual({ adWasShowing: false, preAdMuted: false });

    // User manually mutes between ads, then ad #2 starts — must capture the
    // new pre-ad state (muted), not the stale one from ad #1.
    r = computeMuteSync(true, state, true);
    expect(r.setMutedTo).toBe(true);
    expect(r.nextState).toEqual({ adWasShowing: true, preAdMuted: true });
  });
});

describe('AdblockPlugin registry lifecycle', () => {
  const dummyContext: PluginContext = {
    track: null,
    config: {},
    invoke: async () => null,
    sendPlayerCommand: () => {},
    getVideoElement: () => null
  };

  test('initializes and registers in PluginRegistry', async () => {
    const registry = new PluginRegistry(dummyContext);
    registry.register(AdblockPlugin);

    expect(registry.getRegisteredPlugins().length).toBe(1);
    expect(registry.isEnabled('adblock')).toBe(true);

    await registry.initAll();
    expect(registry.isEnabled('adblock')).toBe(true);

    await registry.disable('adblock');
    expect(registry.isEnabled('adblock')).toBe(false);
  });
});
