import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserWindow, dialog, type IpcMainInvokeEvent } from 'electron';
import { promises as fs } from 'fs';

const { handlers } = vi.hoisted(() => ({
  handlers: new Map<
    string,
    (event: IpcMainInvokeEvent, name: string, text: string) => Promise<string | null>
  >(),
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel, handler) => handlers.set(channel, handler)),
  },
  BrowserWindow: { fromWebContents: vi.fn() },
  dialog: { showSaveDialog: vi.fn() },
}));
vi.mock('fs', () => ({ promises: { writeFile: vi.fn() } }));

import { setupTextExportIPC } from './save-text';

const event = { sender: {} } as IpcMainInvokeEvent;
const save = (name = 'backup.json') => handlers.get('save-text-file')!(event, name, '{"text":"é"}');

beforeEach(() => {
  vi.resetAllMocks();
  handlers.clear();
  setupTextExportIPC();
});

describe('save-text-file handler', () => {
  it('returns null without writing when the dialog is cancelled', async () => {
    vi.mocked(dialog.showSaveDialog).mockResolvedValue({ canceled: true, filePath: '/ignored' });

    await expect(save()).resolves.toBeNull();
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('returns the selected path only after the UTF-8 write completes', async () => {
    const parent = {} as BrowserWindow;
    vi.mocked(BrowserWindow.fromWebContents).mockReturnValue(parent);
    vi.mocked(dialog.showSaveDialog).mockResolvedValue({
      canceled: false,
      filePath: '/chosen/renamed.json',
    });
    let finish!: () => void;
    vi.mocked(fs.writeFile).mockImplementationOnce(
      () => new Promise<void>((resolve) => (finish = resolve))
    );
    const settled = vi.fn();
    const pending = save().then((path) => {
      settled(path);
      return path;
    });
    await Promise.resolve();

    expect(dialog.showSaveDialog).toHaveBeenCalledWith(parent, {
      defaultPath: 'backup.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    expect(fs.writeFile).toHaveBeenCalledWith('/chosen/renamed.json', '{"text":"é"}', 'utf8');
    expect(settled).not.toHaveBeenCalled();
    finish();
    await expect(pending).resolves.toBe('/chosen/renamed.json');
  });

  it('rejects when the file write fails', async () => {
    vi.mocked(dialog.showSaveDialog).mockResolvedValue({
      canceled: false,
      filePath: '/backup.json',
    });
    vi.mocked(fs.writeFile).mockRejectedValue(new Error('disk full'));

    await expect(save()).rejects.toThrow('disk full');
  });

  it.each(['../backup.json', 'dir/backup.json', 'dir\\backup.json', '/etc/passwd', '.', '..', ''])(
    'rejects the name %j without opening a dialog or writing',
    async (name) => {
      await expect(save(name)).rejects.toThrow('bare file name');
      expect(dialog.showSaveDialog).not.toHaveBeenCalled();
      expect(fs.writeFile).not.toHaveBeenCalled();
    }
  );

  it('does not write when the dialog returns no path', async () => {
    vi.mocked(dialog.showSaveDialog).mockResolvedValue({ canceled: false, filePath: '' });

    await expect(save()).resolves.toBeNull();
    expect(fs.writeFile).not.toHaveBeenCalled();
  });
});
