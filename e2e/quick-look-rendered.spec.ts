import { test, expect, type ElectronApplication, type Page } from '@playwright/test';
import { UNIQUE, HOSTILE_HTML, launchApp, rowWith } from './quick-look-harness';

test.describe('Quick look — rendered html', () => {
  let app: ElectronApplication;
  let window: Page;

  test.beforeAll(async () => {
    const result = await launchApp();
    app = result.app;
    window = result.window;
  });

  test.afterAll(async () => {
    await app.close();
  });

  test('the hostile clip renders as text in a sandboxed frame and no request leaves it', async () => {
    const requests: string[] = [];
    window.on('request', (request) => requests.push(request.url()));
    const frameRequests: string[] = [];
    app.on('window', (page) => page.on('request', (request) => frameRequests.push(request.url())));

    await app.evaluate(async ({ clipboard }, html) => {
      clipboard.write({ html });
    }, HOSTILE_HTML);
    await window.waitForTimeout(1000);

    const row = rowWith(window, `Invoice ${UNIQUE}`);
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row).toContainText('html');
    await expect(row).not.toContainText('<script');

    await row.hover();
    await row.getByTestId('eye').click();
    const reader = window.getByTestId('quick-look');
    await expect(reader).toBeVisible();
    await reader.getByTestId('ql-view-rendered').click();
    const frame = reader.getByTestId('ql-frame');
    await expect(frame).toBeVisible({ timeout: 5000 });
    await expect(frame).toHaveAttribute('sandbox', '');
    await expect(frame).toHaveAttribute('referrerpolicy', 'no-referrer');
    const srcdoc = await frame.getAttribute('srcdoc');
    expect(
      srcdoc?.startsWith(
        '<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy"'
      )
    ).toBe(true);
    expect(srcdoc).not.toContain('<script');
    expect(srcdoc).not.toContain('evil.example.net');
    await expect(reader.getByTestId('ql-side')).toContainText('removed:');

    const frameHandle = await window.$('[data-testid="ql-frame"]');
    const inner = await frameHandle!.contentFrame();
    expect(inner).not.toBeNull();
    await expect.poll(() => inner!.locator('body').textContent()).toContain(`Invoice ${UNIQUE}`);
    expect(await inner!.locator('script').count()).toBe(0);
    expect(await inner!.locator('img').count()).toBe(0);
    await window.waitForTimeout(1000);
    expect(requests.filter((u) => u.includes('evil.example.net'))).toEqual([]);
    expect(frameRequests.filter((u) => u.includes('evil.example.net'))).toEqual([]);
    await window.keyboard.press('Escape');
  });
});
