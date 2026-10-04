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

/** The player plays at volume 0 although the slider isn't at 0. */
function silentAbove0(slider: VolumeSlider): boolean {
  const playerVolume = getMoviePlayer()?.getVolume?.();
  return Number(slider.value) > 0 && playerVolume === 0;
}

/**
 * YTM rounds the curved player volume to a whole percent, so the lowest
 * slider values (1-7 or so) play nothing at all: "below 5% it's silent".
 * Such a value moves to the nearest one that plays: up to the first audible
 * one, or, when turning down, to 0. Bounded, so a player that answers late
 * can't be pushed loud.
 */
const MAX_LIFT = 20;

function leaveSilence(slider: VolumeSlider, direction: 'up' | 'down'): void {
  if (!silentAbove0(slider)) return;
  if (direction === 'down') {
    applySlider(slider, 0);
    return;
  }
  for (let value = Number(slider.value) + 1; value <= MAX_LIFT && silentAbove0(slider); value++) {
    applySlider(slider, value);
  }
}

/** After the user let go of YTM's own slider on a value that plays nothing. */
export function liftOutOfSilence(): void {
  const slider = playerBarSlider();
  if (slider) leaveSilence(slider, 'up');
}

export function setPlayerVolumePercent(
  percent: number,
  video: HTMLVideoElement,
  direction: 'up' | 'down' = 'up'
): void {
  if (!Number.isFinite(percent)) return;
  const clamped = clampPercent(percent);

  const slider = playerBarSlider();
  if (slider) {
    applySlider(slider, clamped);
    leaveSilence(slider, direction);
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
