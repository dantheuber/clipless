import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Load package.json to get the version
const packageJson = require('./package.json');

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
    },
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve('src/renderer/index.html'),
          settings: resolve('src/renderer/settings.html'),
        },
      },
    },
    plugins: [react(), tailwindcss()],
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
    },
  },
});
