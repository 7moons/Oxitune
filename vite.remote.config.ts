import { defineConfig, type Plugin } from 'vite';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/** The phone remote is its own build (served by remote_server.rs from
 * dist-remote/, embedded into the binary), so the LAN only ever gets the
 * phone app's files, never the companion windows'. The home-screen icon
 * and manifest are written from the app's existing icon. */
function remoteManifest(): Plugin {
  return {
    name: 'ytmd-remote-manifest',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'remote-icon.png',
        source: readFileSync(resolve(__dirname, 'src-tauri/icons/128x128@2x.png'))
      });
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.webmanifest',
        source: JSON.stringify(
          {
            name: 'Oscilla remote',
            short_name: 'Oscilla',
            start_url: '/',
            scope: '/',
            display: 'standalone',
            orientation: 'portrait',
            background_color: '#030303',
            theme_color: '#030303',
            icons: [{ src: '/remote-icon.png', sizes: '256x256', type: 'image/png', purpose: 'any' }]
          },
          null,
          2
        )
      });
    }
  };
}

export default defineConfig({
  clearScreen: false,
  publicDir: false,
  plugins: [remoteManifest()],
  build: {
    outDir: 'dist-remote',
    emptyOutDir: true,
    target: ['es2020', 'safari14', 'chrome90'],
    assetsInlineLimit: 0,
    rollupOptions: {
      input: { remote: resolve(__dirname, 'remote.html') }
    }
  }
});
