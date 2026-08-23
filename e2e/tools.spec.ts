import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import { resolve } from 'path';

const appPath = resolve(__dirname, '../out/main/index.js');

// Use unique suffixes to avoid collisions with persistent storage
const UNIQUE = Date.now().toString(36);

async function launchApp() {
  // Linux only: Playwright's basic password store leaves safeStorage without encryption
  const app = await electron.launch({
    args: [appPath],
    env: { ...process.env, CLIPLESS_PLAINTEXT_STORAGE: '1' },
  });
  const window = await app.firstWindow();
  await window.waitForSelector('#root > *');
  return { app, window };
}

async function findWindowByUrl(
  app: ElectronApplication,
  urlFragment: string,
  timeoutMs = 15000
): Promise<Page> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const windows = app.windows();
    for (const w of windows) {
      try {
        const url = w.url();
        if (url.includes(urlFragment)) return w;
      } catch {
        // Window may be closing
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  const urls = app.windows().map((w) => {
    try {
      return w.url();
    } catch {
      return 'closed';
    }
  });
  throw new Error(`Window with "${urlFragment}" not found. URLs: ${urls.join(', ')}`);
}

async function openSettingsToolsTab(app: ElectronApplication, mainWindow: Page): Promise<Page> {
  await mainWindow.evaluate(async () => {
    const api = (window as any).api;
    await api.openSettings('tools');
  });

  // Wait for settings window to appear - retry if needed
  let settingsPage: Page | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      settingsPage = await findWindowByUrl(app, 'settings.html');
      break;
    } catch {
      // Settings window may not have opened yet, retry
      await new Promise((r) => setTimeout(r, 1000));
      await mainWindow.evaluate(async () => {
        const api = (window as any).api;
        await api.openSettings('tools');
      });
    }
  }
  if (!settingsPage) throw new Error('Could not open settings window');

  await settingsPage.waitForSelector('#root > *');
  // The Tools tab is a list pane and an inspector (spec 14.3)
  await settingsPage.waitForSelector('[data-testid="list-pane"]', { timeout: 10000 });
  return settingsPage;
}

async function cleanupAllData(window: Page): Promise<void> {
  await window.evaluate(async () => {
    const api = (window as any).api;
    const terms = await api.searchTermsGetAll();
    for (const t of terms) await api.searchTermsDelete(t.id);
    const tools = await api.quickToolsGetAll();
    for (const t of tools) await api.quickToolsDelete(t.id);
    const templates = await api.templatesGetAll();
    for (const t of templates) await api.templatesDelete(t.id);
  });
}

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
    // The sample text persists as a setting; put it back to the newest clip
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
    // nothing is stored before Save
    const stored = await settings.evaluate(async () => ((await (window as any).api.searchTermsGetAll()) as unknown[]).length);
    expect(stored).toBe(0);

    await settings.getByTestId('term-save').click();
    await expect(settings.getByTestId('inspector-title')).toHaveText('Email Address');
    await expect(settings.locator('[data-testid^="row-term-"]')).toHaveCount(1);
    await expect(settings.locator('[data-testid^="row-term-"]').first()).toHaveAttribute('data-dot', 'ok');
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
    await expect(settings.getByTestId('tool-preview-caption')).toHaveText('Would open 1 tab from the sample');
    await expect(settings.getByTestId('tool-editor')).toContainText(`https://example.com/search?q=${encodeURIComponent(email)}`);

    await settings.getByTestId('tool-save').click();
    await expect(settings.getByTestId('inspector-title')).toHaveText(toolName);
    await expect(settings.locator('[data-testid^="row-tool-"]').first()).toHaveAttribute('data-dot', 'ok');
  });

  test('delete asks once and names the dependents', async () => {
    await settings.locator('[data-testid^="row-term-"]').first().click();
    await settings.getByTestId('delete').click();
    const dialog = settings.getByRole('dialog');
    await expect(dialog).toContainText('Delete Email Address?');
    await expect(dialog).toContainText(toolName);
    await dialog.getByRole('button', { name: 'Delete' }).click();
    await expect(settings.locator('[data-testid^="row-term-"]')).toHaveCount(0);
    // the tool now needs a group nothing produces
    await expect(settings.locator('[data-testid^="row-tool-"]').first()).toHaveAttribute('data-dot', 'orph');
  });
});

test.describe('Quick look — pattern scanning', () => {
  let app: ElectronApplication;
  let window: Page;
  const text = `Contact us at test-${UNIQUE}@example.com for info`;

  test.beforeAll(async () => {
    const result = await launchApp();
    app = result.app;
    window = result.window;
    await cleanupAllData(window);

    // Seed search term, tool, and template
    await window.evaluate(async () => {
      const api = (window as any).api;
      await api.searchTermsCreate('Email Pattern', '(?<email>[\\w.+-]+@[\\w-]+\\.[\\w.]+)');
      await api.quickToolsCreate('Email Lookup', 'https://example.com/search?q={email}', ['email']);
      await api.templatesCreate('Email Template', 'Contact: {email}');
    });

    await app.evaluate(async ({ clipboard }, t) => {
      clipboard.writeText(t);
    }, text);
    await window.waitForTimeout(1000);
  });

  test.afterAll(async () => {
    await app.close();
  });

  test('the row shows a chip, pinning it opens the tray with the tool and the template', async () => {
    const row = window.locator('[data-testid="clip-row"]', { hasText: 'Contact us at' }).first();
    const chip = row.locator(`[data-key="email|test-${UNIQUE}@example.com"]`);
    await expect(chip).toBeVisible({ timeout: 10000 });

    await chip.click();
    const tray = window.getByTestId('tray');
    await expect(tray).toBeVisible();
    await expect(tray.getByTestId('tray-group-email')).toContainText('Email Lookup');
    await expect(tray.getByTestId('open-all')).toHaveText('Open all (1 tab)');
    await expect(tray.getByTestId('template-pills')).toContainText('Email Template');
    await expect(tray.locator('[data-state="ready"]')).toHaveCount(1);
  });
});

test.describe('Quick look — clip templates', () => {
  let app: ElectronApplication;
  let window: Page;

  test.beforeAll(async () => {
    const result = await launchApp();
    app = result.app;
    window = result.window;
    await cleanupAllData(window);

    // Seed a positional-only template
    await window.evaluate(async () => {
      const api = (window as any).api;
      await api.templatesCreate('Positional Template', 'First: {c1}, Second: {c2}');
    });

    await app.evaluate(async ({ clipboard }, t) => {
      clipboard.writeText(t);
    }, `clip-template-row-${UNIQUE}`);
    await window.waitForTimeout(1000);
  });

  test.afterAll(async () => {
    await app.close();
  });

  test('the context menu lists the clip template with a preview from row 1', async () => {
    const row = window
      .locator('[data-testid="clip-row"]', { hasText: `clip-template-row-${UNIQUE}` })
      .first();
    await row.click({ button: 'right' });
    const parent = window.getByTestId('menu-fill-clip-template');
    await expect(parent).toBeVisible({ timeout: 3000 });
    await parent.hover();
    const submenu = window.getByTestId('clip-template-submenu');
    await expect(submenu).toBeVisible();
    await expect(submenu).toContainText('Positional Template');
    await expect(submenu).toContainText(`First: clip-template-row-${UNIQUE}`);
    await window.keyboard.press('Escape');
  });
});
