import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserWindow, type IpcMainInvokeEvent } from 'electron';

type InvokeHandler = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown;

const handlers = new Map<string, InvokeHandler>();

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: InvokeHandler) => {
      handlers.set(channel, handler);
    }),
  },
  BrowserWindow: { getAllWindows: vi.fn(() => []) },
}));

vi.mock('./data', () => ({
  getCurrentClipboardData: vi.fn(),
  setClipboardText: vi.fn(),
  setClipboardHTML: vi.fn(),
  setClipboardRTF: vi.fn(),
  setClipboardImage: vi.fn(),
  setClipboardBookmark: vi.fn(),
}));
vi.mock('./monitoring', () => ({
  startClipboardMonitoring: vi.fn(),
  stopClipboardMonitoring: vi.fn(),
  setSkipNextImageChange: vi.fn(),
}));
vi.mock('./storage-integration', () => ({
  getClipsSnapshot: vi.fn(),
  saveClips: vi.fn(),
  getSettings: vi.fn(),
  saveSettings: vi.fn(),
  getStorageStats: vi.fn(),
  exportData: vi.fn(),
  importData: vi.fn(),
  clearAllData: vi.fn(),
}));
vi.mock('../autoStart', () => ({
  applyAutoStart: vi.fn(() => true),
  getAutoStartState: vi.fn(),
}));
vi.mock('./templates', () => ({
  getAllTemplates: vi.fn(),
  createTemplate: vi.fn(),
  updateTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  reorderTemplates: vi.fn(),
}));
vi.mock('./search-terms', () => ({
  getAllSearchTerms: vi.fn(),
  createSearchTerm: vi.fn(),
  updateSearchTerm: vi.fn(),
  deleteSearchTerm: vi.fn(),
}));
vi.mock('./quick-tools', () => ({
  getAllQuickTools: vi.fn(),
  createQuickTool: vi.fn(),
  updateQuickTool: vi.fn(),
  deleteQuickTool: vi.fn(),
}));
vi.mock('./quick-clips-config', () => ({
  exportQuickClipsConfig: vi.fn(),
  importQuickClipsConfig: vi.fn(),
}));
vi.mock('./open-external', () => ({ openExternalUrls: vi.fn() }));
vi.mock('./sanitize-html', () => ({ sanitizeHtml: vi.fn() }));
vi.mock('../storage/image-store', () => ({ loadImage: vi.fn() }));
vi.mock('../storage', () => ({
  storage: { getGroupColours: vi.fn(), setGroupColours: vi.fn() },
}));

import { clearAllData, saveSettings } from './storage-integration';
import { applyAutoStart } from '../autoStart';
import { setupClipboardIPC } from './ipc';

const event = {} as IpcMainInvokeEvent;

// The module registers its handlers once per process, so register before any test runs
// and silence the registration log.
vi.spyOn(console, 'log').mockImplementation(() => {});
setupClipboardIPC(null);

const invokeSaveSettings = (settings: unknown): Promise<unknown> => {
  const handler = handlers.get('storage-save-settings');
  if (!handler) throw new Error('storage-save-settings handler was not registered');
  return Promise.resolve(handler(event, settings));
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(saveSettings).mockResolvedValue(true);
});

describe('storage-save-settings', () => {
  it('leaves the login item alone when the patch does not carry autoStart', async () => {
    // The clips window saves only maxClips on every launch and on every change to the
    // "Clips to keep" value; that must not switch off "Start with the system".
    expect(await invokeSaveSettings({ maxClips: 50 })).toBe(true);

    expect(saveSettings).toHaveBeenCalledWith({ maxClips: 50 });
    expect(applyAutoStart).not.toHaveBeenCalled();
  });

  it('applies autoStart when the patch turns it on', async () => {
    await invokeSaveSettings({ maxClips: 50, startMinimized: false, autoStart: true });

    expect(applyAutoStart).toHaveBeenCalledTimes(1);
    expect(applyAutoStart).toHaveBeenCalledWith(true);
  });

  it('applies autoStart when the patch turns it off', async () => {
    await invokeSaveSettings({ autoStart: false });

    expect(applyAutoStart).toHaveBeenCalledTimes(1);
    expect(applyAutoStart).toHaveBeenCalledWith(false);
  });

  it('does not touch the login item when the save itself fails', async () => {
    const failure = new Error('disk gone');
    vi.mocked(saveSettings).mockRejectedValue(failure);

    await expect(invokeSaveSettings({ autoStart: true })).rejects.toBe(failure);
    expect(applyAutoStart).not.toHaveBeenCalled();
  });
});

describe('storage-clear-all', () => {
  const invokeClear = () => {
    const handler = handlers.get('storage-clear-all');
    if (!handler) throw new Error('storage-clear-all handler was not registered');
    return Promise.resolve(handler(event));
  };

  it('notifies live windows after clearing succeeds and before replying', async () => {
    const send = vi.fn();
    const destroyedSend = vi.fn();
    vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([
      { isDestroyed: () => false, webContents: { send } },
      { isDestroyed: () => true, webContents: { send: destroyedSend } },
    ] as unknown as BrowserWindow[]);
    let finish: (cleared: boolean) => void = () => {};
    vi.mocked(clearAllData).mockImplementationOnce(
      () => new Promise<boolean>((resolve) => (finish = resolve))
    );

    const clear = invokeClear();
    expect(send).not.toHaveBeenCalled();
    finish(true);
    expect(await clear).toBe(true);
    expect(send).toHaveBeenCalledExactlyOnceWith('storage-cleared');
    expect(destroyedSend).not.toHaveBeenCalled();
  });

  it('leaves the renderer history alone when clearing fails', async () => {
    const send = vi.fn();
    vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([
      { isDestroyed: () => false, webContents: { send } },
    ] as unknown as BrowserWindow[]);
    vi.mocked(clearAllData).mockResolvedValueOnce(false);

    expect(await invokeClear()).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });
});
