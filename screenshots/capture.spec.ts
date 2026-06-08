/**
 * Documentation screenshot capture.
 *
 * Run with: `npm run screenshots` (builds first) or `npm run screenshots:only`
 * (reuses an existing build). Output lands in `screenshots/output/` — copy those
 * PNGs into the `gh-pages` branch's image folder to publish them.
 *
 * NOTE: this drives the real Electron app. It uses an isolated profile, so it
 * does not touch your real clip store, but it briefly writes the OS clipboard.
 */
import { test } from '@playwright/test';
import {
  launchApp,
  seed,
  shoot,
  showSearch,
  openSettingsWindow,
  openToolsLauncher,
  cleanup,
  type Theme,
} from './helpers';
import { LAUNCHER_SCAN_CONTENT, SEARCH_FILTER } from './fixtures/demo-data';

const THEMES: Theme[] = ['dark', 'light'];
const SEARCH_INPUT = 'input[placeholder="Filter clips..."]';

for (const theme of THEMES) {
  test(`capture ${theme} theme screenshots`, async () => {
    const { app, page, userDataDir } = await launchApp();
    try {
      await seed(app, page, theme);

      // 1. Main window with curated clips (hero).
      await shoot(page, `main-${theme}.png`);

      // 2. Clip search filtering in action.
      await showSearch(app);
      await page.fill(SEARCH_INPUT, SEARCH_FILTER);
      await page.waitForTimeout(400);
      await shoot(page, `search-${theme}.png`);
      await page.press(SEARCH_INPUT, 'Escape');

      // 3. Settings tabs.
      const settings = await openSettingsWindow(app, page);
      await shoot(settings, `settings-general-${theme}.png`);
      await settings.getByRole('button', { name: 'Tools' }).click();
      await settings.waitForTimeout(300);
      await shoot(settings, `settings-tools-${theme}.png`);
      await settings.getByRole('button', { name: 'Hotkeys' }).click();
      await settings.waitForTimeout(300);
      await shoot(settings, `settings-hotkeys-${theme}.png`);
      await page.evaluate(() =>
        (
          window as unknown as { api: { closeSettings: () => Promise<unknown> } }
        ).api.closeSettings()
      );

      // 4. Quick Clips pattern matching in the Tools Launcher.
      const launcher = await openToolsLauncher(app, page, LAUNCHER_SCAN_CONTENT);
      await launcher.waitForTimeout(500);
      await shoot(launcher, `patterns-${theme}.png`);
      await page.evaluate(() =>
        (
          window as unknown as { api: { closeToolsLauncher: () => Promise<unknown> } }
        ).api.closeToolsLauncher()
      );
    } finally {
      await app.close();
      cleanup(userDataDir);
    }
  });
}
