import { test, expect, type ElectronApplication, type Page } from '@playwright/test';
import { EMAIL, IP_A, UNIQUE, rowWith } from './quick-look-harness';

export function registerQuickLookTemplateCase(
  getApp: () => ElectronApplication,
  getWindow: () => Page
): void {
  test('a ready template pill copies the generated text and toasts the values used', async () => {
    const window = getWindow();
    const row = rowWith(window, `alert ${UNIQUE}`);
    await row.locator(`[data-key="ip|${IP_A}"]`).click();
    await row.locator(`[data-key="email|${EMAIL}"]`).click();
    const pill = window
      .getByTestId('tray')
      .locator('[data-state="ready"]', { hasText: 'IP block' });
    await expect(pill).toBeVisible();
    await pill.click();
    const toast = window.getByTestId('toast').filter({ hasText: 'Copied "IP block"' });
    await expect(toast).toBeVisible();
    await expect(toast).toContainText(`ip ${IP_A}`);
    const clipboardText = await getApp().evaluate(async ({ clipboard }) => clipboard.readText());
    expect(clipboardText).toBe(`Block ${IP_A} reported by ${EMAIL}`);
  });
}
