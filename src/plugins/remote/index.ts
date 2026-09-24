import { YTMDPlugin, PluginContext } from '../types';
import { createEl } from '../../utils/dom';
import { openDialog } from '../../preload/ui/kit';
import { t } from '../../preload/ui/i18n';
import { startRemoteHost, stopRemoteHost } from './host';

interface RemoteInfo {
  ip: string;
  port: number;
  url: string;
  qr_svg: string;
}

export const RemotePlugin: YTMDPlugin = {
  id: 'web_remote',
  name: 'Mobile Web Remote',
  description: 'Control playback from phone or tablet over Wi-Fi with QR code pairing',
  defaultEnabled: true,

  onInit(ctx: PluginContext) {
    window.__ytmd_show_remote_qr = () => showQrModal(ctx);
    startRemoteHost(ctx);
    console.log('[YTMD] Mobile remote module ready.');
  },

  onDestroy() {
    stopRemoteHost();
    window.__ytmd_show_remote_qr = undefined;
    document.getElementById('ytmd-remote-modal')?.remove();
  }
};

const QR_CSS = `
  .ytmd-qr-frame {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 212px;
    height: 212px;
    margin: 20px auto 12px;
    padding: 16px;
    box-sizing: border-box;
    border-radius: 12px;
    background: #fff;
    color: #606060;
    font-size: 12px;
    text-align: center;
  }
  .ytmd-qr-frame img { display: block; width: 180px; height: 180px; }
  .ytmd-qr-url {
    text-align: center;
    font-size: 14px;
    color: var(--ytmd-text);
    word-break: break-all;
    user-select: all;
  }
`;

function ensureQrStyles() {
  if (document.getElementById('ytmd-qr-styles')) return;
  const style = document.createElement('style');
  style.id = 'ytmd-qr-styles';
  style.textContent = QR_CSS;
  document.head.appendChild(style);
}

/** Phone-remote pairing dialog: QR code + URL for the remote server. */
export async function showQrModal(ctx: PluginContext) {
  ensureQrStyles();
  const intro = createEl('p', { text: t().remoteBody, style: 'margin: 0;' });
  const qrFrame = createEl('div', { className: 'ytmd-qr-frame', text: t().remoteLoading });
  const url = createEl('div', { className: 'ytmd-qr-url' });

  const dialog = openDialog({
    id: 'ytmd-remote-modal',
    title: t().remoteTitle,
    body: [intro, qrFrame, url],
    actions: [{ label: t().close }]
  });

  try {
    const info = (await ctx.invoke('get_remote_info')) as RemoteInfo | null;
    // The dialog may have been closed while this was in flight.
    if (!qrFrame.isConnected) return;

    if (info?.qr_svg) {
      const img = createEl('img');
      img.src = `data:image/svg+xml;utf8,${encodeURIComponent(info.qr_svg)}`;
      img.alt = t().remoteTitle;
      qrFrame.replaceChildren(img);
    } else {
      qrFrame.textContent = t().remoteUnavailable;
    }
    if (info?.url) url.textContent = info.url;
  } catch (e) {
    console.error('[YTMD Remote] Error fetching remote info:', e);
    if (qrFrame.isConnected) qrFrame.textContent = t().remoteUnavailable;
  }
  return dialog;
}
