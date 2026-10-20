import { PlayerObserver } from './observer';
import { PlayerBridge } from './bridge';
import { startResume } from './resume';
import { HostContext, PluginRegistry } from '../plugins/registry';
import {
  ExternalPlugin,
  announceSwitchedOff,
  definedExternalPlugins,
  externalPlugin,
  externalPlugins,
  installPluginHost
} from './pluginHost';
import { LyricsPlugin } from '../plugins/lyrics';
import { VolumePlugin } from '../plugins/volume';
import { NotificationsPlugin } from '../plugins/notifications';
import { VisualizerPlugin } from '../plugins/visualizer';
import { AudioDspPlugin } from '../plugins/audio-dsp';
import { AmbientLightingPlugin } from '../plugins/ambient';
import { ThemeEnginePlugin } from '../plugins/themes';
import { PipPlugin } from '../plugins/pip';
import { LocalFilesPlugin } from '../plugins/local-files';
import { SyncRoomPlugin, routeRoomPlayerCommand } from '../plugins/sync-room';
import { PowerPlugin } from '../plugins/power';
import { RemotePlugin } from '../plugins/remote';
import { MediaProgress, MediaToolsProgress, TrackInfo } from '../plugins/types';
import { configureNavMenu, mountNavMenu } from './ui/navMenu';
import { mountWindowControls } from './ui/windowControls';
import { installPlayerBarEdges, syncPlayerBarEdges } from './ui/playerBarEdges';
import { ICONS, showToast } from './ui/kit';
import { t } from './ui/i18n';
import { maybeStartTips, startTips } from './ui/tips';
import { invokeBackend, pageEvents } from './bridgeClient';


/** Fire-and-forget for menu actions: failures are logged and surfaced as a
 * toast rather than left as an unhandled rejection. */
const runAction = (cmd: string) => {
  invokeBackend(cmd).catch((e) => {
    console.error(`[Oxitune] ${cmd} failed:`, e);
    showToast(t().actionFailed);
  });
};

function setupNavMenu() {
  configureNavMenu({
    onSyncChipClick: () => runAction('toggle_sync_window'),
    items: [
      { id: 'settings', iconPath: ICONS.tune, label: t().menuSettings, hint: 'Ctrl+,', onSelect: () => runAction('toggle_settings_window') },
      { id: 'local', iconPath: ICONS.folderMusic, label: t().menuLocal, onSelect: () => runAction('toggle_local_library_window') },
      { id: 'sync', iconPath: ICONS.group, label: t().menuSync, onSelect: () => runAction('toggle_sync_window') },
      { id: 'remote', iconPath: ICONS.phone, label: t().menuRemote, onSelect: () => runAction('open_remote_pairing') },
      { id: 'mini', iconPath: ICONS.miniPlayer, label: t().menuMiniPlayer, onSelect: () => runAction('toggle_mini_player') }
    ]
  });
}

// Maps plugin id -> [AppConfig field that toggles it, default when that
// field is missing (matches AppConfig::default() in config.rs)], for the
// handful of plugins that don't read ctx.config themselves and rely
// entirely on the registry's enable/disable to honor the user's Settings
// choice. Plugin ids missing here (ambient_lighting, audio_dsp, ...)
// self-gate off ctx.config instead, so they're left out on purpose.
const CONFIG_TOGGLED_PLUGINS: Record<string, [field: string, defaultValue: boolean]> = {
  lyrics: ['lyrics_enabled', true],
  notifications: ['notifications_enabled', false],
  web_remote: ['remote_enabled', false]
};

function configToggleMap(config: Record<string, unknown>): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const [pluginId, [field, defaultValue]] of Object.entries(CONFIG_TOGGLED_PLUGINS)) {
    const value = config[field];
    map[pluginId] = typeof value === 'boolean' ? value : defaultValue;
  }
  return map;
}

const CONFIG_QUICK_TRIES = 4;
const CONFIG_RETRY_MS = 2000;

