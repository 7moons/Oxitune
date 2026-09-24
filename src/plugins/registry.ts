import {
  COMMAND_PERMISSIONS,
  EVENT_PERMISSIONS,
  PLUGIN_API_VERSION,
  Permission,
  PluginContext,
  PluginManifest,
  TrackInfo,
  YTMDPlugin
} from './types';

/** Everything the host can do; each plugin gets a slice of it. */
export interface HostContext {
  track: TrackInfo | null;
  config: Record<string, unknown>;
  invoke: PluginContext['invoke'];
  sendPlayerCommand: (command: string) => void;
  getVideoElement: () => HTMLVideoElement | null;
  listen: PluginContext['events']['listen'];
}

/** Errors (in hooks or async work they started) before a plugin is
 * switched off for the rest of the session. Installed plugins also report
 * each error to the backend, which switches them off for good. */
export const MAX_PLUGIN_ERRORS = 5;

export class PermissionError extends Error {}

/** The context `manifest`'s permissions allow, over the shared host. */
export function scopedContext(host: HostContext, manifest: PluginManifest): PluginContext {
  const has = (p: Permission) => manifest.permissions.includes(p);
  const deny = (what: string) => new PermissionError(`${manifest.id} has no permission for ${what}`);
  return {
    apiVersion: PLUGIN_API_VERSION,
    manifest,
    get track() {
      return has('player:read') ? host.track : null;
    },
    set track(_value) {
      // The host owns the track; plugins read it.
    },
    config: has('internal:config') ? host.config : {},
    invoke: (cmd, args, opts) => {
      const needed = COMMAND_PERMISSIONS[cmd];
      if (!needed || !has(needed)) return Promise.reject(deny(cmd));
      return host.invoke(cmd, args, opts);
    },
    sendPlayerCommand: (command) => {
      if (!has('player:control')) throw deny('player control');
      host.sendPlayerCommand(command);
    },
    getVideoElement: () => (has('page') ? host.getVideoElement() : null),
    events: {
      listen: (event, handler) => {
        const needed = EVENT_PERMISSIONS[event];
        if (!needed || !has(needed)) return Promise.reject(deny(`event ${event}`));
        return host.listen(event, handler);
      }
    }
  };
}

type ErrorSink = (plugin: YTMDPlugin, error: unknown) => void;

export class PluginRegistry {
  private plugins: Map<string, YTMDPlugin> = new Map();
  private enabledPlugins: Set<string> = new Set();
  private contexts: Map<string, PluginContext> = new Map();
  private errors: Map<string, number> = new Map();
  private host: HostContext;
  private onError: ErrorSink;

  constructor(host: HostContext, onError: ErrorSink = () => {}) {
    this.host = host;
    this.onError = onError;
  }

  public register(plugin: YTMDPlugin): void {
    this.plugins.set(plugin.id, plugin);
    this.contexts.set(plugin.id, scopedContext(this.host, plugin.manifest));
    if (plugin.defaultEnabled) {
      this.enabledPlugins.add(plugin.id);
    }
  }

  public contextOf(id: string): PluginContext | undefined {
    return this.contexts.get(id);
  }

  /** Runs `fn` for `plugin`, counting a throw or a rejection as an error. */
  private guard(plugin: YTMDPlugin, what: string, fn: () => void | Promise<void>): Promise<void> {
    try {
      const out = fn();
      if (out && typeof (out as Promise<void>).then === 'function') {
        return (out as Promise<void>).catch((e) => this.failed(plugin, what, e));
      }
    } catch (e) {
      this.failed(plugin, what, e);
    }
    return Promise.resolve();
  }

  private failed(plugin: YTMDPlugin, what: string, error: unknown): void {
    console.error(`[YTMD] Error in plugin ${plugin.id} ${what}:`, error);
    const count = (this.errors.get(plugin.id) ?? 0) + 1;
    this.errors.set(plugin.id, count);
    this.onError(plugin, error);
    if (count >= MAX_PLUGIN_ERRORS && this.enabledPlugins.has(plugin.id)) {
      console.warn(`[YTMD] ${plugin.id} switched off after ${count} errors`);
      void this.disable(plugin.id);
    }
  }

  /** Counts an error a plugin's own async code reported (installed plugins'
   * listeners, see pluginHost.ts). */
  public reportError(id: string, what: string, error: unknown): void {
    const plugin = this.plugins.get(id);
    if (plugin) this.failed(plugin, what, error);
  }

  public async initAll(enabledConfig?: Record<string, boolean>): Promise<void> {
    for (const [id, plugin] of this.plugins) {
      const isEnabled = enabledConfig?.[id] !== undefined ? enabledConfig[id] : plugin.defaultEnabled;
      if (isEnabled) {
        this.enabledPlugins.add(id);
        const ctx = this.contexts.get(id)!;
        if (plugin.onInit) await this.guard(plugin, 'onInit', () => plugin.onInit!(ctx));
      } else {
        this.enabledPlugins.delete(id);
      }
    }
  }

  public async enable(id: string): Promise<void> {
    const plugin = this.plugins.get(id);
    if (plugin && !this.enabledPlugins.has(id)) {
      this.enabledPlugins.add(id);
      this.errors.delete(id);
      const ctx = this.contexts.get(id)!;
      if (plugin.onInit) await this.guard(plugin, 'onInit', () => plugin.onInit!(ctx));
    }
  }

  public async disable(id: string): Promise<void> {
    const plugin = this.plugins.get(id);
    if (plugin && this.enabledPlugins.has(id)) {
      this.enabledPlugins.delete(id);
      if (plugin.onDestroy) await this.guard(plugin, 'onDestroy', () => plugin.onDestroy!());
    }
  }

  private each(what: string, run: (plugin: YTMDPlugin, ctx: PluginContext) => void | Promise<void>): void {
    for (const id of [...this.enabledPlugins]) {
      const plugin = this.plugins.get(id);
      const ctx = this.contexts.get(id);
      if (plugin && ctx) void this.guard(plugin, what, () => run(plugin, ctx));
    }
  }

  public handleTrackChange(track: TrackInfo): void {
    this.host.track = track;
    this.each('onTrackChange', (p, ctx) => p.onTrackChange?.(track, ctx));
  }

  public handlePlaybackChange(isPlaying: boolean): void {
    this.each('onPlaybackChange', (p, ctx) => p.onPlaybackChange?.(isPlaying, ctx));
  }

  public handleTick(currentTime: number): void {
    this.each('onTick', (p, ctx) => p.onTick?.(currentTime, ctx));
  }

  public getRegisteredPlugins(): YTMDPlugin[] {
    return Array.from(this.plugins.values());
  }

  public isEnabled(id: string): boolean {
    return this.enabledPlugins.has(id);
  }
}
