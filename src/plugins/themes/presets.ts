/**
 * YouTube Music themes almost its entire UI — nav bar, cards, chips, menus,
 * dialogs, buttons, links — off a shared set of CSS custom properties
 * (`--ytmusic-*` / `--yt-sys-color-baseline--*`). Overriding those instead of
 * background-color on a handful of top-level tag selectors reskins every
 * menu, dialog, chip and accent-colored control too, since they all read
 * from the same variables everywhere (including inside shadow DOM, which
 * custom properties cross but plain selectors from an injected stylesheet
 * often can't reach).
 *
 * There are exactly two looks, chosen by the Ambient Lighting toggle
 * (see ThemeEnginePlugin) — not a preset picker:
 *   - AMBIENT_THEME_CSS: nav bar, player bar and sidebar go translucent
 *     glass so the per-track ambient wash (AmbientLightingPlugin) reads
 *     through the chrome users actually look at, not just the middle
 *     content pane. Colors are `var(--ytmd-accent, ...)` references, not
 *     baked-in hex — AmbientLightingPlugin writes that custom property on
 *     <html> per track, so this stylesheet never needs to be regenerated.
 *   - BASE_THEME_CSS: what shows with Ambient Lighting off. A single
 *     static dark theme in the same glass-adjacent language, no per-track
 *     color or blur-heavy backdrop.
 */
const PROTECT_ARTWORK = `
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

const ACCENT = 'var(--ytmd-accent, #e8b06b)';
const ACCENT_HOVER = 'color-mix(in srgb, var(--ytmd-accent, #e8b06b) 100%, white 18%)';

export const AMBIENT_THEME_CSS = `
  html {
    --ytmusic-call-to-action: ${ACCENT} !important;
    --yt-sys-color-baseline--call-to-action: ${ACCENT} !important;
    --yt-sys-color-baseline--call-to-action-inverse: ${ACCENT} !important;
    --yt-sys-color-baseline--overlay-call-to-action: ${ACCENT} !important;
    --yt-sys-color-baseline--call-to-action-hover: ${ACCENT_HOVER} !important;
    --yt-sys-color-baseline--overlay-call-to-action-hover: ${ACCENT_HOVER} !important;
    --paper-input-container-focus-color: ${ACCENT} !important;

    --ytmusic-brand-background-solid: color-mix(in srgb, #121016 70%, transparent) !important;
    --yt-sys-color-baseline--raised-background: color-mix(in srgb, #121016 78%, transparent) !important;
    --yt-sys-color-baseline--menu-background: color-mix(in srgb, #121016 90%, transparent) !important;
    --paper-menu-background-color: color-mix(in srgb, #121016 90%, transparent) !important;
    --paper-dialog-background-color: color-mix(in srgb, #121016 90%, transparent) !important;
    --yt-live-chat-dialog-background-color: color-mix(in srgb, #121016 90%, transparent) !important;
    --ytmusic-badge-chip-background: color-mix(in srgb, white 7%, transparent) !important;
    --ytmusic-explore-chip-background: color-mix(in srgb, white 7%, transparent) !important;
  }

  /* Only the true root canvas is forced opaque here. ytmusic-app-layout,
     #browse-page and ytmusic-browse-response are transparent by default in
     YouTube Music's own CSS (they already show html/body through), and
     AmbientLightingPlugin owns keeping them that way so the glow orb behind
     them is visible — forcing it here too would just be a second,
     redundant source of truth for the same rule. */
  html, body {
    background-color: #08070b !important;
  }

  /* The chrome users look at constantly — nav bar, player bar, sidebar —
     goes translucent glass instead of a flat opaque box, so the ambient
     wash actually shows through it instead of stopping at its edges. */
  ytmusic-nav-bar, ytmusic-player-bar, ytmusic-player-page {
    background: color-mix(in srgb, #0c0a10 62%, transparent) !important;
    backdrop-filter: blur(26px) saturate(160%) !important;
    -webkit-backdrop-filter: blur(26px) saturate(160%) !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }
  ytmusic-guide-renderer {
    background: color-mix(in srgb, #0a0910 55%, transparent) !important;
    backdrop-filter: blur(26px) saturate(160%) !important;
    -webkit-backdrop-filter: blur(26px) saturate(160%) !important;
    border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
  }
  tp-yt-paper-slider #primaryProgress.tp-yt-paper-slider {
    background-color: ${ACCENT} !important;
  }
  ${PROTECT_ARTWORK}
`;

export const BASE_THEME_CSS = `
  html {
    --ytmusic-background: #0d0c11 !important;
    --yt-sys-color-baseline--base-background: #0d0c11 !important;

    --ytmusic-brand-background-solid: #141319 !important;
    --yt-sys-color-baseline--raised-background: #141319 !important;
    --yt-sys-color-baseline--menu-background: #17151d !important;
    --paper-menu-background-color: #17151d !important;
    --paper-dialog-background-color: #17151d !important;
    --yt-live-chat-dialog-background-color: #17151d !important;
    --ytmusic-badge-chip-background: #1c1a22 !important;
    --ytmusic-explore-chip-background: #1c1a22 !important;

    --ytmusic-call-to-action: #e8b06b !important;
    --yt-sys-color-baseline--call-to-action: #e8b06b !important;
    --yt-sys-color-baseline--call-to-action-inverse: #e8b06b !important;
    --yt-sys-color-baseline--overlay-call-to-action: #e8b06b !important;
    --yt-sys-color-baseline--call-to-action-hover: #f0bd85 !important;
    --yt-sys-color-baseline--overlay-call-to-action-hover: #f0bd85 !important;
    --paper-input-container-focus-color: #e8b06b !important;
  }
  html, body {
    background-color: #0d0c11 !important;
  }
  ytmusic-nav-bar, ytmusic-player-bar, ytmusic-player-page {
    background: #141319 !important;
    border-color: #242229 !important;
  }
  ytmusic-guide-renderer {
    background-color: #0d0c11 !important;
    border-right: 1px solid #242229 !important;
  }
  tp-yt-paper-slider #primaryProgress.tp-yt-paper-slider {
    background-color: #e8b06b !important;
  }
  ${PROTECT_ARTWORK}
`;
