import { TrackInfo } from '../plugins/types';

export function parseTimeStrToSecs(timeStr: string): number {
  const parts = timeStr.trim().split(':').map((p) => parseInt(p, 10));
  if (parts.some((p) => isNaN(p))) return 0;
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

export class PlayerObserver {
  private currentTrack: TrackInfo | null = null;
  private onTrackChangeCallbacks: ((track: TrackInfo) => void)[] = [];
  private onPlaybackChangeCallbacks: ((isPlaying: boolean) => void)[] = [];
  private onTickCallbacks: ((time: number) => void)[] = [];
  private tickInterval: number | null = null;
  private pauseDebounceTimeout: any = null;
  private mutationObserver: MutationObserver | null = null;
  private attachedVideo: HTMLVideoElement | null = null;

  // Named instance methods (not per-call anonymous closures) so
  // detachVideoListeners can remove the exact same listener reference that
  // attachVideoListeners registered.
  private readonly handleVideoPlay = () => this.handlePlaybackChange(true);
  private readonly handleVideoPause = () => this.handlePlaybackChange(false);
  private readonly handleVideoTimeUpdate = () => {
    if (!this.attachedVideo) return;
    const current = this.attachedVideo.currentTime;
    this.onTickCallbacks.forEach((cb) => cb(current));
  };

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
    // 1. Intercept MediaSession metadata setter for instant 0ms track change detection
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator && navigator.mediaSession) {
      const ms = navigator.mediaSession;
      let currentMeta = ms.metadata;
      try {
        Object.defineProperty(ms, 'metadata', {
          get: () => currentMeta,
          set: (val: MediaMetadata | null) => {
            currentMeta = val;
            // Immediate check when YouTube Music pushes new track metadata
            setTimeout(() => this.checkTrackUpdate(), 0);
          },
          configurable: true,
          enumerable: true
        });
      } catch (_) {
        // Ignored if non-configurable
      }
    }

    // 2. Poll & observe video element
    // YTM's SPA can swap out the <video> element (navigation/player
    // reload). `syncVideoListeners` is re-run from the 250ms fallback poll
    // below so listeners always follow the live element instead of
    // silently going stale (falling back to tick-resolution-only updates)
    // for the rest of the session — same class of bug as the power
    // plugin's wake-lock listeners, same fix shape.
    this.syncVideoListeners();

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
    this.mutationObserver = observer;

    // 4. Regular polling fallback to guarantee accuracy
    this.tickInterval = window.setInterval(() => {
      this.syncVideoListeners();
      this.checkTrackUpdate();
      const video = document.querySelector('video');
      if (video && !video.paused) {
        this.onTickCallbacks.forEach((cb) => cb(video.currentTime));
      }
    }, 250);
  }

  private attachVideoListeners(video: HTMLVideoElement): void {
    video.addEventListener('play', this.handleVideoPlay);
    video.addEventListener('playing', this.handleVideoPlay);
    video.addEventListener('pause', this.handleVideoPause);
    video.addEventListener('ended', this.handleVideoPause);
    video.addEventListener('timeupdate', this.handleVideoTimeUpdate);
    this.attachedVideo = video;
  }

  private detachVideoListeners(video: HTMLVideoElement): void {
    video.removeEventListener('play', this.handleVideoPlay);
    video.removeEventListener('playing', this.handleVideoPlay);
    video.removeEventListener('pause', this.handleVideoPause);
    video.removeEventListener('ended', this.handleVideoPause);
    video.removeEventListener('timeupdate', this.handleVideoTimeUpdate);
  }

  private syncVideoListeners(): void {
    const video = document.querySelector('video');
    if (video && video !== this.attachedVideo) {
      if (this.attachedVideo) this.detachVideoListeners(this.attachedVideo);
      this.attachVideoListeners(video);
    }
  }

  private extractTrackInfo(): TrackInfo | null {
    const video = document.querySelector('video');
    const moviePlayer = document.getElementById('movie_player') as any;
    
    // Ignore ads completely
    const isAd = Boolean(
      moviePlayer && (
        (typeof moviePlayer.getAdState === 'function' && moviePlayer.getAdState() === 1) ||
        (typeof moviePlayer.isAdPlaying === 'function' && moviePlayer.isAdPlaying()) ||
        moviePlayer.classList?.contains('ad-showing') ||
        moviePlayer.classList?.contains('ad-interrupting')
      )
    );
    if (isAd) return null;

    // Priority 1: MediaSession metadata
    const msMeta = navigator.mediaSession?.metadata;
    let title = msMeta?.title || '';
    let artist = msMeta?.artist || '';
    let album = msMeta?.album || '';
    let coverUrl = '';

    if (msMeta?.artwork && msMeta.artwork.length > 0) {
      const bestArt = msMeta.artwork[msMeta.artwork.length - 1];
      if (bestArt && bestArt.src) {
        coverUrl = bestArt.src;
      }
    }

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
      if (imgEl && imgEl.src) coverUrl = imgEl.src;
    }

    // Sanitize and upgrade coverUrl quality
    if (coverUrl.startsWith('//')) {
      coverUrl = `https:${coverUrl}`;
    }
    // Upgrade Google thumbnail resolution for sharp Discord cover art
    if (coverUrl.includes('googleusercontent.com') && /=w\d+-h\d+/.test(coverUrl)) {
      coverUrl = coverUrl.replace(/=w\d+-h\d+[^=]*/, '=w512-h512-l90-rj');
    }

    // Extract Video ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v') || undefined;

    let durationSecs = 0;
    let currentTimeSecs = 0;

    // Source A: moviePlayer API (instantaneous)
    if (moviePlayer && typeof moviePlayer.getDuration === 'function') {
      const d = moviePlayer.getDuration();
      if (typeof d === 'number' && Number.isFinite(d) && d > 0) {
        durationSecs = Math.floor(d);
      }
    }
    if (moviePlayer && typeof moviePlayer.getCurrentTime === 'function') {
      const c = moviePlayer.getCurrentTime();
      if (typeof c === 'number' && Number.isFinite(c) && c >= 0) {
        currentTimeSecs = Math.floor(c);
      }
    }

    // Source B: HTML5 video element
    if (!durationSecs && video && Number.isFinite(video.duration) && video.duration > 0) {
      durationSecs = Math.floor(video.duration);
    }
    if (!currentTimeSecs && video && Number.isFinite(video.currentTime) && video.currentTime >= 0) {
      currentTimeSecs = Math.floor(video.currentTime);
    }

    // Source C: Player Bar DOM time-info (e.g. "0:15 / 3:45")
    const timeInfoEl = document.querySelector<HTMLElement>(
      'ytmusic-player-bar .time-info, ytmusic-player-bar #time-info, .ytmusic-player-bar.time-info'
    );
    if (timeInfoEl && timeInfoEl.textContent) {
      const parts = timeInfoEl.textContent.split('/').map((s) => s.trim());
      if (parts.length === 2) {
        if (!currentTimeSecs) {
          currentTimeSecs = parseTimeStrToSecs(parts[0]);
        }
        if (!durationSecs) {
          durationSecs = parseTimeStrToSecs(parts[1]);
        }
      }
    }

    // Source D: Slider aria-valuemax
    if (!durationSecs) {
      const slider = document.querySelector('ytmusic-player-bar #progress-bar, #progress-bar');
      const maxAttr = slider?.getAttribute('aria-valuemax');
      if (maxAttr) {
        const val = parseInt(maxAttr, 10);
        if (!isNaN(val) && val > 0) {
          durationSecs = val;
        }
      }
    }

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

    const metadataUpdated =
      this.currentTrack !== null &&
      ((!this.currentTrack.durationSecs && track.durationSecs > 0) ||
        (!this.currentTrack.coverUrl && !!track.coverUrl) ||
        (!this.currentTrack.album && !!track.album) ||
        (!this.currentTrack.videoId && !!track.videoId));

    const playStateChanged =
      this.currentTrack !== null && this.currentTrack.isPlaying !== track.isPlaying;

    this.currentTrack = track;

    if (isNewTrack || metadataUpdated) {
      if (this.pauseDebounceTimeout !== null) {
        clearTimeout(this.pauseDebounceTimeout);
        this.pauseDebounceTimeout = null;
      }
      this.onTrackChangeCallbacks.forEach((cb) => cb(track));
    }

    if (playStateChanged) {
      this.onPlaybackChangeCallbacks.forEach((cb) => cb(track.isPlaying));
    }
  }

  private handlePlaybackChange(isPlaying: boolean): void {
    if (isPlaying) {
      if (this.pauseDebounceTimeout !== null) {
        clearTimeout(this.pauseDebounceTimeout);
        this.pauseDebounceTimeout = null;
      }
      if (this.currentTrack) {
        this.currentTrack.isPlaying = true;
      }
      this.checkTrackUpdate();
      this.onPlaybackChangeCallbacks.forEach((cb) => cb(true));
    } else {
      // Debounce pause by 400ms to ignore transient pause events during song transitions
      if (this.pauseDebounceTimeout !== null) {
        clearTimeout(this.pauseDebounceTimeout);
      }
      this.pauseDebounceTimeout = setTimeout(() => {
        this.pauseDebounceTimeout = null;
        if (this.currentTrack) {
          this.currentTrack.isPlaying = false;
        }
        this.onPlaybackChangeCallbacks.forEach((cb) => cb(false));
      }, 400);
    }
  }

  public destroy(): void {
    if (this.pauseDebounceTimeout !== null) {
      clearTimeout(this.pauseDebounceTimeout);
      this.pauseDebounceTimeout = null;
    }
    if (this.tickInterval !== null) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    if (this.mutationObserver !== null) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    if (this.attachedVideo !== null) {
      this.detachVideoListeners(this.attachedVideo);
      this.attachedVideo = null;
    }
  }
}
