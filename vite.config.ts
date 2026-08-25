import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  clearScreen: false,
  server: {
    port: 1420,
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
        main: resolve(__dirname, 'index.html'),
        miniplayer: resolve(__dirname, 'miniplayer.html'),
        settings: resolve(__dirname, 'settings.html'),
        local: resolve(__dirname, 'local.html'),
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
