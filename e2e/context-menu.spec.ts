import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import { resolve } from 'path';

const appPath = resolve(__dirname, '../out/main/index.js');
const UNIQUE = Date.now().toString(36);

async function launchApp(): Promise<{ app: ElectronApplication; window: Page }> {
  const app = await electron.launch({ args: [appPath] });
  const window = await app.firstWindow();
  await window.waitForSelector('#root > *');
  return { app, window };
}

test.describe('Context Menu', () => {
  let app: ElectronApplication;
  let window: Page;

  const clipA = `ctx-clip-a-${UNIQUE}`;
  const clipB = `ctx-clip-b-${UNIQUE}`;

  test.beforeAll(async () => {
    const result = await launchApp();
    app = result.app;
    window = result.window;

    // Add two clips: clipA first, then clipB (clipB will be index 0, clipA index 1)
    await app.evaluate(async ({ clipboard }, t) => {
      clipboard.writeText(t);
    }, clipA);
    await window.waitForTimeout(1000);

    await app.evaluate(async ({ clipboard }, t) => {
      clipboard.writeText(t);
    }, clipB);
    await window.waitForTimeout(1000);

    // Verify both clips appear
    await expect(window.locator(`text=${clipA}`).first()).toBeVisible({ timeout: 5000 });
    await expect(window.locator(`text=${clipB}`).first()).toBeVisible({ timeout: 5000 });
  });

  test.afterAll(async () => {
    await app.close();
  });

  test('right-click on a non-first clip shows Copy, Quick look, Fill clip template, Lock and Delete', async () => {
    // clipA is at index 1 (non-first) — right-click it
    await window.locator(`text=${clipA}`).first().click({ button: 'right' });

    const menu = window.getByTestId('clip-context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    for (const id of [
      'menu-copy',
      'menu-quick-look',
      'menu-fill-clip-template',
      'menu-lock',
      'menu-delete',
    ]) {
      await expect(window.getByTestId(id)).toBeVisible();
      await expect(window.getByTestId(id)).not.toHaveAttribute('aria-disabled', 'true');
    }

    // Close by pressing Escape
    await window.keyboard.press('Escape');
    await expect(menu).toBeHidden();
  });

  test('right-click on row 1 shows Lock and Delete disabled with the reason', async () => {
    await window.locator(`text=${clipB}`).first().click({ button: 'right' });
    await expect(window.getByTestId('clip-context-menu')).toBeVisible({ timeout: 3000 });
    await expect(window.getByTestId('menu-lock')).toHaveAttribute('aria-disabled', 'true');
    await expect(window.getByTestId('menu-delete')).toHaveAttribute('aria-disabled', 'true');
    await expect(window.getByTestId('menu-lock')).toContainText('row 1 is the live clipboard');
    await expect(window.getByTestId('menu-quick-look')).not.toHaveAttribute(
      'aria-disabled',
      'true'
    );
    await window.keyboard.press('Escape');
  });

  test('right-click on a clip further down the list shows context menu fully visible', async () => {
    // Add several more clips to push items down the list
    for (let i = 0; i < 8; i++) {
      await app.evaluate(async ({ clipboard }, t) => {
        clipboard.writeText(t);
      }, `ctx-filler-${i}-${UNIQUE}`);
      await window.waitForTimeout(500);
    }
    await window.waitForTimeout(1000);

    // Scroll to clipA (now further down) and right-click
    const target = window.locator(`text=${clipA}`).first();
    await target.scrollIntoViewIfNeeded();
    await target.click({ button: 'right' });

    // Context menu should be fully visible (portalled to body, not clipped by overflow)
    await expect(window.getByTestId('menu-copy')).toBeVisible({ timeout: 3000 });
    await expect(window.getByTestId('menu-delete')).toBeVisible();

    await window.keyboard.press('Escape');
  });

  test('context menu closes when clicking elsewhere', async () => {
    const target = window.locator(`text=${clipA}`).first();
    await target.scrollIntoViewIfNeeded();
    await target.click({ button: 'right' });

    await expect(window.getByTestId('menu-copy')).toBeVisible({ timeout: 3000 });

    // Click elsewhere to close
    await window.locator('body').click({ position: { x: 5, y: 5 } });

    await expect(window.getByTestId('menu-copy')).toBeHidden({ timeout: 3000 });
  });

  test('context menu closes on Escape key', async () => {
    const target = window.locator(`text=${clipA}`).first();
    await target.scrollIntoViewIfNeeded();
    await target.click({ button: 'right' });

    await expect(window.getByTestId('menu-copy')).toBeVisible({ timeout: 3000 });

    await window.keyboard.press('Escape');

    await expect(window.getByTestId('menu-copy')).toBeHidden({ timeout: 3000 });
  });

  test('Copy from the context menu writes the clipboard and toasts', async () => {
    const target = window.locator(`text=${clipA}`).first();
    await target.scrollIntoViewIfNeeded();
    await target.click({ button: 'right' });

    await expect(window.getByTestId('menu-copy')).toBeVisible({ timeout: 3000 });
    await window.getByTestId('menu-copy').click();

    // Menu should close after action
    await expect(window.getByTestId('menu-copy')).toBeHidden({ timeout: 3000 });
    await expect(window.getByTestId('toast')).toContainText('Copied clip', { timeout: 3000 });

    // Verify clipboard contains the expected text
    const clipboardText = await app.evaluate(async ({ clipboard }) => {
      return clipboard.readText();
    });
    expect(clipboardText).toBe(clipA);
  });
});
