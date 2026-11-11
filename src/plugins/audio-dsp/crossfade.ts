import { AudioEngine } from './engine';
import { PlayerBridge } from '../../preload/bridge';
import { TrackInfo } from '../types';

/** A new song fades in over at most this long, however long the fade-out is:
 * YTM plays one song at a time, so the two fades can't overlap, and a slow
 * fade-in after a slow fade-out left a long quiet hole between songs. */
export const MAX_FADE_IN_SECS = 2;
/** Each tick ramps to the level the song will be at this much later, which
 * joins the ~4 ticks a second into one continuous curve. */
export const FADE_RAMP_SECS = 0.3;
/** The longest a held song stays silent, whatever the overlap does. */
export const MAX_HOLD_MS = 10000;
/** How fast a held song comes up when it takes over. */
export const HOLD_RELEASE_SECS = 0.25;
/** A position at or below this, right after the end of a song, is a restart
 * (repeat one) or the next song before its details arrived. */
const RESTART_WINDOW_SECS = 1.5;

/**
 * The fade level (0..1) for a position in a song. Equal-power curves: the
 * song stays near full level for most of the fade-out and rises quickly on
 * the way in, where a straight line sounds like a dip.
 */
export function fadeGainAt(
  positionSecs: number,
  durationSecs: number,
  fadeOutSecs: number,
  fadeInSecs: number
): number {
  let gain = 1;
  if (fadeInSecs > 0 && positionSecs < fadeInSecs) {
    gain = Math.sin((Math.max(0, positionSecs) / fadeInSecs) * (Math.PI / 2));
  }
  if (fadeOutSecs > 0 && durationSecs > 0) {
    const remaining = durationSecs - positionSecs;
    if (remaining < fadeOutSecs) {
      gain = Math.min(gain, Math.sin((Math.max(0, remaining) / fadeOutSecs) * (Math.PI / 2)));
    }
  }
  return gain;
}

/** The song's length to a fraction of a second. `track.durationSecs` is
 * rounded down, and fading against it reached silence up to a second before
 * the song was over. The player's own figure is only trusted when it is this
 * song's (it can be the whole media stream's). */
export function preciseDuration(trackDurationSecs: number, playerDurationSecs: number | undefined): number {
  if (
    typeof playerDurationSecs === 'number' &&
    Number.isFinite(playerDurationSecs) &&
    playerDurationSecs >= trackDurationSecs &&
    playerDurationSecs - trackDurationSecs < 1.5
  ) {
    return playerDurationSecs;
  }
  return trackDurationSecs;
}

const playerDuration = (): number | undefined =>
  typeof document === 'undefined' ? undefined : PlayerBridge.getMoviePlayer()?.getDuration?.();

const playbackRate = (): number => {
  if (typeof document === 'undefined') return 1;
  const rate = PlayerBridge.getVideo()?.playbackRate;
  return typeof rate === 'number' && rate > 0 ? rate : 1;
};

/**
 * Fades each song out at its end and the next one in.
 *
 * YTM plays one stream, so this is a fade through a short quiet point, not
 * two songs overlapping.
 *
 * The level is a function of the song's position, applied on every tick. It
 * used to be a wall-clock ramp scheduled once plus a timer that pressed
 * "next" just before the end, which went wrong whenever the clock and the
 * song disagreed: pausing in the last seconds still skipped the song and
 * left it silent, repeat-one jumped to the next song, buffering or a changed
 * speed finished the fade early or late, and the next song started fading in
 * before it was playing. YTM now moves on by itself, as it does without
 * crossfade, so repeat, the end of the queue and a room's shared queue all
 * behave as usual.
 */
export class CrossfadeController {
  private crossfadeSeconds = 0;
  private currentTrackId = '';
  /** Whether the current song gets a fade-in (it was seen starting). */
  private fadingIn = false;
  private lastPosition = -1;
  private inFadeOut = false;
  /** The next song is already playing in a second player (overlap.ts): this
   * one starts silent instead of fading in, until `release()`. */
  private holdNext = false;
  private heldSinceMs: number | null = null;

  constructor(
    private readonly readPlayerDuration: () => number | undefined = playerDuration,
    private readonly readPlaybackRate: () => number = playbackRate,
    private readonly now: () => number = Date.now
  ) {}

  public setCrossfadeSeconds(secs: number): void {
    this.crossfadeSeconds = Math.max(0, Math.min(12, Number.isFinite(secs) ? secs : 0));
    // Switched off mid-fade: the song must not stay quiet.
    if (this.crossfadeSeconds === 0) this.reset();
  }

