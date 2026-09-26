import { YTMDPlugin, PluginContext, TrackInfo, PluginManifest } from '../types';
import manifest from './manifest.json';
import { PlayerBridge } from '../../preload/bridge';
import { setSyncStatus } from '../../preload/ui/navMenu';
import { showReaction, showToast } from '../../preload/ui/kit';
import { t } from '../../preload/ui/i18n';
import { setRoomNextOverride, setSyncGuest } from '../../preload/syncRole';
import { canControl, MemberRole, roleOf, votesNeeded } from '../../preload/syncRoles';
import { hideQueuePanel, queueAddFromMenuData, showQueuePanel, syncQueuePanel } from './queuePanel';
import { pageLog, playerSnapshot } from '../../preload/diagLog';

export interface SyncPlaybackPayload {
  video_id: string;
  title: string;
  artist: string;
  current_time_secs: number;
  is_playing: boolean;
  timestamp_ms: number;
}

export interface RoomMemberPayload {
  id: string;
  nickname: string;
  is_host: boolean;
  /** Missing from hosts that predate roles, where every guest was a DJ. */
  role?: MemberRole;
}

/** Our own role in `room`. */
export function ownRole(room: Pick<RoomStatePayload, 'members' | 'current_user_id' | 'is_host'>): MemberRole {
  if (room.is_host) return 'host';
  const me = room.members.find((m) => m.id === room.current_user_id);
  return me ? roleOf(me) : 'dj';
}

type LeaveReason = 'left' | 'closed' | 'kicked' | 'lost';

export interface QueueItemPayload {
  id: string;
  video_id: string;
  title: string;
  artist: string;
  added_by: string;
  added_by_id: string;
}

export interface RoomStatePayload {
  /** Stable, non-secret id of the room (the page never gets the room code,
   * which is the room's key; see page_ipc.rs). */
  room_id: string;
  is_host: boolean;
  current_user_id: string;
  members: RoomMemberPayload[];
  playback_state: SyncPlaybackPayload | null;
  queue?: QueueItemPayload[];
  /** Member ids voting to skip the current song. */
  skip_votes?: string[];
  /** The host is gone and we're getting back in (or taking over). */
  reconnecting?: boolean;
}

/** A guest's request for the whole room, carried out by the host's page
 * (mirrors `SyncControl` in sync_room.rs). */
export type SyncControl =
  | { kind: 'next' }
  | { kind: 'previous' }
  | { kind: 'set_playing'; playing: boolean }
  | { kind: 'play_video'; video_id: string; keep_position?: boolean };

/** Why the host's page is asked to act (mirrors `ControlSource`). */
type ControlSource = { kind: 'member' } | { kind: 'vote' } | { kind: 'queue'; title: string };

export interface SyncControlRequest {
  from: string;
  action: SyncControl;
  source?: ControlSource;
}

interface ReactionPayload {
  from: string;
  emoji: string;
}

/** Who arrived/left between two room snapshots, excluding ourselves. */
export function diffMembers(
  prev: RoomMemberPayload[],
  next: RoomMemberPayload[],
  selfId: string
): { joined: string[]; left: string[] } {
  const prevIds = new Set(prev.map((m) => m.id));
  const nextIds = new Set(next.map((m) => m.id));
  return {
    joined: next.filter((m) => m.id !== selfId && !prevIds.has(m.id)).map((m) => m.nickname),
    left: prev.filter((m) => m.id !== selfId && !nextIds.has(m.id)).map((m) => m.nickname)
  };
}

export interface LocalPlayback {
  videoId: string | null;
  paused: boolean;
  currentTime: number;
  /** Length of the loaded song (NaN while unknown). */
  duration: number;
  /** Whether a speed catch-up is already running (it then runs until
   * nearly exact, instead of stopping at the threshold that started it). */
  correcting: boolean;
}

export interface SyncAction {
  navigateTo: string | null;
  setPlaying: boolean | null;
  seekTo: number | null;
  /** Speed to play at to close the gap; 1 = in sync, normal speed. */
  playbackRate: number;
}

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;
/** Past this the guest jumps. Below it, it catches up by playing a little
 * faster or slower, which is inaudible, unlike a seek: that is a gap plus a
 * rebuffer, and the rebuffer itself leaves the guest behind again. */
const SEEK_DRIFT_SECS = 2.0;
/** Drift that starts a catch-up, and drift at which it ends. The gap keeps
 * measurement noise from toggling it. */
const START_CATCH_UP_SECS = 0.25;
const END_CATCH_UP_SECS = 0.05;
/** Aim to close the gap over about this long, never more than
 * MAX_RATE_DELTA off normal speed. */
const CATCH_UP_OVER_SECS = 3;
const MAX_RATE_DELTA = 0.1;
/** A paused guest only needs to be near the host's paused position. */
const PAUSED_DRIFT_SECS = 0.5;
/** Upper bound on the transit time credited to a message, whatever the
 * estimate says, so a bad estimate can never push the guest far ahead. */
const MAX_TRANSIT_SECS = 1.0;
const HOST_BROADCAST_INTERVAL_MS = 1000;
/** Host: a position this far from where steady playback would put it is a
 * seek (or a restart via "previous"), sent right away. */
const HOST_SEEK_JUMP_SECS = 1.0;
/** How long after asking YTM to switch tracks we trust that switch to be in
 * flight before issuing it again (or falling back to a full page load). */
const NAVIGATION_GRACE_MS = 5000;
/** Guest: after asking the host to play a song, how long to stay on it
 * rather than following the host's previous song back. */
const CONTROL_GRACE_MS = 4000;
/** Guest: a track change to a song we navigated to this recently is that
 * navigation landing, not the user picking something. */
const OWN_NAV_MEMORY_MS = 15_000;
/** Guest: a track change this soon after being near the end of the last one
 * is YTM's autoplay, not the user. */
