import { YTMDPlugin, PluginContext, TrackInfo } from './types';

export class PluginRegistry {
  private plugins: Map<string, YTMDPlugin> = new Map();
  private enabledPlugins: Set<string> = new Set();
  private context: PluginContext;

  constructor(context: PluginContext) {
    this.context = context;
  }

  public register(plugin: YTMDPlugin): void {
    this.plugins.set(plugin.id, plugin);
    if (plugin.defaultEnabled) {
      this.enabledPlugins.add(plugin.id);
    }
  }

  public async initAll(enabledConfig?: Record<string, boolean>): Promise<void> {
    for (const [id, plugin] of this.plugins) {
      const isEnabled = enabledConfig?.[id] !== undefined ? enabledConfig[id] : plugin.defaultEnabled;
      if (isEnabled) {
        this.enabledPlugins.add(id);
        if (plugin.onInit) {
          try {
            await plugin.onInit(this.context);
          } catch (e) {
            console.error(`[YTMD] Failed to init plugin ${id}:`, e);
          }
        }
      } else {
        this.enabledPlugins.delete(id);
      }
    }
  }

  public async enable(id: string): Promise<void> {
    const plugin = this.plugins.get(id);
    if (plugin && !this.enabledPlugins.has(id)) {
      this.enabledPlugins.add(id);
      if (plugin.onInit) {
        await plugin.onInit(this.context);
      }
    }
  }

  public async disable(id: string): Promise<void> {
    const plugin = this.plugins.get(id);
    if (plugin && this.enabledPlugins.has(id)) {
      this.enabledPlugins.delete(id);
      if (plugin.onDestroy) {
        await plugin.onDestroy();
      }
    }
  }

  public handleTrackChange(track: TrackInfo): void {
    this.context.track = track;
    for (const id of this.enabledPlugins) {
      const plugin = this.plugins.get(id);
      if (plugin?.onTrackChange) {
        try {
          plugin.onTrackChange(track, this.context);
        } catch (e) {
          console.error(`[YTMD] Error in plugin ${id} onTrackChange:`, e);
        }
      }
    }
  }

  public handlePlaybackChange(isPlaying: boolean): void {
    for (const id of this.enabledPlugins) {
      const plugin = this.plugins.get(id);
      if (plugin?.onPlaybackChange) {
        try {
          plugin.onPlaybackChange(isPlaying, this.context);
        } catch (e) {
          console.error(`[YTMD] Error in plugin ${id} onPlaybackChange:`, e);
        }
      }
    }
  }

  public handleTick(currentTime: number): void {
    for (const id of this.enabledPlugins) {
      const plugin = this.plugins.get(id);
      if (plugin?.onTick) {
        try {
          plugin.onTick(currentTime, this.context);
        } catch (e) {
          console.error(`[YTMD] Error in plugin ${id} onTick:`, e);
        }
      }
    }
  }

  public getRegisteredPlugins(): YTMDPlugin[] {
    return Array.from(this.plugins.values());
  }

  public isEnabled(id: string): boolean {
    return this.enabledPlugins.has(id);
  }
}
