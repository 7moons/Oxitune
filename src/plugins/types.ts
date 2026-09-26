/**
 * Oscilla Plugin API, version 1 (docs/PLUGIN_API.md).
 *
 * Every plugin, built-in or installed, has a manifest and gets a context
 * scoped to the permissions it lists: what it isn't granted is missing or
 * refused. Built-in plugins implement `YTMDPlugin` directly; installed ones
 * get the same hooks through the `ytmd` object (see `YtmdApi`).
 */

export const PLUGIN_API_VERSION = 1;

/** The closed permission set (mirrors `PERMISSIONS` in plugins/manifest.rs). */
export type Permission =
  | 'player:read'
  | 'player:control'
  | 'page'
  | 'storage'
  | 'network'
  | 'ui'
  | 'media:save'
  // Built-in plugins only.
  | 'internal:config'
  | 'internal:lyrics'
  | 'internal:sync'
  | 'internal:remote'
  | 'internal:power'
  | 'internal:windows'
  | 'internal:notify';

export type LocalizedText = string | Record<string, string>;

export interface SettingSpec {
  key: string;
  type: 'boolean' | 'number' | 'string' | 'select';
  label: LocalizedText;
  description?: LocalizedText;
  default: unknown;
  min?: number;
  max?: number;
  options?: { value: string; label: LocalizedText }[];
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  apiVersion: number;
  description: string;
  author: string;
  homepage?: string;
  matches: string[];
  runAt?: 'document-start' | 'document-idle';
  permissions: Permission[];
  hosts?: string[];
  entry: string;
  styles?: string[];
  settings?: SettingSpec[];
}

export interface TrackInfo {
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  durationSecs: number;
  currentTimeSecs: number;
  isPlaying: boolean;
  videoId?: string;
  /** Playlist the song plays from (URL `list`), kept while browsing away. */
  playlistId?: string;
}

export type Unlisten = () => void;

export interface PluginEvents {
  /** App events the plugin's permissions cover (see `EVENT_PERMISSIONS`). */
  listen<T = unknown>(event: string, handler: (event: { payload: T }) => void): Promise<Unlisten>;
}

export interface PluginContext {
  readonly apiVersion: number;
  readonly manifest: PluginManifest;
  /** `player:read`; `null` otherwise. */
  track: TrackInfo | null;
  /** App settings the page may see (`internal:config`); empty otherwise. */
  config: Record<string, unknown>;
  /** Backend commands its permissions cover (see `COMMAND_PERMISSIONS`);
   * anything else rejects. Rejects with the backend's error on failure or
   * timeout (default 8s; pass `timeoutMs` for long-running commands). */
  invoke: (cmd: string, args?: Record<string, unknown>, opts?: { timeoutMs?: number }) => Promise<unknown>;
  /** `player:control`. */
  sendPlayerCommand: (command: string) => void;
  /** `page`; `null` otherwise. */
  getVideoElement: () => HTMLVideoElement | null;
  events: PluginEvents;
}

export interface YTMDPlugin {
  id: string;
  name: string;
  description: string;
  defaultEnabled: boolean;
  manifest: PluginManifest;

  onInit?: (ctx: PluginContext) => void | Promise<void>;
  onTrackChange?: (track: TrackInfo, ctx: PluginContext) => void | Promise<void>;
  onPlaybackChange?: (isPlaying: boolean, ctx: PluginContext) => void | Promise<void>;
  onTick?: (currentTimeSecs: number, ctx: PluginContext) => void | Promise<void>;
  onDestroy?: () => void | Promise<void>;
}

/** Backend commands each permission unlocks for `ctx.invoke`. */
export const COMMAND_PERMISSIONS: Record<string, Permission> = {
  fetch_lyrics: 'internal:lyrics',
  prefetch_lyrics: 'internal:lyrics',
  refresh_lyrics: 'internal:lyrics',
  get_current_lyrics: 'internal:lyrics',
  set_lyrics_offset: 'internal:lyrics',
  list_lyrics_candidates: 'internal:lyrics',
  pick_lyrics: 'internal:lyrics',
  import_lyrics_offsets: 'internal:lyrics',
  get_sync_room_state: 'internal:sync',
  broadcast_sync_state: 'internal:sync',
  send_sync_control: 'internal:sync',
  vote_sync_skip: 'internal:sync',
  send_sync_reaction: 'internal:sync',
  sync_queue_add: 'internal:sync',
  sync_queue_remove: 'internal:sync',
  sync_queue_play: 'internal:sync',
  sync_queue_move: 'internal:sync',
  sync_queue_take_next: 'internal:sync',
  remote_clients: 'internal:remote',
  remote_publish: 'internal:remote',
  remote_reply: 'internal:remote',
  set_inhibit_sleep: 'internal:power',
  toggle_mini_player: 'internal:windows',
  toggle_settings_window: 'internal:windows',
  toggle_local_library_window: 'internal:windows',
  toggle_sync_window: 'internal:windows',
  notify_track_change: 'internal:notify'
};

