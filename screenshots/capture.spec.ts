import { test } from '@playwright/test';
import {
  launchApp,
  seed,
  shoot,
  showSearch,
  openSettingsWindow,
  openQuickLook,
  cleanup,
  type Theme,
} from './helpers';
import { QUICK_LOOK_CONTENT, SEARCH_FILTER } from './fixtures/demo-data';

const THEMES: Theme[] = ['dark', 'light'];
const SEARCH_INPUT = '#clip-search-input';

for (const theme of THEMES) {
  test(`capture ${theme} theme screenshots`, async () => {
    const { app, page, userDataDir } = await launchApp();
    try {
      await seed(app, page, theme); // drives the real app: isolated profile, but briefly writes the OS clipboard

      await shoot(page, `main-${theme}.png`);

      await showSearch(app);
      await page.fill(SEARCH_INPUT, SEARCH_FILTER);
      await page.waitForTimeout(400);
      await shoot(page, `search-${theme}.png`);
      await page.press(SEARCH_INPUT, 'Escape'); // once to clear the filter
      await page.press(SEARCH_INPUT, 'Escape'); // again to hide the bar
      await page.locator(SEARCH_INPUT).waitFor({ state: 'hidden' });

      const settings = await openSettingsWindow(app, page);
      await shoot(settings, `settings-general-${theme}.png`);
      await settings.getByRole('button', { name: 'Tools' }).click();
      await settings.waitForTimeout(300);
      await shoot(settings, `settings-tools-${theme}.png`);
      await settings.getByRole('button', { name: 'Hotkeys' }).click();
      await settings.waitForTimeout(300);
      await shoot(settings, `settings-hotkeys-${theme}.png`);
      await settings.close();

      await openQuickLook(page, QUICK_LOOK_CONTENT, 'ip'); // pinning the IP brings up the tray with its tools
      await page.keyboard.press('w'); // wrap the long line so every chip is in view
      await page.waitForTimeout(500);
      await shoot(page, `patterns-${theme}.png`);
      await page.keyboard.press('Escape');
    } finally {
      await app.close();
      cleanup(userDataDir);
    }
  });
}
