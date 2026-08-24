import { autoUpdater, type UpdateInfo } from 'electron-updater';
import { is } from '@electron-toolkit/utils';
import { BrowserWindow } from 'electron';
import { storage } from '../storage';
import type { UpdateState } from '../../shared/types';

let updateState: UpdateState = { status: 'idle' };

export function getUpdateState(): UpdateState {
  return updateState;
}

export function setUpdateState(next: UpdateState): void {
  updateState = next;
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send('update-state', updateState);
    }
  }
}

export const UNSIGNED_MAC_MESSAGE =
  'Automatic updates are not available for this macOS build. Download the latest release from GitHub.';

export function updateErrorMessage(error: unknown): string {
  if (process.platform === 'darwin') return UNSIGNED_MAC_MESSAGE;
  return error instanceof Error ? error.message : String(error);
}

export async function checkForUpdatesWithRetry(
  retries = 2,
  timeout = 10000
): Promise<UpdateInfo | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const updateCheckPromise = new Promise<UpdateInfo | null>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Update check timeout'));
        }, timeout);

        const onUpdateAvailable = (info: UpdateInfo) => {
          clearTimeout(timeoutId);
          autoUpdater.off('update-available', onUpdateAvailable);
          autoUpdater.off('update-not-available', onUpdateNotAvailable);
          autoUpdater.off('error', onError);
          resolve(info);
        };

        const onUpdateNotAvailable = (_info: UpdateInfo) => {
          clearTimeout(timeoutId);
          autoUpdater.off('update-available', onUpdateAvailable);
          autoUpdater.off('update-not-available', onUpdateNotAvailable);
          autoUpdater.off('error', onError);
          resolve(null); // No updates available
        };

        const onError = (error: Error) => {
          clearTimeout(timeoutId);
          autoUpdater.off('update-available', onUpdateAvailable);
          autoUpdater.off('update-not-available', onUpdateNotAvailable);
          autoUpdater.off('error', onError);
          reject(error);
        };

        autoUpdater.once('update-available', onUpdateAvailable);
        autoUpdater.once('update-not-available', onUpdateNotAvailable);
        autoUpdater.once('error', onError);

        autoUpdater.checkForUpdates().catch(reject);
      });

      const result = await updateCheckPromise;
      return result;
    } catch (error) {
      console.error(`Update check attempt ${attempt} failed:`, error);

      if (attempt === retries) {
        throw error; // Re-throw on final attempt
      }

      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return null; // Fallback return
}

export function configureAutoUpdater(): void {
  if (!is.dev) {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
  }
}

export function setupAutoUpdaterEvents(): void {
  autoUpdater.on('checking-for-update', () => {
    setUpdateState({ status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    setUpdateState({ status: 'available', version: info.version });
  });

  autoUpdater.on('update-not-available', () => {
    setUpdateState({ status: 'upToDate' });
  });

  autoUpdater.on('error', (err) => {
    console.error('Error in auto-updater:', err);
    setUpdateState({ status: 'error', message: updateErrorMessage(err) });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    setUpdateState({
      status: 'downloading',
      version: updateState.version,
      progress: Math.round(progressObj.percent),
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    setUpdateState({ status: 'downloaded', version: info.version });
  });
}

export async function runAutomaticUpdateCheck(): Promise<void> {
  if (is.dev) return;

  let enabled = true;
  try {
    const settings = await storage.getSettings();
    enabled = settings.automaticUpdates ?? true;
  } catch {
    return;
  }
  if (!enabled) return;

  try {
    autoUpdater.autoDownload = true;
    await autoUpdater.checkForUpdates();
  } catch {
    // no-op
  }
}