  public getCrossfadeSeconds(): number {
    return this.crossfadeSeconds;
  }

  private fadeInSeconds(): number {
    return Math.min(this.crossfadeSeconds, MAX_FADE_IN_SECS);
  }

  /** Whether the song after this fade-out should start silent and wait. */
  public setHoldNext(hold: boolean): void {
    this.holdNext = hold;
  }

  public isHeld(): boolean {
    return this.heldSinceMs !== null;
  }

  /** Ends a hold: the song comes up to full level quickly, with no fade-in
   * (the listener has been hearing it from the other player). */
  public release(): void {
    this.holdNext = false;
    if (this.heldSinceMs === null) return;
    this.heldSinceMs = null;
    this.fadingIn = false;
    AudioEngine.getInstance().setFadeGain(1, HOLD_RELEASE_SECS);
  }

  private startIncoming(): void {
    if (this.holdNext) {
      this.holdNext = false;
      this.heldSinceMs = this.now();
      this.fadingIn = false;
    } else {
      this.fadingIn = true;
    }
  }

  private reset(): void {
    this.holdNext = false;
    this.heldSinceMs = null;
    this.fadingIn = false;
    this.inFadeOut = false;
    AudioEngine.getInstance().resetFade();
  }

  public onTrackChange(track: TrackInfo): void {
    const id = track.videoId || `${track.title}-${track.artist}`;
    // The observer also reports metadata arriving mid-song (cover, album, a
    // corrected duration) as a track change. That's the same song: fading
    // it in from silence again dipped the volume at random moments.
    if (id === this.currentTrackId) return;
    this.currentTrackId = id;
    // Only a song that follows a faded-out one fades in, and only when it is
    // actually starting. One the user picked by hand is already audible by
    // the time it is detected (fading it then was a dip, not a fade-in), and
    // one picked up mid-way (resume on launch) just plays at full level.
    const followsFade = this.fadingIn || this.inFadeOut;
    if (this.heldSinceMs !== null) {
      // Already held from the moment it started playing.
    } else if (followsFade && track.currentTimeSecs < this.fadeInSeconds()) {
      this.startIncoming();
    } else {
      this.fadingIn = false;
    }
    this.inFadeOut = false;
    this.lastPosition = track.currentTimeSecs;

    if (this.crossfadeSeconds <= 0) return;
    this.apply(track.currentTimeSecs, track);
  }

  public onTick(currentTimeSecs: number, track: TrackInfo | null): void {
    if (!track || this.crossfadeSeconds <= 0) return;

    // The position fell from the end of a song to the start: repeat-one
    // restarted it, or the next song is playing and its details are still on
    // the way. Either way a song is starting, so it fades in from here
    // instead of staying at the silent end of the fade-out.
    if (this.inFadeOut && currentTimeSecs < RESTART_WINDOW_SECS && this.lastPosition > currentTimeSecs) {
      this.startIncoming();
      this.inFadeOut = false;
    }
    this.lastPosition = currentTimeSecs;
    this.apply(currentTimeSecs, track);
  }

  private apply(positionSecs: number, track: TrackInfo): void {
    if (this.heldSinceMs !== null) {
      // Whatever went wrong with the hand-over, the music must come back.
      if (this.now() - this.heldSinceMs > MAX_HOLD_MS) {
        this.release();
      } else {
        AudioEngine.getInstance().setFadeGain(0, 0.05);
        return;
      }
    }
    const fadeIn = this.fadingIn ? this.fadeInSeconds() : 0;
    if (this.fadingIn && positionSecs >= fadeIn) this.fadingIn = false;

    const duration = track.durationSecs > 0 ? preciseDuration(track.durationSecs, this.readPlayerDuration()) : 0;
    // The song's details can lag behind the song (see onTick): a duration
    // that is the previous song's must not fade the new one.
    const fadeOut = duration > 0 && positionSecs <= duration + 1 ? this.crossfadeSeconds : 0;
    this.inFadeOut = fadeOut > 0 && duration - positionSecs < fadeOut;

    // Where the song will be when the ramp lands, not where it is now.
    const ahead = positionSecs + FADE_RAMP_SECS * this.readPlaybackRate();
    AudioEngine.getInstance().setFadeGain(fadeGainAt(ahead, duration, fadeOut, fadeIn), FADE_RAMP_SECS);
  }

  /** Called when the plugin tears down: leaves the audio at full level. */
  public destroy(): void {
    this.reset();
  }
}
