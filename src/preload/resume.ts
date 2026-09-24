import { invokeBackend } from './bridgeClient';
import { isSyncGuest } from './syncRole';

/**
 * Resume on launch. When the backend reopened the last song (the main
 * window then starts on `/watch?v=…`), put its position back: mute while
 * YTM's own autoplay starts it, seek, pause (or keep playing), unmute.
 * The target comes from `take_resume_session`, which answers only once per
 * launch, so a reload never seeks again.
 */

export interface ResumeTarget {
  video_id: string;
  position_secs: number;
  autoplay: boolean;
}

/** Give up if the song hasn't loaded by then (network, a changed page). */
export const RESUME_TIMEOUT_MS = 15_000;
const POLL_MS = 100;

export type ResumeStep = 'wait' | 'apply' | 'abandon';

/** What to do on one poll, given what the player shows right now. */
export function resumeStep(
  target: Pick<ResumeTarget, 'video_id'>,
  playerVideoId: string | undefined,
  videoReady: boolean,
  inRoom: boolean,
  elapsedMs: number
): ResumeStep {
  if (inRoom || elapsedMs > RESUME_TIMEOUT_MS) return 'abandon';
  if (playerVideoId && playerVideoId !== target.video_id) return 'abandon';
  return playerVideoId === target.video_id && videoReady ? 'apply' : 'wait';
}

type MoviePlayer = HTMLElement & {
  getVideoData?: () => { video_id?: string } | undefined;
};

const playerVideoId = () =>
  (document.getElementById('movie_player') as MoviePlayer | null)?.getVideoData?.()?.video_id || undefined;

/** Call as early as possible: the mute has to land before autoplay is heard. */
export function startResume(): void {
  const urlVideo = location.pathname === '/watch' ? new URLSearchParams(location.search).get('v') : null;
  if (!urlVideo) return;

  let released = false;
  const mutedByUs = new Set<HTMLVideoElement>();
  const muteEarly = (e: Event) => {
    const video = e.target;
    if (released || !(video instanceof HTMLVideoElement) || video.muted) return;
    video.muted = true;
    mutedByUs.add(video);
  };
  document.addEventListener('loadstart', muteEarly, true);
  document.addEventListener('play', muteEarly, true);

  const release = () => {
    if (released) return;
    released = true;
    document.removeEventListener('loadstart', muteEarly, true);
    document.removeEventListener('play', muteEarly, true);
    mutedByUs.forEach((v) => (v.muted = false));
    mutedByUs.clear();
  };

  const apply = (target: ResumeTarget, video: HTMLVideoElement) => {
    const done = () => {
      clearTimeout(fallback);
      video.removeEventListener('seeked', done);
      if (!target.autoplay) video.pause();
      release();
    };
    const fallback = setTimeout(done, 1000);
    video.addEventListener('seeked', done);
    video.currentTime = target.position_secs;
    if (target.autoplay) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
      // YTM's autoplay can start it again right after the first pause.
      const repause = () => video.pause();
      video.addEventListener('play', repause);
      setTimeout(() => video.removeEventListener('play', repause), 1500);
    }
  };

  const started = Date.now();
  // This runs before the page's scripts; Tauri's globals may not be up yet.
  const takeTarget = async (): Promise<unknown> => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await invokeBackend('take_resume_session');
      } catch (e) {
        if (attempt >= 20 || window.__TAURI__?.event?.emit) throw e;
        await new Promise((r) => setTimeout(r, 100));
      }
    }
  };
  void takeTarget()
    .then((data) => {
      const target = data as ResumeTarget | null;
      if (!target || target.video_id !== urlVideo) return release();
      const poll = setInterval(() => {
        const video = document.querySelector('video');
        const step = resumeStep(
          target,
          playerVideoId(),
          !!video && video.readyState >= 1,
          isSyncGuest(),
          Date.now() - started
        );
        if (step === 'wait') return;
        clearInterval(poll);
        if (step === 'apply' && video) apply(target, video);
        else release();
      }, POLL_MS);
    })
    .catch((e) => {
      console.error('[YTMD] Resume failed:', e);
      release();
    });
}
