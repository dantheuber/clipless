import { describe, expect, it, vi } from 'vitest';
import { checkForUpdatesWithRetry } from './index';
import type { UpdaterTestHarness } from './updater-test-harness';

export function registerUpdateRetryCases({
  fakeAutoUpdater,
}: Pick<UpdaterTestHarness, 'fakeAutoUpdater'>): void {
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
}
