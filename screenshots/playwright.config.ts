import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  timeout: 90_000,
  retries: 0,
  workers: 1,
  fullyParallel: false,
  reporter: 'list',
});
