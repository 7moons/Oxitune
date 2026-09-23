/** Volume controls exposed by YouTube's player at #movie_player. */
type MoviePlayerVolume = HTMLElement & {
  getVolume?: () => number;
  setVolume?: (percent: number) => void;
  isMuted?: () => boolean;
  unMute?: () => void;
};

function getMoviePlayer(): MoviePlayerVolume | null {
  return document.getElementById('movie_player') as MoviePlayerVolume | null;
}

/** The player API changes audio, but YTM's Polymer sliders are not updated by it. */
function syncVolumeSliders(percent: number): void {
  type VolumeSlider = HTMLElement & { value: number; step?: number | string };
  for (const selector of ['ytmusic-player-bar #volume-slider', '#expand-volume-slider']) {
    const slider = document.querySelector<VolumeSlider>(selector);
    if (!slider || !('value' in slider)) continue;
    // YTM may quantize the native slider to 5%, while wheel steps can be 1%.
    if ('step' in slider && Number(slider.step) > 1) slider.step = 1;
    slider.value = percent;
  }
}

export function getPlayerVolumePercent(video: HTMLVideoElement): number {
  const playerVolume = getMoviePlayer()?.getVolume?.();
  const percent = typeof playerVolume === 'number' && Number.isFinite(playerVolume)
    ? playerVolume
    : video.volume * 100;
  return Math.max(0, Math.min(100, Math.round(percent)));
}

export function isPlayerMuted(video: HTMLVideoElement): boolean {
  return getMoviePlayer()?.isMuted?.() === true || video.muted;
}

export function setPlayerVolumePercent(percent: number, video: HTMLVideoElement): void {
  if (!Number.isFinite(percent)) return;
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const player = getMoviePlayer();
  if (typeof player?.setVolume === 'function') {
    player.setVolume(clamped);
    if (clamped > 0 && player.isMuted?.()) {
      if (typeof player.unMute === 'function') player.unMute();
      else video.muted = false;
    }
    syncVolumeSliders(clamped);
    return;
  }

  video.volume = clamped / 100;
  if (clamped > 0 && video.muted) video.muted = false;
  syncVolumeSliders(clamped);
}
