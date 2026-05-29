import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { EventEmitter } from 'events';

interface FakeAutoUpdater extends EventEmitter {
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
  checkForUpdates: ReturnType<typeof vi.fn>;
  quitAndInstall: ReturnType<typeof vi.fn>;
}

const { isMock, fakeAutoUpdater, getSettings } = vi.hoisted(() => {
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
    getSettings: vi.fn(),
  };
});

vi.mock('@electron-toolkit/utils', () => ({
  is: isMock,
}));

vi.mock('electron-updater', () => ({
  autoUpdater: fakeAutoUpdater,
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

const makeWindow = (
  overrides: Partial<{ destroyed: boolean; send: ReturnType<typeof vi.fn> }> = {}
): Parameters<typeof runAutomaticUpdateCheck>[0] => {
  const send = overrides.send ?? vi.fn();
  return {
    isDestroyed: () => overrides.destroyed ?? false,
    webContents: { send },
  } as unknown as Parameters<typeof runAutomaticUpdateCheck>[0];
};

beforeEach(() => {
  isMock.dev = false;
  fakeAutoUpdater.removeAllListeners();
  fakeAutoUpdater.autoDownload = false;
  fakeAutoUpdater.autoInstallOnAppQuit = false;
  fakeAutoUpdater.checkForUpdates.mockReset().mockResolvedValue(undefined);
  fakeAutoUpdater.quitAndInstall.mockReset();
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
  it('is a no-op in dev mode', async () => {
    isMock.dev = true;
    await runAutomaticUpdateCheck(makeWindow());
    expect(getSettings).not.toHaveBeenCalled();
    expect(fakeAutoUpdater.checkForUpdates).not.toHaveBeenCalled();
  });

  it('returns silently when settings load throws', async () => {
    getSettings.mockRejectedValue(new Error('disk on fire'));
    await runAutomaticUpdateCheck(makeWindow());
    expect(fakeAutoUpdater.checkForUpdates).not.toHaveBeenCalled();
  });

  it('skips the check when automaticUpdates is false', async () => {
    getSettings.mockResolvedValue({ automaticUpdates: false });
    await runAutomaticUpdateCheck(makeWindow());
    expect(fakeAutoUpdater.checkForUpdates).not.toHaveBeenCalled();
  });

  it('runs the check when automaticUpdates is true and flips autoDownload', async () => {
    getSettings.mockResolvedValue({ automaticUpdates: true });
    await runAutomaticUpdateCheck(makeWindow());
    expect(fakeAutoUpdater.autoDownload).toBe(true);
    expect(fakeAutoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);
  });

  it('treats undefined automaticUpdates as enabled', async () => {
    getSettings.mockResolvedValue({});
    await runAutomaticUpdateCheck(makeWindow());
    expect(fakeAutoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);
  });

  it('silently swallows a checkForUpdates rejection and clears listeners', async () => {
    getSettings.mockResolvedValue({ automaticUpdates: true });
    fakeAutoUpdater.checkForUpdates.mockRejectedValueOnce(new Error('network'));
    await expect(runAutomaticUpdateCheck(makeWindow())).resolves.toBeUndefined();
    expect(fakeAutoUpdater.listenerCount('update-downloaded')).toBe(0);
    expect(fakeAutoUpdater.listenerCount('error')).toBe(0);
  });

  it('clears the update-downloaded listener if an error event fires mid-download', async () => {
    getSettings.mockResolvedValue({ automaticUpdates: true });
    const send = vi.fn();
    await runAutomaticUpdateCheck(makeWindow({ send }));
    expect(fakeAutoUpdater.listenerCount('update-downloaded')).toBe(1);

    fakeAutoUpdater.emit('error', new Error('mid-download boom'));

    expect(fakeAutoUpdater.listenerCount('update-downloaded')).toBe(0);
    expect(fakeAutoUpdater.listenerCount('error')).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });

  it('sends update-downloaded IPC with version to the renderer when download completes', async () => {
    getSettings.mockResolvedValue({ automaticUpdates: true });
    const send = vi.fn();
    const win = makeWindow({ send });

    await runAutomaticUpdateCheck(win);
    fakeAutoUpdater.emit('update-downloaded', { version: '2.3.4' });
    await flush();

    expect(send).toHaveBeenCalledWith('update-downloaded', { version: '2.3.4' });
    expect(fakeAutoUpdater.quitAndInstall).not.toHaveBeenCalled();
  });

  it('does not send IPC when window is null', async () => {
    getSettings.mockResolvedValue({ automaticUpdates: true });
    await runAutomaticUpdateCheck(null);
    fakeAutoUpdater.emit('update-downloaded', { version: '2.3.4' });
    await flush();
    // No assertion needed beyond not throwing — the null path is exercised.
    expect(fakeAutoUpdater.quitAndInstall).not.toHaveBeenCalled();
  });

  it('does not send IPC when window has been destroyed', async () => {
    getSettings.mockResolvedValue({ automaticUpdates: true });
    const send = vi.fn();
    const win = makeWindow({ send, destroyed: true });

    await runAutomaticUpdateCheck(win);
    fakeAutoUpdater.emit('update-downloaded', { version: '2.3.4' });
    await flush();

    expect(send).not.toHaveBeenCalled();
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
