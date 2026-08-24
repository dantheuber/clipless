import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import { resolve } from 'path';

const appPath = resolve(__dirname, '../out/main/index.js');

export const UNIQUE = Date.now().toString(36);

export async function launchApp() {
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
      } catch {}
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

export async function openSettingsToolsTab(
  app: ElectronApplication,
  mainWindow: Page
): Promise<Page> {
  await mainWindow.evaluate(async () => {
    const api = (window as any).api;
    await api.openSettings('tools');
  });

  let settingsPage: Page | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      settingsPage = await findWindowByUrl(app, 'settings.html');
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
      await mainWindow.evaluate(async () => {
        const api = (window as any).api;
        await api.openSettings('tools');
      });
    }
  }
  if (!settingsPage) throw new Error('Could not open settings window');

  await settingsPage.waitForSelector('#root > *');
  await settingsPage.waitForSelector('[data-testid="list-pane"]', { timeout: 10000 });
  return settingsPage;
}

export async function cleanupAllData(window: Page): Promise<void> {
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
