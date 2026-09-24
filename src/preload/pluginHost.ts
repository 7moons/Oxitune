/**
 * The page side of installed plugins (docs/PLUGIN_API.md).
 *
 * Each enabled plugin arrives as its own initialization script
 * (`plugins::page_scripts` in Rust), which calls `__ytmdDefinePlugin` with
 * the checked manifest, its settings and styles, and a function wrapping the
 * plugin's code. The host builds the `ytmd` object that code gets, with only
 * the groups its manifest grants, and adapts the plugin to the same
 * `YTMDPlugin` hooks and registry as the built-in ones: errors are caught
 * per callback and reported to the backend, which switches a plugin off
 * after repeated errors.
 */
import { invokeBackend } from './bridgeClient';
import { PlayerBridge } from './bridge';
import { isSyncGuest } from './syncRole';
import { showToast } from './ui/kit';
import { t } from './ui/i18n';
import {
  MEDIA_FORMATS,
  MediaProgress,
  MediaToolStatus,
  MediaToolsProgress,
  PLUGIN_API_VERSION,
  Permission,
  PluginContext,
  PluginManifest,
  TrackInfo,
  Unlisten,
  YTMDPlugin,
  YtmdApi
} from '../plugins/types';

type Factory = (
  ytmd: YtmdApi,
  window: unknown,
  globalThis: unknown,
  self: unknown,
  document: unknown,
  tauri: undefined,
  tauriInternals: undefined
) => void;

interface Payload {
  manifest: PluginManifest;
  settings: Record<string, unknown>;
  styles: string[];
}

export interface HostHooks {
  /** Runs a player command the way the tray/media keys do. */
  sendPlayerCommand: (command: string) => void;
  /** An installed plugin failed; the backend decided to switch it off. */
  onSwitchedOff: (id: string) => void;
}

const MAX_TOAST_CHARS = 200;

export class ExternalPlugin implements YTMDPlugin {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly defaultEnabled = true;
  readonly manifest: PluginManifest;

  private settingsValues: Record<string, unknown>;
  private readonly styles: string[];
  private readonly factory: Factory;
  private hooks: HostHooks | null = null;
  private started = false;
  private track: TrackInfo | null = null;
  private playing = false;
  private readonly trackListeners = new Set<(track: TrackInfo) => void>();
  private readonly playbackListeners = new Set<(playing: boolean) => void>();
  private readonly tickListeners = new Set<(secs: number) => void>();
  private readonly settingsListeners = new Set<(values: Record<string, unknown>) => void>();
  private readonly mediaListeners = new Set<(progress: MediaProgress) => void>();
  private readonly toolsListeners = new Set<(progress: MediaToolsProgress) => void>();
  private readonly toolsWaiters = new Set<(progress: MediaToolsProgress) => void>();
  private readonly unloaders: (() => void)[] = [];
  private readonly styleNodes: HTMLStyleElement[] = [];

  constructor(payload: Payload, factory: Factory) {
    this.manifest = payload.manifest;
    this.id = payload.manifest.id;
    this.name = payload.manifest.name;
    this.description = payload.manifest.description;
    this.settingsValues = { ...payload.settings };
    this.styles = payload.styles;
    this.factory = factory;
  }

  private has(p: Permission): boolean {
    return this.manifest.permissions.includes(p);
  }

  /** Reports a failure; the backend counts it and may switch us off. */
  report(where: string, error: unknown): void {
    console.error(`[YTMD plugin ${this.id}] ${where}:`, error);
    const message = `${where}: ${error instanceof Error ? error.message : String(error)}`;
    invokeBackend('plugin_error', { id: this.id, message })
      .then((switchedOff) => {
        if (switchedOff === true) this.hooks?.onSwitchedOff(this.id);
      })
      .catch(() => undefined);
  }

  private safe<A extends unknown[]>(where: string, fn: (...args: A) => void): (...args: A) => void {
    return (...args: A) => {
      try {
        const out: unknown = fn(...args);
        if (out instanceof Promise) out.catch((e: unknown) => this.report(where, e));
      } catch (e) {
        this.report(where, e);
      }
    };
  }

  private listenOn<T>(set: Set<(v: T) => void>, where: string, fn: (v: T) => void): Unlisten {
    const wrapped = this.safe(where, fn);
    set.add(wrapped);
    return () => set.delete(wrapped);
  }

  private addStyle(css: string): Unlisten {
    const node = document.createElement('style');
    node.dataset.ytmdPlugin = this.id;
    node.textContent = String(css);
    (document.head || document.documentElement).appendChild(node);
    this.styleNodes.push(node);
    return () => node.remove();
  }

