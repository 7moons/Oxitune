import { YTMDPlugin, PluginContext } from '../types';

export const LocalFilesPlugin: YTMDPlugin = {
  id: 'local_files',
  name: 'Local Music Library',
  description: 'Play local offline audio files alongside YouTube Music streaming',
  defaultEnabled: true,

  onInit(_ctx: PluginContext) {
    // Local Files window is accessible via the central YTMD Menu and shortcuts
    console.log('[YTMD] Local files module ready.');
  }
};
