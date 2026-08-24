import { test, expect, _electron as electron } from '@playwright/test';
import { resolve } from 'path';

test.describe('Theme', () => {
  test('app starts with default theme applied to body', async () => {
    const app = await electron.launch({
      args: [resolve(__dirname, '../out/main/index.js')],
    });

    const window = await app.firstWindow();
    await window.waitForSelector('#root > *');

    await window.waitForFunction(() => /light|dark/.test(document.body.className));
    const bodyClasses = await window.evaluate(() => document.body.className);
    expect(bodyClasses).toMatch(/light|dark/);

    await app.close();
  });
});
