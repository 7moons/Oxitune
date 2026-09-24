import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { HostContext, MAX_PLUGIN_ERRORS, PluginRegistry, scopedContext } from '../plugins/registry';
import { PluginManifest, TrackInfo, YTMDPlugin, YtmdApi } from '../plugins/types';
import { ExternalPlugin } from '../preload/pluginHost';

function manifest(id: string, permissions: PluginManifest['permissions'] = []): PluginManifest {
  return {
    id: `test.${id}`,
    name: id,
    version: '1.0.0',
    apiVersion: 1,
    description: id,
    author: 'test',
    matches: ['https://music.youtube.com/*'],
    permissions,
    entry: 'index.js'
  };
}

function host(): HostContext & { commands: string[]; sent: string[] } {
  const commands: string[] = [];
  const sent: string[] = [];
  return {
    commands,
    sent,
    track: null,
    config: { secret: 1 },
    invoke: async (cmd) => {
      commands.push(cmd);
      return null;
    },
    sendPlayerCommand: (c) => sent.push(c),
    getVideoElement: () => ({}) as HTMLVideoElement,
    listen: async () => () => {}
  };
}

const track: TrackInfo = { title: 'Bohemian Rhapsody', artist: 'Queen', durationSecs: 354, currentTimeSecs: 0, isPlaying: true };

describe('PluginRegistry lifecycle', () => {
  test('registers, initializes and dispatches track changes', async () => {
    const registry = new PluginRegistry(host());
    let initCalled = false;
    let receivedTitle = '';
    const plugin: YTMDPlugin = {
      id: 'listener',
      name: 'Listener',
      description: '',
      defaultEnabled: true,
      manifest: manifest('listener', ['player:read']),
      onInit: () => {
        initCalled = true;
      },
      onTrackChange: (t, ctx) => {
        receivedTitle = `${t.title}/${ctx.track?.title}`;
      }
    };
    registry.register(plugin);
    await registry.initAll();
    expect(initCalled).toBe(true);
    registry.handleTrackChange(track);
    expect(receivedTitle).toBe('Bohemian Rhapsody/Bohemian Rhapsody');
  });

  test('disable and enable invoke the lifecycle hooks', async () => {
    const registry = new PluginRegistry(host());
    let destroyed = false;
    let inits = 0;
    registry.register({
      id: 'lifecycle',
      name: '',
      description: '',
      defaultEnabled: true,
      manifest: manifest('lifecycle'),
      onInit: () => {
        inits++;
      },
      onDestroy: () => {
        destroyed = true;
      }
    });
    await registry.initAll();
    await registry.disable('lifecycle');
    expect(destroyed).toBe(true);
    await registry.enable('lifecycle');
    expect(inits).toBe(2);
  });
});

describe('permissions scope what a plugin gets', () => {
  test('commands, config, track, player and video only as granted', async () => {
    const h = host();
    h.track = track;
    const bare = scopedContext(h, manifest('bare'));
    expect(bare.track).toBeNull();
    expect(bare.config).toEqual({});
    expect(bare.getVideoElement()).toBeNull();
    expect(() => bare.sendPlayerCommand('next')).toThrow();
    await expect(bare.invoke('set_inhibit_sleep', { inhibit: true })).rejects.toThrow('no permission');
    await expect(bare.events.listen('sync-room-updated', () => {})).rejects.toThrow('no permission');

    const power = scopedContext(h, manifest('power', ['player:read', 'player:control', 'page', 'internal:power', 'internal:config']));
    expect(power.track?.title).toBe('Bohemian Rhapsody');
    expect(power.config).toEqual({ secret: 1 });
    await power.invoke('set_inhibit_sleep', { inhibit: true });
    await expect(power.invoke('sync_queue_add', {})).rejects.toThrow('no permission');
    await expect(power.invoke('not_a_command', {})).rejects.toThrow('no permission');
    power.sendPlayerCommand('next');
    expect(h.commands).toEqual(['set_inhibit_sleep']);
    expect(h.sent).toEqual(['next']);
  });
});

