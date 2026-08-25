import { PlayerObserver } from './observer';
import { PlayerBridge } from './bridge';
import { PluginRegistry } from '../plugins/registry';
import { AdblockPlugin } from '../plugins/adblock';
import { SponsorblockPlugin } from '../plugins/sponsorblock';
import { LyricsPlugin } from '../plugins/lyrics';
import { VolumePlugin } from '../plugins/volume';
import { NotificationsPlugin } from '../plugins/notifications';
import { VisualizerPlugin } from '../plugins/visualizer';
import { AudioDspPlugin } from '../plugins/audio-dsp';
import { PluginContext } from '../plugins/types';

declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
      };
      event: {
        listen: <T>(event: string, handler: (event: { payload: T }) => void) => Promise<() => void>;
      };
    };
  }
}

async function initYTMD() {
  console.log('[YTMD] Initializing YouTube Music Desktop integration bridge...');

  const invokeBackend = async (cmd: string, args?: Record<string, unknown>): Promise<unknown> => {
    if (window.__TAURI__?.core) {
      return window.__TAURI__.core.invoke(cmd, args);
    }
    return null;
  };

  // Load config from backend
  let config: Record<string, unknown> = {};
  try {
    const loadedConfig = await invokeBackend('get_config');
    if (loadedConfig && typeof loadedConfig === 'object') {
      config = loadedConfig as Record<string, unknown>;
    }
  } catch (e) {
    console.warn('[YTMD] Could not load config from backend, using defaults:', e);
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

  // Initialize plugins
  const registry = new PluginRegistry(context);
  registry.register(AdblockPlugin);
  registry.register(SponsorblockPlugin);
  registry.register(LyricsPlugin);
  registry.register(VolumePlugin);
  registry.register(NotificationsPlugin);
  registry.register(VisualizerPlugin);
  registry.register(AudioDspPlugin);

  await registry.initAll();

  // Initialize Player Observer
  const observer = new PlayerObserver();

  observer.onTrackChange(async (track) => {
    registry.handleTrackChange(track);
    try {
      await invokeBackend('update_track_info', {
        track: {
          title: track.title,
          artist: track.artist,
          album: track.album || null,
          cover_url: track.coverUrl || null,
          duration_secs: track.durationSecs,
          current_time_secs: track.currentTimeSecs,
          is_playing: track.isPlaying,
          video_id: track.videoId || null
        }
      });
    } catch (e) {
      console.error('[YTMD] Failed to sync track info to backend:', e);
    }
  });

  observer.onPlaybackChange(async (isPlaying) => {
    registry.handlePlaybackChange(isPlaying);
    const track = observer.getCurrentTrack();
    if (track) {
      try {
        await invokeBackend('update_track_info', {
          track: {
            title: track.title,
            artist: track.artist,
            album: track.album || null,
            cover_url: track.coverUrl || null,
            duration_secs: track.durationSecs,
            current_time_secs: track.currentTimeSecs,
            is_playing: isPlaying,
            video_id: track.videoId || null
          }
        });
      } catch (e) {
        console.error('[YTMD] Failed to sync playback state:', e);
      }
    }
  });

  observer.onTick((currentTime) => {
    registry.handleTick(currentTime);
  });

  function handlePlayerCommand(cmd: string) {
    switch (cmd) {
      case 'play':
        PlayerBridge.play();
        break;
      case 'pause':
        PlayerBridge.pause();
        break;
      case 'play-pause':
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

  // Listen to Tauri IPC events
  if (window.__TAURI__?.event) {
    const { listen } = window.__TAURI__.event;

    listen<string>('player-command', (e) => handlePlayerCommand(e.payload));
    listen<string>('tray-command', (e) => handlePlayerCommand(e.payload));
    listen<string>('mpris-command', (e) => handlePlayerCommand(e.payload));
    listen<string>('global-shortcut-event', (e) => handlePlayerCommand(e.payload));

    listen<number>('player-seek', (e) => {
      PlayerBridge.seekTo(e.payload);
    });

    listen<number>('mpris-command-seek', (e) => {
      PlayerBridge.seekTo(e.payload);
    });

    listen<number>('player-volume', (e) => {
      PlayerBridge.setVolume(e.payload);
    });
  }

  // Keyboard shortcut: Ctrl+, or F2 opens settings
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey && e.key === ',') || e.key === 'F2') {
      e.preventDefault();
      invokeBackend('toggle_settings_window');
    }
  });

  // Inject Settings and Mini Player buttons into YouTube Music UI
  const injectNavbarControls = () => {
    if (document.getElementById('ytmd-nav-controls')) return;

    const rightContent = document.querySelector('ytmusic-nav-bar .right-content, ytmusic-nav-bar #right-content');
    if (rightContent) {
      const btnWrapper = document.createElement('div');
      btnWrapper.id = 'ytmd-nav-controls';
      btnWrapper.style.cssText = 'display:flex;align-items:center;gap:8px;margin-right:12px;';

      const miniBtn = document.createElement('button');
      miniBtn.textContent = 'Mini Player';
      miniBtn.title = 'Toggle Mini Player Window';
      miniBtn.style.cssText = 'background:#18181b;color:#e4e4e7;border:1px solid #27272a;padding:5px 10px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;';
      miniBtn.addEventListener('click', () => invokeBackend('toggle_mini_player'));

      const settingsBtn = document.createElement('button');
      settingsBtn.textContent = '⚙ Settings';
      settingsBtn.title = 'Open YTMD Preferences (Ctrl+,)';
      settingsBtn.style.cssText = 'background:#18181b;color:#e4e4e7;border:1px solid #27272a;padding:5px 10px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;';
      settingsBtn.addEventListener('click', () => invokeBackend('toggle_settings_window'));

      btnWrapper.appendChild(miniBtn);
      btnWrapper.appendChild(settingsBtn);
      rightContent.insertBefore(btnWrapper, rightContent.firstChild);
    }
  };

  setInterval(injectNavbarControls, 1000);
  injectNavbarControls();

  console.log('[YTMD] Integration successfully activated.');
}

// Start as soon as DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initYTMD());
} else {
  initYTMD();
}
