import { YTMDPlugin, PluginContext } from '../types';
import { setSafeHTML } from '../../utils/dom';

export const LocalFilesPlugin: YTMDPlugin = {
  id: 'local_files',
  name: 'Local Music Library',
  description: 'Play local offline audio files alongside YouTube Music streaming',
  defaultEnabled: true,

  onInit(ctx: PluginContext) {
    const injectLocalMusicButton = () => {
      if (document.getElementById('ytmd-local-nav-btn')) return;

      const navBarRight = document.querySelector('ytmusic-nav-bar .right-content');
      if (navBarRight) {
        const localBtn = document.createElement('button');
        localBtn.id = 'ytmd-local-nav-btn';
        localBtn.title = 'Local Music Library';
        setSafeHTML(localBtn, `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/>
          </svg>
          <span style="margin-left: 6px; font-size: 13px; font-weight: 500;">Local Files</span>
        `);
        localBtn.style.cssText = `
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
        localBtn.addEventListener('mouseenter', () => {
          localBtn.style.background = '#27272a';
          localBtn.style.borderColor = '#3f3f46';
          localBtn.style.color = '#fafafa';
        });
        localBtn.addEventListener('mouseleave', () => {
          localBtn.style.background = '#18181b';
          localBtn.style.borderColor = '#27272a';
          localBtn.style.color = '#d4d4d8';
        });

        localBtn.addEventListener('click', async () => {
          await ctx.invoke('toggle_local_library_window');
        });

        navBarRight.prepend(localBtn);
      }
    };

    setInterval(injectLocalMusicButton, 1000);
    injectLocalMusicButton();
  }
};
