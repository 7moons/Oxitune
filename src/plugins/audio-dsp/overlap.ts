import { TrackInfo } from '../types';
import { preciseDuration } from './crossfade';

/**
 * Overlapping crossfade (experimental): the next song starts in a second
 * player while the current one fades out, then YouTube Music's own player
 * takes it over.
 *
 * YTM plays one stream at a time, so the ordinary crossfade is a fade
 * through a quiet point. Here the backend finds the next song's audio stream
 * (yt-dlp), and a second `<audio>` plays its first seconds under the
 * fade-out. When YTM moves on to that song, its player starts silent, is
 * moved to where the second player is, and the two swap in a quarter of a
 * second.
 *
 * Every step can fail (no yt-dlp, a queue that changed, an ad, a stream that
 * won't load), and each failure ends the same way: the second player stops
 * and the ordinary crossfade carries on. The hold on YTM's player also ends
 * by itself after `MAX_HOLD_MS` (crossfade.ts), so the music is never left
 * silent.
 */

/** How long before the end the next song's stream is looked up. */
export const PREPARE_SECS = 45;
/** With less of the song left than this there is no time to look the next
 * one up and buffer it. */
export const MIN_PREPARE_SECS = 4;
/** The second player may join the fade late (a slow lookup, a seek to near
 * the end), but not in the song's last moments. */
export const MIN_START_SECS = 1.5;
/** The song has to stay paused this long before the second player pauses
 * with it. */
export const PAUSE_DEBOUNCE_MS = 300;
/** YTM's player is asked for a little ahead of the second player: a seek
 * takes a moment, and the second player keeps going meanwhile. */
export const SEEK_LEAD_SECS = 0.3;
/** Close enough to swap without an audible jump. */
export const SYNC_TOLERANCE_SECS = 0.12;
const MAX_RESEEKS = 3;
/** Ticks in a row the main player must really be playing before the swap. */
export const STEADY_TICKS = 2;
/** More than this between two ticks is a seek landing, not playback. */
const MAX_TICK_ADVANCE_SECS = 1.5;
/** The hand-over is forced after this long, in sync or not. */
export const HANDOFF_TIMEOUT_MS = 8000;
/** A song that started with no details arriving is an ad or the wrong
 * song: give up on the overlap after this long. */
export const CONFIRM_TIMEOUT_MS = 4000;
/** The two players swap over this long. */
export const SWAP_SECS = 0.25;

/** The second player, as far as the controller needs it. */
export interface OverlayPlayer {
  /** Starts loading `url`; nothing is heard until `play`. */
  load(url: string): void;
  play(): void;
  pause(): void;
  /** 0..1 on top of the main player's own volume. */
  setLevel(level: number, rampSecs?: number): void;
  /** Follows YTM's volume slider and mute. */
  setVolume(volume: number, muted: boolean): void;
  currentTime(): number;
  /** Enough is buffered to start right now. */
  ready(): boolean;
  failed(): boolean;
  /** Stops and frees it; after `fadeSecs` when given. */
  dispose(fadeSecs?: number): void;
}

/** What the controller holds the main player's crossfade by. */
export interface FadeHold {
  setHoldNext(hold: boolean): void;
  isHeld(): boolean;
  release(): void;
}

export interface MainPlayerState {
  paused: boolean;
  /**
   * Paused because someone paused it. `paused` alone is also true for a
   * moment whenever YTM changes songs or seeks; pausing the second player
   * on that cut a hole into the music exactly at the song change.
   */
  userPaused: boolean;
  seeking: boolean;
  /** `HTMLMediaElement.readyState`. */
  readyState: number;
  /** The element's own `currentTime`: it only moves while sound really
   * comes out, unlike the player's reported position. */
  mediaTime: number;
  volume: number;
  muted: boolean;
}

