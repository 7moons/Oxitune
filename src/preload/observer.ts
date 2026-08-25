import { TrackInfo } from '../plugins/types';

export class PlayerObserver {
  private currentTrack: TrackInfo | null = null;
  private onTrackChangeCallbacks: ((track: TrackInfo) => void)[] = [];
  private onPlaybackChangeCallbacks: ((isPlaying: boolean) => void)[] = [];
  private onTickCallbacks: ((time: number) => void)[] = [];
  private tickInterval: number | null = null;

  constructor() {
    this.initObservers();
  }

  public getCurrentTrack(): TrackInfo | null {
    return this.currentTrack;
  }

  public onTrackChange(cb: (track: TrackInfo) => void): void {
    this.onTrackChangeCallbacks.push(cb);
  }

  public onPlaybackChange(cb: (isPlaying: boolean) => void): void {
    this.onPlaybackChangeCallbacks.push(cb);
  }

  public onTick(cb: (time: number) => void): void {
    this.onTickCallbacks.push(cb);
  }

  private initObservers(): void {
    // 1. Observe MediaSession changes
    if ('mediaSession' in navigator) {
      // MediaSession is active
    }

    // 2. Poll & observe video element
    const setupVideoListeners = () => {
      const video = document.querySelector('video');
      if (video) {
        video.addEventListener('play', () => this.handlePlaybackChange(true));
        video.addEventListener('pause', () => this.handlePlaybackChange(false));
        video.addEventListener('ended', () => this.handlePlaybackChange(false));
        video.addEventListener('timeupdate', () => {
          const current = video.currentTime;
          this.onTickCallbacks.forEach((cb) => cb(current));
        });
      }
    };

    // 3. MutationObserver throttled via requestAnimationFrame
    let isChecking = false;
    const throttledCheck = () => {
      if (isChecking) return;
      isChecking = true;
      requestAnimationFrame(() => {
        this.checkTrackUpdate();
        isChecking = false;
      });
    };

    const observer = new MutationObserver(throttledCheck);
    const target = document.querySelector('ytmusic-player-bar') || document.body;
    if (target) {
      observer.observe(target, { childList: true, subtree: true, characterData: true });
    }

    setupVideoListeners();

    // 4. Regular polling fallback to guarantee accuracy
    this.tickInterval = window.setInterval(() => {
      this.checkTrackUpdate();
      const video = document.querySelector('video');
      if (video && !video.paused) {
        this.onTickCallbacks.forEach((cb) => cb(video.currentTime));
      }
    }, 250);
  }

  private extractTrackInfo(): TrackInfo | null {
    const video = document.querySelector('video');
    
    // Ignore ads completely
    const isAd = Boolean(
      document.querySelector('.ad-showing, .ad-interrupting, .ytp-ad-player-overlay, .ytp-ad-text') ||
      video?.closest('.ad-showing')
    );
    if (isAd) return null;

    // Priority 1: MediaSession metadata
    const msMeta = navigator.mediaSession?.metadata;
    let title = msMeta?.title || '';
    let artist = msMeta?.artist || '';
    let album = msMeta?.album || '';
    let coverUrl = msMeta?.artwork?.[msMeta.artwork.length - 1]?.src || '';

    // Priority 2: DOM fallback
    if (!title) {
      const titleEl = document.querySelector<HTMLElement>(
        'ytmusic-player-bar .title, yt-formatted-string.title, .ytmusic-player-bar.title'
      );
      if (titleEl) title = titleEl.textContent?.trim() || '';
    }

    if (!artist) {
      const bylineEl = document.querySelector<HTMLElement>(
        'ytmusic-player-bar .byline, yt-formatted-string.byline, .ytmusic-player-bar.subtitle'
      );
      if (bylineEl) {
        const text = bylineEl.textContent?.trim() || '';
        const parts = text.split('•').map((s) => s.trim());
        artist = parts[0] || '';
        if (parts.length > 1) album = parts[1];
      }
    }

    if (!coverUrl) {
      const imgEl = document.querySelector<HTMLImageElement>(
        'ytmusic-player-bar .image, ytmusic-player-bar img#img, .thumbnail-image-wrapper img'
      );
      if (imgEl) coverUrl = imgEl.src;
    }

    // Extract Video ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v') || undefined;

    const durationSecs = video ? Math.floor(video.duration || 0) : 0;
    const currentTimeSecs = video ? Math.floor(video.currentTime || 0) : 0;
    const isPlaying = video ? !video.paused && !video.ended : false;

    if (!title) return null;

    return {
      title,
      artist: artist || 'Unknown Artist',
      album: album || undefined,
      coverUrl: coverUrl || undefined,
      durationSecs,
      currentTimeSecs,
      isPlaying,
      videoId
    };
  }

  private checkTrackUpdate(): void {
    const track = this.extractTrackInfo();
    if (!track) return;

    const isNewTrack =
      !this.currentTrack ||
      this.currentTrack.title !== track.title ||
      this.currentTrack.artist !== track.artist ||
      this.currentTrack.videoId !== track.videoId;

    const playStateChanged =
      this.currentTrack && this.currentTrack.isPlaying !== track.isPlaying;

    this.currentTrack = track;

    if (isNewTrack) {
      this.onTrackChangeCallbacks.forEach((cb) => cb(track));
    }

    if (playStateChanged) {
      this.onPlaybackChangeCallbacks.forEach((cb) => cb(track.isPlaying));
    }
  }

  private handlePlaybackChange(isPlaying: boolean): void {
    if (this.currentTrack) {
      this.currentTrack.isPlaying = isPlaying;
    }
    this.onPlaybackChangeCallbacks.forEach((cb) => cb(isPlaying));
  }

  public destroy(): void {
    if (this.tickInterval !== null) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }
}
