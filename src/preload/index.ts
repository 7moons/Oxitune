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
import { THEME_PRESETS } from '../plugins/themes/presets';
import { PipPlugin } from '../plugins/pip';
import { DownloaderPlugin } from '../plugins/downloader';
import { LocalFilesPlugin } from '../plugins/local-files';
import { SyncRoomPlugin } from '../plugins/sync-room';
import { PowerPlugin } from '../plugins/power';
import { RemotePlugin, showQrModal } from '../plugins/remote';
import { PluginContext, TrackInfo } from '../plugins/types';
import { createEl, createSvg } from '../utils/dom';

let currentActiveTrack: TrackInfo | null = null;
let currentPluginContext: PluginContext | null = null;

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
  } catch {
    // Silent in browser mode
  }
  return null;
};

// Pure DOM YTMD Navbar Menu
function injectBurgerMenu(config: Record<string, unknown>) {
  if (document.getElementById('ytmd-burger-btn')) return;

  const rightContent = document.querySelector('ytmusic-nav-bar .right-content, ytmusic-nav-bar #right-content');
  const leftContent = document.querySelector('ytmusic-nav-bar .left-content, ytmusic-nav-bar #left-content');
  const navBar = document.querySelector('ytmusic-nav-bar');
  const fallbackContainer = document.body || document.documentElement;

  if (!rightContent && !leftContent && !fallbackContainer) return;

  // Burger Button
  const burgerBtn = createEl('button', {
    id: 'ytmd-burger-btn',
    title: 'YouTube Music Desktop Menu (Ctrl+,)',
    style: `
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
      background: #212121 !important;
      color: #f4f4f5 !important;
      border: 1px solid rgba(255, 255, 255, 0.15) !important;
      padding: 6px 12px !important;
      border-radius: 18px !important;
      cursor: pointer !important;
      font-family: inherit !important;
      margin: 0 8px !important;
      flex-shrink: 0 !important;
      z-index: 1000 !important;
      transition: background 0.15s ease, border-color 0.15s ease !important;
    `
  });

  const burgerIcon = createSvg('M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z', 15, 15);
  const burgerLabel = createEl('span', {
    text: 'YTMD',
    style: 'font-size: 12px; font-weight: 700; letter-spacing: 0.2px;'
  });

  burgerBtn.appendChild(burgerIcon);
  burgerBtn.appendChild(burgerLabel);

  burgerBtn.addEventListener('mouseenter', () => {
    burgerBtn.style.background = '#333333';
    burgerBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
    burgerBtn.style.color = '#ffffff';
  });
  burgerBtn.addEventListener('mouseleave', () => {
    burgerBtn.style.background = '#212121';
    burgerBtn.style.borderColor = 'rgba(255, 255, 255, 0.15)';
    burgerBtn.style.color = '#f4f4f5';
  });

  // Dropdown Popover Menu
  let popover = document.getElementById('ytmd-burger-popover');
  if (!popover) {
    popover = createEl('div', {
      id: 'ytmd-burger-popover',
      style: `
        position: fixed !important;
        top: 56px !important;
        right: 16px !important;
        width: 290px !important;
        background: #121215 !important;
        border: 1px solid #27272a !important;
        border-radius: 12px !important;
        box-shadow: 0 20px 48px rgba(0,0,0,0.9) !important;
        z-index: 2147483647 !important;
        display: none;
        flex-direction: column;
        padding: 8px !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        color: #fafafa !important;
        backdrop-filter: blur(16px) !important;
      `
    });

    const createMenuItem = (icon: string, label: string, shortcut: string, onClick: () => void) => {
      const item = createEl('button', {
        style: `
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          width: 100% !important;
          background: transparent !important;
          border: none !important;
          color: #e4e4e7 !important;
          padding: 10px 12px !important;
          border-radius: 6px !important;
          cursor: pointer !important;
          font-size: 13px !important;
          font-family: inherit !important;
          text-align: left !important;
          transition: background 0.12s ease, color 0.12s ease !important;
        `
      });

      const left = createEl('span', { style: 'display:flex; align-items:center; gap:10px;' });
      const iconSpan = createEl('span', { text: icon, style: 'font-size: 15px;' });
      const labelSpan = createEl('span', { text: label, style: 'font-weight: 500;' });
      left.appendChild(iconSpan);
      left.appendChild(labelSpan);

      const right = createEl('span', { text: shortcut, style: 'font-size: 11px; color: #71717a; font-family: monospace;' });

      item.appendChild(left);
      item.appendChild(right);

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

    const createDivider = () => {
      return createEl('div', {
        style: 'height: 1px !important; background: #27272a !important; margin: 6px 4px !important;'
      });
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
      if (currentPluginContext) {
        showQrModal(currentPluginContext);
      }
    }));

    popover.appendChild(createMenuItem('🗖', 'Mini Player', '', () => {
      invokeBackend('toggle_mini_player');
    }));

    popover.appendChild(createDivider());

    popover.appendChild(createMenuItem('⬇', 'Download Current Track', '', async () => {
      if (!currentActiveTrack || !currentActiveTrack.videoId) {
        alert('Please play a track first to download.');
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

    // Quick Theme Switcher Row
    const themeRow = createEl('div', {
      style: 'display: flex; gap: 4px; padding: 6px 8px; flex-wrap: wrap; align-items: center; justify-content: space-between;'
    });

    const themeLabel = createEl('span', {
      text: 'Theme:',
      style: 'font-size: 11px; color: #71717a; font-weight: 600; text-transform: uppercase;'
    });
    themeRow.appendChild(themeLabel);

    ['oled', 'nord', 'catppuccin', 'tokyo_night', 'gruvbox'].forEach((themeId) => {
      const tBtn = createEl('button', {
        text: themeId.toUpperCase(),
        style: `
          background: #1c1c20;
          border: 1px solid #27272a;
          color: #a1a1aa;
          padding: 3px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
        `
      });
      tBtn.addEventListener('click', () => {
        const themeStyle = document.getElementById('ytmd-active-theme');
        if (themeStyle && THEME_PRESETS[themeId]) {
          themeStyle.textContent = THEME_PRESETS[themeId].css;
        }
      });
      themeRow.appendChild(tBtn);
    });

    popover.appendChild(themeRow);

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
      const rect = burgerBtn.getBoundingClientRect();
      popover.style.top = `${rect.bottom + 8}px`;
      popover.style.right = `${Math.max(16, window.innerWidth - rect.right)}px`;
      popover.style.left = 'auto';
      popover.style.display = popover.style.display === 'flex' ? 'none' : 'flex';
    }
  });

  if (rightContent) {
    rightContent.prepend(burgerBtn);
  } else if (leftContent) {
    leftContent.appendChild(burgerBtn);
  } else if (navBar) {
    navBar.prepend(burgerBtn);
  } else {
    burgerBtn.style.position = 'fixed';
    burgerBtn.style.top = '12px';
    burgerBtn.style.right = '16px';
    fallbackContainer.appendChild(burgerBtn);
  }
}

async function initYTMD() {
  console.log('[YTMD] Initializing YouTube Music Desktop integration bridge...');

  let config: Record<string, unknown> = {};

  // Inject burger menu immediately
  injectBurgerMenu(config);
  setInterval(() => injectBurgerMenu(config), 1000);

  // Load config in background
  invokeBackend('get_config').then((loaded) => {
    if (loaded && typeof loaded === 'object') {
      config = loaded as Record<string, unknown>;
    }
  });

  const context: PluginContext = {
    track: null,
    config,
    invoke: invokeBackend,
    sendPlayerCommand: (command: string) => {
      handlePlayerCommand(command);
    },
    getVideoElement: () => PlayerBridge.getVideo()
  };

  currentPluginContext = context;

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
  registry.register(DownloaderPlugin);
  registry.register(LocalFilesPlugin);
  registry.register(SyncRoomPlugin);
  registry.register(PowerPlugin);
  registry.register(RemotePlugin);

  try {
    await registry.initAll();
  } catch (e) {
    console.error('[YTMD] Registry init error:', e);
  }

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

  console.log('[YTMD] Integration successfully activated.');
}

// Start as soon as possible
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initYTMD());
} else {
  initYTMD();
}
