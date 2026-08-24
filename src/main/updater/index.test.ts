import { vi, beforeEach, afterEach } from 'vitest';
import type { FakeAutoUpdater, FakeWindow } from './updater-test-harness';

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
    windows: [] as FakeWindow[],
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

import { setUpdateState } from './index';
import { registerUpdaterStateCases } from './updater-state-cases';
import { registerAutomaticUpdateCases } from './updater-automatic-cases';
import { registerUpdateRetryCases } from './updater-retry-cases';

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

const harness = { isMock, fakeAutoUpdater, getSettings, windows, makeWindow };
registerUpdaterStateCases(harness);
registerAutomaticUpdateCases(harness);
registerUpdateRetryCases(harness);