  /** The `ytmd` object: what the manifest grants, nothing else. */
  buildApi(): YtmdApi {
    const id = this.id;
    const prefix = `[${id}]`;
    const api: YtmdApi = {
      apiVersion: PLUGIN_API_VERSION,
      plugin: { id, name: this.manifest.name, version: this.manifest.version },
      log: {
        info: (...a) => console.info(prefix, ...a),
        warn: (...a) => console.warn(prefix, ...a),
        error: (...a) => console.error(prefix, ...a)
      },
      onUnload: (fn) => {
        this.unloaders.push(this.safe('onUnload', fn));
      },
      settings: {
        all: () => ({ ...this.settingsValues }),
        get: (key) => this.settingsValues[key],
        onChange: (fn) => this.listenOn(this.settingsListeners, 'settings.onChange', fn)
      }
    };
    if (this.has('player:read')) {
      const control = this.has('player:control');
      const send = (command: string) => () => this.hooks?.sendPlayerCommand(command);
      api.player = {
        getTrack: () => (this.track ? { ...this.track } : null),
        isPlaying: () => this.playing,
        onTrackChange: (fn) => this.listenOn(this.trackListeners, 'player.onTrackChange', fn),
        onPlaybackChange: (fn) => this.listenOn(this.playbackListeners, 'player.onPlaybackChange', fn),
        onTick: (fn) => this.listenOn(this.tickListeners, 'player.onTick', fn),
        canSeekAutomatically: () => !isSyncGuest(),
        ...(control
          ? {
              play: send('play'),
              pause: send('pause'),
              playPause: send('play_pause'),
              next: send('next'),
              previous: send('previous'),
              seek: (secs: number) => {
                if (Number.isFinite(secs) && secs >= 0) PlayerBridge.seekTo(secs);
              },
              setVolume: (volume: number) => {
                if (Number.isFinite(volume)) PlayerBridge.setVolume(Math.min(1, Math.max(0, volume)));
              }
            }
          : {})
      };
    }
    if (this.has('page')) {
      api.page = { document, getVideo: () => PlayerBridge.getVideo() };
    }
    if (this.has('storage')) {
      api.storage = {
        get: (key) => invokeBackend('plugin_storage_get', { id, key: String(key) }),
        set: (key, value) => invokeBackend('plugin_storage_set', { id, key: String(key), value }).then(() => undefined),
        remove: (key) => invokeBackend('plugin_storage_remove', { id, key: String(key) }).then(() => undefined),
        keys: () => invokeBackend('plugin_storage_keys', { id }).then((k) => (Array.isArray(k) ? (k as string[]) : []))
      };
    }
    if (this.has('network')) {
      const fetchText = (url: string) =>
        invokeBackend('plugin_fetch', { id, url: String(url) }, { timeoutMs: 15000 }).then((body) => String(body ?? ''));
      api.net = { fetchText, fetchJson: (url) => fetchText(url).then((text) => JSON.parse(text) as unknown) };
    }
    if (this.has('media:save')) {
      api.media = {
        formats: MEDIA_FORMATS,
        save: (videoId, options) =>
          invokeBackend('plugin_media_save', { id, videoId: String(videoId), format: String(options?.format ?? 'mp3') }).then(
            (job) => String(job)
          ),
        cancel: (job) => invokeBackend('plugin_media_cancel', { id, job: String(job) }).then(() => undefined),
        onProgress: (fn) => this.listenOn(this.mediaListeners, 'media.onProgress', fn),
        tools: () => invokeBackend('plugin_media_tools_status', { id }).then((s) => s as MediaToolStatus),
        installTools: () =>
          new Promise((resolve, reject) => {
            const waiter = (p: MediaToolsProgress) => {
              if (p.state === 'done' || p.state === 'declined' || p.state === 'failed') {
                this.toolsWaiters.delete(waiter);
                resolve(p.state);
              }
            };
            this.toolsWaiters.add(waiter);
            invokeBackend('plugin_media_install_tools', { id }).catch((e: unknown) => {
              this.toolsWaiters.delete(waiter);
              reject(e);
            });
          }),
        onToolsProgress: (fn) => this.listenOn(this.toolsListeners, 'media.onToolsProgress', fn)
      };
    }
    if (this.has('ui')) {
      api.ui = {
        toast: (text, options) => {
          const action = options?.action;
          showToast(String(text).slice(0, MAX_TOAST_CHARS), {
            id: options?.id ? `${id}:${String(options.id)}` : undefined,
            durationMs: typeof options?.durationMs === 'number' ? Math.min(Math.max(options.durationMs, 1000), 60000) : undefined,
            action: action
              ? { label: String(action.label).slice(0, 40), onClick: this.safe('ui.toast action', () => action.onClick()) }
              : undefined
          });
        },
        addStyle: (css) => this.addStyle(css)
      };
    }
    return Object.freeze(api);
  }

