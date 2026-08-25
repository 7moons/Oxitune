import { YTMDPlugin, PluginContext } from '../types';

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
    const injectRemoteButton = () => {
      if (document.getElementById('ytmd-remote-nav-btn')) return;

      const navBarRight = document.querySelector('ytmusic-nav-bar .right-content');
      if (navBarRight) {
        const remoteBtn = document.createElement('button');
        remoteBtn.id = 'ytmd-remote-nav-btn';
        remoteBtn.title = 'Mobile Web Remote (QR Code)';
        remoteBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/>
          </svg>
          <span style="margin-left: 6px; font-size: 13px; font-weight: 500;">Remote</span>
        `;
        remoteBtn.style.cssText = `
          display: inline-flex;
          align-items: center;
          background: #18181b;
          border: 1px solid #27272a;
          color: #d4d4d8;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          margin-right: 8px;
          font-family: inherit;
          transition: background-color 0.15s ease, border-color 0.15s ease;
        `;
        remoteBtn.addEventListener('mouseenter', () => {
          remoteBtn.style.background = '#27272a';
          remoteBtn.style.borderColor = '#3f3f46';
          remoteBtn.style.color = '#fafafa';
        });
        remoteBtn.addEventListener('mouseleave', () => {
          remoteBtn.style.background = '#18181b';
          remoteBtn.style.borderColor = '#27272a';
          remoteBtn.style.color = '#d4d4d8';
        });

        remoteBtn.addEventListener('click', async () => {
          await showQrModal(ctx);
        });

        navBarRight.prepend(remoteBtn);
      }
    };

    setInterval(injectRemoteButton, 1000);
    injectRemoteButton();
  }
};

async function showQrModal(ctx: PluginContext) {
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
      background: rgba(0,0,0,0.75);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(8px);
    `;
    document.body.appendChild(modal);
  }

  modal.style.display = 'flex';
  modal.innerHTML = `
    <div style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 24px; max-width: 360px; width: 90%; text-align: center; color: #fafafa; font-family: inherit; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
      <h3 style="margin: 0 0 8px 0; font-size: 18px;">Mobile Web Remote</h3>
      <p style="font-size: 13px; color: #a1a1aa; margin-bottom: 16px;">Scan with your phone camera on the same Wi-Fi network:</p>
      <div id="ytmd-qr-container" style="background: #ffffff; padding: 12px; border-radius: 8px; display: inline-block; margin-bottom: 16px;">
        <span style="color: #000; font-size: 12px;">Loading QR code...</span>
      </div>
      <div id="ytmd-remote-url" style="font-family: monospace; font-size: 13px; color: #38bdf8; margin-bottom: 20px; word-break: break-all;"></div>
      <button id="ytmd-remote-close-btn" style="background: #dc2626; color: #fff; border: none; border-radius: 6px; padding: 8px 20px; font-weight: 600; cursor: pointer; font-size: 13px;">Close</button>
    </div>
  `;

  const closeBtn = document.getElementById('ytmd-remote-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (modal) modal.style.display = 'none';
    });
  }

  try {
    const info = (await ctx.invoke('get_remote_info')) as RemoteInfo;
    const qrContainer = document.getElementById('ytmd-qr-container');
    const urlContainer = document.getElementById('ytmd-remote-url');

    if (qrContainer && info.qr_svg) {
      qrContainer.innerHTML = info.qr_svg;
      const svg = qrContainer.querySelector('svg');
      if (svg) {
        svg.style.width = '180px';
        svg.style.height = '180px';
        svg.style.display = 'block';
      }
    }
    if (urlContainer) {
      urlContainer.textContent = info.url;
    }
  } catch (e) {
    console.error('[YTMD Remote] Failed to load remote info:', e);
  }
}
