import { YTMDPlugin, PluginContext } from '../types';
import { setSafeHTML } from '../../utils/dom';

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
    (window as any).__ytmd_show_remote_qr = () => showQrModal(ctx);
    console.log('[YTMD] Mobile remote module ready.');
  }
};

export async function showQrModal(ctx: PluginContext) {
  let modal = document.getElementById('ytmd-remote-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'ytmd-remote-modal';
    modal.style.cssText = `
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
    `;
    document.body.appendChild(modal);
  }

  modal.style.display = 'flex';
  setSafeHTML(modal, `
    <div style="background: #18181b; border: 1px solid #27272a; border-radius: 14px; padding: 24px; max-width: 360px; width: 90%; text-align: center; color: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-shadow: 0 24px 48px rgba(0,0,0,0.85);">
      <h3 style="margin: 0 0 6px 0; font-size: 18px; font-weight: 700;">Mobile Web Remote</h3>
      <p style="font-size: 13px; color: #a1a1aa; margin: 0 0 16px 0;">Scan with your phone camera on the same Wi-Fi network:</p>
      <div id="ytmd-qr-container" style="background: #ffffff; padding: 14px; border-radius: 10px; display: inline-block; margin-bottom: 14px; min-width: 180px; min-height: 180px; display: flex; align-items: center; justify-content: center;">
        <span style="color: #52525b; font-size: 12px; font-weight: 500;">Generating QR code...</span>
      </div>
      <div id="ytmd-remote-url" style="font-family: monospace; font-size: 13px; color: #38bdf8; margin-bottom: 20px; word-break: break-all; font-weight: 600;"></div>
      <button id="ytmd-remote-close-btn" style="background: #27272a; color: #fff; border: 1px solid #3f3f46; border-radius: 8px; padding: 8px 24px; font-weight: 600; cursor: pointer; font-size: 13px; transition: background 0.15s ease;">Close</button>
    </div>
  `);

  const closeBtn = document.getElementById('ytmd-remote-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (modal) modal.style.display = 'none';
    });
  }

  // Close on outside click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  try {
    const info = (await ctx.invoke('get_remote_info')) as RemoteInfo | null;
    const qrContainer = document.getElementById('ytmd-qr-container');
    const urlContainer = document.getElementById('ytmd-remote-url');

    if (info && info.qr_svg && qrContainer) {
      setSafeHTML(qrContainer, info.qr_svg);
      const svg = qrContainer.querySelector('svg');
      if (svg) {
        svg.style.width = '180px';
        svg.style.height = '180px';
        svg.style.display = 'block';
      }
    } else if (qrContainer) {
      qrContainer.innerHTML = '<span style="color: #71717a; font-size: 12px;">Remote server starting...</span>';
    }

    if (info && info.url && urlContainer) {
      urlContainer.textContent = info.url;
    }
  } catch (e) {
    console.error('[YTMD Remote] Error fetching remote info:', e);
  }
}
