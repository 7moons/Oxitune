/** Styles for the lyrics view (Lyrics tab and fullscreen). Only our own
 * elements and YTM's CSS custom properties; nothing here writes to YTM's nodes. */
export const LYRICS_CSS = `
  /* Scoped to tabs unlockLyricsTabHeader() has explicitly matched by
     label — NOT blind tab position (nth-of-type), since a layout where
     "Tekst"/"Lyrics" isn't the 2nd tab would otherwise force
     pointer-events:auto on some unrelated tab. */
  .oxitune-lyrics-tab-unlocked {
    pointer-events: auto !important;
    cursor: pointer !important;
  }
  .oxitune-lyrics-tab-unlocked[disabled],
  .oxitune-lyrics-tab-unlocked[aria-disabled="true"] {
    opacity: 1 !important;
    color: var(--oxitune-text, #fff) !important;
  }

  /* Hide default un-synced text, spinners and unavailable messages inside lyrics tab ONLY */
  #tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-description-shelf-renderer,
  #tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-message-renderer,
  #tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] tp-yt-paper-spinner,
  ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-description-shelf-renderer,
  ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-message-renderer,
  ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] tp-yt-paper-spinner {
    display: none !important;
  }

  #oxitune-native-lyrics-wrapper {
    display: none !important;
    flex-direction: column;
    padding: 24px 0 160px;
    max-width: 760px;
    margin: 0 auto;
    box-sizing: border-box;
    width: 100%;
  }

  /* Strict visibility: show ONLY inside the active lyrics tab renderer */
  ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"].iron-selected #oxitune-native-lyrics-wrapper,
  ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]:not([hidden]):not([aria-hidden="true"]) #oxitune-native-lyrics-wrapper {
    display: flex !important;
  }

  /* Never show inside queue / related / hidden tabs */
  ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"][hidden] #oxitune-native-lyrics-wrapper,
  ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"][aria-hidden="true"] #oxitune-native-lyrics-wrapper,
  ytmusic-tab-renderer:not([page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]) #oxitune-native-lyrics-wrapper,
  ytmusic-player-page ytmusic-tab-renderer:not(.iron-selected) #oxitune-native-lyrics-wrapper {
    display: none !important;
  }

  .oxitune-lyrics-view {
    --oxitune-lyric-on: #fff;
    --oxitune-lyric-off: rgba(255, 255, 255, 0.35);
    --oxitune-lyric-size: 28px;
    --oxitune-lyric-scale: 1;
    --oxitune-lyric-weight: 700;
    --oxitune-lyric-gap: 14px;
    position: relative;
    display: flex;
    flex-direction: column;
    /* The sung line grows by transform; it must not widen the scroll area. */
    overflow-x: clip;
  }
  .oxitune-lyrics-view[hidden] { display: none; }
  .oxitune-lyrics-lines { display: flex; flex-direction: column; gap: var(--oxitune-lyric-gap); }

  /* Large display type; the lines not being sung are dimmed. Size and
     weight never change between states (the sung line grows by transform
     only), so the text doesn't reflow as the highlight moves. */
  .oxitune-lyric-line {
    font: var(--oxitune-lyric-weight) calc(var(--oxitune-lyric-size) * var(--oxitune-lyric-scale))/1.25 var(--oxitune-font-display, "YouTube Sans", Roboto, Arial, sans-serif);
    color: var(--oxitune-lyric-off);
    cursor: pointer;
    padding: 4px 6% 4px 0;
    user-select: none;
    overflow-wrap: anywhere;
    transform-origin: left center;
    transition: color 0.25s ease, transform 0.35s ease, filter 0.35s ease, opacity 0.25s ease;
  }
  .oxitune-lyric-line:hover { color: rgba(255, 255, 255, 0.7); }
  .oxitune-lyric-line.oxitune-active { color: var(--oxitune-lyric-on); }
  .oxitune-lyric-line.oxitune-alt { text-align: right; padding: 4px 0 4px 6%; transform-origin: right center; }
  /* Text-only lyrics: the same type as timed ones, all of it lit. */
  .oxitune-lyric-line.oxitune-plain { cursor: default; color: var(--oxitune-lyric-on); }
  .oxitune-lyric-line.oxitune-plain:hover { color: var(--oxitune-lyric-on); }
  .oxitune-lyric-line.oxitune-empty { min-height: 0.6em; padding: 0; }

  /* Word by word: the word being sung fills from its start to its end.
     Every word of the sung line is painted the same way, by one gradient
     whose edge sits at --oxitune-fill (0 = not sung yet, 1 = sung). A word
     never switches between ways of being painted, and nothing here has a
     transition: switching made each syllable blink as it finished. */
  .oxitune-lyric-line.oxitune-active .oxitune-has-words .oxitune-lyric-word {
    background-image: linear-gradient(
      90deg,
      var(--oxitune-lyric-on) calc(var(--oxitune-fill, 0) * 112% - 12%),
      var(--oxitune-lyric-off) calc(var(--oxitune-fill, 0) * 112%)
    );
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    -webkit-text-fill-color: transparent;
  }

  /* Background vocals, the romanization and the translation sit under the line, smaller. */
  .oxitune-lyric-bg { font-size: 0.62em; font-weight: 500; margin-top: 4px; opacity: 0.85; }
  .oxitune-lyric-roman,
  .oxitune-lyric-trans {
    font: 500 0.56em/1.35 var(--oxitune-font, Roboto, Arial, sans-serif);
    margin-top: 4px;
    color: var(--oxitune-lyric-off);
  }
  .oxitune-lyric-line.oxitune-active .oxitune-lyric-roman,
  .oxitune-lyric-line.oxitune-active .oxitune-lyric-trans,
  .oxitune-lyric-line.oxitune-plain .oxitune-lyric-roman,
  .oxitune-lyric-line.oxitune-plain .oxitune-lyric-trans { color: rgba(255, 255, 255, 0.7); }

  /* An interlude: three dots that light up as it passes. */
  /* Always laid out (appearing would push every line below it down). */
  .oxitune-lyric-gap { display: flex; gap: 10px; padding: 10px 0; opacity: 0; transition: opacity 0.4s ease; }
  .oxitune-lyric-gap.oxitune-active { opacity: 1; }
  .oxitune-lyric-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--oxitune-lyric-off);
    transition: background-color 0.4s ease, transform 0.4s ease;
  }
  .oxitune-lyric-dot.oxitune-lit { background: var(--oxitune-lyric-on); transform: scale(1.15); }

  /* ---- Looks (Settings > Lyrics look; LYRICS_THEMES in view.ts). "classic" is the base above. ---- */
  .oxitune-lyrics-view[data-theme="spotlight"] {
    --oxitune-lyric-scale: 1.3;
    --oxitune-lyric-weight: 800;
    --oxitune-lyric-gap: 22px;
    --oxitune-lyric-off: rgba(255, 255, 255, 0.2);
  }
  .oxitune-lyrics-view[data-theme="compact"] {
    --oxitune-lyric-scale: 0.72;
    --oxitune-lyric-weight: 500;
    --oxitune-lyric-gap: 4px;
    --oxitune-lyric-off: rgba(255, 255, 255, 0.5);
  }
  .oxitune-lyrics-view[data-theme="accent"],
  .oxitune-lyrics-view[data-theme="karaoke"] {
    /* The cover's color, lifted toward white so it reads on any cover. */
    --oxitune-lyric-on: color-mix(in srgb, var(--oxitune-accent, #fff) 65%, #fff);
  }
  .oxitune-lyrics-view[data-theme="centered"] { --oxitune-lyric-weight: 600; }
  .oxitune-lyrics-view[data-theme="karaoke"] { --oxitune-lyric-scale: 1.15; --oxitune-lyric-weight: 800; --oxitune-lyric-gap: 20px; }
  .oxitune-lyrics-view[data-theme="karaoke"] .oxitune-lyric-line:not(.oxitune-plain) { text-transform: uppercase; letter-spacing: 0.02em; }
  .oxitune-lyrics-view[data-theme="centered"] .oxitune-lyric-line,
  .oxitune-lyrics-view[data-theme="karaoke"] .oxitune-lyric-line {
    text-align: center;
    padding: 4px 3%;
    transform-origin: center;
  }
  .oxitune-lyrics-view[data-theme="centered"] .oxitune-lyric-gap,
  .oxitune-lyrics-view[data-theme="karaoke"] .oxitune-lyric-gap { justify-content: center; }

  /* Effects (Settings): the sung line stands out, the rest falls back. Off
     while the listener scrolls through the lyrics themselves. */
  .oxitune-lyrics-effects .oxitune-lyric-line.oxitune-active { transform: scale(1.04); }
  .oxitune-lyrics-effects:not(.oxitune-lyrics-plain):not(.oxitune-lyrics-browsing) .oxitune-lyric-line:not(.oxitune-active) { filter: blur(1.6px); opacity: 0.8; }
  .oxitune-lyrics-effects:not(.oxitune-lyrics-plain):not(.oxitune-lyrics-browsing) .oxitune-lyric-line.oxitune-near:not(.oxitune-active) { filter: blur(0.7px); opacity: 0.9; }
  .oxitune-lyrics-effects .oxitune-lyric-line:hover { filter: none !important; opacity: 1 !important; }

  .oxitune-chip.oxitune-lyrics-resume {
    position: sticky;
    bottom: 76px;
    align-self: center;
    margin-top: 12px;
    background: var(--oxitune-surface, #212121);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
    z-index: 1;
  }
  .oxitune-chip.oxitune-lyrics-resume[hidden] { display: none; }

  .oxitune-native-lyrics-status {
    padding: 48px 0;
    text-align: center;
    font: 400 16px/24px var(--oxitune-font, Roboto, Arial, sans-serif);
    color: var(--oxitune-text-secondary, rgba(255, 255, 255, 0.7));
  }
  /* The controls: one pill that stays at the bottom of the tab while the
     lyrics scroll under it. Opaque: lines must not show through it. */
  .oxitune-lyrics-bar {
    position: sticky;
    bottom: 16px;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 2px;
    align-self: stretch;
    margin-top: 40px;
    padding: 4px 6px 4px 16px;
    border-radius: 24px;
    background: var(--oxitune-surface, #212121);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
    font: 400 12px/16px var(--oxitune-font, Roboto, Arial, sans-serif);
    color: var(--oxitune-text-secondary, rgba(255, 255, 255, 0.7));
  }
  .oxitune-lyrics-bar .oxitune-lyrics-source {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: inherit;
    text-decoration: none;
  }
  .oxitune-lyrics-bar a.oxitune-lyrics-source:hover { text-decoration: underline; }
  .oxitune-lyrics-bar .oxitune-icon-btn { width: 36px; height: 36px; flex: none; }
  .oxitune-lyrics-bar .oxitune-icon-btn svg { width: 20px; height: 20px; }
  /* A switch that is on looks like YTM's selected chip. */
  .oxitune-lyrics-bar .oxitune-icon-btn[aria-pressed="true"] { background: var(--oxitune-text, #fff); color: #030303; }
  .oxitune-lyrics-bar-sep { flex: none; width: 1px; height: 20px; margin: 0 6px; background: var(--oxitune-divider, rgba(255, 255, 255, 0.1)); }
  .oxitune-lyrics-offset-value {
    all: unset;
    flex: none;
    min-width: 48px;
    text-align: center;
    font: 500 12px/36px var(--oxitune-font, Roboto, Arial, sans-serif);
    font-variant-numeric: tabular-nums;
    color: var(--oxitune-text, #fff);
    cursor: pointer;
    border-radius: 18px;
  }
  .oxitune-lyrics-offset-value:hover { background: var(--oxitune-hover, rgba(255, 255, 255, 0.1)); }
  .oxitune-lyrics-offset-value:focus-visible { outline: 2px solid var(--oxitune-text, #fff); outline-offset: -2px; }
  .oxitune-lyrics-pick-list { display: flex; flex-direction: column; margin: 8px -24px 0; max-height: 50vh; overflow-y: auto; }
  .oxitune-lyrics-pick-list .oxitune-menu-item { width: 100%; text-align: left; }

  /* ---- Fullscreen: the cover and the player on the left, the lyrics on the right. ---- */
  #oxitune-lyrics-fs {
    position: fixed;
    inset: 0;
    z-index: 2147483000;
    background: #030303;
    color: var(--oxitune-text, #fff);
    font-family: var(--oxitune-font, Roboto, Arial, sans-serif);
    overflow: hidden;
  }
  #oxitune-lyrics-fs.oxitune-fs-idle { cursor: none; }
  /* The cover blurred once into a small bitmap (never a live blur filter
     on a full-window layer), stretched over the window. */
  .oxitune-fs-backdrop { position: absolute; inset: 0; background-size: cover; background-position: center; }
  .oxitune-fs-veil { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.45); }
  .oxitune-fs-body {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6vw;
    height: 100%;
    padding: 0 6vw;
    box-sizing: border-box;
  }
  .oxitune-fs-side { flex: 0 0 min(34vw, 62vh); display: flex; flex-direction: column; min-width: 0; }
  .oxitune-fs-cover {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.08);
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  }
  .oxitune-fs-title {
    margin-top: 24px;
    font: 700 24px/32px var(--oxitune-font-display, "YouTube Sans", Roboto, Arial, sans-serif);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .oxitune-fs-artist {
    font: 400 16px/24px var(--oxitune-font, Roboto, Arial, sans-serif);
    color: rgba(255, 255, 255, 0.7);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .oxitune-fs-seek { margin-top: 20px; padding: 8px 0; cursor: pointer; }
  .oxitune-fs-track { height: 4px; border-radius: 2px; background: rgba(255, 255, 255, 0.25); overflow: hidden; }
  .oxitune-fs-played { height: 100%; width: 100%; background: #fff; transform-origin: left center; transform: scaleX(0); }
  .oxitune-fs-times {
    display: flex;
    justify-content: space-between;
    font: 400 12px/16px var(--oxitune-font, Roboto, Arial, sans-serif);
    font-variant-numeric: tabular-nums;
    color: rgba(255, 255, 255, 0.7);
  }
  .oxitune-fs-controls { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 12px; }
  .oxitune-fs-controls .oxitune-fs-play { width: 56px; height: 56px; }
  .oxitune-fs-controls .oxitune-fs-play svg { width: 36px; height: 36px; }
  .oxitune-fs-close { position: absolute; top: 16px; right: 16px; z-index: 2; }
  .oxitune-fs-controls,
  .oxitune-fs-close { transition: opacity 0.3s ease; }
  .oxitune-fs-idle .oxitune-fs-controls,
  .oxitune-fs-idle .oxitune-fs-close { opacity: 0; }

  .oxitune-fs-lyrics {
    flex: 1;
    min-width: 0;
    height: 100%;
    overflow-y: auto;
    scrollbar-width: none;
    padding: 45vh 0;
    box-sizing: border-box;
    -webkit-mask-image: linear-gradient(to bottom, transparent, #000 18%, #000 82%, transparent);
    mask-image: linear-gradient(to bottom, transparent, #000 18%, #000 82%, transparent);
  }
  .oxitune-fs-lyrics::-webkit-scrollbar { display: none; }
  .oxitune-fs-lyrics .oxitune-lyrics-view { --oxitune-lyric-size: clamp(28px, 3.2vw, 52px); }
  .oxitune-fs-lyrics .oxitune-lyrics-lines { gap: calc(var(--oxitune-lyric-gap) * 1.5); }
  .oxitune-fs-lyrics .oxitune-native-lyrics-status { font-size: 20px; }
  @media (max-width: 800px) {
    .oxitune-fs-side { display: none; }
  }
`;