describe('error isolation', () => {
  test('a throwing plugin never stops the others and is switched off after repeated errors', async () => {
    const reported: string[] = [];
    const registry = new PluginRegistry(host(), (p) => reported.push(p.id));
    let good = 0;
    registry.register({
      id: 'bad',
      name: '',
      description: '',
      defaultEnabled: true,
      manifest: manifest('bad'),
      onTick: () => {
        throw new Error('boom');
      }
    });
    registry.register({
      id: 'async-bad',
      name: '',
      description: '',
      defaultEnabled: true,
      manifest: manifest('async-bad'),
      onTick: async () => {
        throw new Error('later');
      }
    });
    registry.register({ id: 'good', name: '', description: '', defaultEnabled: true, manifest: manifest('good'), onTick: () => { good++; } });
    await registry.initAll();
    for (let i = 0; i < MAX_PLUGIN_ERRORS + 2; i++) registry.handleTick(i);
    await new Promise((r) => setTimeout(r, 0));
    expect(good).toBe(MAX_PLUGIN_ERRORS + 2);
    expect(registry.isEnabled('bad')).toBe(false);
    expect(registry.isEnabled('async-bad')).toBe(false);
    expect(registry.isEnabled('good')).toBe(true);
    expect(reported.filter((id) => id === 'bad').length).toBe(MAX_PLUGIN_ERRORS);
  });
});

describe('installed plugins get only the ytmd groups they were granted', () => {
  const external = (permissions: PluginManifest['permissions']) => {
    let api: YtmdApi | null = null;
    const plugin = new ExternalPlugin(
      { manifest: manifest('ext', permissions), settings: { accent: 'red' }, styles: [] },
      (ytmd, win, _g, _s, doc, tauri, internals) => {
        api = ytmd;
        expect(tauri).toBeUndefined();
        expect(internals).toBeUndefined();
        if (!permissions.includes('page')) {
          expect(win).toBeUndefined();
          expect(doc).toBeUndefined();
        }
      }
    );
    return { plugin, get api() { return api!; } };
  };

  test('nothing granted: settings and logging only', () => {
    const e = external([]);
    e.plugin.start({ sendPlayerCommand: () => {}, onSwitchedOff: () => {} });
    expect(e.api.settings.get('accent')).toBe('red');
    expect(e.api.player).toBeUndefined();
    expect(e.api.storage).toBeUndefined();
    expect(e.api.net).toBeUndefined();
    expect(e.api.ui).toBeUndefined();
    expect(e.api.page).toBeUndefined();
    expect(Object.isFrozen(e.api)).toBe(true);
  });

  test('media:save: formats, and progress only for this plugin', () => {
    const none = external(['ui']);
    none.plugin.start({ sendPlayerCommand: () => {}, onSwitchedOff: () => {} });
    expect(none.api.media).toBeUndefined();
    const e = external(['media:save']);
    e.plugin.start({ sendPlayerCommand: () => {}, onSwitchedOff: () => {} });
    expect(e.api.media?.formats).toEqual(['mp3', 'm4a', 'opus', 'flac']);
    const seen: string[] = [];
    const off = e.api.media!.onProgress((p) => seen.push(`${p.state}:${p.percent}`));
    const progress = { plugin: 'test.ext', job: 'j', videoId: 'dQw4w9WgXcQ', state: 'downloading' as const, percent: 40, file: null, error: null };
    e.plugin.mediaProgress(progress);
    off();
    e.plugin.mediaProgress({ ...progress, state: 'done', percent: 100 });
    expect(seen).toEqual(['downloading:40']);
  });

  test('player:read without control: no control methods; events arrive', () => {
    const e = external(['player:read']);
    e.plugin.start({ sendPlayerCommand: () => {}, onSwitchedOff: () => {} });
    const titles: string[] = [];
    e.api.player!.onTrackChange((t) => titles.push(t.title));
    expect(e.api.player!.next).toBeUndefined();
    e.plugin.onTrackChange(track);
    expect(titles).toEqual(['Bohemian Rhapsody']);
    expect(e.api.player!.getTrack()?.artist).toBe('Queen');
  });

  test('player:control sends commands through the host', () => {
    const sent: string[] = [];
    const e = external(['player:read', 'player:control']);
    e.plugin.start({ sendPlayerCommand: (c) => sent.push(c), onSwitchedOff: () => {} });
    e.api.player!.next!();
    e.api.player!.playPause!();
    expect(sent).toEqual(['next', 'play_pause']);
  });

  test('settings changes reach the plugin; unload drops its listeners', () => {
    const e = external([]);
    e.plugin.start({ sendPlayerCommand: () => {}, onSwitchedOff: () => {} });
    const seen: unknown[] = [];
    let unloaded = false;
    e.api.settings.onChange((v) => seen.push(v.accent));
    e.api.onUnload(() => {
      unloaded = true;
    });
    e.plugin.setSettings({ accent: 'teal' });
    e.plugin.onDestroy();
    e.plugin.setSettings({ accent: 'gold' });
    expect(seen).toEqual(['teal']);
    expect(unloaded).toBe(true);
  });
});

