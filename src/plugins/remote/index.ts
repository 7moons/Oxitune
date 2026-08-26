import { YTMDPlugin, PluginContext } from '../types';
import { createEl } from '../../utils/dom';

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
    console.log('[YTMD] Mobile remote module ready.');
  },

  onDestroy() {
    window.__ytmd_show_remote_qr = undefined;
    document.getElementById('ytmd-remote-modal')?.remove();
  }
};

export async function showQrModal(ctx: PluginContext) {
  let modal = document.getElementById('ytmd-remote-modal');
  if (!modal) {
    modal = createEl('div', {
      id: 'ytmd-remote-modal',
      style: `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0,0,0,0.8);
        z-index: 2147483647;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(12px);
      `
    });

    const card = createEl('div', {
      style: `
        background: #18181b;
        border: 1px solid #27272a;
        border-radius: 14px;
        padding: 24px;
        max-width: 360px;
        width: 90%;
        text-align: center;
        color: #fafafa;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 24px 48px rgba(0,0,0,0.85);
      `
    });

    const title = createEl('h3', {
      text: 'Mobile Web Remote',
      style: 'margin: 0 0 6px 0; font-size: 18px; font-weight: 700;'
    });

    const desc = createEl('p', {
      text: 'Scan with your phone camera on the same Wi-Fi network:',
      style: 'font-size: 13px; color: #a1a1aa; margin: 0 0 16px 0;'
    });

    const qrContainer = createEl('div', {
      id: 'ytmd-qr-container',
      style: `
        background: #ffffff;
        padding: 14px;
        border-radius: 10px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 14px;
        min-width: 180px;
        min-height: 180px;
      `
    });

    const loadingText = createEl('span', {
      text: 'Generating QR code...',
      style: 'color: #52525b; font-size: 12px; font-weight: 500;'
    });
    qrContainer.appendChild(loadingText);

    const urlContainer = createEl('div', {
      id: 'ytmd-remote-url',
      style: 'font-family: monospace; font-size: 13px; color: #38bdf8; margin-bottom: 20px; word-break: break-all; font-weight: 600;'
    });

    const closeBtn = createEl('button', {
      id: 'ytmd-remote-close-btn',
      text: 'Close',
      style: 'background: #27272a; color: #fff; border: 1px solid #3f3f46; border-radius: 8px; padding: 8px 24px; font-weight: 600; cursor: pointer; font-size: 13px;'
    });

    const modalEl = modal;
    closeBtn.addEventListener('click', () => {
      modalEl.style.display = 'none';
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modalEl) {
        modalEl.style.display = 'none';
      }
    });

    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(qrContainer);
    card.appendChild(urlContainer);
    card.appendChild(closeBtn);

    modal.appendChild(card);
    document.body.appendChild(modal);
  }

  modal.style.display = 'flex';

  try {
    const info = (await ctx.invoke('get_remote_info')) as RemoteInfo | null;
    const qrContainer = document.getElementById('ytmd-qr-container');
    const urlContainer = document.getElementById('ytmd-remote-url');

    if (info && info.qr_svg && qrContainer) {
      const img = createEl('img');
      img.src = `data:image/svg+xml;utf8,${encodeURIComponent(info.qr_svg)}`;
      img.width = 180;
      img.height = 180;
      img.style.display = 'block';
      img.alt = 'Mobile Remote QR Code';
      qrContainer.replaceChildren(img);
    } else if (qrContainer) {
      qrContainer.replaceChildren(
        createEl('span', { text: 'Remote server starting...', style: 'color: #71717a; font-size: 12px;' })
      );
    }

    if (info && info.url && urlContainer) {
      urlContainer.textContent = info.url;
    }
  } catch (e) {
    console.error('[YTMD Remote] Error fetching remote info:', e);
  }
}
