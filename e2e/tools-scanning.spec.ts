import { test, expect, type ElectronApplication, type Page } from '@playwright/test';
import { UNIQUE, launchApp, cleanupAllData } from './tools-harness';

test.describe('Quick look — pattern scanning', () => {
  let app: ElectronApplication;
  let window: Page;
  const text = `Contact us at test-${UNIQUE}@example.com for info`;

  test.beforeAll(async () => {
    const result = await launchApp();
    app = result.app;
    window = result.window;
    await cleanupAllData(window);

    await window.evaluate(async () => {
      const api = (window as any).api;
      await api.searchTermsCreate('Email Pattern', '(?<email>[\\w.+-]+@[\\w-]+\\.[\\w.]+)');
      await api.quickToolsCreate('Email Lookup', 'https://example.com/search?q={email}', ['email']);
      await api.templatesCreate('Email Template', 'Contact: {email}');
    });

    await app.evaluate(async ({ clipboard }, t) => {
      clipboard.writeText(t);
    }, text);
    await window.waitForTimeout(1000);
  });

  test.afterAll(async () => {
    await app.close();
  });

  test('the row shows a chip, pinning it opens the tray with the tool and the template', async () => {
    const row = window.locator('[data-testid="clip-row"]', { hasText: 'Contact us at' }).first();
    const chip = row.locator(`[data-key="email|test-${UNIQUE}@example.com"]`);
    await expect(chip).toBeVisible({ timeout: 10000 });

    await chip.click();
    const tray = window.getByTestId('tray');
    await expect(tray).toBeVisible();
    await expect(tray.getByTestId('tray-group-email')).toContainText('Email Lookup');
    await expect(tray.getByTestId('open-all')).toHaveText('Open all (1 tab)');
    await expect(tray.getByTestId('template-pills')).toContainText('Email Template');
    await expect(tray.locator('[data-state="ready"]')).toHaveCount(1);
  });
});
