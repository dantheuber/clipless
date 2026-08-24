import { test, expect, type ElectronApplication, type Page } from '@playwright/test';
import { UNIQUE, launchApp, cleanupAllData, openSettingsToolsTab } from './tools-harness';

test.describe('Settings — Tools tab', () => {
  let app: ElectronApplication;
  let settings: Page;
  const email = `test-${UNIQUE}@example.com`;
  const toolName = `Lookup-${UNIQUE}`;

  test.beforeAll(async () => {
    const result = await launchApp();
    app = result.app;
    await cleanupAllData(result.window);
    settings = await openSettingsToolsTab(app, result.window);
  });

  test.afterAll(async () => {
    const reset = settings.getByTestId('sample').getByText('reset');
    if (await reset.count()) await reset.click();
    await app.close();
  });

  test('create a search term from the library and see chips against the sample before Save', async () => {
    await settings.getByTestId('new-term').click();
    await expect(settings.getByTestId('start-from')).toBeVisible();
    await settings.getByTestId('library-email').click();
    await expect(settings.getByTestId('term-name')).toHaveValue('Email Address');

    const sample = settings.getByTestId('sample-text');
    await sample.fill(`Contact ${email} for info`);
    const chip = settings.getByTestId('chips-preview').locator(`[data-group="email"]`);
    await expect(chip).toHaveText(email);
    const stored = await settings.evaluate(
      async () => ((await (window as any).api.searchTermsGetAll()) as unknown[]).length
    );
    expect(stored).toBe(0);

    await settings.getByTestId('term-save').click();
    await expect(settings.getByTestId('inspector-title')).toHaveText('Email Address');
    await expect(settings.locator('[data-testid^="row-term-"]')).toHaveCount(1);
    await expect(settings.locator('[data-testid^="row-term-"]').first()).toHaveAttribute(
      'data-dot',
      'ok'
    );
  });

  test('make a tool with a picked token and see the tab count', async () => {
    await settings.getByTestId('new-tool').click();
    await settings.getByTestId('tool-name').fill(toolName);
    const url = settings.getByTestId('tool-url');
    await url.fill('https://example.com/search?q=');
    await url.press('End');
    await settings.getByTestId('token-picker').locator('[data-group="email"]').click();
    await expect(url).toHaveValue('https://example.com/search?q={email}');
    await expect(settings.getByTestId('readiness')).toContainText('ready on the sample');
    await expect(settings.getByTestId('tool-preview-caption')).toHaveText(
      'Would open 1 tab from the sample'
    );
    await expect(settings.getByTestId('tool-editor')).toContainText(
      `https://example.com/search?q=${encodeURIComponent(email)}`
    );

    await settings.getByTestId('tool-save').click();
    await expect(settings.getByTestId('inspector-title')).toHaveText(toolName);
    await expect(settings.locator('[data-testid^="row-tool-"]').first()).toHaveAttribute(
      'data-dot',
      'ok'
    );
  });

  test('delete asks once and names the dependents', async () => {
    await settings.locator('[data-testid^="row-term-"]').first().click();
    await settings.getByTestId('delete').click();
    const dialog = settings.getByRole('dialog');
    await expect(dialog).toContainText('Delete Email Address?');
    await expect(dialog).toContainText(toolName);
    await dialog.getByRole('button', { name: 'Delete' }).click();
    await expect(settings.locator('[data-testid^="row-term-"]')).toHaveCount(0);
    await expect(settings.locator('[data-testid^="row-tool-"]').first()).toHaveAttribute(
      'data-dot',
      'orph'
    );
  });
});
