export interface ThemePreset {
  id: string;
  name: string;
  css: string;
}

interface ThemeColors {
  id: string;
  name: string;
  /** Root page background (browse/search/library pages, main canvas). */
  background: string;
  /** Raised surfaces: nav bar, player bar, sidebar, menus, dialogs, chips, solid buttons. */
  surface: string;
  /** Hairline borders between surfaces. */
  border: string;
  /** Links, focus rings, slider fill, "call to action" buttons. */
  accent: string;
  accentHover: string;
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

/**
 * YouTube Music themes almost its entire UI — nav bar, cards, chips, menus,
 * dialogs, buttons, links — off a shared set of CSS custom properties
 * (`--ytmusic-*` / `--yt-sys-color-baseline--*`). Earlier versions of these
 * presets only overrode background-color on a handful of top-level tag
 * selectors (nav bar, player bar, sidebar), which left every menu, dialog,
 * chip and accent-colored control in YouTube's native colors — the "some
 * elements stay their original color, looks disjointed" bug. Overriding the
 * custom properties instead reskins those components too, since they read
 * from the same variables everywhere (including inside shadow DOM, which
 * custom properties cross but plain selectors from an injected stylesheet
 * often can't reach).
 */
function buildThemeCss(c: ThemeColors): string {
  return `
      html {
        --ytmusic-background: ${c.background} !important;
        --yt-sys-color-baseline--base-background: ${c.background} !important;

        --ytmusic-brand-background-solid: ${c.surface} !important;
        --yt-sys-color-baseline--raised-background: ${c.surface} !important;
        --yt-sys-color-baseline--menu-background: ${c.surface} !important;
        --paper-menu-background-color: ${c.surface} !important;
        --paper-dialog-background-color: ${c.surface} !important;
        --yt-live-chat-dialog-background-color: ${c.surface} !important;
        --ytmusic-badge-chip-background: ${c.surface} !important;
        --ytmusic-explore-chip-background: ${c.surface} !important;

        --ytmusic-call-to-action: ${c.accent} !important;
        --yt-sys-color-baseline--call-to-action: ${c.accent} !important;
        --yt-sys-color-baseline--call-to-action-inverse: ${c.accent} !important;
        --yt-sys-color-baseline--overlay-call-to-action: ${c.accent} !important;
        --yt-sys-color-baseline--call-to-action-hover: ${c.accentHover} !important;
        --yt-sys-color-baseline--overlay-call-to-action-hover: ${c.accentHover} !important;
        --paper-input-container-focus-color: ${c.accent} !important;
      }

      /* Only the true root canvas is forced opaque here. ytmusic-app-layout,
         #browse-page and ytmusic-browse-response are transparent by default
         in YouTube Music's own CSS (they already show html/body through), and
         forcing them opaque here would fight the ambient lighting plugin's
         own transparency rule for those same selectors and block the glow. */
      html, body {
        background-color: ${c.background} !important;
      }
      ytmusic-nav-bar, ytmusic-player-bar, ytmusic-player-page {
        background: ${c.surface} !important;
        border-color: ${c.border} !important;
      }
      ytmusic-guide-renderer {
        background-color: ${c.background} !important;
        border-right: 1px solid ${c.border} !important;
      }
      tp-yt-paper-slider #primaryProgress.tp-yt-paper-slider {
        background-color: ${c.accent} !important;
      }
      ${COMMON_PROTECT_ARTWORK}
    `;
}

const THEME_COLORS: ThemeColors[] = [
  {
    id: 'default',
    name: 'Modern Dark',
    background: '#0f0f0f',
    surface: '#121215',
    border: '#27272a',
    accent: '#3ea6ff',
    accentHover: '#65b8ff'
  },
  {
    id: 'oled',
    name: 'Pure OLED Black',
    background: '#000000',
    surface: '#0a0a0a',
    border: '#1a1a1a',
    accent: '#3ea6ff',
    accentHover: '#65b8ff'
  },
  {
    id: 'nord',
    name: 'Nord Arctic',
    background: '#2e3440',
    surface: '#3b4252',
    border: '#434c5e',
    accent: '#88c0d0',
    accentHover: '#a3d0dd'
  },
  {
    id: 'catppuccin',
    name: 'Catppuccin Mocha',
    background: '#1e1e2e',
    surface: '#181825',
    border: '#313244',
    accent: '#cba6f7',
    accentHover: '#dbc2fa'
  },
  {
    id: 'gruvbox',
    name: 'Gruvbox Dark',
    background: '#282828',
    surface: '#1d2021',
    border: '#3c3836',
    accent: '#fe8019',
    accentHover: '#fe9a4d'
  },
  {
    id: 'tokyo_night',
    name: 'Tokyo Night',
    background: '#1a1b26',
    surface: '#16161e',
    border: '#292e42',
    accent: '#7aa2f7',
    accentHover: '#9ab8f9'
  },
  {
    id: 'dracula',
    name: 'Dracula',
    background: '#282a36',
    surface: '#21222c',
    border: '#44475a',
    accent: '#bd93f9',
    accentHover: '#cfb0fb'
  },
  {
    id: 'rose_pine',
    name: 'Rosé Pine',
    background: '#191724',
    surface: '#1f1d2e',
    border: '#26233a',
    accent: '#eb6f92',
    accentHover: '#f08daa'
  }
];

export const THEME_PRESETS: Record<string, ThemePreset> = Object.fromEntries(
  THEME_COLORS.map((c) => [c.id, { id: c.id, name: c.name, css: buildThemeCss(c) }])
);
