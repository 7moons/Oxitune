import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  clearScreen: false,
  server: {
    host: '127.0.0.1',
    port: 24681,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**']
    }
  },
  build: {
    target: ['es2021', 'chrome105', 'safari13'],
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
    rollupOptions: {
      input: {
        miniplayer: resolve(__dirname, 'miniplayer.html'),
        settings: resolve(__dirname, 'settings.html'),
        local: resolve(__dirname, 'local.html'),
        sync: resolve(__dirname, 'sync.html'),
        offline: resolve(__dirname, 'offline.html'),
        preload: resolve(__dirname, 'src/preload/index.ts')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'preload') {
            return 'preload.js';
          }
          return 'assets/[name]-[hash].js';
        }
      }
    }
  }
});
