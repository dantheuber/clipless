import type { EventEmitter } from 'events';
import type { Mock } from 'vitest';

export interface FakeAutoUpdater extends EventEmitter {
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
  checkForUpdates: Mock;
  quitAndInstall: Mock;
}

export interface FakeWindow {
  isDestroyed: () => boolean;
  webContents: { send: Mock };
}

export interface UpdaterTestHarness {
  isMock: { dev: boolean };
  fakeAutoUpdater: FakeAutoUpdater;
  getSettings: Mock;
  windows: FakeWindow[];
  makeWindow: (destroyed?: boolean) => FakeWindow;
}
