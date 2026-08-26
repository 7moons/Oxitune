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
import { RemotePlugin, showQrModal } from '../plugins/remote';
import { PluginContext, TrackInfo } from '../plugins/types';
import { createEl, createSvg, createSvgIcon } from '../utils/dom';

let currentActiveTrack: TrackInfo | null = null;
let currentPluginContext: PluginContext | null = null;

const invokeBackend = (cmd: string, args: Record<string, unknown> = {}): Promise<unknown> => {
  return new Promise((resolve) => {
    const tauri = window.__TAURI__;
    if (!tauri?.event?.emit) {
      resolve(null);
      return;
    }

    const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    let unlisten: (() => void) | null = null;

    const timer = setTimeout(() => {
      if (unlisten) unlisten();
      resolve(null);
    }, 4000);

    tauri.event
      .listen(`ytmd-response-${id}`, (event) => {
        clearTimeout(timer);
        if (unlisten) unlisten();
        resolve(event.payload);
      })
      .then((unlistenFn) => {
        unlisten = unlistenFn;
        tauri.event.emit('ytmd-invoke', { id, cmd, args });
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(null);
      });
  });
};

/** Injects the one `<style>` block the burger button/popover rely on for
 * hover states, the open/close transition, and reduced-motion handling —
 * everything else about their look lives in this stylesheet, not inline, so
 * `var(--ytmd-accent, ...)` (set per-track by the ambient plugin) only has
 * to be written once. Uses `!important` throughout because it's competing
 * with YouTube Music's own heavily-specific native styles. */
function ensureBurgerStyles() {
  if (document.getElementById('ytmd-burger-styles')) return;

  const style = document.createElement('style');
  style.id = 'ytmd-burger-styles';
  style.textContent = `
    #ytmd-burger-btn {
      display: inline-flex !important;
      align-items: center !important;
      gap: 7px !important;
      background: color-mix(in srgb, black 55%, transparent) !important;
      backdrop-filter: blur(16px) saturate(160%) !important;
      -webkit-backdrop-filter: blur(16px) saturate(160%) !important;
      color: #f3f1ee !important;
      border: 1px solid rgba(255, 255, 255, 0.14) !important;
      padding: 6px 14px 6px 10px !important;
      border-radius: 20px !important;
      cursor: pointer !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      margin: 0 8px !important;
      flex-shrink: 0 !important;
      z-index: 1000 !important;
      transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.2s ease !important;
    }
    #ytmd-burger-btn:hover {
      border-color: rgba(255, 255, 255, 0.3) !important;
      box-shadow: 0 8px 20px -8px color-mix(in srgb, var(--ytmd-accent, #e8b06b) 55%, transparent) !important;
    }
    #ytmd-burger-btn svg {
      color: var(--ytmd-accent, #e8b06b) !important;
      transition: color 0.6s ease !important;
      flex-shrink: 0 !important;
    }
    #ytmd-burger-btn span {
      font-size: 12px !important;
      font-weight: 700 !important;
      letter-spacing: 0.3px !important;
    }
    #ytmd-burger-popover {
      position: fixed !important;
      width: 292px !important;
      background: color-mix(in srgb, #0c0a10 78%, transparent) !important;
      backdrop-filter: blur(28px) saturate(170%) !important;
      -webkit-backdrop-filter: blur(28px) saturate(170%) !important;
      border: 1px solid rgba(255, 255, 255, 0.12) !important;
      border-radius: 16px !important;
      box-shadow: 0 1px 0 rgba(255, 255, 255, 0.06) inset, 0 24px 56px -20px rgba(0, 0, 0, 0.85) !important;
      z-index: 2147483647 !important;
      display: flex !important;
      flex-direction: column !important;
      padding: 8px !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      color: #f3f1ee !important;
      opacity: 0 !important;
      transform: translateY(-6px) scale(0.98) !important;
      pointer-events: none !important;
      transition: opacity 0.14s ease, transform 0.14s ease !important;
    }
    #ytmd-burger-popover.ytmd-open {
      opacity: 1 !important;
      transform: translateY(0) scale(1) !important;
      pointer-events: auto !important;
    }
    .ytmd-burger-item {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      width: 100% !important;
      padding: 9px 10px !important;
      background: transparent !important;
      border: none !important;
      border-radius: 9px !important;
      color: #e7e5e2 !important;
      font-size: 13px !important;
      cursor: pointer !important;
      font-family: inherit !important;
      text-align: left !important;
      transition: background-color 0.12s ease, color 0.12s ease !important;
    }
    .ytmd-burger-item:hover, .ytmd-burger-item:focus-visible {
      background: color-mix(in srgb, var(--ytmd-accent, #e8b06b) 14%, white 4%) !important;
      color: #ffffff !important;
      outline: none !important;
    }
    .ytmd-burger-item:hover .ytmd-burger-item-icon, .ytmd-burger-item:focus-visible .ytmd-burger-item-icon {
      color: var(--ytmd-accent, #e8b06b) !important;
    }
    .ytmd-burger-item-left { display: flex !important; align-items: center !important; gap: 10px !important; }
    .ytmd-burger-item-icon {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 16px !important;
      height: 16px !important;
      color: #8f8c95 !important;
      transition: color 0.12s ease !important;
    }
    .ytmd-burger-item-label { font-weight: 500 !important; }
    .ytmd-burger-item-shortcut { font-size: 11px !important; color: #75727a !important; font-family: ui-monospace, monospace !important; }
    .ytmd-burger-divider { height: 1px !important; background: rgba(255, 255, 255, 0.09) !important; margin: 6px 4px !important; }
    @media (prefers-reduced-motion: reduce) {
      #ytmd-burger-popover { transition: opacity 0.1s linear !important; transform: none !important; }
    }
  `;
  document.head.appendChild(style);
}

