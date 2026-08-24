import { test, expect, type ElectronApplication, type Page } from '@playwright/test';
import {
  UNIQUE,
  IP_A,
  IP_B,
  EMAIL,
  CLIP_ONE,
  CLIP_TWO,
  launchApp,
  seedConfig,
  seedTextClips,
  closeSearch,
  rowWith,
} from './quick-look-harness';
import { registerQuickLookTemplateCase } from './quick-look-template-case';
test.describe('Quick look', () => {
  let app: ElectronApplication;
  let window: Page;
  test.beforeAll(async () => {
    const result = await launchApp();
    app = result.app;
    window = result.window;
    await seedConfig(window);
    await seedTextClips(app, window, [CLIP_TWO, CLIP_ONE]);
    await expect(rowWith(window, `alert ${UNIQUE}`)).toBeVisible({ timeout: 10000 });
  });
  test.afterAll(async () => {
    await app.close();
  });

  test('a clip with an IP and an email shows two chips and two dots', async () => {
    const row = rowWith(window, `alert ${UNIQUE}`);
    await expect(row.locator('[data-key]')).toHaveCount(2, { timeout: 10000 });
    await expect(row.locator(`[data-key="ip|${IP_A}"]`)).toBeVisible();
    await expect(row.locator(`[data-key="email|${EMAIL}"]`)).toBeVisible();
    await expect(row.getByTestId('group-dots').locator('i')).toHaveCount(2);
    await expect(window.getByTestId('tray')).toBeHidden();
  });

  test('clicking a chip pins it: the tray appears with one group and a tool button', async () => {
    const row = rowWith(window, `alert ${UNIQUE}`);
    await row.locator(`[data-key="ip|${IP_A}"]`).click();
    const tray = window.getByTestId('tray');
    await expect(tray).toBeVisible();
    await expect(tray.locator('[data-testid^="tray-group-"]')).toHaveCount(1);
    await expect(tray.getByTestId('tray-group-ip')).toContainText('VirusTotal');
    await expect(tray.getByTestId('tray-group-ip')).not.toContainText('x2');
    await expect(tray.getByTestId('open-all')).toHaveText('Open all (1 tab)');
    await expect(row.locator(`[data-key="ip|${IP_A}"]`)).toHaveAttribute('data-pinned', 'true');
    await expect(row.locator('textarea')).toHaveCount(0);
  });

  test('pinning a second IP gives the tool a multiplier and Open all the exact count', async () => {
    const row = rowWith(window, `second source ${UNIQUE}`);
    await row.locator(`[data-key="ip|${IP_B}"]`).click();
    const tray = window.getByTestId('tray');
    await expect(tray.getByTestId('tray-group-ip')).toContainText('VirusTotal x2');
    await expect(tray.getByTestId('open-all')).toHaveText('Open all (2 tabs)');
    await expect(tray.getByTestId('template-pills')).toContainText('needs email');
  });

  test('the eye and Space open the reader, Esc closes it and focus is on the row', async () => {
    const row = rowWith(window, `alert ${UNIQUE}`);
    await row.hover();
    await row.getByTestId('eye').click();
    const reader = window.getByTestId('quick-look');
    await expect(reader).toBeVisible();
    await expect(reader.getByTestId('ql-content').locator(`[data-key="ip|${IP_A}"]`)).toBeVisible();
    await expect(reader.getByTestId('ql-side')).toContainText('2 values');
    await window.keyboard.press('Escape');
    await expect(reader).toBeHidden();
    await expect
      .poll(() => window.evaluate(() => document.activeElement?.getAttribute('data-testid')))
      .toBe('clip-row');
    await expect
      .poll(() => window.evaluate(() => document.activeElement?.textContent))
      .toContain(`alert ${UNIQUE}`);

    await window.keyboard.press('Space');
    await expect(reader).toBeVisible();
    await window.keyboard.press('Escape');
    await expect(reader).toBeHidden();
  });

  test('Up and Down walk the clips without closing the reader', async () => {
    const row = rowWith(window, `second source ${UNIQUE}`);
    await row.hover();
    await row.getByTestId('eye').click();
    const reader = window.getByTestId('quick-look');
    await expect(reader.getByTestId('ql-clip-number')).toHaveText('Clip 1');
    await window.keyboard.press('ArrowDown');
    await expect(reader.getByTestId('ql-clip-number')).toHaveText('Clip 2');
    await expect(reader.getByTestId('ql-content')).toContainText(`alert ${UNIQUE}`);
    await window.keyboard.press('ArrowUp');
    await expect(reader.getByTestId('ql-clip-number')).toHaveText('Clip 1');
    await expect(reader).toBeVisible();
    await window.keyboard.press('Escape');
    await expect(reader).toBeHidden();
  });

  test('with a filter typed, the reader says "n / m filtered"', async () => {
    await window.getByTestId('search-button').click();
    const input = window.locator('#clip-search-input');
    await expect(input).toBeFocused();
    await input.fill(UNIQUE);
    await expect(window.getByTestId('search-count')).toContainText('2 of');
    await window.keyboard.press('ArrowDown');
    await expect
      .poll(() => window.evaluate(() => document.activeElement?.getAttribute('data-testid')))
      .toBe('clip-row');
    await window.keyboard.press('Space');
    const reader = window.getByTestId('quick-look');
    await expect(reader.getByTestId('ql-position')).toHaveText('1 / 2 filtered');
    await window.keyboard.press('Escape');
    await expect(reader).toBeHidden();
    await input.focus();
    await window.keyboard.press('Escape');
    await expect(input).toHaveValue('');
    await closeSearch(window);
  });

  test('right-click row 2 shows Quick look and the submenu; row 1 has Lock and Delete disabled', async () => {
    await closeSearch(window);
    await rowWith(window, `alert ${UNIQUE}`).click({ button: 'right' });
    await expect(window.getByTestId('menu-quick-look')).toBeVisible({ timeout: 3000 });
    await expect(window.getByTestId('menu-quick-look')).not.toHaveAttribute(
      'aria-disabled',
      'true'
    );
    await expect(window.getByTestId('menu-fill-clip-template')).toBeVisible();
    await expect(window.getByTestId('menu-lock')).not.toHaveAttribute('aria-disabled', 'true');
    await window.keyboard.press('Escape');

    await rowWith(window, `second source ${UNIQUE}`).click({ button: 'right' });
    await expect(window.getByTestId('menu-lock')).toHaveAttribute('aria-disabled', 'true');
    await expect(window.getByTestId('menu-delete')).toHaveAttribute('aria-disabled', 'true');
    await expect(window.getByTestId('menu-lock')).toContainText('row 1 is the live clipboard');
    await window.keyboard.press('Escape');
    await expect(window.getByTestId('clip-context-menu')).toBeHidden();
  });

  test('the status bar quick look button opens the reader on row 1', async () => {
    await window.getByTestId('quick-look-button').click();
    const reader = window.getByTestId('quick-look');
    await expect(reader).toBeVisible();
    await expect(reader.getByTestId('ql-clip-number')).toHaveText('Clip 1');
    await window.keyboard.press('Escape');
    await expect(reader).toBeHidden();
  });
});

