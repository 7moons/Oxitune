import { AudioEngine } from './engine';
import { PlayerBridge } from '../../preload/bridge';
import { TrackInfo } from '../types';

const repeatsOne = (): boolean => typeof document !== 'undefined' && PlayerBridge.getRepeatMode() === 'one';

export class SkipSilenceController {
  private enabled = false;
  private silenceThresholdDb = -50;
  private consecutiveSilentTicks = 0;
  private checkedIntro = false;
  private outroSkipped = false;

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public onTrackChange(): void {
    this.outroSkipped = false;
    this.checkedIntro = false;
    this.consecutiveSilentTicks = 0;
  }

  public onTick(currentTimeSecs: number, track: TrackInfo | null, video: HTMLVideoElement | null): void {
    if (!this.enabled || !track || !video || video.paused || video.ended) return;

    const powerDb = AudioEngine.getInstance().getAudioPowerDb();
    // No analyser (Web Audio graph not built): unknown, not silent. Treating
    // it as silence used to fast-forward every intro and skip every outro.
    if (powerDb === null) return;

    // 1. Skip intro silence (in first 15 seconds)
    if (!this.checkedIntro && currentTimeSecs < 15) {
      if (powerDb < this.silenceThresholdDb) {
        this.consecutiveSilentTicks++;
        // If silence persists for 2 consecutive ticks, fast-forward 1s
        if (this.consecutiveSilentTicks >= 2 && currentTimeSecs < 12) {
          console.log(`[Oxitune Skip Silence] Intro silence detected (${powerDb.toFixed(1)} dB). Fast forwarding...`);
          video.currentTime += 1.0;
          this.consecutiveSilentTicks = 0;
        }
      } else {
        // Sound has begun
        this.checkedIntro = true;
        this.consecutiveSilentTicks = 0;
      }
    } else {
      this.checkedIntro = true;
    }

    // 2. Skip outro silence (in last 10 seconds)
    if (!this.outroSkipped && track.durationSecs > 15 && currentTimeSecs > track.durationSecs - 10) {
      if (powerDb < this.silenceThresholdDb) {
        this.consecutiveSilentTicks++;
        if (this.consecutiveSilentTicks >= 3) {
          this.consecutiveSilentTicks = 0;
          // Once per song: the next one takes a moment to load, and counting
          // on through that pressed "next" a second time (two songs skipped).
          this.outroSkipped = true;
          // "Next" on repeat-one leaves the song; let it loop instead.
          if (repeatsOne()) return;
          console.log(`[Oxitune Skip Silence] Outro silence detected (${powerDb.toFixed(1)} dB). Advancing to next track...`);
          PlayerBridge.next();
        }
      } else {
        this.consecutiveSilentTicks = 0;
      }
    }
  }
}
