import { describe, expect, test } from 'bun:test';
import { PluginRegistry } from '../plugins/registry';
import { YTMDPlugin, PluginContext, TrackInfo } from '../plugins/types';

describe('PluginRegistry Lifecycle', () => {
  const dummyContext: PluginContext = {
    track: null,
    config: {},
    invoke: async () => null,
    sendPlayerCommand: () => {},
    getVideoElement: () => null
  };

  test('registers and initializes plugins', async () => {
    const registry = new PluginRegistry(dummyContext);
    let initCalled = false;

    const testPlugin: YTMDPlugin = {
      id: 'test-plugin',
      name: 'Test Plugin',
      description: 'Testing plugin registry',
      defaultEnabled: true,
      onInit: () => {
        initCalled = true;
      }
    };

    registry.register(testPlugin);
    expect(registry.getRegisteredPlugins().length).toBe(1);

    await registry.initAll();
    expect(initCalled).toBe(true);
    expect(registry.isEnabled('test-plugin')).toBe(true);
  });

  test('dispatches track change to enabled plugins', async () => {
    const registry = new PluginRegistry(dummyContext);
    let receivedTitle = '';

    const testPlugin: YTMDPlugin = {
      id: 'track-listener',
      name: 'Track Listener',
      description: 'Test track changes',
      defaultEnabled: true,
      onTrackChange: (track) => {
        receivedTitle = track.title;
      }
    };

    registry.register(testPlugin);
    await registry.initAll();

    const track: TrackInfo = {
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      durationSecs: 354,
      currentTimeSecs: 0,
      isPlaying: true
    };

    registry.handleTrackChange(track);
    expect(receivedTitle).toBe('Bohemian Rhapsody');
    expect(dummyContext.track?.title).toBe('Bohemian Rhapsody');
  });

  test('disable and enable plugin invokes lifecycle hooks', async () => {
    const registry = new PluginRegistry(dummyContext);
    let destroyed = false;
    let initializedCount = 0;

    const testPlugin: YTMDPlugin = {
      id: 'lifecycle-test',
      name: 'Lifecycle Test',
      description: 'Test lifecycle',
      defaultEnabled: true,
      onInit: () => {
        initializedCount++;
      },
      onDestroy: () => {
        destroyed = true;
      }
    };

    registry.register(testPlugin);
    await registry.initAll();
    expect(initializedCount).toBe(1);

    await registry.disable('lifecycle-test');
    expect(destroyed).toBe(true);
    expect(registry.isEnabled('lifecycle-test')).toBe(false);

    await registry.enable('lifecycle-test');
    expect(initializedCount).toBe(2);
    expect(registry.isEnabled('lifecycle-test')).toBe(true);
  });
});
