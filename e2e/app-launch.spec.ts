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
});
