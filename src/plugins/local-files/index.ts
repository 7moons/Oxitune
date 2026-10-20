import { OxitunePlugin, PluginContext, PluginManifest } from '../types';
import manifest from './manifest.json';

export const LocalFilesPlugin: OxitunePlugin = {
  id: 'local_files',
  manifest: manifest as PluginManifest,
  name: 'Local Music Library',
  description: 'Play local offline audio files alongside YouTube Music streaming',
  defaultEnabled: true,

  onInit(_ctx: PluginContext) {
    // Local Files window is accessible via the central Oxitune Menu and shortcuts
    console.log('[Oxitune] Local files module ready.');
  }
};
