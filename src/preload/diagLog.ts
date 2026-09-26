/**
 * Lines for `~/.oscilla/logs/oscilla.log` from the injected page (the
 * `page_log` bridge command; page_log.rs caps the rate). The page's console
 * is gone once the app closes, so what the page decided and what YouTube
 * Music's player looked like when it went wrong has to be written here to
 * be found later. Never log room codes, tokens or anything a user typed.
 */
import { invokeBackend } from './bridgeClient';
import { PlayerBridge } from './bridge';

export type PageLogLevel = 'info' | 'warn' | 'error';

export function pageLog(level: PageLogLevel, scope: string, message: string): void {
  if (level !== 'info') console[level](`[Oscilla ${scope}] ${message}`);
  invokeBackend('page_log', { level, scope, message }).catch(() => undefined);
}

const fmt = (n: number | undefined) => (typeof n === 'number' && Number.isFinite(n) ? n.toFixed(1) : '?');

/** YouTube Music's player and the video element, side by side: where they
 * disagree is usually the bug. */
export function playerSnapshot(): string {
  const player = PlayerBridge.getMoviePlayer();
  const video = PlayerBridge.getVideo();
  const playability = player?.getPlayerResponse?.()?.playabilityStatus;
  return [
    `song=${player?.getVideoData?.()?.video_id ?? '?'}`,
    `t=${fmt(player?.getCurrentTime?.())}/${fmt(player?.getDuration?.())}`,
    `video=${fmt(video?.currentTime)}/${fmt(video?.duration)}`,
    `state=${player?.getPlayerState?.() ?? '?'}`,
    `paused=${video ? video.paused : '?'}`,
    `ready=${video ? video.readyState : '?'}`,
    video?.error ? `mediaError=${video.error.code}` : '',
    playability?.status && playability.status !== 'OK'
      ? `playability=${playability.status}${playability.reason ? ` (${playability.reason})` : ''}`
      : ''
  ]
    .filter(Boolean)
    .join(' ');
}
