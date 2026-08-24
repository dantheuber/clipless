import { test, expect, type ElectronApplication, type Page } from '@playwright/test';
import { UNIQUE, launchApp, cleanupAllData } from './tools-harness';

test.describe('Quick look — clip templates', () => {
  let app: ElectronApplication;
  let window: Page;

  test.beforeAll(async () => {
    const result = await launchApp();
    app = result.app;
    window = result.window;
    await cleanupAllData(window);

    await window.evaluate(async () => {
      const api = (window as any).api;
      await api.templatesCreate('Positional Template', 'First: {c1}, Second: {c2}');
    });

    await app.evaluate(async ({ clipboard }, t) => {
      clipboard.writeText(t);
    }, `clip-template-row-${UNIQUE}`);
    await window.waitForTimeout(1000);
  });

  test.afterAll(async () => {
    await app.close();
  });

  test('the context menu lists the clip template with a preview from row 1', async () => {
    const row = window
      .locator('[data-testid="clip-row"]', { hasText: `clip-template-row-${UNIQUE}` })
      .first();
    await row.click({ button: 'right' });
    const parent = window.getByTestId('menu-fill-clip-template');
    await expect(parent).toBeVisible({ timeout: 3000 });
    await parent.hover();
    const submenu = window.getByTestId('clip-template-submenu');
    await expect(submenu).toBeVisible();
    await expect(submenu).toContainText('Positional Template');
    await expect(submenu).toContainText(`First: clip-template-row-${UNIQUE}`);
    await window.keyboard.press('Escape');
  });
});
