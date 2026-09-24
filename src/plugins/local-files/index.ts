import { YTMDPlugin, PluginContext, PluginManifest } from '../types';
import manifest from './manifest.json';

export const LocalFilesPlugin: YTMDPlugin = {
  id: 'local_files',
  manifest: manifest as PluginManifest,
  name: 'Local Music Library',
  description: 'Play local offline audio files alongside YouTube Music streaming',
  defaultEnabled: true,

  onInit(_ctx: PluginContext) {
    // Local Files window is accessible via the central Oscilla Menu and shortcuts
    console.log('[Oscilla] Local files module ready.');
  }
};
