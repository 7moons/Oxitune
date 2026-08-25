import { YTMDPlugin, PluginContext, TrackInfo } from '../types';

export const NotificationsPlugin: YTMDPlugin = {
  id: 'notifications',
  name: 'Track Change Notifications',
  description: 'Displays native desktop notifications when songs change',
  defaultEnabled: true,

  async onTrackChange(track: TrackInfo, ctx: PluginContext) {
    try {
      await ctx.invoke('notify_track_change', {
        title: track.title,
        artist: track.artist
      });
    } catch (e) {
      console.warn('[YTMD] Notification dispatch failed:', e);
    }
  }
};
