import { YTMDPlugin, PluginContext } from '../types';
import { startRemoteHost, stopRemoteHost } from './host';

/**
 * The page's half of the phone remote: carries out the phone's actions and
 * reports what the phone shows. The pairing QR code holds the remote's
 * token, so it is shown in the Settings window (`open_remote_pairing`),
 * never in the YouTube Music page.
 */
export const RemotePlugin: YTMDPlugin = {
  id: 'web_remote',
  name: 'Mobile Web Remote',
  description: 'Control playback from phone or tablet over Wi-Fi with QR code pairing',
  defaultEnabled: true,

  onInit(ctx: PluginContext) {
    startRemoteHost(ctx);
  },

  onDestroy() {
    stopRemoteHost();
  }
};
