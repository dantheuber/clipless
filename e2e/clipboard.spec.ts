import { test, expect, _electron as electron } from '@playwright/test';
import { resolve } from 'path';

test.describe('Clipboard', () => {
  test('clip appears after copying text', async () => {
    const app = await electron.launch({
      args: [resolve(__dirname, '../out/main/index.js')],
    });

    const window = await app.firstWindow();
    await window.waitForSelector('#root > *');

    await app.evaluate(async ({ clipboard }) => {
      clipboard.writeText('Test clipboard entry');
    });

    await window.waitForTimeout(1000);

    const content = await window.textContent('body');
    expect(content).toContain('Test clipboard entry');

    await app.close();
  });
});