export interface OverlapDeps {
  /** The next song's stream address; rejects when it can't be had. */
  resolve(videoId: string): Promise<string>;
  /** The song after the playing one in YTM's queue. */
  nextVideoId(): string | null;
  createOverlay(): OverlayPlayer | null;
  seekMain(secs: number): void;
  mainState(): MainPlayerState | null;
  playerDuration(): number | undefined;
  isAd(): boolean;
  repeatsOne(): boolean;
  inRoom(): boolean;
  now(): number;
  log(message: string): void;
}

type Phase = 'idle' | 'resolving' | 'ready' | 'overlapping' | 'handoff';

/** The second player's level `progress` (0..1) of the way through the
 * fade window: the equal-power partner of the fade-out in crossfade.ts. */
export function overlapLevel(progress: number): number {
  return Math.sin(Math.max(0, Math.min(1, progress)) * (Math.PI / 2));
}

export class OverlapController {
  private enabled = false;
  private crossfadeSeconds = 0;
  private phase: Phase = 'idle';
  private overlay: OverlayPlayer | null = null;
  /** The song being prepared or played in the second player. */
  private nextId: string | null = null;
  /** The playing song the current attempt belongs to. */
  private forId: string | null = null;
  /** Songs already tried (or ruled out): one attempt per song. */
  private attemptedFor: string | null = null;
  /** Bumped whenever an attempt ends, so a late lookup is ignored. */
  private attempt = 0;
  private lastPosition = -1;
  private wrappedAtMs: number | null = null;
  private handoffAtMs = 0;
  private reseeks = 0;
  private lead = SEEK_LEAD_SECS;
  private lastMediaTime = -1;
  private steadyTicks = 0;
  private overlayPaused = false;
  private pausedSinceMs: number | null = null;