// Pure DOM YTMD Navbar Menu
function injectBurgerMenu(config: Record<string, unknown>) {
  if (document.getElementById('ytmd-burger-btn')) return;

  const rightContent = document.querySelector('ytmusic-nav-bar .right-content, ytmusic-nav-bar #right-content');
  const leftContent = document.querySelector('ytmusic-nav-bar .left-content, ytmusic-nav-bar #left-content');
  const navBar = document.querySelector('ytmusic-nav-bar');
  const fallbackContainer = document.body || document.documentElement;

  if (!rightContent && !leftContent && !fallbackContainer) return;

  ensureBurgerStyles();

  // Burger Button
  const burgerBtn = createEl('button', {
    id: 'ytmd-burger-btn',
    title: 'YTMD Menu (Ctrl+,)'
  });

  const burgerIcon = createSvg('M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z', 15, 15);
  const burgerLabel = createEl('span', { text: 'YTMD' });

  burgerBtn.appendChild(burgerIcon);
  burgerBtn.appendChild(burgerLabel);

  // Dropdown Popover Menu
  let popover = document.getElementById('ytmd-burger-popover');
  if (!popover) {
    popover = createEl('div', { id: 'ytmd-burger-popover' });

    const createMenuItem = (iconSvg: string, label: string, shortcut: string, onClick: () => void) => {
      const item = createEl('button', { className: 'ytmd-burger-item' });

      const left = createEl('span', { className: 'ytmd-burger-item-left' });
      const iconSpan = createEl('span', { className: 'ytmd-burger-item-icon' });
      iconSpan.appendChild(createSvgIcon(iconSvg));
      const labelSpan = createEl('span', { text: label, className: 'ytmd-burger-item-label' });
      left.appendChild(iconSpan);
      left.appendChild(labelSpan);

      const right = createEl('span', { text: shortcut, className: 'ytmd-burger-item-shortcut' });

      item.appendChild(left);
      item.appendChild(right);

      item.addEventListener('click', () => {
        popover?.classList.remove('ytmd-open');
        onClick();
      });
      return item;
    };

    const createDivider = () => createEl('div', { className: 'ytmd-burger-divider' });

    popover.appendChild(createMenuItem(
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
      'Preferences & DSP EQ',
      'Ctrl+,',
      () => {
        invokeBackend('toggle_settings_window');
      }
    ));

    popover.appendChild(createMenuItem(
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
      'Local Music Library',
      '',
      () => {
        invokeBackend('toggle_local_library_window');
      }
    ));

    popover.appendChild(createMenuItem(
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      'Listen Together (Sync)',
      '',
      () => {
        invokeBackend('toggle_sync_window');
      }
    ));

    popover.appendChild(createMenuItem(
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
      'Mobile Web Remote',
      '',
      () => {
        if (currentPluginContext) {
          showQrModal(currentPluginContext);
        }
      }
    ));

    popover.appendChild(createMenuItem(
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><rect x="12" y="9" width="8" height="6" rx="1"/></svg>',
      'Mini Player',
      '',
      () => {
        invokeBackend('toggle_mini_player');
      }
    ));

    popover.appendChild(createDivider());

    popover.appendChild(createMenuItem(
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
      'Download Current Track',
      '',
      async () => {
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
      }
    ));

    document.body.appendChild(popover);

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (popover && popover.classList.contains('ytmd-open')) {
        if (!popover.contains(e.target as Node) && !burgerBtn.contains(e.target as Node)) {
          popover.classList.remove('ytmd-open');
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
      popover.classList.toggle('ytmd-open');
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
  console.log('[YTMD] Initializing desktop integration bridge...');

  let config: Record<string, unknown> = {};

  // Inject burger menu immediately
  injectBurgerMenu(config);
  const burgerMenuPoll = setInterval(() => injectBurgerMenu(config), 1000);
  // No other teardown path exists for this injected script today (its
  // lifetime is normally the page's), but `pagehide` fires on the one case
  // that does end it early without a full reload — bfcache eviction /
  // navigating away from music.youtube.com — so the poll doesn't keep
  // ticking against a torn-down document.
  window.addEventListener('pagehide', () => clearInterval(burgerMenuPoll));

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

  let lastSyncedPosition = 0;
  let lastSyncRealTime = Date.now();

  observer.onTrackChange(async (track) => {
    currentActiveTrack = track;
    lastSyncedPosition = track.currentTimeSecs || 0;
    lastSyncRealTime = Date.now();
    registry.handleTrackChange(track);
    try {
      await invokeBackend('update_track_info', {
        track: {
          title: track.title,
          artist: track.artist,
          album: track.album || null,
          cover_url: track.coverUrl || null,
          duration_secs: Math.round(track.durationSecs || 0),
          current_time_secs: Math.round(track.currentTimeSecs || 0),
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
      lastSyncedPosition = track.currentTimeSecs || 0;
      lastSyncRealTime = Date.now();
      try {
        await invokeBackend('update_track_info', {
          track: {
            title: track.title,
            artist: track.artist,
            album: track.album || null,
            cover_url: track.coverUrl || null,
            duration_secs: Math.round(track.durationSecs || 0),
            current_time_secs: Math.round(track.currentTimeSecs || 0),
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
      invokeBackend('update_track_info', {
        track: {
          title: track.title,
          artist: track.artist,
          album: track.album || null,
          cover_url: track.coverUrl || null,
          duration_secs: Math.round(track.durationSecs || 0),
          current_time_secs: Math.round(positionSecs),
          is_playing: true,
          video_id: track.videoId || null
        }
      }).catch((e) => console.error('[YTMD] Failed to sync seek/progress to backend:', e));
    }
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
  const listenEvent = <T>(eventName: string, handler: (payload: T) => void) => {
    const tauri = window.__TAURI__;
    if (tauri?.event?.listen) {
      tauri.event.listen<T>(eventName, (e) => handler(e.payload));
    }
  };

  listenEvent<string>('player-command', (payload) => handlePlayerCommand(payload));
  listenEvent<string>('tray-command', (payload) => handlePlayerCommand(payload));
  listenEvent<string>('mpris-command', (payload) => handlePlayerCommand(payload));
  listenEvent<string>('global-shortcut-event', (payload) => handlePlayerCommand(payload));
  listenEvent<number>('player-seek', (payload) => PlayerBridge.seekTo(payload));
  listenEvent<number>('mpris-command-seek', (payload) => PlayerBridge.seekTo(payload));
  listenEvent<number>('player-volume', (payload) => PlayerBridge.setVolume(payload));

  // Keyboard shortcut: Ctrl+, or F2 opens settings
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey && e.key === ',') || e.key === 'F2') {
      e.preventDefault();
      invokeBackend('toggle_settings_window');
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
// (adblock, lyrics, downloader, burger menu, DSP...) per ad iframe. Only the
// top-level music.youtube.com frame should ever run this.
const isTopLevelYTMFrame =
  window.self === window.top && /(^|\.)music\.youtube\.com$/.test(location.hostname);

if (isTopLevelYTMFrame) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initYTMD());
  } else {
    initYTMD();
  }
}
