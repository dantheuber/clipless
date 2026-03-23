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

    const testImagePath = resolve(__dirname, 'fixtures/test-image.png');

    // Copy first image
    await app.evaluate(async ({ clipboard, nativeImage }, imgPath) => {
      const image = nativeImage.createFromPath(imgPath);
      clipboard.writeImage(image);
    }, testImagePath);

    await window.waitForTimeout(2000);
    await expect(window.locator('img[alt="Clipboard image preview"]').first()).toBeVisible({
      timeout: 5000,
    });

    // Clear clipboard with text to reset, then copy a different image
    await app.evaluate(async ({ clipboard }) => {
      clipboard.writeText('separator');
    });
    await window.waitForTimeout(1000);

    // Copy image again (will have different fingerprint due to fresh nativeImage instance)
    await app.evaluate(async ({ clipboard, nativeImage }, imgPath) => {
      // Create a slightly different image by modifying pixels
      const image = nativeImage.createFromPath(imgPath);
      const size = image.getSize();
      const buf = image.toBitmap();
      // Flip a pixel to ensure different fingerprint
      buf[0] = buf[0] === 0 ? 1 : 0;
      const modified = nativeImage.createFromBitmap(buf, { width: size.width, height: size.height });
      clipboard.writeImage(modified);
    }, testImagePath);

    await window.waitForTimeout(2000);

    // Should now have two image clips
    const imgPreviews = window.locator('img[alt="Clipboard image preview"]');
    await expect(imgPreviews).toHaveCount(2, { timeout: 5000 });

    await app.close();
  });
});
