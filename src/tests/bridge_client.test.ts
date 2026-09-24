import { afterEach, describe, expect, test } from 'bun:test';

type Invoke = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;

class FakeChannel<T> {
  onmessage: (message: T) => void = () => {};
}

const g = globalThis as unknown as { window?: { __TAURI__?: unknown } };

function installTauri(invoke: Invoke) {
  g.window = { __TAURI__: { core: { invoke, Channel: FakeChannel, convertFileSrc: (p: string) => p } } };
}

afterEach(() => {
  delete g.window;
});

describe('page bridge client', () => {
  test('requests go through the single ytmd_bridge command', async () => {
    const calls: [string, unknown][] = [];
    installTauri(async (cmd, args) => {
      calls.push([cmd, args]);
      return { ok: 1 };
    });
    const { invokeBackend } = await import('../preload/bridgeClient');
    expect(await invokeBackend('get_config')).toEqual({ ok: 1 });
    expect(calls).toEqual([['ytmd_bridge', { cmd: 'get_config', args: {} }]]);
  });

  test('backend errors reject', async () => {
    installTauri(async () => {
      throw 'sync.error.notInRoom';
    });
    const { invokeBackend } = await import('../preload/bridgeClient');
    await expect(invokeBackend('vote_sync_skip')).rejects.toThrow('sync.error.notInRoom');
  });

  test('events arrive over one subscribed channel and can be unlistened', async () => {
    let channel: FakeChannel<{ event: string; payload: unknown }> | null = null;
    installTauri(async (cmd, args) => {
      if (cmd === 'ytmd_subscribe') channel = (args as { channel: FakeChannel<{ event: string; payload: unknown }> }).channel;
      return null;
    });
    const { pageEvents } = await import('../preload/bridgeClient');
    const seen: unknown[] = [];
    const unlisten = await pageEvents.listen<number>('player-seek', (e) => seen.push(e.payload));
    await Promise.resolve();
    expect(channel).not.toBeNull();
    channel!.onmessage({ event: 'player-seek', payload: 42 });
    channel!.onmessage({ event: 'other', payload: 1 });
    unlisten();
    channel!.onmessage({ event: 'player-seek', payload: 7 });
    expect(seen).toEqual([42]);
  });
});
