import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { EventEmitter } from 'events';

interface FakeAutoUpdater extends EventEmitter {
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
  checkForUpdates: ReturnType<typeof vi.fn>;
  quitAndInstall: ReturnType<typeof vi.fn>;
}

const { isMock, fakeAutoUpdater, showMessageBox, getSettings } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { EventEmitter: NodeEventEmitter } = require('events');
  const updater = new NodeEventEmitter();
  updater.setMaxListeners(50);
  updater.autoDownload = false;
  updater.autoInstallOnAppQuit = false;
  updater.checkForUpdates = vi.fn(async () => undefined);
  updater.quitAndInstall = vi.fn();
  return {
    isMock: { dev: false },
    fakeAutoUpdater: updater as FakeAutoUpdater,
    showMessageBox: vi.fn(),
    getSettings: vi.fn(),
  };
});

vi.mock('@electron-toolkit/utils', () => ({
  is: isMock,
}));

vi.mock('electron-updater', () => ({
  autoUpdater: fakeAutoUpdater,
}));

vi.mock('electron', () => ({
  dialog: {
    showMessageBox: (...args: unknown[]) => showMessageBox(...args),
  },
}));

vi.mock('../storage', () => ({
  storage: {
    getSettings: (...args: unknown[]) => getSettings(...args),
  },
}));

import {
  configureAutoUpdater,
  setupAutoUpdaterEvents,
  runAutomaticUpdateCheck,
  checkForUpdatesWithRetry,
} from './index';

const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  isMock.dev = false;
  fakeAutoUpdater.removeAllListeners();
  fakeAutoUpdater.autoDownload = false;
  fakeAutoUpdater.autoInstallOnAppQuit = false;
  fakeAutoUpdater.checkForUpdates.mockReset().mockResolvedValue(undefined);
  fakeAutoUpdater.quitAndInstall.mockReset();
  showMessageBox.mockReset();
  getSettings.mockReset();
});

afterEach(() => {
  fakeAutoUpdater.removeAllListeners();
});

describe('configureAutoUpdater', () => {
  it('sets autoDownload=false and autoInstallOnAppQuit=true outside dev', () => {
    isMock.dev = false;
    fakeAutoUpdater.autoDownload = true;
    fakeAutoUpdater.autoInstallOnAppQuit = false;
    configureAutoUpdater();
    expect(fakeAutoUpdater.autoDownload).toBe(false);
    expect(fakeAutoUpdater.autoInstallOnAppQuit).toBe(true);
  });

  it('does nothing in dev mode', () => {
    isMock.dev = true;
    fakeAutoUpdater.autoDownload = true;
    fakeAutoUpdater.autoInstallOnAppQuit = false;
    configureAutoUpdater();
    expect(fakeAutoUpdater.autoDownload).toBe(true);
    expect(fakeAutoUpdater.autoInstallOnAppQuit).toBe(false);
  });
});

describe('setupAutoUpdaterEvents', () => {
  it('logs lifecycle events but does NOT call quitAndInstall on update-downloaded (manual flow bug fix)', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    setupAutoUpdaterEvents();

    fakeAutoUpdater.emit('checking-for-update');
    fakeAutoUpdater.emit('update-available', { version: '1.0.0' });
    fakeAutoUpdater.emit('update-not-available', { version: '0.9.0' });
    fakeAutoUpdater.emit('download-progress', { percent: 42 });
    fakeAutoUpdater.emit('update-downloaded', { version: '1.0.0' });
    fakeAutoUpdater.emit('error', new Error('boom'));

    expect(fakeAutoUpdater.quitAndInstall).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalledWith('Error in auto-updater:', expect.any(Error));

    logSpy.mockRestore();
    errSpy.mockRestore();
  });
});

