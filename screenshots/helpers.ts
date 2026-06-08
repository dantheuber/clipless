/**
 * Shared utilities for the documentation screenshot harness.
 *
 * The harness launches the *built* Electron app (`out/main/index.js`) against an
 * isolated temporary user-data profile. Isolation does two things:
 *   1. It never reads or writes your real encrypted clip store, and
 *   2. the per-profile single-instance lock means the harness won't collide with
 *      a Clipless instance you already have running.
 *
 * Each capture run starts from an empty profile, seeds curated demo data via the
 * same IPC the renderer uses, then drives the three window types and writes PNGs
 * to `screenshots/output/`.
 */
import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
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

/** Built main-process entry point. Requires `npm run build` first. */
const MAIN_ENTRY = resolve(__dirname, '../out/main/index.js');

/** Where captured PNGs are written (gitignored on the code branch). */
export const OUTPUT_DIR = resolve(__dirname, 'output');

export interface LaunchedApp {
  app: ElectronApplication;
  page: Page;
  userDataDir: string;
}

/** `window.api` is exposed by the preload bridge but untyped in this context. */
type WindowWithApi = Window & { api: Record<string, (...args: unknown[]) => Promise<unknown>> };

/**
 * Launch the built app with an isolated profile at 2x device scale for crisp,
 * retina-quality screenshots.
 */
export async function launchApp(): Promise<LaunchedApp> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const userDataDir = mkdtempSync(join(tmpdir(), 'clipless-shots-'));
  const app = await electron.launch({
    args: [MAIN_ENTRY, `--user-data-dir=${userDataDir}`, '--force-device-scale-factor=2'],
  });
  const page = await app.firstWindow();
  await page.waitForSelector('#root > *');
  return { app, page, userDataDir };
}

/**
 * Seed settings, Quick Clips config, and clips, then reload so the renderer
 * picks everything up with the requested theme applied.
 */
export async function seed(app: ElectronApplication, page: Page, theme: Theme): Promise<void> {
  // Theme + code highlighting + a generous clip cap.
  await page.evaluate(async (t) => {
    await (window as unknown as WindowWithApi).api.storageSaveSettings({
      theme: t,
      codeDetectionEnabled: true,
      maxClips: 25,
    });
  }, theme);

  // Quick Clips patterns, tools, and templates via the renderer IPC.
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

  // Pre-set the OS clipboard to the most-recent clip so the clipboard monitor
  // dedupes against it instead of injecting whatever is currently copied.
  await app.evaluate(
    ({ clipboard }, text) => clipboard.writeText(text),
    DEMO_CLIPS[0].clip.content
  );

  // Persist the curated clip list. The main `storage-save-clips` handler takes a
  // ClipItem[] plus a map of locked indices (it derives StoredClip metadata
  // itself), so we pass the bare clips — not pre-wrapped StoredClip objects.
  const clipItems = DEMO_CLIPS.map((d: DemoClip) => d.clip);
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

  // Reload so stored clips + theme render from a clean state.
  await page.reload();
  await page.waitForSelector('#root > *');
  await page.waitForFunction(() => /light|dark/.test(document.body.className));
  // Let the clipboard poll settle and syntax highlighting paint.
  await page.waitForTimeout(800);
}

/** Capture a full-window screenshot into the output directory. */
export async function shoot(target: Page, fileName: string): Promise<void> {
  await target.screenshot({ path: join(OUTPUT_DIR, fileName) });
}

/** Toggle the clip search bar in the main window via its IPC channel. */
export async function showSearch(app: ElectronApplication): Promise<void> {
  await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    win?.webContents.send('toggle-search');
  });
}

/** Open the settings window and wait for it to render with the theme applied. */
export async function openSettingsWindow(app: ElectronApplication, page: Page): Promise<Page> {
  const [win] = await Promise.all([
    app.waitForEvent('window'),
    page.evaluate(() => (window as unknown as WindowWithApi).api.openSettings('general')),
  ]);
  await win.waitForSelector('#root > *');
  await win.waitForFunction(() => /light|dark/.test(document.body.className));
  return win;
}

/** Open the Tools Launcher for the given clip content and wait for the scan. */
export async function openToolsLauncher(
  app: ElectronApplication,
  page: Page,
  content: string
): Promise<Page> {
  const [win] = await Promise.all([
    app.waitForEvent('window'),
    page.evaluate((c) => (window as unknown as WindowWithApi).api.openToolsLauncher(c), content),
  ]);
  await win.waitForSelector('#root > *');
  await win.waitForFunction(() => /light|dark/.test(document.body.className));
  // Wait for the pattern scan to populate before capturing.
  await win.getByText(/Found Patterns/).waitFor({ timeout: 10_000 });
  return win;
}

/** Best-effort removal of the temporary profile after the app has closed. */
export function cleanup(userDataDir: string): void {
  try {
    rmSync(userDataDir, { recursive: true, force: true });
  } catch {
    // Windows may briefly hold a lock on the profile; safe to ignore.
  }
}
