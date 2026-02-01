import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    projects: [
      {
        define: {
          __APP_VERSION__: JSON.stringify('0.0.0-test'),
        },
        test: {
          name: 'node',
          include: ['src/main/**/*.test.ts', 'src/preload/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        define: {
          __APP_VERSION__: JSON.stringify('0.0.0-test'),
        },
        test: {
          name: 'renderer',
          include: ['src/renderer/**/*.test.ts', 'src/renderer/**/*.test.tsx'],
          environment: 'jsdom',
          setupFiles: ['src/renderer/src/test-setup.ts'],
        },
        resolve: {
          alias: {
            '@renderer': resolve(__dirname, 'src/renderer/src'),
          },
        },
      },
    ],
  },
});
