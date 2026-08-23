import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import { resolve } from 'path';

/**
 * The settings window after step 3 of the quick look plan: one shell with a left rail, the
 * General grid, the Hotkeys table with the keycaps as the recorder. Hotkey recording is
 * not driven to acceptance: accepting registers a real global shortcut on this machine, so
 * the case records, sees the conflict line and presses Esc.
 */

const appPath = resolve(__dirname, '../out/main/index.js');

async function launchApp(): Promise<{ app: ElectronApplication; window: Page }> {
  // Linux only: Playwright's basic password store leaves safeStorage without encryption
  const app = await electron.launch({
    args: [appPath],
    env: { ...process.env, CLIPLESS_PLAINTEXT_STORAGE: '1' },
  });
  const window = await app.firstWindow();
  await window.waitForSelector('#root > *');
  return { app, window };
}

async function openSettings(app: ElectronApplication, mainWindow: Page, tab: string): Promise<Page> {
  await mainWindow.evaluate(async (t) => {
    await (window as any).api.openSettings(t);
  }, tab);
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const page = app.windows().find((w) => {
      try {
        return w.url().includes('settings.html');
      } catch {
        return false;
      }
    });
    if (page) {
      await page.waitForSelector('[data-testid="rail"]');
      return page;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('settings window did not open');
}

// Sizes the web contents, not the outer window: on Windows setSize includes the frame, so
// innerWidth would come back 16px short and the viewport media queries would not fire.
async function setSettingsSize(app: ElectronApplication, width: number, height: number): Promise<void> {
  await app.evaluate(
    ({ BrowserWindow }, size) => {
      const win = BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().includes('settings.html'));
      win?.setContentSize(size.width, size.height);
    },
    { width, height }
  );
}

test.describe('Settings window', () => {
  let app: ElectronApplication;
  let settings: Page;

  test.beforeAll(async () => {
    const result = await launchApp();
    app = result.app;
    settings = await openSettings(app, result.window, 'general');
  });

  test.afterAll(async () => {
    await app.close();
  });

  test('one shell: a left rail with the three tabs and the version at its foot, no top tabs', async () => {
    const rail = settings.getByTestId('rail');
    await expect(rail.getByTestId('rail-general')).toBeVisible();
    await expect(rail.getByTestId('rail-hotkeys')).toBeVisible();
    await expect(rail.getByTestId('rail-tools')).toBeVisible();
    await expect(rail.getByTestId('rail-version')).toHaveText(/^v\d+\.\d+\.\d+/);
    await expect(settings.getByTestId('title-bar')).toHaveText(/General/);
    await expect(settings.getByTestId('footer')).toContainText('Changes apply as you make them.');
    await expect(settings.locator('text=Versions')).toHaveCount(0);
  });

  test('General shows all five panels without scrolling at 900 x 600', async () => {
    const size = await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().includes('settings.html'));
      return { min: win?.getMinimumSize(), resizable: win?.isResizable() };
    });
    expect(size.min).toEqual([720, 440]);
    expect(size.resizable).toBe(true);
    // Under Playwright's x11 wrapper the work area reports 0 x 0 and Electron opens every
    // window at its minimum, so the default size is set here rather than trusted
    await setSettingsSize(app, 900, 600);
    await expect.poll(() => settings.evaluate(() => window.innerWidth)).toBe(900);
    for (const name of ['application', 'window', 'storage', 'updates', 'about']) {
      await expect(settings.getByTestId(`panel-${name}`)).toBeVisible();
    }
    const scrolls = await settings.getByTestId('general-grid').evaluate((grid) => {
      const pane = grid.parentElement as HTMLElement;
      return pane.scrollHeight > pane.clientHeight;
    });
    expect(scrolls).toBe(false);
  });

  test('at 720 x 440 the grid is one scrolling column, nothing is hidden, and the frame stays put', async () => {
    const countControls = () => settings.locator('[data-control], [data-testid^="toggle-"], select, input').count();
    const before = await countControls();

    await setSettingsSize(app, 720, 440);
    await expect.poll(() => settings.evaluate(() => window.innerWidth)).toBe(720);

    expect(await countControls()).toBe(before);
    const hidden = await settings.locator('[data-control]').evaluateAll((nodes) =>
      nodes.filter((n) => getComputedStyle(n).display === 'none' || getComputedStyle(n).visibility === 'hidden').length
    );
    expect(hidden).toBe(0);

    const columns = await settings.getByTestId('general-grid').evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(1);
    const scrolls = await settings.getByTestId('general-grid').evaluate((grid) => {
      const pane = grid.parentElement as HTMLElement;
      return pane.scrollHeight > pane.clientHeight;
    });
    expect(scrolls).toBe(true);

    const rail = await settings.getByTestId('rail').boundingBox();
    const title = await settings.getByTestId('title-bar').boundingBox();
    const footer = await settings.getByTestId('footer').boundingBox();
    expect(rail?.x).toBe(0);
    expect(rail?.width).toBe(96);
    expect(title?.y).toBe(0);
    expect(Math.round((footer?.y ?? 0) + (footer?.height ?? 0))).toBe(440);

    await setSettingsSize(app, 900, 600);
    await expect.poll(() => settings.evaluate(() => window.innerWidth)).toBe(900);
  });

  test('Clips to keep validates inline and does not apply an out-of-range value', async () => {
    const input = settings.getByTestId('clips-to-keep');
    const before = await input.inputValue();
    await input.fill('7');
    await expect(settings.getByTestId('row-maxClips')).toContainText('15 to 100');
    await input.press('Enter');
    await expect(settings.getByTestId('status-maxClips')).toHaveText('');
    await input.press('Escape');
    await expect(input).toHaveValue(before);
  });

  test('Hotkeys: the table with keycaps, a recorder that catches a conflict, and Esc', async () => {
    await settings.getByTestId('rail-hotkeys').click();
    const table = settings.getByTestId('hotkeys-table');
    await expect(table).toBeVisible();
    await expect(settings.getByTestId('hotkey-quickLook')).toContainText('Quick look on newest clip');
    await expect(settings.getByTestId('keys-focusWindow')).toContainText('Ctrl');
    await expect(settings.getByTestId('keys-focusWindow')).not.toContainText('CommandOrControl');

    const master = settings.getByTestId('toggle-hotkeys');
    const wasOn = await master.isChecked();
    if (!wasOn) {
      await master.click();
      await expect(settings.getByTestId('status-hk:enabled')).toContainText('saved');
    }
    await expect(table).toHaveAttribute('aria-disabled', 'false');

    await settings.getByTestId('keys-focusWindow').click();
    await expect(settings.getByTestId('recorder')).toContainText('press keys, Esc cancels');
    await settings.keyboard.press('Control+Shift+1');
    await expect(settings.getByTestId('recorder-message')).toContainText('used by Copy clip 1');
    await expect(settings.getByTestId('recorder-message')).toContainText('swap');
    await settings.keyboard.press('Escape');
    await expect(settings.getByTestId('recorder')).toHaveCount(0);
    await expect(settings.getByTestId('keys-focusWindow')).toContainText('V');

    if (!wasOn) {
      await master.click();
      await expect(table).toHaveAttribute('aria-disabled', 'true');
    }
  });
});
