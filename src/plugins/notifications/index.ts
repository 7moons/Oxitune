import { OxitunePlugin, PluginContext, TrackInfo, PluginManifest } from '../types';
import manifest from './manifest.json';

export const NotificationsPlugin: OxitunePlugin = {
  id: 'notifications',
  manifest: manifest as PluginManifest,
  name: 'Track Change Notifications',
  description: 'Displays native desktop notifications when songs change',
  defaultEnabled: false,

  async onTrackChange(track: TrackInfo, ctx: PluginContext) {
    if (!ctx.config?.notifications_enabled) return;
    if (!track.title || track.title === 'No Track Playing') return;

    try {
      await ctx.invoke('notify_track_change', {
        title: track.title,
        artist: track.artist
      });
    } catch (e) {
      console.warn('[Oxitune] Notification dispatch failed:', e);
    }
  }
};
