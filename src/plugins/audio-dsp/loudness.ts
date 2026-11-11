import { AudioEngine, normalizationGainDb } from './engine';
import { PlayerBridge } from '../../preload/bridge';

/** What the player says about the loaded song's loudness. */
export interface PlayerLoudness {
  videoId: string | undefined;
  loudnessDb: number | undefined;
}

const readPlayerLoudness = (): PlayerLoudness | null => {
  if (typeof document === 'undefined') return null;
  const response = PlayerBridge.getMoviePlayer()?.getPlayerResponse?.();
  if (!response) return null;
  return {
    videoId: response.videoDetails?.videoId,
    loudnessDb: response.playerConfig?.audioConfig?.loudnessDb
  };
};

/** How long to wait for the player to describe a new song before leaving it
 * at its own level. */
export const LOUDNESS_WAIT_TICKS = 40;

/**
 * Sets each song's normalization gain from YouTube's loudness figure for it.
 * The player's details switch a moment after the song does, so a new song
 * plays unboosted (never with the previous song's boost) until they match.
 */
export class LoudnessController {
  private enabled = false;
  private pendingId: string | null = null;
  private ticksWaited = 0;
  private resolvedId: string | null = null;

  constructor(private readonly read: () => PlayerLoudness | null = readPlayerLoudness) {}

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.pendingId = null;
      this.resolvedId = null;
      AudioEngine.getInstance().setNormalizationDb(0);
    }
  }

  /** Call with the song's id when it changes (and when switched on). */
  public onTrackChange(videoId: string | undefined): void {
    if (!this.enabled) return;
    // The same song again (its cover or album arrived): nothing to redo.
    if (videoId && videoId === this.resolvedId) return;
    this.resolvedId = null;
    this.pendingId = videoId ?? null;
    this.ticksWaited = 0;
    if (!this.resolve()) AudioEngine.getInstance().setNormalizationDb(0);
  }

  public onTick(): void {
    if (!this.enabled || this.pendingId === null) return;
    if (this.resolve()) return;
    if (++this.ticksWaited >= LOUDNESS_WAIT_TICKS) this.pendingId = null;
  }

  private resolve(): boolean {
    if (this.pendingId === null) return false;
    const info = this.read();
    if (!info || info.videoId !== this.pendingId) return false;
    this.resolvedId = this.pendingId;
    this.pendingId = null;
    AudioEngine.getInstance().setNormalizationDb(normalizationGainDb(info.loudnessDb));
    return true;
  }
}
