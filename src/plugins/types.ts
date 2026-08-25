export interface TrackInfo {
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  durationSecs: number;
  currentTimeSecs: number;
  isPlaying: boolean;
  videoId?: string;
}

export interface PluginContext {
  track: TrackInfo | null;
  config: Record<string, unknown>;
  invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
  sendPlayerCommand: (command: string) => void;
  getVideoElement: () => HTMLVideoElement | null;
}

export interface YTMDPlugin {
  id: string;
  name: string;
  description: string;
  defaultEnabled: boolean;
  
  onInit?: (ctx: PluginContext) => void | Promise<void>;
  onTrackChange?: (track: TrackInfo, ctx: PluginContext) => void | Promise<void>;
  onPlaybackChange?: (isPlaying: boolean, ctx: PluginContext) => void | Promise<void>;
  onTick?: (currentTimeSecs: number, ctx: PluginContext) => void | Promise<void>;
  onDestroy?: () => void | Promise<void>;
}
