/**
 * Volume in YTM's own terms: the 0-100 value its player-bar slider shows.
 * That is not the player's volume: YTM maps the slider through a curve
 * (slider 30 plays at player volume 8, 57 at 26) and keeps the slider value
 * in its own store, which it restores on launch. Writing the player's volume
 * directly left the two apart, so after a restart the slider showed ~40 while
 * the song played far quieter, until the next change resynced it.
 *
 * So changes go through the slider the way a drag does: set its value and
 * fire `change`, which YTM's `onVolumeChange` turns into the player volume
 * and its stored value. The player API is only a fallback while the player
 * bar isn't rendered.
 */

/** Volume controls exposed by YouTube's player at #movie_player. */
type MoviePlayerVolume = HTMLElement & {
  getVolume?: () => number;
  setVolume?: (percent: number) => void;
  isMuted?: () => boolean;
  unMute?: () => void;
};

type VolumeSlider = HTMLElement & { value: number; step?: number | string };

function getMoviePlayer(): MoviePlayerVolume | null {
  return document.getElementById('movie_player') as MoviePlayerVolume | null;
}

function getSlider(selector: string): VolumeSlider | null {
  const slider = document.querySelector<VolumeSlider>(selector);
  return slider && 'value' in slider ? slider : null;
}

const playerBarSlider = () => getSlider('ytmusic-player-bar #volume-slider');

function clampPercent(percent: number): number {
  return Math.max(0, Math.min(100, Math.round(percent)));
}

function setSliderValue(slider: VolumeSlider, percent: number): void {
  // YTM may quantize the slider to 5%, while wheel steps can be 1%.
  if ('step' in slider && Number(slider.step) > 1) slider.step = 1;
  slider.value = percent;
}

export function getPlayerVolumePercent(video: HTMLVideoElement): number {
  const sliderValue = Number(playerBarSlider()?.value);
  if (Number.isFinite(sliderValue)) return clampPercent(sliderValue);
  const playerVolume = getMoviePlayer()?.getVolume?.();
  const percent = typeof playerVolume === 'number' && Number.isFinite(playerVolume)
    ? playerVolume
    : video.volume * 100;
  return clampPercent(percent);
}

export function isPlayerMuted(video: HTMLVideoElement): boolean {
  return getMoviePlayer()?.isMuted?.() === true || video.muted;
}

function applySlider(slider: VolumeSlider, percent: number): void {
  setSliderValue(slider, percent);
  // What a finished drag fires; YTM sets the player (and unmutes) from it.
  slider.dispatchEvent(new CustomEvent('change', { bubbles: true, composed: true }));
  const expanded = getSlider('#expand-volume-slider');
  if (expanded) setSliderValue(expanded, percent);
}

/**
 * YTM rounds the curved player volume to a whole percent, so its lowest
 * slider values (1-4 measured) play at 0: "below 5% it's silent". Those get
 * a share of YTM's quietest step (player volume 1) on the video itself:
 * slider 1 plays at 0.2%, 4 at 0.8%. YTM's own state stays as it set it.
 */
const QUIET_STEP = 0.002;
const QUIET_MAX = 0.01;

// A player that puts its 0 back after every write must not ping-pong with
// us: the same value is written again at most a few times in a while.
const MAX_REWRITES = 6;
const REWRITE_WINDOW_MS = 2000;
let lastQuiet = { target: -1, writes: 0, since: 0 };

export function keepQuietVolumesAudible(video: HTMLVideoElement): void {
  const slider = playerBarSlider();
  if (!slider) return;
  const value = Number(slider.value);
  const player = getMoviePlayer();
  if (!(value > 0) || player?.getVolume?.() !== 0 || isPlayerMuted(video)) return;
  const target = Math.min(QUIET_MAX, value * QUIET_STEP);
  if (Math.abs(video.volume - target) < 1e-4) return;
  const now = Date.now();
  if (target !== lastQuiet.target || now - lastQuiet.since > REWRITE_WINDOW_MS) {
    lastQuiet = { target, writes: 0, since: now };
  }
  if (lastQuiet.writes >= MAX_REWRITES) return;
  lastQuiet.writes++;
  video.volume = target;
}

export function setPlayerVolumePercent(percent: number, video: HTMLVideoElement): void {
  if (!Number.isFinite(percent)) return;
  const clamped = clampPercent(percent);

  const slider = playerBarSlider();
  if (slider) {
    applySlider(slider, clamped);
    keepQuietVolumesAudible(video);
    return;
  }

  const player = getMoviePlayer();
  if (typeof player?.setVolume === 'function') {
    player.setVolume(clamped);
    if (clamped > 0 && player.isMuted?.()) {
      if (typeof player.unMute === 'function') player.unMute();
      else video.muted = false;
    }
    return;
  }
  video.volume = clamped / 100;
  if (clamped > 0 && video.muted) video.muted = false;
}
