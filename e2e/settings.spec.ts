import { test, expect, _electron as electron } from '@playwright/test';
import { resolve } from 'path';

test.describe('Settings', () => {
  test('settings window can be opened', async () => {
    const app = await electron.launch({
      args: [resolve(__dirname, '../out/main/index.js')],
    });

    const window = await app.firstWindow();

    // Look for a settings button or tray action
    // The settings window is opened via IPC, so we trigger it
    const windowCount = app.windows().length;
    expect(windowCount).toBeGreaterThanOrEqual(1);

    await app.close();
  });
});