async function initOxitune() {
  console.log('[Oxitune] Initializing desktop integration bridge...');

  const config: Record<string, unknown> = {};

  // Mount the nav-bar menu immediately, then keep it mounted: YTM
  // re-renders its nav bar on some navigations, which drops our slot.
  setupNavMenu();
  const mountNavBar = () => {
    mountNavMenu();
    mountWindowControls();
    syncPlayerBarEdges();
  };
  installPlayerBarEdges();
  mountNavBar();
  const navMenuPoll = setInterval(mountNavBar, 1000);
  // No other teardown path exists for this injected script today (its
  // lifetime is normally the page's), but `pagehide` fires on the one case
  // that does end it early without a full reload — bfcache eviction /
  // navigating away from music.youtube.com — so the poll doesn't keep
  // ticking against a torn-down document.
  window.addEventListener('pagehide', () => clearInterval(navMenuPoll));

  // Awaited (not fire-and-forget) so `context.config` below is never handed
  // out as an empty object — plugins that read ctx.config synchronously in
  // onInit (audio_dsp, ambient_lighting, ...) would otherwise always see
  // defaults, never the user's saved settings. Mutated in place with
  // Object.assign rather than reassigned, since `context.config` and this
  // `config` binding must stay the same object for the config-updated
  // listener below to keep working after a Settings save.
  // Right at launch the bridge can miss a request; one failed read used to
  // leave every plugin on defaults (5% wheel steps instead of the saved 1%)
  // until something happened to broadcast config-updated. So: a few quick
  // tries before plugins start, then keep trying in the background.
  const loadConfig = async (timeoutMs: number): Promise<Record<string, unknown> | null> => {
    try {
      const loaded = await invokeBackend('get_config', {}, { timeoutMs });
      return loaded && typeof loaded === 'object' ? (loaded as Record<string, unknown>) : null;
    } catch (e) {
      console.warn('[Oxitune] Loading config failed, retrying:', e);
      return null;
    }
  };
  let configLoaded = false;
  for (let attempt = 0; attempt < CONFIG_QUICK_TRIES && !configLoaded; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 250));
    const loaded = await loadConfig(2000);
    if (loaded) {
      Object.assign(config, loaded);
      configLoaded = true;
    }
  }

  // Everything plugins can do; each gets the slice its manifest grants
  // (plugins/registry.ts `scopedContext`).
  const host: HostContext = {
    track: null,
    config,
    invoke: invokeBackend,
    sendPlayerCommand: (command: string) => {
      handlePlayerCommand(command);
    },
    getVideoElement: () => PlayerBridge.getVideo(),
    listen: (event, handler) => pageEvents.listen(event, handler)
  };

  // Built-in plugins, then installed ones (pluginHost.ts); errors in either
  // are isolated per plugin, and installed plugins report them to the
  // backend, which switches a plugin off after repeated failures.
  const registry = new PluginRegistry(host, (plugin, error) => {
    if (plugin instanceof ExternalPlugin) plugin.report('hook', error);
  });
  registry.register(LyricsPlugin);
  registry.register(VolumePlugin);
  registry.register(NotificationsPlugin);
  registry.register(VisualizerPlugin);
  registry.register(AudioDspPlugin);
  registry.register(AmbientLightingPlugin);
  registry.register(ThemeEnginePlugin);
  registry.register(PipPlugin);
  registry.register(LocalFilesPlugin);
  registry.register(SyncRoomPlugin);
  registry.register(PowerPlugin);
  registry.register(RemotePlugin);
  const switchOff = (id: string) => {
    const plugin = externalPlugin(id);
    void registry.disable(id);
    if (plugin) announceSwitchedOff(plugin);
  };
  for (const plugin of externalPlugins({ sendPlayerCommand: (c) => handlePlayerCommand(c), onSwitchedOff: switchOff })) {
    registry.register(plugin);
  }

  try {
    await registry.initAll(configToggleMap(config));
  } catch (e) {
    console.error('[Oxitune] Registry init error:', e);
  }

  // Initialize Player Observer
  const observer = new PlayerObserver();

  let lastSyncedPosition = 0;
  let lastSyncRealTime = Date.now();

  /** Reports the track to the backend (Discord, MPRIS, companion windows).
   * `sampled_at_ms` pins when the position was read, so the song's start
   * time doesn't drift by however long the update takes to get there. */
  async function sendTrackInfo(track: TrackInfo, positionSecs: number, isPlaying: boolean): Promise<void> {
    try {
      await invokeBackend('update_track_info', {
        track: {
          title: track.title,
          artist: track.artist,
          album: track.album || null,
          cover_url: track.coverUrl || null,
          duration_secs: Math.round(track.durationSecs || 0),
          current_time_secs: Math.round(positionSecs),
          is_playing: isPlaying,
          video_id: track.videoId || null,
          playlist_id: track.playlistId || null,
          sampled_at_ms: Date.now()
        }
      });
    } catch (e) {
      console.error('[Oxitune] Failed to sync track info to backend:', e);
    }
  }

  observer.onTrackChange(async (track) => {
    lastSyncedPosition = track.currentTimeSecs || 0;
    lastSyncRealTime = Date.now();
    registry.handleTrackChange(track);
    await sendTrackInfo(track, track.currentTimeSecs || 0, track.isPlaying);
  });

  observer.onPlaybackChange(async (isPlaying) => {
    registry.handlePlaybackChange(isPlaying);
    const track = observer.getCurrentTrack();
    if (track) {
      track.isPlaying = isPlaying;
      lastSyncedPosition = track.currentTimeSecs || 0;
      lastSyncRealTime = Date.now();
      await sendTrackInfo(track, track.currentTimeSecs || 0, isPlaying);
    }
  });

  observer.onTick((positionSecs) => {
    registry.handleTick(positionSecs);

    const track = observer.getCurrentTrack();
    if (!track || !track.isPlaying) return;

    const now = Date.now();
    const elapsedSecs = (now - lastSyncRealTime) / 1000;
    const expectedPosition = lastSyncedPosition + elapsedSecs;
    const drift = Math.abs(positionSecs - expectedPosition);

    // Sync whenever a seek (>2s drift) occurs or periodically every 15s to guarantee tight Discord RPC time sync
    if (drift > 2.0 || elapsedSecs >= 15.0) {
      lastSyncedPosition = positionSecs;
      lastSyncRealTime = now;
      track.currentTimeSecs = Math.round(positionSecs);
      void sendTrackInfo(track, positionSecs, true);
    }
  });

  function handlePlayerCommand(command: string) {
    if (routeRoomPlayerCommand(command)) return;
    switch (command) {
      case 'play':
        PlayerBridge.play();
        break;
      case 'pause':
      // MPRIS Stop: YouTube Music has no stop, pausing is the closest.
      case 'stop':
        PlayerBridge.pause();
        break;
      case 'play_pause':
        PlayerBridge.playPause();
        break;
      case 'next':
        PlayerBridge.next();
        break;
      case 'previous':
        PlayerBridge.previous();
        break;
      case 'like':
        PlayerBridge.toggleLike();
        break;
      case 'dislike':
        PlayerBridge.toggleDislike();
        break;
      case 'mute':
        PlayerBridge.toggleMute();
        break;
    }
  }

  // App events, relayed by page_ipc.rs over the page's event channel.
  const listenEvent = <T>(eventName: string, handler: (payload: T) => void) => {
    void pageEvents.listen<T>(eventName, (e) => handler(e.payload));
  };

  // Plugin manager (Settings): switching off takes effect now; settings
  // reach the plugin live.
  listenEvent<{ id: string; enabled: boolean }>('plugin-state-changed', (p) => {
    if (p && !p.enabled) void registry.disable(p.id);
  });
  listenEvent<{ id: string; values: Record<string, unknown> }>('plugin-settings-changed', (p) => {
    if (p?.id && p.values) externalPlugin(p.id)?.setSettings(p.values);
  });
  listenEvent<MediaProgress>('plugin-media-progress', (p) => {
    if (p?.plugin) externalPlugin(p.plugin)?.mediaProgress(p);
  });
  listenEvent<MediaToolsProgress>('plugin-media-tools', (p) => {
    if (p?.state) definedExternalPlugins().forEach((plugin) => plugin.mediaTools(p));
  });

  listenEvent<string>('player-command', (payload) => handlePlayerCommand(payload));
  listenEvent<string>('tray-command', (payload) => handlePlayerCommand(payload));
  listenEvent<string>('mpris-command', (payload) => handlePlayerCommand(payload));
  listenEvent<string>('global-shortcut-event', (payload) => handlePlayerCommand(payload));
  listenEvent<number>('player-seek', (payload) => PlayerBridge.seekTo(payload));
  listenEvent<number>('mpris-command-seek', (payload) => PlayerBridge.seekTo(payload));
  listenEvent<number>('player-volume', (payload) => PlayerBridge.setVolume(payload));

  // Settings window emits this after a successful Save so toggles the
  // registry gates (lyrics/notifications/web_remote)
  // take effect immediately instead of only on next app restart. Plugins
  // that read ctx.config directly (audio_dsp, ambient_lighting, ...) pick up
  // the change for free since `config` is mutated in place, not reassigned.
  const applyConfig = (payload: Record<string, unknown>) => {
    Object.assign(config, payload);
    const toggles = configToggleMap(config);
    for (const [pluginId, shouldBeEnabled] of Object.entries(toggles)) {
      if (shouldBeEnabled) {
        registry.enable(pluginId).catch((e) =>
          console.error(`[Oxitune] Failed to enable plugin ${pluginId}:`, e)
        );
      } else {
        registry.disable(pluginId).catch((e) =>
          console.error(`[Oxitune] Failed to disable plugin ${pluginId}:`, e)
        );
      }
    }
  };
  listenEvent<Record<string, unknown>>('config-updated', (payload) => {
    if (payload && typeof payload === 'object') applyConfig(payload);
  });

  if (!configLoaded) {
    console.error('[Oxitune] Config not loaded yet; plugins run on defaults until it is.');
    const retry = setInterval(() => {
      void loadConfig(CONFIG_RETRY_MS).then((loaded) => {
        if (!loaded || configLoaded) return;
        configLoaded = true;
        clearInterval(retry);
        applyConfig(loaded);
        maybeStartTips(config);
      });
    }, CONFIG_RETRY_MS);
  } else {
    maybeStartTips(config);
  }
  // The welcome window was just finished (first launch or "Run setup again").
  listenEvent('onboarding-finished', () => startTips(true));

  // Keyboard shortcut: Ctrl+, or F2 opens settings
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey && e.key === ',') || e.key === 'F2') {
      e.preventDefault();
      runAction('toggle_settings_window');
    }
  });

  console.log('[Oxitune] Integration successfully activated.');
}

// Tauri's initialization_script runs in every frame of the webview, including
// third-party iframes YouTube Music itself loads (content served from
// tpc.googlesyndication.com and similar). Bootstrapping the full plugin stack
// there wastes resources, spams "event.listen not allowed" errors (those
// origins aren't in our Tauri capability allowlist — by design, since they're
// untrusted), and runs a duplicate copy of every setInterval polling loop
// (lyrics, burger menu, DSP...) per such iframe. Only the
// top-level music.youtube.com frame should ever run this.
const isTopLevelYTMFrame =
  window.self === window.top && /(^|\.)music\.youtube\.com$/.test(location.hostname);

if (isTopLevelYTMFrame) {
  // Before the installed plugins' own init scripts run (they follow this one).
  installPluginHost();
  startResume();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initOxitune());
  } else {
    initOxitune();
  }
}
