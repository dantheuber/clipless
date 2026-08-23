import { test, expect, _electron as electron } from '@playwright/test';
import { resolve } from 'path';

test.describe('App Launch', () => {
  test('app launches and main window is visible', async () => {
    const app = await electron.launch({
      args: [resolve(__dirname, '../out/main/index.js')],
    });

    const window = await app.firstWindow();
    await window.waitForSelector('#root > *');
    expect(window).toBeTruthy();

    const title = await window.title();
    expect(title).toBeTruthy();

    const isVisible = await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      return win ? win.isVisible() : false;
    });
    expect(isVisible).toBe(true);

    await app.close();
  });

  test('app window has expected dimensions', async () => {
    const app = await electron.launch({
      args: [resolve(__dirname, '../out/main/index.js')],
    });

    const window = await app.firstWindow();
    const { width, height } = await window.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
    }));

    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);

    await app.close();
  });

  test('quick look opens in the main window, no launcher window exists', async () => {
    const app = await electron.launch({
      args: [resolve(__dirname, '../out/main/index.js')],
      env: { ...process.env, CLIPLESS_PLAINTEXT_STORAGE: '1' },
    });

    const window = await app.firstWindow();
    await window.waitForSelector('#root > *');
    const text = `launch check ${Date.now().toString(36)}`;
    await app.evaluate(({ clipboard }, t) => clipboard.writeText(t), text);
    await expect(window.locator('[data-testid="clip-row"]', { hasText: text })).toBeVisible({
      timeout: 10000,
    });

    await window.getByTestId('quick-look-button').click();
    await expect(window.getByTestId('quick-look')).toBeVisible();

    const urls = app.windows().map((w) => w.url());
    expect(urls.some((url) => url.includes('tools-launcher'))).toBe(false);
    expect(app.windows().length).toBe(1);

    await app.close();
  });
});