/** App events each permission lets `ctx.events` receive. */
export const EVENT_PERMISSIONS: Record<string, Permission> = {
  'config-updated': 'internal:config',
  'set-ambient-enabled': 'internal:config',
  'set-ambient-intensity': 'internal:config',
  'set-custom-css': 'internal:config',
  'set-eq-band': 'internal:config',
  'set-eq-all': 'internal:config',
  'set-eq-preset': 'internal:config',
  'set-preamp': 'internal:config',
  'set-crossfade-seconds': 'internal:config',
  'set-skip-silence': 'internal:config',
  'set-loudness-normalization': 'internal:config',
  'set-playback-rate': 'internal:config',
  'set-preserves-pitch': 'internal:config',
  'lyrics-changed': 'internal:lyrics',
  'sync-room-updated': 'internal:sync',
  'sync-room-left': 'internal:sync',
  'sync-playback-remote': 'internal:sync',
  'sync-control-remote': 'internal:sync',
  'sync-reaction': 'internal:sync',
  'remote-action': 'internal:remote',
  'remote-clients': 'internal:remote'
};

/**
 * What an installed plugin's entry script gets as `ytmd` (docs/PLUGIN_API.md).
 * Groups its manifest doesn't grant are `undefined`.
 */
export interface YtmdApi {
  readonly apiVersion: number;
  readonly plugin: { id: string; name: string; version: string };
  log: { info(...args: unknown[]): void; warn(...args: unknown[]): void; error(...args: unknown[]): void };
  /** Runs when the plugin is switched off or the page goes away. */
  onUnload(fn: () => void): void;
  settings: {
    all(): Record<string, unknown>;
    get(key: string): unknown;
    onChange(fn: (values: Record<string, unknown>) => void): Unlisten;
  };
  player?: {
    getTrack(): TrackInfo | null;
    isPlaying(): boolean;
    onTrackChange(fn: (track: TrackInfo) => void): Unlisten;
    onPlaybackChange(fn: (playing: boolean) => void): Unlisten;
    onTick(fn: (positionSecs: number) => void): Unlisten;
    /** False while this app follows someone else's playback (a Listen
     * Together guest): automatic seeking would fight the host. */
    canSeekAutomatically(): boolean;
    play?(): void;
    pause?(): void;
    playPause?(): void;
    next?(): void;
    previous?(): void;
    seek?(positionSecs: number): void;
    setVolume?(volume: number): void;
  };
  page?: { document: Document; getVideo(): HTMLVideoElement | null };
  storage?: {
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<void>;
    remove(key: string): Promise<void>;
    keys(): Promise<string[]>;
  };
  net?: { fetchText(url: string): Promise<string>; fetchJson(url: string): Promise<unknown> };
  ui?: {
    /** A YouTube Music-style toast; `id` updates a toast in place, `action`
     * adds one button. */
    toast(text: string, options?: ToastOptions): void;
    addStyle(css: string): Unlisten;
  };
  media?: {
    /** Formats `save` accepts. */
    readonly formats: readonly MediaFormat[];
    /** Saves a song (by YouTube video id) to the user's folder with
     * yt-dlp; resolves to a job id once it's queued. */
    save(videoId: string, options?: { format?: MediaFormat }): Promise<string>;
    cancel(job: string): Promise<void>;
    onProgress(fn: (progress: MediaProgress) => void): Unlisten;
    /** Whether yt-dlp/ffmpeg are there (Oscilla's own copies or the system's). */
    tools(): Promise<MediaToolStatus>;
    /** Asks the user (in an Oscilla dialog) to install yt-dlp and ffmpeg, then
     * installs them; resolves with how it ended. */
    installTools(): Promise<'done' | 'declined' | 'failed'>;
    onToolsProgress(fn: (progress: MediaToolsProgress) => void): Unlisten;
  };
}

export interface ToastOptions {
  id?: string;
  durationMs?: number;
  action?: { label: string; onClick: () => void };
}

export interface MediaToolStatus {
  ytdlp: 'managed' | 'system' | 'missing';
  ytdlpVersion: string | null;
  ffmpeg: 'managed' | 'system' | 'missing';
  installable: boolean;
  installing: boolean;
}

/** `plugin-media-tools`: installing yt-dlp/ffmpeg. */
export interface MediaToolsProgress {
  state: 'downloading' | 'installing' | 'done' | 'failed' | 'declined';
  tool: 'yt-dlp' | 'ffmpeg' | null;
  percent: number;
  error: string | null;
}

export const MEDIA_FORMATS = ['mp3', 'm4a', 'opus', 'flac'] as const;
export type MediaFormat = (typeof MEDIA_FORMATS)[number];

/** A `media:save` job's progress (`plugin-media-progress`). `file` is the
 * saved file's name, never its folder; `error` a message key such as
 * `plugins.error.ytdlpMissing`. */
export interface MediaProgress {
  plugin: string;
  job: string;
  videoId: string;
  state: 'queued' | 'downloading' | 'converting' | 'done' | 'failed' | 'cancelled';
  percent: number;
  file: string | null;
  error: string | null;
}