describe('the permission set', () => {
  test('Permission (types.ts) mirrors PERMISSIONS in plugins/manifest.rs', () => {
    const rust = readFileSync(join(import.meta.dir, '..', '..', 'src-tauri', 'src', 'plugins', 'manifest.rs'), 'utf8');
    const block = rust.slice(rust.indexOf('pub const PERMISSIONS'), rust.indexOf('];', rust.indexOf('pub const PERMISSIONS')));
    const fromRust = [...block.matchAll(/\("([a-z:]+)", (true|false)\)/g)].map((m) => m[1]).sort();
    const types = readFileSync(join(import.meta.dir, '..', 'plugins', 'types.ts'), 'utf8');
    const union = types.slice(types.indexOf('export type Permission ='), types.indexOf(';', types.indexOf('export type Permission =')));
    const fromTs = [...union.matchAll(/'([a-z:]+)'/g)].map((m) => m[1]).sort();
    expect(fromTs).toEqual(fromRust);
  });
});

describe('built-in plugin manifests', () => {
  const root = join(import.meta.dir, '..', 'plugins');
  const dirs = readdirSync(root).filter((d) => existsSync(join(root, d, 'index.ts')));

  test('every built-in plugin has a manifest in the app.ytmd namespace', () => {
    for (const d of dirs) {
      const m = JSON.parse(readFileSync(join(root, d, 'manifest.json'), 'utf8')) as PluginManifest;
      expect(m.id.startsWith('app.ytmd.')).toBe(true);
      expect(m.apiVersion).toBe(1);
    }
  });

  test('every backend command a built-in plugin invokes is covered by its permissions', () => {
    // Keep in sync with COMMAND_PERMISSIONS in plugins/types.ts.
    const types = readFileSync(join(root, 'types.ts'), 'utf8');
    const perm = (cmd: string) => types.match(new RegExp(`  ${cmd}: '([a-z:]+)'`))?.[1];
    for (const d of dirs) {
      const m = JSON.parse(readFileSync(join(root, d, 'manifest.json'), 'utf8')) as PluginManifest;
      const src = readdirSync(join(root, d))
        .filter((f) => f.endsWith('.ts'))
        .map((f) => readFileSync(join(root, d, f), 'utf8'))
        .join('\n');
      for (const [, cmd] of src.matchAll(/invoke\(\s*'([a-z_]+)'/g)) {
        const needed = perm(cmd);
        expect(needed, `${d} invokes ${cmd}`).toBeTruthy();
        expect(m.permissions as string[], `${d} needs ${needed} for ${cmd}`).toContain(needed!);
      }
    }
  });
});
