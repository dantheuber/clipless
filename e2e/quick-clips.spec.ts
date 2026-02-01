import { test, expect, _electron as electron } from '@playwright/test';
import { resolve } from 'path';

test.describe('Quick Clips', () => {
  test('app launches without quick clips errors', async () => {
    const app = await electron.launch({
      args: [resolve(__dirname, '../out/main/index.js')],
    });

    const window = await app.firstWindow();
    await window.waitForSelector('#root > *');

    // Verify the app loaded successfully
    const content = await window.textContent('body');
    expect(content).toBeTruthy();

    // Check console for errors related to quick clips
    const errors: string[] = [];
    window.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await window.waitForTimeout(500);

    const quickClipErrors = errors.filter((e) => e.includes('quick clip') || e.includes('pattern'));
    expect(quickClipErrors).toHaveLength(0);

    await app.close();
  });
});