const NEAR_END_SECS = 3;
const AUTOPLAY_WINDOW_MS = 4000;
/** Guest: a track change counts as the user's pick only this soon after
 * they clicked or pressed a key. Without that, YTM moved on by itself: when
 * a song can't play here ("Video unavailable", region or account limits)
 * it skips to its own next song, and a DJ's page sent that skip to the
 * host, which skipped the song for the whole room. */
const USER_PICK_WINDOW_MS = 8000;
/** Guest: this many seeks within the window is a seek loop, logged with
 * the player's state. */
const SEEK_LOOP_COUNT = 3;
const SEEK_LOOP_WINDOW_MS = 10_000;
/** YouTube Music's player time not moving while the video plays on for
 * this long means its state is broken (it showed 0:00 while a song played). */
const PLAYER_STALL_SECS = 3;
/** Host: how long a Song/Video switch may take to load before the seek to
 * the old position is given up. */
const PENDING_SEEK_MS = 15_000;
/** Guest: a seek never lands closer than this to the end of the song. At
 * the very end the video ends and YTM autoplays the guest's own next song,
 * not the host's. */
const END_GUARD_SECS = 1;
/** Guest: after finishing a song ahead of the host, how long to wait for
 * the host to finish it too (it's within HOST_FINISHING_SECS of the end)
 * instead of going back to it. */
const HOST_NEXT_WAIT_MS = 10_000;
const HOST_FINISHING_SECS = 5;
/** A payload older than the newest one seen, by less than this, was
 * reordered or redelivered (MQTT QoS 1) and is dropped; a bigger step back
 * is the host's clock being reset, and is accepted. */
const REORDER_WINDOW_MS = 10_000;
/** Host: this close to a song's end, the shared queue's next song starts,
 * before YTM's own autoplay picks something. */
const QUEUE_ADVANCE_SECS = 1.2;

function clampBeforeEnd(target: number, duration: number): number {
  return Number.isFinite(duration) && duration > END_GUARD_SECS ? Math.min(target, duration - END_GUARD_SECS) : target;
}

export function computeSyncAction(payload: SyncPlaybackPayload, local: LocalPlayback, transitSecs: number): SyncAction {
  const action: SyncAction = { navigateTo: null, setPlaying: null, seekTo: null, playbackRate: 1 };

  if (VIDEO_ID_RE.test(payload.video_id) && local.videoId !== payload.video_id) {
    action.navigateTo = payload.video_id;
    return action;
  }

  if (payload.is_playing === local.paused) {
    action.setPlaying = payload.is_playing;
  }

  if (!payload.is_playing) {
    if (Math.abs(local.currentTime - payload.current_time_secs) > PAUSED_DRIFT_SECS) {
      action.seekTo = clampBeforeEnd(payload.current_time_secs, local.duration);
    }
    return action;
  }

  const target = payload.current_time_secs + Math.min(MAX_TRANSIT_SECS, Math.max(0, transitSecs));
  const drift = target - local.currentTime;
  if (Math.abs(drift) > SEEK_DRIFT_SECS) {
    action.seekTo = clampBeforeEnd(target, local.duration);
  } else if (Math.abs(drift) > (local.correcting ? END_CATCH_UP_SECS : START_CATCH_UP_SECS)) {
    action.playbackRate = 1 + Math.max(-MAX_RATE_DELTA, Math.min(MAX_RATE_DELTA, drift / CATCH_UP_OVER_SECS));
  }
  return action;
}

/**
 * How long a host message spent getting here. Host and guest wall clocks
 * differ (by seconds, on some machines), so `now - timestamp_ms` is clock
 * skew plus delivery time. The smallest value seen lately is the skew plus
 * the fastest delivery; subtracting it leaves how much slower than the
 * fastest this message was. What it can't see is the fastest delivery
 * itself: a few ms on a LAN, tens over MQTT, well under the catch-up
 * threshold. Trusting the host's clock directly put guests up to a second
 * off whenever the clocks disagreed.
 */
export class TransitEstimator {
  private samples: number[] = [];

  constructor(private readonly windowSize = 30) {}

  public transitSecs(hostTimestampMs: number, localNowMs: number): number {
    const delta = localNowMs - hostTimestampMs;
    this.samples.push(delta);
    if (this.samples.length > this.windowSize) this.samples.shift();
    return (delta - Math.min(...this.samples)) / 1000;
  }

  public reset(): void {
    this.samples = [];
  }
}

export function isStalePayload(timestampMs: number, newestMs: number | null): boolean {
  return newestMs !== null && timestampMs < newestMs && newestMs - timestampMs < REORDER_WINDOW_MS;
}

/** What a guest's media key / tray / mini player command asks of the room. */
export function controlForCommand(command: string, localPaused: boolean): SyncControl | null {
  switch (command) {
    case 'next':
      return { kind: 'next' };
    case 'previous':
      return { kind: 'previous' };
    case 'play':
      return { kind: 'set_playing', playing: true };
    case 'pause':
      return { kind: 'set_playing', playing: false };
    case 'play_pause':
      return { kind: 'set_playing', playing: localPaused };
    default:
      return null;
  }
}

/** The player-bar buttons a guest's clicks are redirected from. */
const CONTROL_BUTTONS: [selector: string, command: string][] = [
  ['ytmusic-player-bar .next-button', 'next'],
  ['ytmusic-player-bar .previous-button', 'previous'],
  ['ytmusic-player-bar #play-pause-button', 'play_pause']
];

function currentVideoId(): string | null {
  return new URLSearchParams(window.location.search).get('v');
}

/** The song the player has actually loaded, its position in it and its
 * length. Around a track change the URL's `v` and the video element's time
 * don't switch at the same moment, so pairing them sent (and compared) the
 * old song's last seconds under the new song's id, or the new song's 0:00
 * under the old id: guests jumped to the end of the next song or restarted
 * the old one. And the video element's timeline isn't the song's at all
 * once YTM has appended the next song to the same media stream (its
 * `duration` was 115 s for a 76 s song). The player API reports all of it
 * from one state. */