  /** Runs the plugin's code (once). */
  start(hooks: HostHooks): void {
    this.hooks = hooks;
    if (this.started) return;
    this.started = true;
    if (this.has('ui')) this.styles.forEach((css) => this.addStyle(css));
    const page = this.has('page');
    try {
      this.factory(
        this.buildApi(),
        page ? window : undefined,
        page ? window : undefined,
        page ? window : undefined,
        page ? document : undefined,
        undefined,
        undefined
      );
    } catch (e) {
      this.report('startup', e);
    }
  }

  /** A `plugin-media-tools` event (installs are app-wide). */
  mediaTools(progress: MediaToolsProgress): void {
    if (!this.has('media:save')) return;
    this.toolsListeners.forEach((fn) => fn({ ...progress }));
    [...this.toolsWaiters].forEach((fn) => fn(progress));
  }

  /** A `plugin-media-progress` event for this plugin. */
  mediaProgress(progress: MediaProgress): void {
    this.mediaListeners.forEach((fn) => fn({ ...progress }));
  }

  setSettings(values: Record<string, unknown>): void {
    this.settingsValues = { ...values };
    const copy = { ...values };
    this.settingsListeners.forEach((fn) => fn(copy));
  }

  // --- YTMDPlugin hooks (the registry calls these) -------------------

  onInit(ctx: PluginContext): void {
    void ctx;
    if (this.hooks) this.start(this.hooks);
  }

  onTrackChange(track: TrackInfo): void {
    this.track = { ...track };
    this.trackListeners.forEach((fn) => fn({ ...track }));
  }

  onPlaybackChange(playing: boolean): void {
    this.playing = playing;
    this.playbackListeners.forEach((fn) => fn(playing));
  }

  onTick(secs: number): void {
    this.tickListeners.forEach((fn) => fn(secs));
  }

  onDestroy(): void {
    for (const unload of this.unloaders.splice(0)) unload();
    this.styleNodes.splice(0).forEach((n) => n.remove());
    this.trackListeners.clear();
    this.playbackListeners.clear();
    this.tickListeners.clear();
    this.settingsListeners.clear();
    this.mediaListeners.clear();
    this.toolsListeners.clear();
  }
}

const external = new Map<string, ExternalPlugin>();
let hostHooks: HostHooks | null = null;

function isPayload(v: unknown): v is Payload {
  if (!v || typeof v !== 'object') return false;
  const p = v as Partial<Payload>;
  return (
    !!p.manifest &&
    typeof p.manifest.id === 'string' &&
    Array.isArray(p.manifest.permissions) &&
    !!p.settings &&
    typeof p.settings === 'object' &&
    Array.isArray(p.styles)
  );
}

/** Installs `window.__ytmdDefinePlugin` for the plugin init scripts that
 * follow this one. The first definition of an id wins; plugins that asked
 * to run at document start run right away, the rest when the host starts. */
export function installPluginHost(): void {
  if (typeof window === 'undefined' || '__ytmdDefinePlugin' in window) return;
  Object.defineProperty(window, '__ytmdDefinePlugin', {
    value: (payload: unknown, factory: unknown) => {
      if (!isPayload(payload) || typeof factory !== 'function' || external.has(payload.manifest.id)) return;
      if (payload.manifest.apiVersion !== PLUGIN_API_VERSION) return;
      const plugin = new ExternalPlugin(payload, factory as Factory);
      external.set(plugin.id, plugin);
      if (payload.manifest.runAt === 'document-start') {
        plugin.start({
          sendPlayerCommand: (c) => hostHooks?.sendPlayerCommand(c),
          onSwitchedOff: (id) => hostHooks?.onSwitchedOff(id)
        });
      }
    },
    enumerable: false,
    writable: false,
    configurable: false
  });
}

/** The installed plugins defined so far, to register with the registry. */
export function externalPlugins(hooks: HostHooks): ExternalPlugin[] {
  hostHooks = hooks;
  for (const plugin of external.values()) plugin.start(hooks);
  return [...external.values()];
}

/** Every installed plugin defined on this page. */
export function definedExternalPlugins(): ExternalPlugin[] {
  return [...external.values()];
}

export function externalPlugin(id: string): ExternalPlugin | undefined {
  return external.get(id);
}

/** Toast when the backend switched a plugin off after errors. */
export function announceSwitchedOff(plugin: ExternalPlugin): void {
  showToast(t().pluginSwitchedOff(plugin.name));
}