  constructor(
    private readonly deps: OverlapDeps,
    private readonly fade: FadeHold
  ) {}

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.abort('switched off');
  }

  public setCrossfadeSeconds(secs: number): void {
    this.crossfadeSeconds = Math.max(0, Math.min(12, Number.isFinite(secs) ? secs : 0));
    if (this.crossfadeSeconds === 0) this.abort('crossfade off');
  }

  public getPhase(): Phase {
    return this.phase;
  }

  /** Keeps the second player paused exactly while the user has the song
   * paused; returns whether that is now. */
  private followPause(main: MainPlayerState, overlay: OverlayPlayer): boolean {
    if (!main.userPaused) {
      this.pausedSinceMs = null;
    } else if (this.pausedSinceMs === null) {
      this.pausedSinceMs = this.deps.now();
    }
    const paused = this.pausedSinceMs !== null && this.deps.now() - this.pausedSinceMs >= PAUSE_DEBOUNCE_MS;
    if (paused !== this.overlayPaused) {
      this.overlayPaused = paused;
      if (paused) overlay.pause();
      else overlay.play();
    }
    return paused;
  }

  private active(): boolean {
    return this.enabled && this.crossfadeSeconds > 0;
  }

  public onTrackChange(track: TrackInfo): void {
    const id = track.videoId ?? null;
    // More details for the song already playing: nothing to do.
    if (id !== null && id === this.forId && this.phase !== 'overlapping') return;
    if (this.phase === 'overlapping' && id !== null && id === this.nextId) {
      this.startHandoff();
      return;
    }
    if (this.phase === 'handoff' && id === this.nextId) return;
    if (this.phase !== 'idle') this.abort('another song started');
  }

  public onTick(positionSecs: number, track: TrackInfo | null): void {
    if (!this.active() || !track) return;
    const main = this.deps.mainState();
    if (!main) return;
    const last = this.lastPosition;
    this.lastPosition = positionSecs;

    if (this.deps.inRoom()) {
      // The hand-over seeks, and a room would send that seek to everyone.
      if (this.phase !== 'idle') this.abort('in a room');
      return;
    }

    this.overlay?.setVolume(main.volume, main.muted);
    if (this.overlay?.failed()) {
      this.abort('the second player failed');
      return;
    }

    if (this.phase === 'handoff') {
      this.tickHandoff(positionSecs, main);
      return;
    }

    const duration = track.durationSecs > 0 ? preciseDuration(track.durationSecs, this.deps.playerDuration()) : 0;
    if (duration <= 0) return;
    const remaining = duration - positionSecs;
    const trackId = track.videoId ?? null;

    if (this.phase === 'idle') {
      this.maybePrepare(trackId, remaining);
      return;
    }
    if (trackId !== this.forId && this.phase !== 'overlapping') {
      this.abort('the song changed');
      return;
    }

    if (this.phase === 'ready') {
      const window = this.crossfadeSeconds;
      if (remaining < MIN_START_SECS) {
        this.deps.log('overlap: skipped (the next song was not buffered in time)');
        this.abort('too late to start');
      } else if (remaining <= window && !main.paused && this.overlay?.ready()) {
        // Normally the first tick inside the window; later when the lookup
        // or the buffering took longer. The level then comes up to where the
        // fade already is instead of the overlap being dropped.
        this.fade.setHoldNext(true);
        this.overlay.setLevel(0);
        this.overlay.play();
        this.overlayPaused = false;
        this.pausedSinceMs = null;
        this.wrappedAtMs = null;
        this.phase = 'overlapping';
        this.deps.log(`overlap: started ${remaining.toFixed(1)}s before the end`);
      }
      return;
    }

    if (this.phase === 'overlapping') {
      this.tickOverlap(positionSecs, last, remaining, main);
    }
  }

  private maybePrepare(trackId: string | null, remaining: number): void {
    if (!trackId || trackId === this.attemptedFor) return;
    if (remaining > PREPARE_SECS || remaining < MIN_PREPARE_SECS) return;
    this.attemptedFor = trackId;
    // One line per song either way: an overlap that doesn't happen must say why.
    if (this.deps.repeatsOne() || this.deps.isAd()) {
      this.deps.log('overlap: skipped (repeat-one or an ad)');
      return;
    }
    const nextId = this.deps.nextVideoId();
    if (!nextId || nextId === trackId) {
      this.deps.log('overlap: skipped (no next song in the queue)');
      return;
    }
    this.deps.log(`overlap: looking up the next song ${remaining.toFixed(0)}s before the end`);

    const attempt = ++this.attempt;
    this.phase = 'resolving';
    this.forId = trackId;
    this.nextId = nextId;
    this.deps.resolve(nextId).then(
      (url) => {
        if (attempt !== this.attempt || this.phase !== 'resolving') return;
        const overlay = this.deps.createOverlay();
        if (!overlay) {
          this.abort('no second player');
          return;
        }
        this.overlay = overlay;
        overlay.setLevel(0);
        overlay.load(url);
        this.phase = 'ready';
        this.deps.log('overlap: the next song is loading in the second player');
      },
      (e: unknown) => {
        if (attempt !== this.attempt) return;
        const why = e instanceof Error ? e.message : String(e);
        // Logged even though nothing was playing yet: without it, an overlap
        // that never happens leaves no trace of why.
        this.deps.log(`overlap: no stream for the next song (${why})`);
        this.abort('no stream');
      }
    );
  }

  private tickOverlap(positionSecs: number, last: number, remaining: number, main: MainPlayerState): void {
    const overlay = this.overlay;
    if (!overlay) {
      this.abort('the second player is gone');
      return;
    }
    if (this.deps.isAd()) {
      this.abort('an ad started');
      return;
    }
    // Pausing the song pauses both.
    this.followPause(main, overlay);

    // The main player went from the end of the song to the start of
    // something: the next song (its details follow) or not.
    if (this.wrappedAtMs === null && last > positionSecs && positionSecs < 2 && last > 2) {
      this.wrappedAtMs = this.deps.now();
    }
    if (this.wrappedAtMs !== null) {
      overlay.setLevel(1, 0.1);
      if (this.deps.now() - this.wrappedAtMs > CONFIRM_TIMEOUT_MS) this.abort('the next song was never confirmed');
      return;
    }

    const window = this.crossfadeSeconds;
    // Seeked back out of the fade: the song plays on, the second player waits.
    if (remaining > window + 1) {
      this.abort('seeked out of the fade');
      return;
    }
    overlay.setLevel(overlapLevel(1 - remaining / window), 0.3);
  }

  private startHandoff(): void {
    const overlay = this.overlay;
    if (!overlay) {
      this.abort('the second player is gone');
      return;
    }
    this.phase = 'handoff';
    this.forId = this.nextId;
    // This song must not be prepared for again as "the playing one" until
    // it nears its own end; that is a different attempt.
    this.handoffAtMs = this.deps.now();
    this.reseeks = 0;
    this.steadyTicks = 0;
    this.lastMediaTime = -1;
    this.lead = SEEK_LEAD_SECS;
    overlay.setLevel(1, 0.1);
    this.deps.seekMain(overlay.currentTime() + this.lead);
    this.deps.log('overlap: handing over to the player');
  }

  private tickHandoff(positionSecs: number, main: MainPlayerState): void {
    const overlay = this.overlay;
    if (!overlay) {
      this.finish('the second player is gone');
      return;
    }
    if (this.followPause(main, overlay)) {
      // Paused mid hand-over: the clock for forcing it stops too.
      this.handoffAtMs = this.deps.now();
      return;
    }
    if (this.deps.now() - this.handoffAtMs > HANDOFF_TIMEOUT_MS || !this.fade.isHeld()) {
      this.finish('forced');
      return;
    }
    // The player reports the position it was sent to the moment it is
    // asked, long before it has loaded that part of the song. Swapping on
    // that left a gap: the second player faded away while this one was
    // still buffering. Only the media clock moving, tick after tick, says
    // sound is really coming out.
    const moved = this.lastMediaTime < 0 ? 0 : main.mediaTime - this.lastMediaTime;
    this.lastMediaTime = main.mediaTime;
    const playing = !main.seeking && main.readyState >= 3 && moved > 0.02 && moved < MAX_TICK_ADVANCE_SECS;
    this.steadyTicks = playing ? this.steadyTicks + 1 : 0;
    if (this.steadyTicks < STEADY_TICKS) return;

    const ahead = positionSecs - overlay.currentTime();
    if (Math.abs(ahead) <= SYNC_TOLERANCE_SECS) {
      this.finish(`in sync (${(ahead * 1000).toFixed(0)}ms)`);
    } else if (this.reseeks < MAX_RESEEKS) {
      this.reseeks++;
      this.steadyTicks = 0;
      this.deps.log(`overlap: the player landed ${(ahead * 1000).toFixed(0)}ms off, correcting`);
      // The last seek landed `ahead` off: aim that much the other way.
      this.lead = Math.max(0, Math.min(2, this.lead - ahead));
      this.deps.seekMain(overlay.currentTime() + this.lead);
    } else {
      this.finish(`out of sync by ${ahead.toFixed(2)}s`);
    }
  }

  /** The main player takes over; the second one fades away under it. */
  private finish(why: string): void {
    this.deps.log(`overlap: handed over, ${why}`);
    this.fade.release();
    this.overlay?.dispose(SWAP_SECS);
    this.clear();
  }

  private abort(why: string): void {
    if (this.phase === 'idle' && !this.overlay) return;
    if (this.phase === 'overlapping' || this.phase === 'handoff') this.deps.log(`overlap: stopped, ${why}`);
    this.fade.setHoldNext(false);
    this.fade.release();
    this.overlay?.dispose(this.phase === 'overlapping' || this.phase === 'handoff' ? SWAP_SECS : 0);
    this.clear();
  }

  private clear(): void {
    this.attempt++;
    this.overlay = null;
    this.phase = 'idle';
    this.nextId = null;
    this.forId = null;
    this.wrappedAtMs = null;
    this.overlayPaused = false;
    this.pausedSinceMs = null;
  }

  public destroy(): void {
    this.abort('unloaded');
  }
}
