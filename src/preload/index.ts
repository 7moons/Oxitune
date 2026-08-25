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
import { AmbientLightingPlugin } from '../plugins/ambient';
import { ThemeEnginePlugin } from '../plugins/themes';
import { PipPlugin } from '../plugins/pip';
import { DownloaderPlugin } from '../plugins/downloader';
import { LocalFilesPlugin } from '../plugins/local-files';
import { SyncRoomPlugin } from '../plugins/sync-room';
import { PowerPlugin } from '../plugins/power';
import { RemotePlugin } from '../plugins/remote';
import { PluginContext, TrackInfo } from '../plugins/types';

async function initYTMD() {
  console.log('[YTMD] Initializing YouTube Music Desktop integration bridge...');

  const invokeBackend = async (cmd: string, args: Record<string, unknown> = {}): Promise<unknown> => {
    try {
      const internals = (window as any).__TAURI_INTERNALS__;
      if (internals && typeof internals.invoke === 'function') {
        return await internals.invoke(cmd, args);
      }
      const tauri = (window as any).__TAURI__;
      if (tauri?.core && typeof tauri.core.invoke === 'function') {
        return await tauri.core.invoke(cmd, args);
      }
      console.warn(`[YTMD] Tauri IPC bridge not ready for '${cmd}'`);
    } catch (err) {
      console.error(`[YTMD] Failed to invoke '${cmd}':`, err);
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
  registry.register(AmbientLightingPlugin);
  registry.register(ThemeEnginePlugin);
  registry.register(PipPlugin);
  registry.register(DownloaderPlugin);
  registry.register(LocalFilesPlugin);
  registry.register(SyncRoomPlugin);
  registry.register(PowerPlugin);
  registry.register(RemotePlugin);

  await registry.initAll();

  let currentActiveTrack: TrackInfo | null = null;

  // Initialize Player Observer
  const observer = new PlayerObserver();

  observer.onTrackChange(async (track) => {
    currentActiveTrack = track;
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
      track.isPlaying = isPlaying;
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
        console.error('[YTMD] Failed to sync playback status:', e);
      }
    }
  });

  observer.onTick((positionSecs) => {
    registry.handleTick(positionSecs);
  });

  function handlePlayerCommand(command: string) {
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

  // Listen to Tauri IPC events
  const listenEvent = (eventName: string, handler: (payload: any) => void) => {
    const tauri = (window as any).__TAURI__;
    if (tauri?.event?.listen) {
      tauri.event.listen(eventName, (e: any) => handler(e.payload));
    }
  };

  listenEvent('player-command', (payload) => handlePlayerCommand(payload));
  listenEvent('tray-command', (payload) => handlePlayerCommand(payload));
  listenEvent('mpris-command', (payload) => handlePlayerCommand(payload));
  listenEvent('global-shortcut-event', (payload) => handlePlayerCommand(payload));
  listenEvent('player-seek', (payload) => PlayerBridge.seekTo(payload));
  listenEvent('mpris-command-seek', (payload) => PlayerBridge.seekTo(payload));
  listenEvent('player-volume', (payload) => PlayerBridge.setVolume(payload));

  // Keyboard shortcut: Ctrl+, or F2 opens settings
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey && e.key === ',') || e.key === 'F2') {
      e.preventDefault();
      invokeBackend('toggle_settings_window');
    }
  });

  // Inject sleek Burger Menu in top navigation
  const injectBurgerMenu = () => {
    if (document.getElementById('ytmd-burger-btn')) return;

    const navBar = document.querySelector('ytmusic-nav-bar');
    const rightContent = document.querySelector('ytmusic-nav-bar .right-content, ytmusic-nav-bar #right-content');
    if (!navBar || !rightContent) return;

    // Burger Button
    const burgerBtn = document.createElement('button');
    burgerBtn.id = 'ytmd-burger-btn';
    burgerBtn.title = 'YTMD Menu';
    burgerBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
      </svg>
      <span style="font-size: 13px; font-weight: 700; letter-spacing: -0.2px;">YTMD</span>
    `;
    burgerBtn.style.cssText = `
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
      background: #18181b !important;
      color: #fafafa !important;
      border: 1px solid #27272a !important;
      padding: 6px 12px !important;
      border-radius: 8px !important;
      cursor: pointer !important;
      font-family: inherit !important;
      margin-right: 12px !important;
      flex-shrink: 0 !important;
      z-index: 1000 !important;
      transition: background 0.15s ease, border-color 0.15s ease;
    `;

    burgerBtn.addEventListener('mouseenter', () => {
      burgerBtn.style.background = '#27272a';
      burgerBtn.style.borderColor = '#3f3f46';
    });
    burgerBtn.addEventListener('mouseleave', () => {
      burgerBtn.style.background = '#18181b';
      burgerBtn.style.borderColor = '#27272a';
    });

    // Dropdown Popover Menu
    let popover = document.getElementById('ytmd-burger-popover');
    if (!popover) {
      popover = document.createElement('div');
      popover.id = 'ytmd-burger-popover';
      popover.style.cssText = `
        position: fixed;
        top: 60px;
        right: 16px;
        width: 280px;
        background: #121215;
        border: 1px solid #27272a;
        border-radius: 12px;
        box-shadow: 0 16px 36px rgba(0,0,0,0.7);
        z-index: 999999;
        display: none;
        flex-direction: column;
        padding: 8px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #fafafa;
        backdrop-filter: blur(12px);
      `;

      const createMenuItem = (icon: string, label: string, shortcut: string, onClick: () => void) => {
        const item = document.createElement('button');
        item.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          background: transparent;
          border: none;
          color: #e4e4e7;
          padding: 9px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-family: inherit;
          text-align: left;
          transition: background 0.12s ease, color 0.12s ease;
        `;
        item.innerHTML = `
          <span style="display:flex; align-items:center; gap:10px;">
            <span style="font-size: 15px;">${icon}</span>
            <span style="font-weight: 500;">${label}</span>
          </span>
          <span style="font-size: 11px; color: #71717a; font-family: monospace;">${shortcut}</span>
        `;
        item.addEventListener('mouseenter', () => {
          item.style.background = '#27272a';
          item.style.color = '#ffffff';
        });
        item.addEventListener('mouseleave', () => {
          item.style.background = 'transparent';
          item.style.color = '#e4e4e7';
        });
        item.addEventListener('click', () => {
          if (popover) popover.style.display = 'none';
          onClick();
        });
        return item;
      };

      const divider = () => {
        const div = document.createElement('div');
        div.style.cssText = 'height: 1px; background: #27272a; margin: 6px 4px;';
        return div;
      };

      popover.appendChild(createMenuItem('⚙', 'Preferences & DSP EQ', 'Ctrl+,', () => {
        invokeBackend('toggle_settings_window');
      }));

      popover.appendChild(createMenuItem('🎵', 'Local Music Library', '', () => {
        invokeBackend('toggle_local_library_window');
      }));

      popover.appendChild(createMenuItem('👥', 'Listen Together (Sync)', '', () => {
        invokeBackend('toggle_sync_window');
      }));

      popover.appendChild(createMenuItem('📱', 'Mobile Web Remote', '', () => {
        const remoteBtn = document.getElementById('ytmd-remote-nav-btn');
        if (remoteBtn) remoteBtn.click();
        else invokeBackend('toggle_settings_window');
      }));

      popover.appendChild(createMenuItem('🗖', 'Mini Player', '', () => {
        invokeBackend('toggle_mini_player');
      }));

      popover.appendChild(divider());

      popover.appendChild(createMenuItem('⬇', 'Download Current Track', '', async () => {
        if (!currentActiveTrack || !currentActiveTrack.videoId) {
          alert('Please start playing a track to download.');
          return;
        }
        try {
          await invokeBackend('download_track', {
            request: {
              video_id: currentActiveTrack.videoId,
              title: currentActiveTrack.title,
              artist: currentActiveTrack.artist,
              album: currentActiveTrack.album || undefined,
              cover_url: currentActiveTrack.coverUrl || undefined,
              format: config.download_format || 'mp3',
              embed_lyrics: config.embed_lyrics !== false
            }
          });
          alert(`Download started for: ${currentActiveTrack.title}`);
        } catch (e) {
          console.error('[YTMD Download Error]:', e);
        }
      }));

      document.body.appendChild(popover);

      // Close on outside click
      document.addEventListener('click', (e) => {
        if (popover && popover.style.display === 'flex') {
          if (!popover.contains(e.target as Node) && !burgerBtn.contains(e.target as Node)) {
            popover.style.display = 'none';
          }
        }
      });
    }

    burgerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (popover) {
        popover.style.display = popover.style.display === 'flex' ? 'none' : 'flex';
      }
    });

    rightContent.insertBefore(burgerBtn, rightContent.firstChild);
  };

  setInterval(injectBurgerMenu, 1000);
  injectBurgerMenu();

  console.log('[YTMD] Integration activated with Burger Menu.');
}

// Start as soon as DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initYTMD());
} else {
  initYTMD();
}
