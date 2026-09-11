import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import packageJson from './package.json';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
      // Public ingestion token (not a personal API key). Empty overrides disable reporting.
      __POSTHOG_PROJECT_TOKEN__: JSON.stringify(
        process.env.CLIPLESS_POSTHOG_TOKEN ?? 'phc_zTkMbFNXm7QYuJRVfwGKnM6niFSb5VyDU4teX4Zdm8YD'
      ),
      __POSTHOG_REGION__: JSON.stringify(process.env.CLIPLESS_POSTHOG_REGION ?? 'us'),
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
