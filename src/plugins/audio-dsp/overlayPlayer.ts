import { AudioEngine } from './engine';
import { OverlayPlayer } from './overlap';

/**
 * The second player of the overlapping crossfade: an `<audio>` that is never
 * put in the page, routed into the audio graph behind the fade so it gets
 * the same equalizer as the song it joins. That routing needs the stream to
 * be CORS-enabled (YouTube's media servers allow music.youtube.com); if it
 * isn't, loading fails and the overlap is skipped for that song.
 */
export function createOverlayPlayer(): OverlayPlayer | null {
  if (typeof Audio === 'undefined') return null;
  const audio = new Audio();
  audio.preload = 'auto';
  audio.crossOrigin = 'anonymous';
  const handle = AudioEngine.getInstance().attachOverlay(audio);
  if (!handle) return null;

  let failed = false;
  let disposed = false;
  audio.addEventListener('error', () => {
    failed = true;
  });

  const free = () => {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    handle.detach();
  };

  return {
    load: (url) => {
      audio.src = url;
      audio.load();
    },
    play: () => {
      void audio.play().catch(() => {
        if (!disposed) failed = true;
      });
    },
    pause: () => audio.pause(),
    setLevel: (level, rampSecs) => handle.setGain(level, rampSecs),
    setVolume: (volume, muted) => {
      if (audio.volume !== volume) audio.volume = Math.max(0, Math.min(1, volume));
      if (audio.muted !== muted) audio.muted = muted;
    },
    currentTime: () => audio.currentTime,
    ready: () => audio.readyState >= 3,
    failed: () => failed,
    dispose: (fadeSecs = 0) => {
      if (disposed) return;
      disposed = true;
      if (fadeSecs > 0) {
        handle.setGain(0, fadeSecs);
        setTimeout(free, fadeSecs * 1000 + 50);
      } else {
        free();
      }
    }
  };
}
