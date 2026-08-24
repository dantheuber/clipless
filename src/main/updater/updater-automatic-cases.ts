import { describe, expect, it } from 'vitest';
import { runAutomaticUpdateCheck, setupAutoUpdaterEvents } from './index';
import type { UpdaterTestHarness } from './updater-test-harness';

export function registerAutomaticUpdateCases(harness: UpdaterTestHarness): void {
  const { isMock, fakeAutoUpdater, getSettings, windows, makeWindow } = harness;

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
}
