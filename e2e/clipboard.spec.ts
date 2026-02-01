import { test, expect, _electron as electron } from '@playwright/test';
import { resolve } from 'path';

test.describe('Clipboard', () => {
  test('clip appears after copying text', async () => {
    const app = await electron.launch({
      args: [resolve(__dirname, '../out/main/index.js')],
    });

    const window = await app.firstWindow();
    await window.waitForSelector('#root > *');

    // Write text to clipboard via Electron
    await app.evaluate(async ({ clipboard }) => {
      clipboard.writeText('Test clipboard entry');
    });

    // Wait for clip to appear (polling interval is 250ms)
    await window.waitForTimeout(1000);

    // Check that the clip content appears in the window
    const content = await window.textContent('body');
    expect(content).toContain('Test clipboard entry');

    await app.close();
  });
});