describe('runAutomaticUpdateCheck', () => {
  const parentWindow = {} as Parameters<typeof runAutomaticUpdateCheck>[0];

  it('is a no-op in dev mode', async () => {
    isMock.dev = true;
    await runAutomaticUpdateCheck(parentWindow);
    expect(getSettings).not.toHaveBeenCalled();
    expect(fakeAutoUpdater.checkForUpdates).not.toHaveBeenCalled();
  });

  it('returns silently when settings load throws', async () => {
    getSettings.mockRejectedValue(new Error('disk on fire'));
    await runAutomaticUpdateCheck(parentWindow);
    expect(fakeAutoUpdater.checkForUpdates).not.toHaveBeenCalled();
  });

  it('skips the check when automaticUpdates is false', async () => {
    getSettings.mockResolvedValue({ automaticUpdates: false });
    await runAutomaticUpdateCheck(parentWindow);
    expect(fakeAutoUpdater.checkForUpdates).not.toHaveBeenCalled();
  });

  it('runs the check when automaticUpdates is true and flips autoDownload', async () => {
    getSettings.mockResolvedValue({ automaticUpdates: true });
    await runAutomaticUpdateCheck(parentWindow);
    expect(fakeAutoUpdater.autoDownload).toBe(true);
    expect(fakeAutoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);
  });

  it('treats undefined automaticUpdates as enabled', async () => {
    getSettings.mockResolvedValue({});
    await runAutomaticUpdateCheck(parentWindow);
    expect(fakeAutoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);
  });

  it('silently swallows a checkForUpdates rejection and clears listeners', async () => {
    getSettings.mockResolvedValue({ automaticUpdates: true });
    fakeAutoUpdater.checkForUpdates.mockRejectedValueOnce(new Error('network'));
    await expect(runAutomaticUpdateCheck(parentWindow)).resolves.toBeUndefined();
    expect(fakeAutoUpdater.listenerCount('update-downloaded')).toBe(0);
    expect(fakeAutoUpdater.listenerCount('error')).toBe(0);
  });

  it('clears the update-downloaded listener if an error event fires mid-download', async () => {
    getSettings.mockResolvedValue({ automaticUpdates: true });
    await runAutomaticUpdateCheck(parentWindow);
    expect(fakeAutoUpdater.listenerCount('update-downloaded')).toBe(1);

    fakeAutoUpdater.emit('error', new Error('mid-download boom'));

    expect(fakeAutoUpdater.listenerCount('update-downloaded')).toBe(0);
    expect(fakeAutoUpdater.listenerCount('error')).toBe(0);
    expect(showMessageBox).not.toHaveBeenCalled();
  });

  it('shows dialog with parent window and calls quitAndInstall when user picks Restart Now', async () => {
    getSettings.mockResolvedValue({ automaticUpdates: true });
    showMessageBox.mockResolvedValue({ response: 0 });

    await runAutomaticUpdateCheck(parentWindow);
    fakeAutoUpdater.emit('update-downloaded', { version: '1.0.0' });
    await flush();
    await flush();

    expect(showMessageBox).toHaveBeenCalledWith(
      parentWindow,
      expect.objectContaining({
        type: 'info',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
        cancelId: 1,
      })
    );
    expect(fakeAutoUpdater.quitAndInstall).toHaveBeenCalledTimes(1);
  });

  it('does NOT call quitAndInstall when user picks Later', async () => {
    getSettings.mockResolvedValue({ automaticUpdates: true });
    showMessageBox.mockResolvedValue({ response: 1 });

    await runAutomaticUpdateCheck(parentWindow);
    fakeAutoUpdater.emit('update-downloaded', { version: '1.0.0' });
    await flush();
    await flush();

    expect(showMessageBox).toHaveBeenCalled();
    expect(fakeAutoUpdater.quitAndInstall).not.toHaveBeenCalled();
  });

  it('falls back to parentless dialog when no window is provided', async () => {
    getSettings.mockResolvedValue({ automaticUpdates: true });
    showMessageBox.mockResolvedValue({ response: 0 });

    await runAutomaticUpdateCheck(null);
    fakeAutoUpdater.emit('update-downloaded', { version: '1.0.0' });
    await flush();
    await flush();

    expect(showMessageBox).toHaveBeenCalledWith(
      expect.objectContaining({ buttons: ['Restart Now', 'Later'] })
    );
    expect(fakeAutoUpdater.quitAndInstall).toHaveBeenCalledTimes(1);
  });

  it('silently swallows a dialog failure without calling quitAndInstall', async () => {
    getSettings.mockResolvedValue({ automaticUpdates: true });
    showMessageBox.mockRejectedValueOnce(new Error('dialog broken'));

    await runAutomaticUpdateCheck(parentWindow);
    fakeAutoUpdater.emit('update-downloaded', { version: '1.0.0' });
    await flush();
    await flush();

    expect(fakeAutoUpdater.quitAndInstall).not.toHaveBeenCalled();
  });
});

describe('checkForUpdatesWithRetry', () => {
  it('resolves with UpdateInfo when update-available fires', async () => {
    fakeAutoUpdater.checkForUpdates.mockImplementationOnce(async () => {
      setImmediate(() => fakeAutoUpdater.emit('update-available', { version: '2.0.0' }));
      return undefined;
    });
    const result = await checkForUpdatesWithRetry(1, 1000);
    expect(result).toEqual({ version: '2.0.0' });
  });

  it('resolves null when update-not-available fires', async () => {
    fakeAutoUpdater.checkForUpdates.mockImplementationOnce(async () => {
      setImmediate(() => fakeAutoUpdater.emit('update-not-available', { version: '1.0.0' }));
      return undefined;
    });
    const result = await checkForUpdatesWithRetry(1, 1000);
    expect(result).toBeNull();
  });

  it('rejects on error event after exhausting retries', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fakeAutoUpdater.checkForUpdates.mockImplementation(async () => {
      setImmediate(() => fakeAutoUpdater.emit('error', new Error('net down')));
      return undefined;
    });
    await expect(checkForUpdatesWithRetry(1, 1000)).rejects.toThrow('net down');
    errSpy.mockRestore();
  });

  it('rejects when checkForUpdates() throws synchronously', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fakeAutoUpdater.checkForUpdates.mockRejectedValueOnce(new Error('sync fail'));
    await expect(checkForUpdatesWithRetry(1, 1000)).rejects.toThrow('sync fail');
    errSpy.mockRestore();
  });

  it('rejects with timeout when no events fire', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fakeAutoUpdater.checkForUpdates.mockImplementationOnce(async () => undefined);
    await expect(checkForUpdatesWithRetry(1, 10)).rejects.toThrow('Update check timeout');
    errSpy.mockRestore();
  });

  it('retries with exponential backoff and succeeds on second attempt', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let attempt = 0;
    fakeAutoUpdater.checkForUpdates.mockImplementation(async () => {
      attempt += 1;
      if (attempt === 1) {
        setImmediate(() => fakeAutoUpdater.emit('error', new Error('flaky')));
      } else {
        setImmediate(() => fakeAutoUpdater.emit('update-not-available', { version: '1.0.0' }));
      }
      return undefined;
    });
    const result = await checkForUpdatesWithRetry(2, 1000);
    expect(result).toBeNull();
    expect(attempt).toBe(2);
    errSpy.mockRestore();
  });
});
