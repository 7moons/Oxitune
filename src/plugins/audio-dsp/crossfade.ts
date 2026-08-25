import { AudioEngine } from './engine';
import { PlayerBridge } from '../../preload/bridge';
import { TrackInfo } from '../types';

export class CrossfadeController {
  private crossfadeSeconds = 0;
  private fadeOutTriggered = false;
  private currentTrackId = '';

  public setCrossfadeSeconds(secs: number): void {
    this.crossfadeSeconds = Math.max(0, Math.min(12, secs));
  }

  public getCrossfadeSeconds(): number {
    return this.crossfadeSeconds;
  }

  public onTrackChange(track: TrackInfo): void {
    this.fadeOutTriggered = false;
    this.currentTrackId = track.videoId || `${track.title}-${track.artist}`;

    if (this.crossfadeSeconds > 0) {
      AudioEngine.getInstance().fadeIn(this.crossfadeSeconds);
    } else {
      AudioEngine.getInstance().resetFade();
    }
  }

  public onTick(currentTimeSecs: number, track: TrackInfo | null): void {
    if (!track || this.crossfadeSeconds <= 0 || track.durationSecs <= 0) return;

    const remaining = track.durationSecs - currentTimeSecs;

    // Trigger fade-out when remaining time matches crossfade seconds
    if (remaining <= this.crossfadeSeconds && !this.fadeOutTriggered && remaining > 0) {
      this.fadeOutTriggered = true;
      console.log(`[YTMD Crossfade] Fading out (${remaining.toFixed(1)}s remaining)...`);
      AudioEngine.getInstance().fadeOut(remaining);

      // Auto-advance to next song at boundary
      setTimeout(() => {
        const id = track.videoId || `${track.title}-${track.artist}`;
        if (this.currentTrackId === id) {
          console.log('[YTMD Crossfade] Advancing to next track...');
          PlayerBridge.next();
        }
      }, Math.max(100, (remaining - 0.2) * 1000));
    }
  }
}
