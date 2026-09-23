import { setPlayerVolumePercent } from './playerVolume';

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

  static next(): void {
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
    const likeBtn = document.querySelector<HTMLElement>(
      'ytmusic-player-bar #like-button-renderer #button[aria-label*="Like"], ytmusic-like-button-renderer #button[aria-label*="Like"]'
    );
    if (likeBtn) {
      likeBtn.click();
    }
  }

  static toggleDislike(): void {
    const dislikeBtn = document.querySelector<HTMLElement>(
      'ytmusic-player-bar #like-button-renderer #button[aria-label*="Dislike"], ytmusic-like-button-renderer #button[aria-label*="Dislike"]'
    );
    if (dislikeBtn) {
      dislikeBtn.click();
    }
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
