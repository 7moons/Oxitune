import { setPlayerVolumePercent } from './playerVolume';
import { takeRoomNext } from './syncRole';

export class PlayerBridge {
  static getVideo(): HTMLVideoElement | null {
    return document.querySelector('video') || document.querySelector('.html5-main-video');
  }

  static getPlayerBar(): HTMLElement | null {
    return document.querySelector('ytmusic-player-bar');
  }

  static playPause(): void {
    const playBtn = document.querySelector<HTMLElement>('#play-pause-button, ytmusic-player-bar #play-pause-button');
    if (playBtn) {
      playBtn.click();
      return;
    }
    const video = this.getVideo();
    if (video) {
      if (video.paused) {
        video.play();
      } else {
        video.pause();
      }
    }
  }

  static play(): void {
    const video = this.getVideo();
    if (video && video.paused) {
      this.playPause();
    }
  }

  static pause(): void {
    const video = this.getVideo();
    if (video && !video.paused) {
      this.playPause();
    }
  }

  /** Next song: the room's shared queue when this page hosts one that has
   * songs (see `takeRoomNext`), YTM's own up-next otherwise. */
  static next(): void {
    if (takeRoomNext()) return;
    this.nextInYtm();
  }

  /** YTM's own next button, whatever a room says. */
  static nextInYtm(): void {
    const nextBtn = document.querySelector<HTMLElement>(
      'ytmusic-player-bar .next-button, #player-bar-background .next-button, .next-button'
    );
    if (nextBtn) {
      nextBtn.click();
    }
  }

  static previous(): void {
    const prevBtn = document.querySelector<HTMLElement>(
      'ytmusic-player-bar .previous-button, #player-bar-background .previous-button, .previous-button'
    );
    if (prevBtn) {
      prevBtn.click();
    }
  }

  static seekTo(seconds: number): void {
    const video = this.getVideo();
    if (video && !isNaN(seconds)) {
      video.currentTime = Math.max(0, Math.min(seconds, video.duration || seconds));
    }
  }

  static setVolume(volume: number): void {
    const video = this.getVideo();
    if (video) {
      setPlayerVolumePercent(volume * 100, video);
    }
  }

  static toggleLike(): void {
    // `#button-shape-like` works in every UI language; the aria-label
    // fallback only matched English.
    const likeBtn = document.querySelector<HTMLElement>(
      'ytmusic-player-bar ytmusic-like-button-renderer #button-shape-like button, ytmusic-player-bar #like-button-renderer #button[aria-label*="Like"], ytmusic-like-button-renderer #button[aria-label*="Like"]'
    );
    if (likeBtn) {
      likeBtn.click();
    }
  }

  static toggleDislike(): void {
    const dislikeBtn = document.querySelector<HTMLElement>(
      'ytmusic-player-bar ytmusic-like-button-renderer #button-shape-dislike button, ytmusic-player-bar #like-button-renderer #button[aria-label*="Dislike"], ytmusic-like-button-renderer #button[aria-label*="Dislike"]'
    );
    if (dislikeBtn) {
      dislikeBtn.click();
    }
  }

  /** YTM's own like state for the playing song (`like-status` on the
   * player bar's like renderer; read only). */
  static getLikeStatus(): 'like' | 'dislike' | 'none' {
    const status = document
      .querySelector('ytmusic-player-bar ytmusic-like-button-renderer')
      ?.getAttribute('like-status');
    return status === 'LIKE' ? 'like' : status === 'DISLIKE' ? 'dislike' : 'none';
  }

  static getRepeatMode(): 'none' | 'all' | 'one' {
    const mode = document.querySelector('ytmusic-player-bar')?.getAttribute('repeat-mode');
    return mode === 'ALL' ? 'all' : mode === 'ONE' ? 'one' : 'none';
  }

  static isShuffleOn(): boolean {
    return document.querySelector('ytmusic-player-bar')?.hasAttribute('shuffle-on') ?? false;
  }

  static toggleShuffle(): void {
    document.querySelector<HTMLElement>('ytmusic-player-bar .shuffle, ytmusic-player-bar #shuffle-button')?.click();
  }

  /** Off → all → one → off, like YTM's own button. */
  static cycleRepeat(): void {
    document.querySelector<HTMLElement>('ytmusic-player-bar .repeat, ytmusic-player-bar #repeat-button')?.click();
  }

  static toggleMute(): void {
    const volumeBtn = document.querySelector<HTMLElement>('ytmusic-player-bar #volume-slider');
    const video = this.getVideo();
    if (video) {
      video.muted = !video.muted;
    }
    if (volumeBtn) {
      const muteBtn = volumeBtn.parentElement?.querySelector<HTMLElement>('paper-icon-button, #button');
      if (muteBtn) muteBtn.click();
    }
  }
}
