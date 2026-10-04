/** Styles for the lyrics view (Lyrics tab and fullscreen). Only our own
 * elements and YTM's CSS custom properties; nothing here writes to YTM's nodes. */
export const LYRICS_CSS = `
  /* Scoped to tabs unlockLyricsTabHeader() has explicitly matched by
     label — NOT blind tab position (nth-of-type), since a layout where
     "Tekst"/"Lyrics" isn't the 2nd tab would otherwise force
     pointer-events:auto on some unrelated tab. */
  .ytmd-lyrics-tab-unlocked {
    pointer-events: auto !important;
    cursor: pointer !important;
  }
  .ytmd-lyrics-tab-unlocked[disabled],
  .ytmd-lyrics-tab-unlocked[aria-disabled="true"] {
    opacity: 1 !important;
    color: var(--ytmd-text, #fff) !important;
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

  #ytmd-native-lyrics-wrapper {
    display: none !important;
    flex-direction: column;
    padding: 24px 0 160px;
    max-width: 760px;
    margin: 0 auto;
    box-sizing: border-box;
    width: 100%;
  }

  /* Strict visibility: show ONLY inside the active lyrics tab renderer */
  ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"].iron-selected #ytmd-native-lyrics-wrapper,
  ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]:not([hidden]):not([aria-hidden="true"]) #ytmd-native-lyrics-wrapper {
    display: flex !important;
  }

  /* Never show inside queue / related / hidden tabs */
  ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"][hidden] #ytmd-native-lyrics-wrapper,
  ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"][aria-hidden="true"] #ytmd-native-lyrics-wrapper,
  ytmusic-tab-renderer:not([page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]) #ytmd-native-lyrics-wrapper,
  ytmusic-player-page ytmusic-tab-renderer:not(.iron-selected) #ytmd-native-lyrics-wrapper {
    display: none !important;
  }

  .ytmd-lyrics-view {
    --ytmd-lyric-on: #fff;
    --ytmd-lyric-off: rgba(255, 255, 255, 0.35);
    --ytmd-lyric-size: 28px;
    --ytmd-lyric-scale: 1;
    --ytmd-lyric-weight: 700;
    --ytmd-lyric-gap: 14px;
    position: relative;
    display: flex;
    flex-direction: column;
    /* The sung line grows by transform; it must not widen the scroll area. */
    overflow-x: clip;
  }
  .ytmd-lyrics-view[hidden] { display: none; }
  .ytmd-lyrics-lines { display: flex; flex-direction: column; gap: var(--ytmd-lyric-gap); }

  /* Large display type; the lines not being sung are dimmed. Size and
     weight never change between states (the sung line grows by transform
     only), so the text doesn't reflow as the highlight moves. */
  .ytmd-lyric-line {
    font: var(--ytmd-lyric-weight) calc(var(--ytmd-lyric-size) * var(--ytmd-lyric-scale))/1.25 var(--ytmd-font-display, "YouTube Sans", Roboto, Arial, sans-serif);
    color: var(--ytmd-lyric-off);
    cursor: pointer;
    padding: 4px 6% 4px 0;
    user-select: none;
    overflow-wrap: anywhere;
    transform-origin: left center;
    transition: color 0.25s ease, transform 0.35s ease, filter 0.35s ease, opacity 0.25s ease;
  }
  .ytmd-lyric-line:hover { color: rgba(255, 255, 255, 0.7); }
  .ytmd-lyric-line.ytmd-active { color: var(--ytmd-lyric-on); }
  .ytmd-lyric-line.ytmd-alt { text-align: right; padding: 4px 0 4px 6%; transform-origin: right center; }
  .ytmd-lyric-line.ytmd-plain { cursor: default; color: var(--ytmd-lyric-on); font-weight: 500; --ytmd-lyric-size: 22px; }
  .ytmd-lyric-line.ytmd-plain:hover { color: var(--ytmd-lyric-on); }
  .ytmd-lyric-line.ytmd-empty { min-height: 0.6em; padding: 0; }

  /* Word by word: the word being sung fills from its start to its end.
     Every word of the sung line is painted the same way, by one gradient
     whose edge sits at --ytmd-fill (0 = not sung yet, 1 = sung). A word
     never switches between ways of being painted, and nothing here has a
     transition: switching made each syllable blink as it finished. */
  .ytmd-lyric-line.ytmd-active .ytmd-has-words .ytmd-lyric-word {
    background-image: linear-gradient(
      90deg,
      var(--ytmd-lyric-on) calc(var(--ytmd-fill, 0) * 112% - 12%),
      var(--ytmd-lyric-off) calc(var(--ytmd-fill, 0) * 112%)
    );
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    -webkit-text-fill-color: transparent;
  }

  /* Background vocals, the romanization and the translation sit under the line, smaller. */
  .ytmd-lyric-bg { font-size: 0.62em; font-weight: 500; margin-top: 4px; opacity: 0.85; }
  .ytmd-lyric-roman,
  .ytmd-lyric-trans {
    font: 500 0.56em/1.35 var(--ytmd-font, Roboto, Arial, sans-serif);
    margin-top: 4px;
    color: var(--ytmd-lyric-off);
  }
  .ytmd-lyric-line.ytmd-active .ytmd-lyric-roman,
  .ytmd-lyric-line.ytmd-active .ytmd-lyric-trans,
  .ytmd-lyric-line.ytmd-plain .ytmd-lyric-roman,
  .ytmd-lyric-line.ytmd-plain .ytmd-lyric-trans { color: rgba(255, 255, 255, 0.7); }

  /* An interlude: three dots that light up as it passes. */
  /* Always laid out (appearing would push every line below it down). */
  .ytmd-lyric-gap { display: flex; gap: 10px; padding: 10px 0; opacity: 0; transition: opacity 0.4s ease; }
  .ytmd-lyric-gap.ytmd-active { opacity: 1; }
  .ytmd-lyric-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--ytmd-lyric-off);
    transition: background-color 0.4s ease, transform 0.4s ease;
  }
  .ytmd-lyric-dot.ytmd-lit { background: var(--ytmd-lyric-on); transform: scale(1.15); }

  /* ---- Looks (Settings > Lyrics look; LYRICS_THEMES in view.ts). "classic" is the base above. ---- */
  .ytmd-lyrics-view[data-theme="spotlight"] {
    --ytmd-lyric-scale: 1.3;
    --ytmd-lyric-weight: 800;
    --ytmd-lyric-gap: 22px;
    --ytmd-lyric-off: rgba(255, 255, 255, 0.2);
  }
  .ytmd-lyrics-view[data-theme="compact"] {
    --ytmd-lyric-scale: 0.72;
    --ytmd-lyric-weight: 500;
    --ytmd-lyric-gap: 4px;
    --ytmd-lyric-off: rgba(255, 255, 255, 0.5);
  }
  .ytmd-lyrics-view[data-theme="accent"],
  .ytmd-lyrics-view[data-theme="karaoke"] {
    /* The cover's color, lifted toward white so it reads on any cover. */
    --ytmd-lyric-on: color-mix(in srgb, var(--ytmd-accent, #fff) 65%, #fff);
  }
  .ytmd-lyrics-view[data-theme="centered"] { --ytmd-lyric-weight: 600; }
  .ytmd-lyrics-view[data-theme="karaoke"] { --ytmd-lyric-scale: 1.15; --ytmd-lyric-weight: 800; --ytmd-lyric-gap: 20px; }
  .ytmd-lyrics-view[data-theme="karaoke"] .ytmd-lyric-line:not(.ytmd-plain) { text-transform: uppercase; letter-spacing: 0.02em; }
  .ytmd-lyrics-view[data-theme="centered"] .ytmd-lyric-line,
  .ytmd-lyrics-view[data-theme="karaoke"] .ytmd-lyric-line {
    text-align: center;
    padding: 4px 3%;
    transform-origin: center;
  }
  .ytmd-lyrics-view[data-theme="centered"] .ytmd-lyric-gap,
  .ytmd-lyrics-view[data-theme="karaoke"] .ytmd-lyric-gap { justify-content: center; }

  /* Effects (Settings): the sung line stands out, the rest falls back. Off
     while the listener scrolls through the lyrics themselves. */
  .ytmd-lyrics-effects .ytmd-lyric-line.ytmd-active { transform: scale(1.04); }
  .ytmd-lyrics-effects:not(.ytmd-lyrics-plain):not(.ytmd-lyrics-browsing) .ytmd-lyric-line:not(.ytmd-active) { filter: blur(1.6px); opacity: 0.8; }
  .ytmd-lyrics-effects:not(.ytmd-lyrics-plain):not(.ytmd-lyrics-browsing) .ytmd-lyric-line.ytmd-near:not(.ytmd-active) { filter: blur(0.7px); opacity: 0.9; }
  .ytmd-lyrics-effects .ytmd-lyric-line:hover { filter: none !important; opacity: 1 !important; }

  .ytmd-chip.ytmd-lyrics-resume {
    position: sticky;
    bottom: 24px;
    align-self: center;
    margin-top: 12px;
    background: var(--ytmd-surface, #212121);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
    z-index: 1;
  }
  .ytmd-chip.ytmd-lyrics-resume[hidden] { display: none; }

  .ytmd-native-lyrics-status {
    padding: 48px 0;
    text-align: center;
    font: 400 16px/24px var(--ytmd-font, Roboto, Arial, sans-serif);
    color: var(--ytmd-text-secondary, rgba(255, 255, 255, 0.7));
  }
  .ytmd-native-lyrics-footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-top: 32px;
    font: 400 12px/16px var(--ytmd-font, Roboto, Arial, sans-serif);
    color: var(--ytmd-text-secondary, rgba(255, 255, 255, 0.7));
  }
  .ytmd-native-lyrics-footer .ytmd-lyrics-source { flex: 1 1 100%; }
  .ytmd-native-lyrics-footer a.ytmd-lyrics-source { color: inherit; text-decoration: none; }
  .ytmd-native-lyrics-footer a.ytmd-lyrics-source:hover { text-decoration: underline; }
  .ytmd-lyrics-footer-group { display: inline-flex; align-items: center; gap: 8px; }
  /* A switch that is on looks like YTM's selected chip. */
  .ytmd-chip[aria-pressed="true"] { background: var(--ytmd-text, #fff); color: #030303; }
  .ytmd-lyrics-offset-value {
    min-width: 56px;
    text-align: center;
    font-variant-numeric: tabular-nums;
    color: var(--ytmd-text, #fff);
  }
  .ytmd-lyrics-pick-list { display: flex; flex-direction: column; margin: 8px -24px 0; max-height: 50vh; overflow-y: auto; }
  .ytmd-lyrics-pick-list .ytmd-menu-item { width: 100%; text-align: left; }

  /* ---- Fullscreen: the cover and the player on the left, the lyrics on the right. ---- */
  #ytmd-lyrics-fs {
    position: fixed;
    inset: 0;
    z-index: 2147483000;
    background: #030303;
    color: var(--ytmd-text, #fff);
    font-family: var(--ytmd-font, Roboto, Arial, sans-serif);
    overflow: hidden;
  }
  #ytmd-lyrics-fs.ytmd-fs-idle { cursor: none; }
  /* The cover blurred once into a small bitmap (never a live blur filter
     on a full-window layer), stretched over the window. */
  .ytmd-fs-backdrop { position: absolute; inset: 0; background-size: cover; background-position: center; }
  .ytmd-fs-veil { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.45); }
  .ytmd-fs-body {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6vw;
    height: 100%;
    padding: 0 6vw;
    box-sizing: border-box;
  }
  .ytmd-fs-side { flex: 0 0 min(34vw, 62vh); display: flex; flex-direction: column; min-width: 0; }
  .ytmd-fs-cover {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.08);
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  }
  .ytmd-fs-title {
    margin-top: 24px;
    font: 700 24px/32px var(--ytmd-font-display, "YouTube Sans", Roboto, Arial, sans-serif);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ytmd-fs-artist {
    font: 400 16px/24px var(--ytmd-font, Roboto, Arial, sans-serif);
    color: rgba(255, 255, 255, 0.7);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ytmd-fs-seek { margin-top: 20px; padding: 8px 0; cursor: pointer; }
  .ytmd-fs-track { height: 4px; border-radius: 2px; background: rgba(255, 255, 255, 0.25); overflow: hidden; }
  .ytmd-fs-played { height: 100%; width: 100%; background: #fff; transform-origin: left center; transform: scaleX(0); }
  .ytmd-fs-times {
    display: flex;
    justify-content: space-between;
    font: 400 12px/16px var(--ytmd-font, Roboto, Arial, sans-serif);
    font-variant-numeric: tabular-nums;
    color: rgba(255, 255, 255, 0.7);
  }
  .ytmd-fs-controls { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 12px; }
  .ytmd-fs-controls .ytmd-fs-play { width: 56px; height: 56px; }
  .ytmd-fs-controls .ytmd-fs-play svg { width: 36px; height: 36px; }
  .ytmd-fs-close { position: absolute; top: 16px; right: 16px; z-index: 2; }
  .ytmd-fs-controls,
  .ytmd-fs-close { transition: opacity 0.3s ease; }
  .ytmd-fs-idle .ytmd-fs-controls,
  .ytmd-fs-idle .ytmd-fs-close { opacity: 0; }

  .ytmd-fs-lyrics {
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
  .ytmd-fs-lyrics::-webkit-scrollbar { display: none; }
  .ytmd-fs-lyrics .ytmd-lyrics-view { --ytmd-lyric-size: clamp(28px, 3.2vw, 52px); }
  .ytmd-fs-lyrics .ytmd-lyrics-lines { gap: calc(var(--ytmd-lyric-gap) * 1.5); }
  .ytmd-fs-lyrics .ytmd-native-lyrics-status { font-size: 20px; }
  @media (max-width: 800px) {
    .ytmd-fs-side { display: none; }
  }
`;
