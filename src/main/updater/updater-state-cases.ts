import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  configureAutoUpdater,
  getUpdateState,
  setUpdateState,
  setupAutoUpdaterEvents,
  UNSIGNED_MAC_MESSAGE,
  updateErrorMessage,
} from './index';
import type { UpdaterTestHarness } from './updater-test-harness';

export function registerUpdaterStateCases(harness: UpdaterTestHarness): void {
  const { isMock, fakeAutoUpdater, windows, makeWindow } = harness;

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
}
