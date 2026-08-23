import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { EventEmitter } from 'events';

interface FakeAutoUpdater extends EventEmitter {
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
  checkForUpdates: ReturnType<typeof vi.fn>;
  quitAndInstall: ReturnType<typeof vi.fn>;
}

const { isMock, fakeAutoUpdater, getSettings, windows } = vi.hoisted(() => {
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
    windows: [] as {
      isDestroyed: () => boolean;
      webContents: { send: ReturnType<typeof vi.fn> };
    }[],
  };
});

vi.mock('@electron-toolkit/utils', () => ({
  is: isMock,
}));

vi.mock('electron-updater', () => ({
  autoUpdater: fakeAutoUpdater,
}));

vi.mock('electron', () => ({
  BrowserWindow: { getAllWindows: () => windows },
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
  getUpdateState,
  setUpdateState,
  updateErrorMessage,
  UNSIGNED_MAC_MESSAGE,
} from './index';

const makeWindow = (destroyed = false) => ({
  isDestroyed: () => destroyed,
  webContents: { send: vi.fn() },
});

beforeEach(() => {
  isMock.dev = false;
  fakeAutoUpdater.removeAllListeners();
  fakeAutoUpdater.autoDownload = false;
  fakeAutoUpdater.autoInstallOnAppQuit = false;
  fakeAutoUpdater.checkForUpdates.mockReset().mockResolvedValue(undefined);
  fakeAutoUpdater.quitAndInstall.mockReset();
  getSettings.mockReset();
  windows.length = 0;
  setUpdateState({ status: 'idle' });
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

describe('update state', () => {
  it('starts idle', () => {
    expect(getUpdateState()).toEqual({ status: 'idle' });
  });

  it('pushes every change as update-state to every live window', () => {
    const a = makeWindow();
    const gone = makeWindow(true);
    const b = makeWindow();
    windows.push(a, gone, b);

    setUpdateState({ status: 'checking' });

    expect(a.webContents.send).toHaveBeenCalledWith('update-state', { status: 'checking' });
    expect(b.webContents.send).toHaveBeenCalledWith('update-state', { status: 'checking' });
    expect(gone.webContents.send).not.toHaveBeenCalled();
    expect(getUpdateState()).toEqual({ status: 'checking' });
  });
});

describe('setupAutoUpdaterEvents', () => {
  it('moves through the states from each event and never installs on its own', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const win = makeWindow();
    windows.push(win);
    setupAutoUpdaterEvents();

    fakeAutoUpdater.emit('checking-for-update');
    expect(getUpdateState()).toEqual({ status: 'checking' });

    fakeAutoUpdater.emit('update-available', { version: '1.9.0' });
    expect(getUpdateState()).toEqual({ status: 'available', version: '1.9.0' });

    fakeAutoUpdater.emit('download-progress', { percent: 42.4 });
    expect(getUpdateState()).toEqual({ status: 'downloading', version: '1.9.0', progress: 42 });

    fakeAutoUpdater.emit('update-downloaded', { version: '1.9.0' });
    expect(getUpdateState()).toEqual({ status: 'downloaded', version: '1.9.0' });

    fakeAutoUpdater.emit('update-not-available', { version: '1.8.10' });
    expect(getUpdateState()).toEqual({ status: 'upToDate' });

    fakeAutoUpdater.emit('error', new Error('boom'));
    expect(getUpdateState().status).toBe('error');
    expect(errSpy).toHaveBeenCalledWith('Error in auto-updater:', expect.any(Error));

    expect(fakeAutoUpdater.quitAndInstall).not.toHaveBeenCalled();
    expect(win.webContents.send).toHaveBeenCalledTimes(6);
    expect(win.webContents.send).toHaveBeenLastCalledWith('update-state', {
      status: 'error',
      message: expect.any(String),
    });
    errSpy.mockRestore();
  });
});

describe('updateErrorMessage', () => {
  const originalPlatform = process.platform;
  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform, writable: true });
  });

  it('uses the error message off macOS', () => {
    Object.defineProperty(process, 'platform', { value: 'linux', writable: true });
    expect(updateErrorMessage(new Error('net down'))).toBe('net down');
    expect(updateErrorMessage('plain')).toBe('plain');
  });

  it('carries the unsigned-build message on macOS', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin', writable: true });
    expect(updateErrorMessage(new Error('net down'))).toBe(UNSIGNED_MAC_MESSAGE);
  });
});

describe('runAutomaticUpdateCheck', () => {
  it('is a no-op in dev mode', async () => {
    isMock.dev = true;
    await runAutomaticUpdateCheck();
    expect(getSettings).not.toHaveBeenCalled();
    expect(fakeAutoUpdater.checkForUpdates).not.toHaveBeenCalled();
  });

  it('returns silently when settings load throws', async () => {
    getSettings.mockRejectedValue(new Error('disk on fire'));
    await runAutomaticUpdateCheck();
    expect(fakeAutoUpdater.checkForUpdates).not.toHaveBeenCalled();
  });

  it('skips the check when automaticUpdates is false', async () => {
    getSettings.mockResolvedValue({ automaticUpdates: false });
    await runAutomaticUpdateCheck();
    expect(fakeAutoUpdater.checkForUpdates).not.toHaveBeenCalled();
  });

  it('runs the check when automaticUpdates is true and flips autoDownload', async () => {
    getSettings.mockResolvedValue({ automaticUpdates: true });
    await runAutomaticUpdateCheck();
    expect(fakeAutoUpdater.autoDownload).toBe(true);
    expect(fakeAutoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);
  });

  it('treats undefined automaticUpdates as enabled', async () => {
    getSettings.mockResolvedValue({});
    await runAutomaticUpdateCheck();
    expect(fakeAutoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);
  });

  it('silently swallows a checkForUpdates rejection', async () => {
    getSettings.mockResolvedValue({ automaticUpdates: true });
    fakeAutoUpdater.checkForUpdates.mockRejectedValueOnce(new Error('network'));
    await expect(runAutomaticUpdateCheck()).resolves.toBeUndefined();
  });

  it('leaves the downloaded state to the events, which reach the renderer', async () => {
    getSettings.mockResolvedValue({ automaticUpdates: true });
    const win = makeWindow();
    windows.push(win);
    setupAutoUpdaterEvents();

    await runAutomaticUpdateCheck();
    fakeAutoUpdater.emit('update-downloaded', { version: '2.3.4' });

    expect(win.webContents.send).toHaveBeenCalledWith('update-state', {
      status: 'downloaded',
      version: '2.3.4',
    });
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
