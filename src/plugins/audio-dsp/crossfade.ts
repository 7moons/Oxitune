import { AudioEngine } from './engine';
import { PlayerBridge } from '../../preload/bridge';
import { TrackInfo } from '../types';

export class CrossfadeController {
  private crossfadeSeconds = 0;
  private fadeOutTriggered = false;
  private currentTrackId = '';
  private pendingAdvanceTimeout: ReturnType<typeof setTimeout> | null = null;

  public setCrossfadeSeconds(secs: number): void {
    this.crossfadeSeconds = Math.max(0, Math.min(12, secs));
  }

  public getCrossfadeSeconds(): number {
    return this.crossfadeSeconds;
  }

  public onTrackChange(track: TrackInfo): void {
    const id = track.videoId || `${track.title}-${track.artist}`;
    // The observer also reports metadata arriving mid-song (cover, album, a
    // corrected duration) as a track change. That's the same song: fading
    // it in from silence again dipped the volume at random moments.
    if (id === this.currentTrackId) return;

    // A new track means any auto-advance scheduled for the previous one is
    // no longer relevant — cancel it instead of letting it fire and rely on
    // the currentTrackId check as the only guard.
    this.clearPendingAdvance();
    this.fadeOutTriggered = false;
    this.currentTrackId = id;

    // Only a song that is actually starting fades in; one picked up mid-way
    // (resume on launch, a late first detection) just plays at full level.
    if (this.crossfadeSeconds > 0 && track.currentTimeSecs < this.crossfadeSeconds) {
      AudioEngine.getInstance().fadeIn(this.crossfadeSeconds);
    } else {
      AudioEngine.getInstance().resetFade();
    }
  }

  public onTick(currentTimeSecs: number, track: TrackInfo | null): void {
    if (!track || this.crossfadeSeconds <= 0 || track.durationSecs <= 0) return;

    const remaining = track.durationSecs - currentTimeSecs;

    // User seeked back out of the fade window: undo the fade-out and the
    // scheduled advance, or the rest of the song plays silent and then
    // gets cut off.
    if (this.fadeOutTriggered && remaining > this.crossfadeSeconds + 1) {
      this.fadeOutTriggered = false;
      this.clearPendingAdvance();
      AudioEngine.getInstance().resetFade();
      return;
    }

    // Trigger fade-out when remaining time matches crossfade seconds
    if (remaining <= this.crossfadeSeconds && !this.fadeOutTriggered && remaining > 0) {
      this.fadeOutTriggered = true;
      console.log(`[Oscilla Crossfade] Fading out (${remaining.toFixed(1)}s remaining)...`);
      AudioEngine.getInstance().fadeOut(remaining);

      // Auto-advance to next song at boundary
      this.clearPendingAdvance();
      this.pendingAdvanceTimeout = setTimeout(() => {
        this.pendingAdvanceTimeout = null;
        const id = track.videoId || `${track.title}-${track.artist}`;
        if (this.currentTrackId === id) {
          console.log('[Oscilla Crossfade] Advancing to next track...');
          PlayerBridge.next();
        }
      }, Math.max(100, (remaining - 0.2) * 1000));
    }
  }

  private clearPendingAdvance(): void {
    if (this.pendingAdvanceTimeout !== null) {
      clearTimeout(this.pendingAdvanceTimeout);
      this.pendingAdvanceTimeout = null;
    }
  }

  /** Cancels any pending auto-advance. Called when the plugin tears down
   * (`onDestroy`) so a scheduled advance never fires after the controller
   * that owns it is gone. */
  public destroy(): void {
    this.clearPendingAdvance();
  }
}
