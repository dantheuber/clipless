import { test, expect, _electron as electron } from '@playwright/test';
import { resolve } from 'path';

test.describe('Image Clipboard', () => {
  test('image clip appears after copying an image', async () => {
    const app = await electron.launch({
      args: [resolve(__dirname, '../out/main/index.js')],
    });

    const window = await app.firstWindow();
    await window.waitForSelector('#root > *');

    const testImagePath = resolve(__dirname, 'fixtures/test-image.png');
    await app.evaluate(async ({ clipboard, nativeImage }, imgPath) => {
      const image = nativeImage.createFromPath(imgPath);
      clipboard.writeImage(image);
    }, testImagePath);

    await window.waitForTimeout(2000);

    const imgPreview = window.locator('img[alt="Clipboard image preview"]');
    await expect(imgPreview.first()).toBeVisible({ timeout: 5000 });

    const row = window.locator('[data-testid="clip-row"]', { has: imgPreview.first() });
    await expect(row).toContainText('png');
    await expect(row).toContainText(/\d+ (B|KB)/);

    await app.close();
  });

  test('copying a second image adds another clip', async () => {
    const app = await electron.launch({
      args: [resolve(__dirname, '../out/main/index.js')],
    });

    const window = await app.firstWindow();
    await window.waitForSelector('#root > *');

    await window.evaluate(async () => {
      const api = (window as any).api;
      await api.storageSaveClips([], {});
    });
    await window.waitForTimeout(500);

    await window.reload();
    await window.waitForSelector('#root > *');
    await window.waitForTimeout(500);

    const testImagePath = resolve(__dirname, 'fixtures/test-image.png');

    await app.evaluate(async ({ clipboard, nativeImage }, imgPath) => {
      const image = nativeImage.createFromPath(imgPath);
      clipboard.writeImage(image);
    }, testImagePath);

    await window.waitForTimeout(2000);
    const imgPreviews = window.locator('img[alt="Clipboard image preview"]');
    await expect(imgPreviews.first()).toBeVisible({ timeout: 5000 });

    await expect(imgPreviews).toHaveCount(1, { timeout: 3000 });

    await app.evaluate(async ({ clipboard }) => {
      clipboard.writeText('separator');
    });
    await window.waitForTimeout(1000);

    await app.evaluate(async ({ clipboard, nativeImage }, imgPath) => {
      const image = nativeImage.createFromPath(imgPath);
      const resized = image.resize({ width: 16, height: 16 });
      clipboard.writeImage(resized);
    }, testImagePath);

    await window.waitForTimeout(2000);

    await expect(imgPreviews).toHaveCount(2, { timeout: 5000 });

    await app.close();
  });
});
