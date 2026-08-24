import {
  _electron as electron,
  type ElectronApplication,
  type Locator,
  type Page,
} from '@playwright/test';
import { mkdtempSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import {
  DEMO_CLIPS,
  SEARCH_TERMS,
  QUICK_TOOLS,
  TEMPLATES,
  type DemoClip,
} from './fixtures/demo-data';

export type Theme = 'light' | 'dark';

const MAIN_ENTRY = resolve(__dirname, '../out/main/index.js'); // the built app: requires `npm run build` first

const MAIN_WINDOW_SIZE = { width: 900, height: 670 }; // pinned so captures match across machines and window managers
const SETTINGS_WINDOW_SIZE = { width: 900, height: 600 };

const OUTPUT_DIR = resolve(__dirname, 'output');

export interface LaunchedApp {
  app: ElectronApplication;
  page: Page;
  userDataDir: string;
}

type WindowWithApi = Window & { api: Record<string, (...args: unknown[]) => Promise<unknown>> }; // the preload bridge exposes window.api untyped here

export async function launchApp(): Promise<LaunchedApp> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const userDataDir = mkdtempSync(join(tmpdir(), 'clipless-shots-'));
  const app = await electron.launch({
    args: [MAIN_ENTRY, `--user-data-dir=${userDataDir}`, '--force-device-scale-factor=2'],
    env: { ...process.env, CLIPLESS_PLAINTEXT_STORAGE: '1' }, // Playwright's basic password store leaves Linux safeStorage without encryption
  });
  const page = await app.firstWindow();
  await page.waitForSelector('#root > *');
  await app.evaluate(({ BrowserWindow }, size) => {
    BrowserWindow.getAllWindows()[0]?.setSize(size.width, size.height);
  }, MAIN_WINDOW_SIZE);
  return { app, page, userDataDir };
}

export async function seed(app: ElectronApplication, page: Page, theme: Theme): Promise<void> {
  await page.evaluate(async (t) => {
    await (window as unknown as WindowWithApi).api.storageSaveSettings({
      theme: t,
      codeDetectionEnabled: true,
      maxClips: 25,
    });
  }, theme);

  await page.evaluate(
    async (data) => {
      const api = (window as unknown as WindowWithApi).api;
      for (const st of data.searchTerms) await api.searchTermsCreate(st.name, st.pattern);
      for (const tool of data.quickTools)
        await api.quickToolsCreate(tool.name, tool.url, tool.captureGroups);
      for (const tpl of data.templates) await api.templatesCreate(tpl.name, tpl.content);
    },
    { searchTerms: SEARCH_TERMS, quickTools: QUICK_TOOLS, templates: TEMPLATES }
  );

  await app.evaluate(
    ({ clipboard }, text) => clipboard.writeText(text),
    DEMO_CLIPS[0].clip.content
  ); // pre-set so the clipboard monitor dedupes instead of injecting whatever is currently copied

  const clipItems = DEMO_CLIPS.map((d: DemoClip) => d.clip); // storage-save-clips takes bare ClipItems plus a locked map; it derives StoredClip itself
  const locks: Record<number, boolean> = {};
  DEMO_CLIPS.forEach((d: DemoClip, i: number) => {
    if (d.locked && i > 0) locks[i] = true;
  });
  await page.evaluate(
    async ({ clipItems, locks }) => {
      await (window as unknown as WindowWithApi).api.storageSaveClips(clipItems, locks);
    },
    { clipItems, locks }
  );

  await page.reload();
  await page.waitForSelector('#root > *');
  await page.waitForFunction(() => /light|dark/.test(document.body.className));
  await page.waitForTimeout(800); // let the clipboard poll settle and syntax highlighting paint
}

export async function shoot(target: Page, fileName: string): Promise<void> {
  await target.screenshot({ path: join(OUTPUT_DIR, fileName) });
}

export async function showSearch(app: ElectronApplication): Promise<void> {
  await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    win?.webContents.send('toggle-search');
  });
}

export async function openSettingsWindow(app: ElectronApplication, page: Page): Promise<Page> {
  const [win] = await Promise.all([
    app.waitForEvent('window'),
    page.evaluate(() => (window as unknown as WindowWithApi).api.openSettings('general')),
  ]);
  await win.waitForSelector('#root > *');
  await win.waitForFunction(() => /light|dark/.test(document.body.className));
  await app.evaluate(({ BrowserWindow }, size) => {
    const settings = BrowserWindow.getAllWindows().find((w) => w.getTitle().includes('Settings'));
    settings?.setSize(size.width, size.height);
  }, SETTINGS_WINDOW_SIZE);
  return win;
}

export async function openQuickLook(
  page: Page,
  content: string,
  pinGroup?: string
): Promise<Locator> {
  const row = page.locator('[data-testid="clip-row"]', { hasText: content }).first();
  await row.waitFor({ timeout: 10_000 });
  await row.hover();
  await row.getByTestId('eye').click();
  const reader = page.getByTestId('quick-look');
  await reader.waitFor();
  const body = reader.getByTestId('ql-content');
  await body.locator('[data-key]').first().waitFor({ timeout: 10_000 });
  if (pinGroup) {
    await body.locator(`[data-key^="${pinGroup}|"]`).first().click();
    await page.getByTestId('tray').waitFor();
    await page.getByTestId('open-all').waitFor();
  }
  return reader;
}

export function cleanup(userDataDir: string): void {
  try {
    rmSync(userDataDir, { recursive: true, force: true });
  } catch {} // Windows may briefly hold a lock on the profile; safe to ignore
}
