import { defineConfig } from '@playwright/test';

/**
 * Dedicated Playwright config for the documentation screenshot harness.
 * Kept separate from the e2e suite (which uses the root playwright.config.ts)
 * so screenshot generation never runs as part of the normal test run.
 */
export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  timeout: 90_000,
  retries: 0,
  workers: 1,
  fullyParallel: false,
  reporter: 'list',
});
