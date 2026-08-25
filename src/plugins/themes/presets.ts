export interface ThemePreset {
  id: string;
  name: string;
  css: string;
}

const COMMON_PROTECT_ARTWORK = `
  /* Protect album artwork, thumbnails and player cover images from background overrides */
  yt-img-shadow,
  yt-img-shadow #content,
  yt-img-shadow img,
  ytmusic-player-page #song-image,
  ytmusic-player-page #song-image #image,
  ytmusic-player-page #song-image #content,
  ytmusic-thumbnail-renderer,
  ytmusic-thumbnail-renderer #content,
  ytmusic-thumbnail-renderer img,
  ytmusic-two-row-item-renderer #content,
  ytmusic-responsive-list-item-renderer #content,
  #thumbnail,
  #thumbnail img,
  #image,
  #image img,
  #song-image,
  #song-image img,
  img.ytmusic-player-page,
  img.ytmusic-img-shadow {
    background-color: transparent !important;
  }
`;

export const THEME_PRESETS: Record<string, ThemePreset> = {
  default: {
    id: 'default',
    name: 'Modern Dark',
    css: `
      /* Clean Dark Minimal */
      ytmusic-nav-bar { background: rgba(18, 18, 21, 0.94) !important; border-bottom: 1px solid #27272a !important; }
      ytmusic-player-bar { background: rgba(18, 18, 21, 0.96) !important; border-top: 1px solid #27272a !important; }
      ${COMMON_PROTECT_ARTWORK}
    `
  },
  oled: {
    id: 'oled',
    name: 'Pure OLED Black',
    css: `
      html, body, ytmusic-app, ytmusic-app-layout, #browse-page, ytmusic-browse-response, ytmusic-search-page, ytmusic-tab-renderer {
        background-color: #000000 !important;
      }
      ytmusic-nav-bar, ytmusic-player-bar, ytmusic-player-page {
        background: #000000 !important;
        border-color: #1a1a1a !important;
      }
      ytmusic-guide-renderer {
        background-color: #000000 !important;
        border-right: 1px solid #141414 !important;
      }
      ${COMMON_PROTECT_ARTWORK}
    `
  },
  nord: {
    id: 'nord',
    name: 'Nord Arctic',
    css: `
      html, body, ytmusic-app, ytmusic-app-layout, #browse-page, ytmusic-browse-response, ytmusic-search-page, ytmusic-tab-renderer {
        background-color: #2e3440 !important;
      }
      ytmusic-nav-bar {
        background: #3b4252 !important;
        border-bottom: 1px solid #434c5e !important;
      }
      ytmusic-player-bar {
        background: #3b4252 !important;
        border-top: 1px solid #434c5e !important;
      }
      ytmusic-guide-renderer {
        background-color: #2e3440 !important;
        border-right: 1px solid #3b4252 !important;
      }
      tp-yt-paper-slider #primaryProgress.tp-yt-paper-slider {
        background-color: #88c0d0 !important;
      }
      ${COMMON_PROTECT_ARTWORK}
    `
  },
  catppuccin: {
    id: 'catppuccin',
    name: 'Catppuccin Mocha',
    css: `
      html, body, ytmusic-app, ytmusic-app-layout, #browse-page, ytmusic-browse-response, ytmusic-search-page, ytmusic-tab-renderer {
        background-color: #1e1e2e !important;
      }
      ytmusic-nav-bar {
        background: #181825 !important;
        border-bottom: 1px solid #313244 !important;
      }
      ytmusic-player-bar {
        background: #181825 !important;
        border-top: 1px solid #313244 !important;
      }
      ytmusic-guide-renderer {
        background-color: #1e1e2e !important;
        border-right: 1px solid #313244 !important;
      }
      tp-yt-paper-slider #primaryProgress.tp-yt-paper-slider {
        background-color: #cba6f7 !important;
      }
      ${COMMON_PROTECT_ARTWORK}
    `
  },
  gruvbox: {
    id: 'gruvbox',
    name: 'Gruvbox Dark',
    css: `
      html, body, ytmusic-app, ytmusic-app-layout, #browse-page, ytmusic-browse-response, ytmusic-search-page, ytmusic-tab-renderer {
        background-color: #282828 !important;
      }
      ytmusic-nav-bar {
        background: #1d2021 !important;
        border-bottom: 1px solid #3c3836 !important;
      }
      ytmusic-player-bar {
        background: #1d2021 !important;
        border-top: 1px solid #3c3836 !important;
      }
      ytmusic-guide-renderer {
        background-color: #282828 !important;
        border-right: 1px solid #3c3836 !important;
      }
      tp-yt-paper-slider #primaryProgress.tp-yt-paper-slider {
        background-color: #fe8019 !important;
      }
      ${COMMON_PROTECT_ARTWORK}
    `
  },
  tokyo_night: {
    id: 'tokyo_night',
    name: 'Tokyo Night',
    css: `
      html, body, ytmusic-app, ytmusic-app-layout, #browse-page, ytmusic-browse-response, ytmusic-search-page, ytmusic-tab-renderer {
        background-color: #1a1b26 !important;
      }
      ytmusic-nav-bar {
        background: #16161e !important;
        border-bottom: 1px solid #292e42 !important;
      }
      ytmusic-player-bar {
        background: #16161e !important;
        border-top: 1px solid #292e42 !important;
      }
      ytmusic-guide-renderer {
        background-color: #1a1b26 !important;
        border-right: 1px solid #292e42 !important;
      }
      tp-yt-paper-slider #primaryProgress.tp-yt-paper-slider {
        background-color: #7aa2f7 !important;
      }
      ${COMMON_PROTECT_ARTWORK}
    `
  },
  dracula: {
    id: 'dracula',
    name: 'Dracula',
    css: `
      html, body, ytmusic-app, ytmusic-app-layout, #browse-page, ytmusic-browse-response, ytmusic-search-page, ytmusic-tab-renderer {
        background-color: #282a36 !important;
      }
      ytmusic-nav-bar {
        background: #21222c !important;
        border-bottom: 1px solid #44475a !important;
      }
      ytmusic-player-bar {
        background: #21222c !important;
        border-top: 1px solid #44475a !important;
      }
      ytmusic-guide-renderer {
        background-color: #282a36 !important;
        border-right: 1px solid #44475a !important;
      }
      tp-yt-paper-slider #primaryProgress.tp-yt-paper-slider {
        background-color: #bd93f9 !important;
      }
      ${COMMON_PROTECT_ARTWORK}
    `
  },
  rose_pine: {
    id: 'rose_pine',
    name: 'Rosé Pine',
    css: `
      html, body, ytmusic-app, ytmusic-app-layout, #browse-page, ytmusic-browse-response, ytmusic-search-page, ytmusic-tab-renderer {
        background-color: #191724 !important;
      }
      ytmusic-nav-bar {
        background: #1f1d2e !important;
        border-bottom: 1px solid #26233a !important;
      }
      ytmusic-player-bar {
        background: #1f1d2e !important;
        border-top: 1px solid #26233a !important;
      }
      ytmusic-guide-renderer {
        background-color: #191724 !important;
        border-right: 1px solid #26233a !important;
      }
      tp-yt-paper-slider #primaryProgress.tp-yt-paper-slider {
        background-color: #eb6f92 !important;
      }
      ${COMMON_PROTECT_ARTWORK}
    `
  }
};
