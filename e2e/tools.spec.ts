import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import { resolve } from 'path';

const appPath = resolve(__dirname, '../out/main/index.js');

// Use unique suffixes to avoid collisions with persistent storage
const UNIQUE = Date.now().toString(36);

async function launchApp() {
  const app = await electron.launch({ args: [appPath] });
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
  // Wait for the tools tab content to load
  await settingsPage.waitForSelector('button:has-text("Search Terms")', { timeout: 10000 });
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

/** Click Delete on a card item and confirm in the dialog */
async function deleteItemByName(page: Page, name: string): Promise<void> {
  // Click Delete button in the item header
  const itemHeader = page.locator(`h4:has-text("${name}")`).locator('..');
  await itemHeader.locator('button:has-text("Delete")').click();

  // Wait for and click the confirm dialog's Delete button
  const confirmBtn = page.locator('button:has-text("Delete")').last();
  await confirmBtn.waitFor({ state: 'visible', timeout: 3000 });
  await confirmBtn.click();
}

test.describe('Settings — Search Terms CRUD', () => {
  let app: ElectronApplication;
  let settings: Page;

  test.beforeAll(async () => {
    const result = await launchApp();
    app = result.app;
    await cleanupAllData(result.window);
    settings = await openSettingsToolsTab(app, result.window);
  });

  test.afterAll(async () => {
    await app.close();
  });

  test('create, edit, and delete a search term', async () => {
    const name = `ST-${UNIQUE}`;
    const nameUpdated = `ST-Upd-${UNIQUE}`;

    // Navigate to Search Terms sub-tab
    await settings.click('button:has-text("Search Terms")');

    // Create
    await settings.click('button:has-text("Create Search Term")');
    await settings.fill('input[placeholder="Search term name"]', name);
    await settings.fill(
      'textarea[placeholder*="Regular expression"]',
      '(?<email>[\\w.+-]+@[\\w-]+\\.[\\w.]+)'
    );
    await settings.click('button:has-text("Save")');

    // Verify appears
    await expect(settings.locator('h4', { hasText: name })).toBeVisible();

    // Edit
    const header = settings.locator(`h4:has-text("${name}")`).locator('..');
    await header.locator('button:has-text("Edit")').click();
    await settings.fill('input[placeholder="Search term name"]', nameUpdated);
    await settings.click('button:has-text("Save")');

    await expect(settings.locator('h4', { hasText: nameUpdated })).toBeVisible();

    // Delete with confirm
    await deleteItemByName(settings, nameUpdated);
    await expect(settings.locator('h4', { hasText: nameUpdated })).toBeHidden({ timeout: 5000 });
  });
});

test.describe('Settings — Quick Tools CRUD', () => {
  let app: ElectronApplication;
  let settings: Page;

  test.beforeAll(async () => {
    const result = await launchApp();
    app = result.app;
    await cleanupAllData(result.window);

    // Seed a search term so capture groups exist
    await result.window.evaluate(async () => {
      const api = (window as any).api;
      await api.searchTermsCreate('Email Finder', '(?<email>[\\w.+-]+@[\\w-]+\\.[\\w.]+)');
    });

    settings = await openSettingsToolsTab(app, result.window);
  });

  test.afterAll(async () => {
    await app.close();
  });

  test('create, edit, and delete a quick tool', async () => {
    const name = `QT-${UNIQUE}`;

    // Navigate to Tools sub-tab (not the top-level "Tools" tab which is already active)
    // The second "Tools" button is the sub-tab
    await settings.locator('button:has-text("Tools")').nth(1).click();

    // Create
    await settings.click('button:has-text("Create Tool")');
    await settings.fill('input[placeholder="Tool name"]', name);
    await settings.fill('input[type="url"]', 'https://example.com/search?q={email}');
    await settings.click('button:has-text("Save")');

    // Verify appears
    await expect(settings.locator('h4', { hasText: name })).toBeVisible();

    // Edit
    const header = settings.locator(`h4:has-text("${name}")`).locator('..');
    await header.locator('button:has-text("Edit")').click();
    await settings.fill('input[type="url"]', 'https://example.com/lookup?email={email}');
    await settings.click('button:has-text("Save")');

    await expect(settings.locator('h4', { hasText: name })).toBeVisible();

    // Delete with confirm
    await deleteItemByName(settings, name);
    await expect(settings.locator('h4', { hasText: name })).toBeHidden({ timeout: 5000 });
  });
});

test.describe('Settings — Templates CRUD', () => {
  let app: ElectronApplication;
  let settings: Page;

  test.beforeAll(async () => {
    const result = await launchApp();
    app = result.app;
    await cleanupAllData(result.window);
    settings = await openSettingsToolsTab(app, result.window);
  });

  test.afterAll(async () => {
    await app.close();
  });

  test('create, edit, and delete a template', async () => {
    const name = `TPL-${UNIQUE}`;
    const nameUpdated = `TPL-Upd-${UNIQUE}`;

    // Navigate to Templates sub-tab
    await settings.click('button:has-text("Templates")');

    // Create
    await settings.click('button:has-text("Create Template")');
    await settings.fill('input[placeholder="Template name"]', name);
    await settings.fill(
      'textarea[placeholder*="Template content"]',
      'Hello {c1}, your email is {email}'
    );
    await settings.click('button:has-text("Save")');

    // Verify appears (templates use h3, not h4)
    await expect(settings.locator('h3', { hasText: name })).toBeVisible();

    // Expand the template to reveal Edit/Delete buttons
    await settings.locator('h3', { hasText: name }).click();
    await expect(settings.locator('button:has-text("Edit")')).toBeVisible({ timeout: 3000 });

    // Edit
    await settings.locator('button:has-text("Edit")').click();
    await settings.fill('input[placeholder="Template name"]', nameUpdated);
    await settings.click('button:has-text("Save")');

    await expect(settings.locator('h3', { hasText: nameUpdated })).toBeVisible();

    // After save from edit, template should still be expanded (expandedId set by handleStartEdit)
    // Delete button should be visible
    await expect(settings.locator('button:has-text("Delete")')).toBeVisible({ timeout: 3000 });

    // Delete — click Delete in the template actions
    await settings.locator('button:has-text("Delete")').click();

    // Confirm in the delete dialog
    const confirmBtn = settings.locator('button:has-text("Delete")').last();
    await confirmBtn.waitFor({ state: 'visible', timeout: 3000 });
    await confirmBtn.click();

    await expect(settings.locator('h3', { hasText: nameUpdated })).toBeHidden({ timeout: 5000 });
  });
});

test.describe('Tools Launcher — Pattern Scanning', () => {
  let app: ElectronApplication;

  test.beforeAll(async () => {
    const result = await launchApp();
    app = result.app;
    await cleanupAllData(result.window);

    // Seed search term, tool, and template
    await result.window.evaluate(async () => {
      const api = (window as any).api;
      await api.searchTermsCreate('Email Pattern', '(?<email>[\\w.+-]+@[\\w-]+\\.[\\w.]+)');
      await api.quickToolsCreate('Email Lookup', 'https://example.com/search?q={email}', ['email']);
      await api.templatesCreate('Email Template', 'Contact: {email}');
    });
  });

  test.afterAll(async () => {
    await app.close();
  });

  test('tools launcher shows patterns, tools, and templates for matching text', async () => {
    const mainWindow = await app.firstWindow();

    // Open tools launcher with text containing an email
    await mainWindow.evaluate(async () => {
      const api = (window as any).api;
      await api.openToolsLauncher('Contact us at test@example.com for info');
    });

    const launcher = await findWindowByUrl(app, 'tools-launcher');
    await launcher.waitForSelector('#root > *');

    // Wait for scanning to complete
    await launcher.waitForSelector('text=test@example.com', { timeout: 10000 });

    // Verify pattern found
    await expect(launcher.locator('text=test@example.com')).toBeVisible();

    // Wait for content to fully load
    await launcher.waitForTimeout(2000);

    // Check if tools section is expanded; if not, expand it
    const toolsVisible = await launcher
      .locator('text=Email Lookup')
      .isVisible()
      .catch(() => false);
    if (!toolsVisible) {
      // Click "Available Tools" to expand
      await launcher.locator('text=Available Tools').click();
    }
    await expect(launcher.locator('text=Email Lookup')).toBeVisible({ timeout: 5000 });

    // Check if templates section is expanded; if not, expand it
    const templateVisible = await launcher
      .getByText('Email Template')
      .isVisible()
      .catch(() => false);
    if (!templateVisible) {
      await launcher.locator('span:has-text("Matched Templates")').click();
    }
    await expect(launcher.getByText('Email Template')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Tools Launcher — Clip Templates', () => {
  let app: ElectronApplication;

  test.beforeAll(async () => {
    const result = await launchApp();
    app = result.app;
    await cleanupAllData(result.window);

    // Seed a positional-only template
    await result.window.evaluate(async () => {
      const api = (window as any).api;
      await api.templatesCreate('Positional Template', 'First: {c1}, Second: {c2}');
    });
  });

  test.afterAll(async () => {
    await app.close();
  });

  test('tools launcher shows clip templates', async () => {
    const mainWindow = await app.firstWindow();

    // Open tools launcher
    await mainWindow.evaluate(async () => {
      const api = (window as any).api;
      await api.openToolsLauncher('Some clipboard text');
    });

    const launcher = await findWindowByUrl(app, 'tools-launcher');
    await launcher.waitForSelector('#root > *');

    // Wait for content to load
    await launcher.waitForTimeout(2000);

    // Verify clip template section appears
    await expect(launcher.locator('text=Clip Templates')).toBeVisible({ timeout: 10000 });
    await expect(launcher.locator('text=Positional Template').first()).toBeVisible();
  });
});