test.describe.serial('Quick look — clipboard writes', () => {
  let app: ElectronApplication;
  let window: Page;
  test.beforeAll(async () => {
    const result = await launchApp();
    app = result.app;
    window = result.window;
    await seedConfig(window);
    await seedTextClips(app, window, [CLIP_TWO, CLIP_ONE]);
    await expect(rowWith(window, `alert ${UNIQUE}`)).toBeVisible({ timeout: 10000 });
    await expect(rowWith(window, `second source ${UNIQUE}`)).toBeVisible({ timeout: 10000 });
  });

  test.afterAll(async () => {
    await app.close();
  });

  test('the number cell copies the clip and toasts', async () => {
    const row = rowWith(window, `alert ${UNIQUE}`);
    await row.getByTestId('row-number').click();
    await expect(
      window.getByTestId('toast').filter({ hasText: 'Copied clip 2 to the clipboard' })
    ).toBeVisible();
    const clipboardText = await app.evaluate(async ({ clipboard }) => clipboard.readText());
    expect(clipboardText).toBe(CLIP_ONE);
  });

  test('c in the reader copies the clip and toasts', async () => {
    const row = rowWith(window, `second source ${UNIQUE}`);
    await row.hover();
    await row.getByTestId('eye').click();
    await expect(window.getByTestId('quick-look')).toBeVisible();
    await window.keyboard.press('c');
    await expect(
      window.getByTestId('toast').filter({ hasText: 'Copied clip 1 to the clipboard' })
    ).toBeVisible();
    const clipboardText = await app.evaluate(async ({ clipboard }) => clipboard.readText());
    expect(clipboardText).toBe(CLIP_TWO);
    await window.keyboard.press('Escape');
  });

  registerQuickLookTemplateCase(
    () => app,
    () => window
  );
});
