import { test, expect, _electron as electron } from '@playwright/test';
import { resolve } from 'path';

test.describe('Image Clipboard', () => {
  test('image clip appears after copying an image', async () => {
    const app = await electron.launch({
      args: [resolve(__dirname, '../out/main/index.js')],
    });

    const window = await app.firstWindow();
    await window.waitForSelector('#root > *');

    // Load a test image and write it to the clipboard via Electron's nativeImage
    const testImagePath = resolve(__dirname, 'fixtures/test-image.png');
    await app.evaluate(async ({ clipboard, nativeImage }, imgPath) => {
      const image = nativeImage.createFromPath(imgPath);
      clipboard.writeImage(image);
    }, testImagePath);

    // Wait for clipboard polling to detect the image (250ms interval + processing)
    await window.waitForTimeout(2000);

    // Verify an image clip appeared with the expected elements
    const imgPreview = window.locator('img[alt="Clipboard image preview"]');
    await expect(imgPreview.first()).toBeVisible({ timeout: 5000 });

    // Verify image metadata is displayed
    const body = await window.textContent('body');
    expect(body).toContain('Image (PNG)');

    await app.close();
  });

  test('copying a second image adds another clip', async () => {
    const app = await electron.launch({
      args: [resolve(__dirname, '../out/main/index.js')],
    });

    const window = await app.firstWindow();
    await window.waitForSelector('#root > *');

    // Clear any persisted clips from previous test runs
    await window.evaluate(async () => {
      const api = (window as any).api;
      await api.storageSaveClips([], {});
    });
    await window.waitForTimeout(500);

    // Reload the window to pick up the cleared state
    await window.reload();
    await window.waitForSelector('#root > *');
    await window.waitForTimeout(500);

    const testImagePath = resolve(__dirname, 'fixtures/test-image.png');

    // Copy first image (original dimensions)
    await app.evaluate(async ({ clipboard, nativeImage }, imgPath) => {
      const image = nativeImage.createFromPath(imgPath);
      clipboard.writeImage(image);
    }, testImagePath);

    await window.waitForTimeout(2000);
    const imgPreviews = window.locator('img[alt="Clipboard image preview"]');
    await expect(imgPreviews.first()).toBeVisible({ timeout: 5000 });

    // Verify exactly 1 image clip so far
    await expect(imgPreviews).toHaveCount(1, { timeout: 3000 });

    // Clear clipboard with text to reset the detection state
    await app.evaluate(async ({ clipboard }) => {
      clipboard.writeText('separator');
    });
    await window.waitForTimeout(1000);

    // Copy a different image (resized to different dimensions → stable, distinct fingerprint)
    await app.evaluate(async ({ clipboard, nativeImage }, imgPath) => {
      const image = nativeImage.createFromPath(imgPath);
      const resized = image.resize({ width: 16, height: 16 });
      clipboard.writeImage(resized);
    }, testImagePath);

    await window.waitForTimeout(2000);

    // Should now have two image clips
    await expect(imgPreviews).toHaveCount(2, { timeout: 5000 });

    await app.close();
  });
});
