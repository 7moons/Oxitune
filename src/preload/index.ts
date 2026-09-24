import { PlayerObserver } from './observer';
import { PlayerBridge } from './bridge';
import { startResume } from './resume';
import { PluginRegistry } from '../plugins/registry';
import { AdblockPlugin } from '../plugins/adblock';
import { SponsorblockPlugin } from '../plugins/sponsorblock';
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
import { PluginContext, TrackInfo } from '../plugins/types';
import { configureNavMenu, mountNavMenu } from './ui/navMenu';
import { ICONS, showToast } from './ui/kit';
import { t } from './ui/i18n';
import { invokeBackend, pageEvents } from './bridgeClient';


/** Fire-and-forget for menu actions: failures are logged and surfaced as a
 * toast rather than left as an unhandled rejection. */
const runAction = (cmd: string) => {
  invokeBackend(cmd).catch((e) => {
    console.error(`[YTMD] ${cmd} failed:`, e);
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
  adblock: ['adblock_enabled', true],
  sponsorblock: ['sponsorblock_enabled', true],
  lyrics: ['lyrics_enabled', true],
  notifications: ['notifications_enabled', false],
  web_remote: ['remote_enabled', true]
};

function configToggleMap(config: Record<string, unknown>): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const [pluginId, [field, defaultValue]] of Object.entries(CONFIG_TOGGLED_PLUGINS)) {
    const value = config[field];
    map[pluginId] = typeof value === 'boolean' ? value : defaultValue;
  }
  return map;
}

async function initYTMD() {
  console.log('[YTMD] Initializing desktop integration bridge...');

  const config: Record<string, unknown> = {};

  // Mount the nav-bar menu immediately, then keep it mounted: YTM
  // re-renders its nav bar on some navigations, which drops our slot.
  setupNavMenu();
  mountNavMenu();
  const navMenuPoll = setInterval(mountNavMenu, 1000);
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
  try {
    const loaded = await invokeBackend('get_config');
    if (loaded && typeof loaded === 'object') {
      Object.assign(config, loaded as Record<string, unknown>);
    }
  } catch (e) {
    console.error('[YTMD] Failed to load config, using defaults:', e);
  }

  const context: PluginContext = {
    track: null,
    config,
    invoke: invokeBackend,
    sendPlayerCommand: (command: string) => {
      handlePlayerCommand(command);
    },
    getVideoElement: () => PlayerBridge.getVideo()
  };


  // Initialize plugins safely
  const registry = new PluginRegistry(context);
  registry.register(AdblockPlugin);
  registry.register(SponsorblockPlugin);
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

  try {
    await registry.initAll(configToggleMap(config));
  } catch (e) {
    console.error('[YTMD] Registry init error:', e);
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
      console.error('[YTMD] Failed to sync track info to backend:', e);
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

  listenEvent<string>('player-command', (payload) => handlePlayerCommand(payload));
  listenEvent<string>('tray-command', (payload) => handlePlayerCommand(payload));
  listenEvent<string>('mpris-command', (payload) => handlePlayerCommand(payload));
  listenEvent<string>('global-shortcut-event', (payload) => handlePlayerCommand(payload));
  listenEvent<number>('player-seek', (payload) => PlayerBridge.seekTo(payload));
  listenEvent<number>('mpris-command-seek', (payload) => PlayerBridge.seekTo(payload));
  listenEvent<number>('player-volume', (payload) => PlayerBridge.setVolume(payload));

  // Settings window emits this after a successful Save so toggles the
  // registry gates (adblock/sponsorblock/lyrics/notifications/web_remote)
  // take effect immediately instead of only on next app restart. Plugins
  // that read ctx.config directly (audio_dsp, ambient_lighting, ...) pick up
  // the change for free since `config` is mutated in place, not reassigned.
  listenEvent<Record<string, unknown>>('config-updated', (payload) => {
    if (!payload || typeof payload !== 'object') return;
    Object.assign(config, payload);
    const toggles = configToggleMap(config);
    for (const [pluginId, shouldBeEnabled] of Object.entries(toggles)) {
      if (shouldBeEnabled) {
        registry.enable(pluginId).catch((e) =>
          console.error(`[YTMD] Failed to enable plugin ${pluginId}:`, e)
        );
      } else {
        registry.disable(pluginId).catch((e) =>
          console.error(`[YTMD] Failed to disable plugin ${pluginId}:`, e)
        );
      }
    }
  });

  // Keyboard shortcut: Ctrl+, or F2 opens settings
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey && e.key === ',') || e.key === 'F2') {
      e.preventDefault();
      runAction('toggle_settings_window');
    }
  });

  console.log('[YTMD] Integration successfully activated.');
}

// Tauri's initialization_script runs in every frame of the webview, including
// third-party iframes YouTube Music itself loads (ad creatives served from
// tpc.googlesyndication.com and similar). Bootstrapping the full plugin stack
// there wastes resources, spams "event.listen not allowed" errors (those
// origins aren't in our Tauri capability allowlist — by design, since they're
// untrusted), and runs a duplicate copy of every setInterval polling loop
// (adblock, lyrics, burger menu, DSP...) per ad iframe. Only the
// top-level music.youtube.com frame should ever run this.
const isTopLevelYTMFrame =
  window.self === window.top && /(^|\.)music\.youtube\.com$/.test(location.hostname);

if (isTopLevelYTMFrame) {
  startResume();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initYTMD());
  } else {
    initYTMD();
  }
}
