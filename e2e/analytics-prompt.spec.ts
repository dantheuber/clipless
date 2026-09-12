import { test, expect, _electron as electron } from '@playwright/test';
import { resolve } from 'path';

test.describe('Analytics consent', () => {
  for (const choice of ['No thanks', 'Send analytics']) {
    test(`first-launch metrics prompt remembers ${choice} on renderer reload`, async () => {
      const app = await electron.launch({ args: [resolve(__dirname, '../out/main/index.js')] });
      try {
        const main = await app.firstWindow();
        await main.waitForSelector('#root > *');
        // Exercise the packaged-build UI without enabling production analytics or altering consent.
        await app.evaluate(({ ipcMain }) => {
          let decided = false;
          let enabled = false;
          ipcMain.removeHandler('analytics-preference');
          ipcMain.removeHandler('analytics-set-enabled');
          ipcMain.handle('analytics-preference', () => ({
            enabled,
            available: true,
            needsPrompt: !decided,
          }));
          ipcMain.handle('analytics-set-enabled', (_event, value: boolean) => {
            enabled = value;
            decided = true;
            return { enabled, available: true, needsPrompt: false };
          });
        });
        await main.reload();
        const prompt = main.getByRole('dialog', { name: 'Help improve Clipless?' });
        await expect(prompt).toBeVisible();
        await expect(prompt).toContainText('100% opt-in');
        await expect(prompt.getByRole('button', { name: 'No thanks' })).toBeFocused();
        const recordingDetails = prompt.getByText(/We count activity and how often/);
        await expect(recordingDetails).toBeHidden();
        await prompt.getByText('What is sent?', { exact: true }).click();
        await expect(recordingDetails).toBeVisible();
        await prompt.getByRole('button', { name: choice }).click();
        await expect(prompt).toHaveCount(0);
        await main.reload();
        await main.waitForSelector('#root > *');
        const preference = await main.evaluate(() => window.api.analyticsPreference());
        expect(preference).toEqual({
          enabled: choice === 'Send analytics',
          available: true,
          needsPrompt: false,
        });
        await expect(prompt).toHaveCount(0);
      } finally {
        await app.close();
      }
    });
  }
});