function loadedPlayback(video: HTMLVideoElement | null): { videoId: string | null; currentTime: number; duration: number } {
  const player = PlayerBridge.getMoviePlayer();
  const videoId = player?.getVideoData?.()?.video_id;
  const currentTime = player?.getCurrentTime?.();
  if (videoId && VIDEO_ID_RE.test(videoId) && typeof currentTime === 'number' && Number.isFinite(currentTime)) {
    const duration = player?.getDuration?.();
    return {
      videoId,
      currentTime,
      duration: typeof duration === 'number' && duration > 0 ? duration : video ? video.duration : NaN
    };
  }
  return { videoId: currentVideoId(), currentTime: video ? video.currentTime : 0, duration: video ? video.duration : NaN };
}

function isAdPlaying(): boolean {
  const player = document.getElementById('movie_player');
  return !!player && (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting'));
}

/** Switches tracks through YTM's own SPA router (the same `yt-navigate`
 * event its links fire) instead of `location.href`, which reloaded the
 * whole app, re-ran every plugin, and took seconds per track change. */
export function navigateToVideo(videoId: string) {
  const app = document.querySelector('ytmusic-app');
  if (!app) {
    window.location.href = `https://music.youtube.com/watch?v=${videoId}`;
    return;
  }
  app.dispatchEvent(
    new CustomEvent('yt-navigate', {
      bubbles: true,
      composed: true,
      detail: { endpoint: { watchEndpoint: { videoId } } }
    })
  );
}

export class RoomSyncController {
  private isHost = false;
  private inRoom = false;
  /** Guest: whether our role may skip/pause/pick (not a listener). */
  private canControl = true;

  /** Host: the song we last moved on from to the shared queue, and when. */
  private queueAdvance: { from: string | null; atMs: number } | null = null;

  /** `notify` shows a message to the user (a toast outside of tests). */
  constructor(private readonly notify: (message: string) => void = showToast) {}
  private lastBroadcast: { atMs: number; videoId: string; position: number; rate: number; playing: boolean } | null =
    null;
  private pendingNav: { videoId: string; atMs: number; attempts: number } | null = null;
  private readonly transit = new TransitEstimator();
  private newestPayloadMs: number | null = null;
  /** Guest: the song the host last said it's playing. */
  private hostVideoId: string | null = null;
  /** Guest: songs we navigated to for the sync, and when. */
  private ownNavs = new Map<string, number>();
  /** Guest: a song we asked the host to play, not confirmed yet. */
  private requestedVideo: { videoId: string; atMs: number } | null = null;
  private nearEndAtMs = Number.NEGATIVE_INFINITY;
  /** Guest: when the user last clicked or pressed a key on the page. */
  private userInputAtMs = Number.NEGATIVE_INFINITY;
  /** Guest: when the user last clicked YouTube Music's Song/Video switch. */
  private avToggleAtMs = Number.NEGATIVE_INFINITY;
  /** Host: a guest switched the song's version; seek the new version to
   * where the old one was once it has loaded. */
  private pendingSeek: { videoId: string; position: number; playing: boolean; atMs: number } | null = null;
  /** Guest, for the log: recent seeks, when a seek loop was last reported,
   * and whether waiting for the host's next song was already reported. */
  private recentSeeks: number[] = [];
  private seekLoopWarnedAtMs = Number.NEGATIVE_INFINITY;
  private waitingLogged = false;
  /** Where YouTube Music's player time last stood still, to report it
   * being stuck (once per song). */
  private stall: { songId: string | null; songTime: number; videoTime: number; warned: boolean } | null = null;
  /** Guest: the song we last played to (nearly) the end. */
  private finished: { videoId: string; duration: number; atMs: number } | null = null;
  /** Guest: speed catch-up in progress, and what to restore after it. */
  private rateCorrection: { video: HTMLVideoElement; rate: number; preservesPitch: boolean } | null = null;

  public setRoomState(inRoom: boolean, isHost: boolean, canControl = true) {
    const roleChanged = inRoom !== this.inRoom || isHost !== this.isHost;
    this.inRoom = inRoom;
    this.isHost = isHost;
    this.canControl = canControl;
    setSyncGuest(this.isGuest());
    if (!roleChanged) return;
    this.pendingNav = null;
    this.lastBroadcast = null;
    this.transit.reset();
    this.newestPayloadMs = null;
    this.hostVideoId = null;
    this.ownNavs.clear();
    this.requestedVideo = null;
    this.nearEndAtMs = Number.NEGATIVE_INFINITY;
    this.recentSeeks = [];
    this.seekLoopWarnedAtMs = Number.NEGATIVE_INFINITY;
    this.waitingLogged = false;
    this.stall = null;
    this.avToggleAtMs = Number.NEGATIVE_INFINITY;
    this.pendingSeek = null;
    this.finished = null;
    this.endRateCorrection();
  }

  public isInRoom(): boolean {
    return this.inRoom;
  }

  public isRoomHost(): boolean {
    return this.isHost;
  }

  public isGuest(): boolean {
    return this.inRoom && !this.isHost;
  }
  public handleRemotePlayback(payload: SyncPlaybackPayload, video: HTMLVideoElement | null, now = Date.now()) {
    if (!this.isGuest() || isAdPlaying()) return;
    if (isStalePayload(payload.timestamp_ms, this.newestPayloadMs)) return;
    this.newestPayloadMs = payload.timestamp_ms;
    const transitSecs = this.transit.transitSecs(payload.timestamp_ms, now);
    if (VIDEO_ID_RE.test(payload.video_id)) this.hostVideoId = payload.video_id;

    const requested = this.requestedVideo;
    if (requested) {
      if (payload.video_id !== requested.videoId && now - requested.atMs < CONTROL_GRACE_MS) return;
      this.requestedVideo = null;
    }

    const loaded = loadedPlayback(video);
    if (this.waitingForHostsNext(payload, loaded.videoId, video, now)) {
      if (!this.waitingLogged) {
        this.waitingLogged = true;
        pageLog('info', 'sync', `guest: finished ${payload.video_id} before the host, waiting for its next song`);
      }
      this.endRateCorrection();
      PlayerBridge.pause();
      return;
    }
    this.waitingLogged = false;

    const local: LocalPlayback = {
      videoId: loaded.videoId,
      paused: video ? video.paused : true,
      currentTime: loaded.currentTime,
      duration: loaded.duration,
      correcting: this.rateCorrection !== null
    };
    const action = computeSyncAction(payload, local, transitSecs);

    if (action.navigateTo) {
      this.endRateCorrection();
      const pending = this.pendingNav;
      if (pending && pending.videoId === action.navigateTo && now - pending.atMs < NAVIGATION_GRACE_MS) return;
      const attempts = pending && pending.videoId === action.navigateTo ? pending.attempts + 1 : 1;
      this.pendingNav = { videoId: action.navigateTo, atMs: now, attempts };
      this.rememberOwnNav(action.navigateTo, now);
      pageLog(
        attempts > 1 ? 'warn' : 'info',
        'sync',
        `guest: host plays ${action.navigateTo} at ${payload.current_time_secs.toFixed(1)} s, we have ${loaded.videoId ?? 'nothing'}: ` +
          (attempts > 1 ? `switch didn't take, full reload (attempt ${attempts}); ${playerSnapshot()}` : 'switching')
      );
      // The old song keeps playing while the new one loads; if it ends
      // first, YTM autoplays its own next song over our navigation.
      PlayerBridge.pause();
      if (attempts > 1) {
        // SPA navigation didn't take; a full load always does.
        window.location.href = `https://music.youtube.com/watch?v=${action.navigateTo}`;
      } else {
        navigateToVideo(action.navigateTo);
      }
      return;
    }
    this.pendingNav = null;
    if (!video) return;

    if (action.setPlaying === true) PlayerBridge.play();
    else if (action.setPlaying === false) PlayerBridge.pause();

    if (action.seekTo !== null) {
      this.endRateCorrection();
      this.logSeek(local.currentTime, action.seekTo, payload, now);
      PlayerBridge.seekTo(action.seekTo);
    } else {
      this.setCatchUpRate(video, action.playbackRate);
    }
  }

  /** Guest: we finished the host's song first and YTM moved on to its own
   * next song (or stopped). Going back would replay the last seconds and
   * autoplay again, flipping between songs; the host is about to switch, so
   * stay paused until it does. A host that restarted the song ("previous")
   * is far from the end and is followed as usual. */
  private waitingForHostsNext(
    payload: SyncPlaybackPayload,
    localVideoId: string | null,
    video: HTMLVideoElement | null,
    now: number
  ): boolean {
    const f = this.finished;
    return (
      !!f &&
      payload.video_id === f.videoId &&
      now - f.atMs < HOST_NEXT_WAIT_MS &&
      f.duration - payload.current_time_secs < HOST_FINISHING_SECS &&
      (localVideoId !== f.videoId || !!video?.ended)
    );
  }

  /** One line per seek; a guest that keeps seeking is stuck in a loop
   * (the sync and the player disagree on where it is), so that also gets
   * a warning with the player's state, at most once per window. */
  private logSeek(from: number, to: number, payload: SyncPlaybackPayload, now: number) {
    this.recentSeeks = this.recentSeeks.filter((at) => now - at < SEEK_LOOP_WINDOW_MS);
    this.recentSeeks.push(now);
    pageLog(
      'info',
      'sync',
      `guest: seek ${from.toFixed(1)} -> ${to.toFixed(1)} s (host ${payload.current_time_secs.toFixed(1)} s, ${payload.is_playing ? 'playing' : 'paused'})`
    );
    if (this.recentSeeks.length >= SEEK_LOOP_COUNT && now - this.seekLoopWarnedAtMs > SEEK_LOOP_WINDOW_MS) {
      this.seekLoopWarnedAtMs = now;
      pageLog('warn', 'sync', `guest: ${this.recentSeeks.length} seeks in ${SEEK_LOOP_WINDOW_MS / 1000} s; ${playerSnapshot()}`);
    }
  }

  private rememberOwnNav(videoId: string, now: number) {
    for (const [id, at] of this.ownNavs) {
      if (now - at > OWN_NAV_MEMORY_MS) this.ownNavs.delete(id);
    }
    this.ownNavs.set(videoId, now);
  }

  private setCatchUpRate(video: HTMLVideoElement, rate: number) {
    if (rate === 1) {
      this.endRateCorrection();
      return;
    }
    if (!this.rateCorrection || this.rateCorrection.video !== video) {
      this.endRateCorrection();
      pageLog('info', 'sync', `guest: catching up at ${rate.toFixed(3)}x`);
      this.rateCorrection = { video, rate: video.playbackRate, preservesPitch: video.preservesPitch };
    }
    // A pitch shift would be audible; a 10% tempo change with pitch kept isn't.
    video.preservesPitch = true;
    video.playbackRate = rate;
  }

  private endRateCorrection() {
    const correction = this.rateCorrection;
    if (!correction) return;
    this.rateCorrection = null;
    correction.video.playbackRate = correction.rate;
    correction.video.preservesPitch = correction.preservesPitch;
  }

  /** Guest: remembers being near the end of a song, so the switch that
   * follows is recognized as YTM's autoplay. */
  public noteLocalTick(video: HTMLVideoElement | null, now = Date.now()) {
    if (!this.isGuest() || !video) return;
    const { videoId, currentTime, duration } = loadedPlayback(video);
    if (Number.isFinite(duration) && duration > 0 && duration - currentTime < NEAR_END_SECS) {
      this.nearEndAtMs = now;
      if (videoId) this.finished = { videoId, duration, atMs: now };
    }
  }

  /** In a room: reports YouTube Music's player time standing still while
   * the video plays on. The sync reads the player's time, so from there on
   * it corrects against a wrong position (this was the seek-every-second
   * loop). Returns whether it reported. */
  public checkPlayer(video: HTMLVideoElement | null): boolean {
    if (!this.inRoom || !video || video.paused || isAdPlaying()) {
      this.stall = null;
      return false;
    }
    const { videoId, currentTime } = loadedPlayback(video);
    const s = this.stall;
    if (!s || s.songId !== videoId || Math.abs(currentTime - s.songTime) > 0.05) {
      this.stall = { songId: videoId, songTime: currentTime, videoTime: video.currentTime, warned: s?.songId === videoId && s.warned };
      return false;
    }
    if (s.warned || video.currentTime - s.videoTime < PLAYER_STALL_SECS) return false;
    s.warned = true;
    pageLog('warn', 'player', `YouTube Music's player time is stuck while the video plays on; ${playerSnapshot()}`);
    return true;
  }

  /** Guest: the user clicked or pressed a key (trusted events only). */
  public noteUserInput(now = Date.now()) {
    this.userInputAtMs = now;
  }

  /** Guest: the user clicked YouTube Music's Song/Video switch. */
  public noteAvToggle(now = Date.now()) {
    this.avToggleAtMs = now;
  }

  /** Host: once the version a guest switched to has loaded, carries on
   * from where the song was (plus the time the switch took, if playing). */
  public applyPendingSeek(video: HTMLVideoElement | null, now = Date.now()) {
    const pending = this.pendingSeek;
    if (!pending || !video) return;
    if (!this.isHost || now - pending.atMs > PENDING_SEEK_MS) {
      this.pendingSeek = null;
      return;
    }
    const { videoId, duration } = loadedPlayback(video);
    if (videoId !== pending.videoId || !Number.isFinite(duration) || duration <= 0) return;
    this.pendingSeek = null;
    const target = clampBeforeEnd(pending.position + (pending.playing ? (now - pending.atMs) / 1000 : 0), duration);
    pageLog('info', 'sync', `host: ${videoId} is the other version of the song, carrying on at ${target.toFixed(1)} s`);
    PlayerBridge.seekTo(target);
  }

  /** Guest: our page switched songs. Unless that was our own sync
   * navigation or YTM switching by itself (autoplay, or skipping a song it
   * can't play), the user picked it, and it becomes the room's song:
   * returns the request to send the host. */
  public handleLocalTrackChange(videoId: string | undefined, now = Date.now()): SyncControl | null {
    // A listener's pick isn't sent: the next host broadcast brings it back.
    if (!this.isGuest() || !this.canControl || !videoId || !VIDEO_ID_RE.test(videoId)) return null;
    // No host state yet (just joined, or the page reloaded): nothing to diverge from.
    if (this.hostVideoId === null || videoId === this.hostVideoId) return null;
    const navAt = this.ownNavs.get(videoId);
    if (navAt !== undefined && now - navAt < OWN_NAV_MEMORY_MS) return null;
    const ignore = (why: string) => {
      pageLog('info', 'sync', `guest: now on ${videoId}, host on ${this.hostVideoId}: ${why}, not sent; ${playerSnapshot()}`);
      return null;
    };
    if (now - this.nearEndAtMs < AUTOPLAY_WINDOW_MS) return ignore('autoplay after the song ended');
    // Nobody picked it: the next host broadcast brings the host's song back.
    if (now - this.userInputAtMs > USER_PICK_WINDOW_MS) return ignore('YouTube Music switched by itself');
    if (this.requestedVideo?.videoId === videoId) return null;
    this.requestedVideo = { videoId, atMs: now };
    // Song/Video is the same song under another id: keep the room's place.
    if (now - this.avToggleAtMs < USER_PICK_WINDOW_MS) {
      pageLog('info', 'sync', `guest: switched ${this.hostVideoId} to its other version ${videoId}, asking the host to keep its place`);
      return { kind: 'play_video', video_id: videoId, keep_position: true };
    }
    pageLog('info', 'sync', `guest: picked ${videoId} (host on ${this.hostVideoId}), asking the host to play it`);
    return { kind: 'play_video', video_id: videoId };
  }

  public requestControl(action: SyncControl, invoke: PluginContext['invoke']) {
    if (!this.canControl) {
      // A listener's "next" is a vote; the rest isn't theirs to do.
      if (action.kind !== 'next') {
        this.notify(t().syncListenerOnly);
        return;
      }
      invoke('vote_sync_skip')
        .then(() => this.notify(t().syncVotedSkip))
        .catch((e) => {
          pageLog('warn', 'sync', `vote to skip failed: ${String(e)}`);
          this.notify(t().actionFailed);
        });
      return;
    }
    invoke('send_sync_control', { action }).catch((e) => {
      pageLog('warn', 'sync', `request ${action.kind} to the host failed: ${String(e)}`);
      this.notify(t().actionFailed);
    });
  }

  /** Host: a guest's request, carried out on this player; the broadcasts
   * that follow bring every guest along. */
  public applyRemoteControl(request: SyncControlRequest) {
    if (!this.inRoom || !this.isHost) return;
    const { from, action, source } = request;
    const said =
      source?.kind === 'vote' ? t().syncVoteSkipped : source?.kind === 'queue' ? t().syncFromQueue(source.title, from) : null;
    switch (action.kind) {
      case 'next':
        PlayerBridge.next();
        this.notify(said ?? t().syncGuestNext(from));
        break;
      case 'previous':
        PlayerBridge.previous();
        this.notify(said ?? t().syncGuestPrevious(from));
        break;
      case 'set_playing': {
        const video = PlayerBridge.getVideo();
        if (!video || video.paused !== action.playing) return;
        if (action.playing) PlayerBridge.play();
        else PlayerBridge.pause();
        this.notify(said ?? (action.playing ? t().syncGuestResumed(from) : t().syncGuestPaused(from)));
        break;
      }
      case 'play_video': {
        if (!VIDEO_ID_RE.test(action.video_id) || action.video_id === currentVideoId()) return;
        if (action.keep_position) {
          // Same song, other version: no "picked a song" toast, and the
          // new version picks up where this one is.
          const video = PlayerBridge.getVideo();
          this.pendingSeek = {
            videoId: action.video_id,
            position: loadedPlayback(video).currentTime,
            playing: !!video && !video.paused,
            atMs: Date.now()
          };
          navigateToVideo(action.video_id);
          break;
        }
        navigateToVideo(action.video_id);
        this.notify(said ?? t().syncGuestPicked(from));
        break;
      }
    }
  }

  /** Host: as a song ends, plays the next song from the shared queue. */
  public advanceQueue(queueLength: number, video: HTMLVideoElement | null, invoke: PluginContext['invoke']) {
    if (!video || isAdPlaying()) return;
    const { currentTime, duration } = loadedPlayback(video);
    const remaining = duration - currentTime;
    if (!Number.isFinite(remaining) || (remaining > QUEUE_ADVANCE_SECS && !video.ended)) return;
    this.playNextFromQueue(queueLength, invoke, video, false);
  }

  /** Host: "next" while the shared queue has songs plays the queue's first
   * song (the backend hands it over and removes it). Returns whether it
   * took over. Another "next" from the same song while that's under way
   * (a double click, crossfade plus the end-of-song advance) is swallowed,
   * so one skip never eats two songs. If the queue turned out empty, a
   * skip still skips (`skipIfEmpty`), through YTM's own next. */
  public playNextFromQueue(
    queueLength: number,
    invoke: PluginContext['invoke'],
    video: HTMLVideoElement | null = PlayerBridge.getVideo(),
    skipIfEmpty = true,
    now = Date.now()
  ): boolean {
    if (!this.inRoom || !this.isHost || queueLength === 0) return false;
    const { videoId } = loadedPlayback(video);
    const pending = this.queueAdvance;
    if (pending && pending.from === videoId && now - pending.atMs < NAVIGATION_GRACE_MS) return true;
    this.queueAdvance = { from: videoId, atMs: now };
    const fallback = () => {
      if (skipIfEmpty) PlayerBridge.nextInYtm();
    };
    invoke('sync_queue_take_next')
      .then((item) => {
        const next = item as QueueItemPayload | null;
        if (!next || !VIDEO_ID_RE.test(next.video_id)) {
          fallback();
          return;
        }
        PlayerBridge.pause(); // don't let the old song end into YTM's autoplay
        navigateToVideo(next.video_id);
        this.notify(t().syncFromQueue(next.title, next.added_by));
      })
      .catch((e) => {
        pageLog('warn', 'sync', `host: playing from the shared queue failed: ${String(e)}`);
        fallback();
      });
    return true;
  }

  /** `force` skips the throttle: track and play/pause changes go out
   * immediately instead of waiting up to a second for the next tick. */
  public broadcastLocalState(
    track: TrackInfo | null,
    video: HTMLVideoElement | null,
    invoke: PluginContext['invoke'],
    force = false
  ) {
    if (!this.inRoom || !this.isHost || !track || !video || isAdPlaying()) return;
    // A Song/Video switch still loading: its 0:00 would pull the guest who
    // switched (already at the right place) back to the start.
    if (this.pendingSeek && Date.now() - this.pendingSeek.atMs < PENDING_SEEK_MS) return;
    // Between songs: the position is the old song's end, and the "paused"
    // that comes with it would pause guests at the end, where they autoplay.
    if (video.ended) return;
    const { videoId, currentTime } = loadedPlayback(video);
    if (!videoId) return;

    const now = Date.now();
    const last = this.lastBroadcast;
    const expected = last ? last.position + ((now - last.atMs) / 1000) * last.rate : 0;
    const jumped = !!last && last.playing && !video.paused && Math.abs(currentTime - expected) > HOST_SEEK_JUMP_SECS;
    const newSong = !!last && last.videoId !== videoId;
    if (!force && !jumped && !newSong && last && now - last.atMs < HOST_BROADCAST_INTERVAL_MS) return;
    this.lastBroadcast = { atMs: now, videoId, position: currentTime, rate: video.playbackRate, playing: !video.paused };

    invoke('broadcast_sync_state', {
      playback: {
        video_id: videoId,
        title: track.title,
        artist: track.artist,
        current_time_secs: currentTime,
        is_playing: !video.paused,
        timestamp_ms: now
      }
    }).catch((e) => pageLog('warn', 'sync', `host: broadcast failed: ${String(e)}`));
  }
}

let controllerRef: RoomSyncController | null = null;
let invokeRef: PluginContext['invoke'] | null = null;
let cleanup: (() => void) | null = null;
/** Last room snapshot seen, to announce joins/leaves; null when not in a room. */
let lastRoom: RoomStatePayload | null = null;
/** The song this page has loaded, for the queue panel's "Now playing". */
let currentTrack: TrackInfo | null = null;
const QUEUE_PANEL_POLL_MS = 1000;

/** In a room, YTM's "Up next" tab shows the shared queue instead. */
function refreshQueuePanel() {
  const room = lastRoom;
  const invoke = invokeRef;
  if (!room || !invoke) {
    hideQueuePanel();
    return;
  }
  const track = currentTrack;
  const act = (cmd: string) => (itemId: string) => {
    invoke(cmd, { itemId }).catch((e) => {
      pageLog('warn', 'sync', `${cmd} failed: ${String(e)}`);
      showToast(t().actionFailed);
    });
  };
  showQueuePanel(
    {
      queue: room.queue ?? [],
      nowPlaying:
        track?.videoId && VIDEO_ID_RE.test(track.videoId)
          ? { videoId: track.videoId, title: track.title, artist: track.artist }
          : null,
      myId: room.current_user_id,
      myRole: ownRole(room)
    },
    {
      play: act('sync_queue_play'),
      remove: act('sync_queue_remove'),
      move: (itemId, toIndex) => {
        invoke('sync_queue_move', { itemId, toIndex }).catch((e) => {
          pageLog('warn', 'sync', `sync_queue_move failed: ${String(e)}`);
          showToast(t().actionFailed);
        });
      }
    }
  );
}

/** Closes the YTM menu a redirected item was picked from, the way a user
 * would: Escape (its overlay listens for it). */
function closeYtmMenu() {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
}

/** A song picked with YTM's "Add to queue" / "Play next" while in a room. */
function addToSharedQueue(add: { videoId: string | null; next: boolean }, invoke: PluginContext['invoke']) {
  if (!lastRoom || !canControl(ownRole(lastRoom))) {
    showToast(t().syncQueueListenerNo);
    return;
  }
  if (!add.videoId) {
    showToast(t().syncQueueSongsOnly);
    return;
  }
  invoke('sync_queue_add', { input: add.videoId, next: add.next })
    .then(() => showToast(add.next ? t().syncQueuedNext : t().syncQueued))
    .catch((e) => {
      pageLog('warn', 'sync', `adding to the shared queue failed: ${String(e)}`);
      showToast(t().actionFailed);
    });
}

/** Guest: media keys, tray, mini player and phone remote act for the room
 * (through the host) instead of on the local player, which the next sync
 * would just undo. Returns whether the command was taken. */
export function routeRoomPlayerCommand(command: string): boolean {
  const controller = controllerRef;
  if (!controller || !invokeRef || !controller.isGuest()) return false;
  const video = PlayerBridge.getVideo();
  const action = controlForCommand(command, video ? video.paused : true);
  if (!action) return false;
  controller.requestControl(action, invokeRef);
  return true;
}

/** Guest: a song picked on the phone remote is asked of the host, the
 * same way `routeRoomPlayerCommand` routes skips. Returns whether it was
 * taken (false outside a room or on the host, whose own player acts). */
export function routeRoomPlayVideo(videoId: string): boolean {
  const controller = controllerRef;
  if (!controller || !invokeRef || !controller.isGuest()) return false;
  controller.requestControl({ kind: 'play_video', video_id: videoId }, invokeRef);
  return true;
}

/** Mirrors room state into the nav-bar chip and announces changes the way
 * YTM announces its own events: a short toast, no dialog. `announce` is
 * false when restoring state on page load (nothing new happened). */
function applyRoomUi(room: RoomStatePayload | null, announce: boolean, leaveReason: LeaveReason = 'left') {
  const prev = lastRoom;
  lastRoom = room;
  setSyncStatus(room ? { listeners: room.members.length, isHost: room.is_host } : null);
  refreshQueuePanel();
  if (!announce) return;

  if (!room) {
    if (!prev) return;
    showToast(leaveReason === 'kicked' ? t().syncKicked : leaveReason === 'lost' ? t().syncLost : t().syncRoomClosed);
    return;
  }
  if (!prev || prev.room_id !== room.room_id) {
    if (!room.is_host) showToast(t().syncConnected);
    return;
  }
  if (room.reconnecting) {
    if (!prev.reconnecting) showToast(t().syncReconnecting);
    return;
  }
  // A handoff: everyone reconnects, so a join/leave list would be noise.
  const hostId = (r: RoomStatePayload) => r.members.find((m) => m.is_host)?.id;
  if (hostId(prev) !== hostId(room)) {
    const host = room.members.find((m) => m.is_host);
    if (room.is_host) showToast(t().syncYouHost);
    else if (host) showToast(t().syncNewHost(host.nickname));
    return;
  }
  if (prev.reconnecting) return;
  const { joined, left } = diffMembers(prev.members, room.members, room.current_user_id);
  const messages = [...joined.map(t().syncJoined), ...left.map(t().syncLeft)];
  const votes = room.skip_votes ?? [];
  const newVoters = votes.filter((id) => id !== room.current_user_id && !(prev.skip_votes ?? []).includes(id));
  for (const id of newVoters) {
    const name = room.members.find((m) => m.id === id)?.nickname;
    if (name) messages.push(t().syncVoteProgress(name, votes.length, votesNeeded(room.members.length)));
  }
  const role = ownRole(room);
  if (role !== ownRole(prev)) {
    messages.push(
      role === 'moderator' ? t().syncRoleModerator : role === 'listener' ? t().syncRoleListener : t().syncRoleDj
    );
  }
  if (messages.length > 0) showToast(messages.join(' · '));
}

export const SyncRoomPlugin: YTMDPlugin = {
  id: 'sync_room',
  manifest: manifest as PluginManifest,
  name: 'P2P Room Sync',
  description: 'Listen together with friends in real-time synchronized listening rooms',
  defaultEnabled: true,

  onInit(ctx: PluginContext) {
    const controller = new RoomSyncController();
    controllerRef = controller;
    invokeRef = ctx.invoke;

    const unlistenPromises: Promise<() => void>[] = [];
    if (ctx.events) {
      unlistenPromises.push(
        ctx.events.listen<RoomStatePayload>('sync-room-updated', (e) => {
          controller.setRoomState(true, e.payload.is_host, canControl(ownRole(e.payload)));
          applyRoomUi(e.payload, true);
        }),
        ctx.events.listen<{ reason?: LeaveReason } | null>('sync-room-left', (e) => {
          controller.setRoomState(false, false);
          applyRoomUi(null, true, e.payload?.reason ?? 'left');
        }),
        ctx.events.listen<SyncPlaybackPayload>('sync-playback-remote', (e) => {
          controller.handleRemotePlayback(e.payload, ctx.getVideoElement());
        }),
        ctx.events.listen<SyncControlRequest>('sync-control-remote', (e) => {
          controller.applyRemoteControl(e.payload);
        }),
        ctx.events.listen<ReactionPayload>('sync-reaction', (e) => {
          showReaction(e.payload.emoji, e.payload.from);
        })
      );
    }

    // Capture phase on window runs before YTM's own handlers.
    const onClick = (e: MouseEvent) => {
      if (!(e.target instanceof Element)) return;
      const target = e.target;
      if (target.closest('ytmusic-player-page tp-yt-paper-tab')) setTimeout(syncQueuePanel, 0);

      // In a room, YTM's "Add to queue" / "Play next" fill the shared queue.
      if (controller.isInRoom()) {
        const menuItem = target.closest<HTMLElement & { data?: unknown }>('ytmusic-menu-service-item-renderer');
        const add = menuItem ? queueAddFromMenuData(menuItem.data) : null;
        if (add) {
          e.preventDefault();
          e.stopImmediatePropagation();
          closeYtmMenu();
          addToSharedQueue(add, ctx.invoke);
          return;
        }
      }

      if (!e.isTrusted) return; // our own PlayerBridge clicks
      // The host's own next button plays from the shared queue when it has
      // songs; YTM's handler would take its local up-next instead.
      if (
        controller.isRoomHost() &&
        target.closest('ytmusic-player-bar .next-button') &&
        controller.playNextFromQueue(lastRoom?.queue?.length ?? 0, ctx.invoke)
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      // A guest's own clicks on next/previous/play-pause go to the host.
      if (!controller.isGuest()) return;
      const hit = CONTROL_BUTTONS.find(([selector]) => target.closest(selector));
      if (!hit) return;
      const video = ctx.getVideoElement();
      const action = controlForCommand(hit[1], video ? video.paused : true);
      if (!action) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      controller.requestControl(action, ctx.invoke);
    };
    window.addEventListener('click', onClick, true);
    // Tells the user's own song picks apart from YTM switching by itself.
    const onUserInput = (e: Event) => {
      if (!e.isTrusted) return;
      controller.noteUserInput();
      if (e.target instanceof Element && e.target.closest('ytmusic-av-toggle')) controller.noteAvToggle();
    };
    window.addEventListener('pointerdown', onUserInput, true);
    window.addEventListener('keydown', onUserInput, true);
    // YTM re-renders the player page on some navigations; put the queue
    // panel back and keep it in step with the selected tab.
    const panelPoll = setInterval(syncQueuePanel, QUEUE_PANEL_POLL_MS);
    // Every other "next" on the host (media keys, tray, a guest's skip, a
    // vote, crossfade, skip-silence) goes through PlayerBridge.next().
    setRoomNextOverride(() => controller.playNextFromQueue(lastRoom?.queue?.length ?? 0, ctx.invoke));

    // The page can (re)load while already in a room: app start after a
    // crash, or a fallback full-page track switch. Pick the room back up
    // instead of silently dropping out of sync.
    ctx
      .invoke('get_sync_room_state')
      .then((state) => {
        if (controllerRef !== controller || !state || typeof state !== 'object') return;
        const room = state as RoomStatePayload;
        controller.setRoomState(true, room.is_host, canControl(ownRole(room)));
        applyRoomUi(room, false);
        if (!room.is_host && room.playback_state) {
          controller.handleRemotePlayback(room.playback_state, ctx.getVideoElement());
        }
      })
      .catch((e) => pageLog('warn', 'sync', `restoring the room after a page load failed: ${String(e)}`));

    cleanup = () => {
      unlistenPromises.forEach((p) => p.then((unlisten) => unlisten()));
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('pointerdown', onUserInput, true);
      window.removeEventListener('keydown', onUserInput, true);
      clearInterval(panelPoll);
      setRoomNextOverride(null);
      controller.setRoomState(false, false);
      controllerRef = null;
      invokeRef = null;
      lastRoom = null;
      currentTrack = null;
      setSyncStatus(null);
      hideQueuePanel();
    };
  },

  onTrackChange(track: TrackInfo, ctx: PluginContext) {
    const controller = controllerRef;
    if (!controller) return;
    currentTrack = track;
    refreshQueuePanel();
    if (controller.isInRoom()) {
      const playability = PlayerBridge.getMoviePlayer()?.getPlayerResponse?.()?.playabilityStatus;
      if (playability?.status && playability.status !== 'OK') {
        pageLog('warn', 'player', `${track.videoId ?? '?'} won't play here; ${playerSnapshot()}`);
      }
    }
    controller.applyPendingSeek(ctx.getVideoElement());
    controller.broadcastLocalState(track, ctx.getVideoElement(), ctx.invoke, true);
    const request = controller.handleLocalTrackChange(track.videoId);
    if (request) controller.requestControl(request, ctx.invoke);
  },

  onPlaybackChange(_isPlaying: boolean, ctx: PluginContext) {
    controllerRef?.broadcastLocalState(ctx.track, ctx.getVideoElement(), ctx.invoke, true);
  },

  onTick(_currentTimeSecs: number, ctx: PluginContext) {
    const video = ctx.getVideoElement();
    controllerRef?.broadcastLocalState(ctx.track, video, ctx.invoke);
    controllerRef?.noteLocalTick(video);
    controllerRef?.checkPlayer(video);
    controllerRef?.applyPendingSeek(video);
    controllerRef?.advanceQueue(lastRoom?.queue?.length ?? 0, video, ctx.invoke);
  },

  onDestroy() {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  }
};
