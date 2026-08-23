import { autoUpdater, type UpdateInfo } from 'electron-updater';
import { is } from '@electron-toolkit/utils';
import { BrowserWindow } from 'electron';
import { storage } from '../storage';
import type { UpdateState } from '../../shared/types';

/**
 * The one copy of the updater state. Set from the electron-updater events and the
 * check-for-updates and download-update handlers, pushed as update-state to every window
 * on each change, readable through get-update-state. The status bar pill and the settings
 * Updates panel both render from it; nothing substring-matches a display string.
 */
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

/**
 * Unsigned macOS builds cannot update themselves; every updater error there means the
 * same thing, so say that and point at the releases page (spec 15.4).
 */
export const UNSIGNED_MAC_MESSAGE =
  'Automatic updates are not available for this macOS build. Download the latest release from GitHub.';

export function updateErrorMessage(error: unknown): string {
  if (process.platform === 'darwin') return UNSIGNED_MAC_MESSAGE;
  return error instanceof Error ? error.message : String(error);
}

// Helper function to check for updates with timeout and retry
export async function checkForUpdatesWithRetry(
  retries = 2,
  timeout = 10000
): Promise<UpdateInfo | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Create a promise that resolves with auto-updater events
      const updateCheckPromise = new Promise<UpdateInfo | null>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Update check timeout'));
        }, timeout);

        // Listen for update events
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

        // Set up event listeners
        autoUpdater.once('update-available', onUpdateAvailable);
        autoUpdater.once('update-not-available', onUpdateNotAvailable);
        autoUpdater.once('error', onError);

        // Start the check
        autoUpdater.checkForUpdates().catch(reject);
      });

      const result = await updateCheckPromise;
      return result;
    } catch (error) {
      console.error(`Update check attempt ${attempt} failed:`, error);

      if (attempt === retries) {
        throw error; // Re-throw on final attempt
      }

      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return null; // Fallback return
}

export function configureAutoUpdater(): void {
  if (!is.dev) {
    // Manual flow (UpdaterControl) controls its own download; automatic flow
    // sets autoDownload = true just before invoking the check.
    autoUpdater.autoDownload = false;
    // If an update is downloaded and the user defers the restart, install it
    // automatically the next time they quit.
    autoUpdater.autoInstallOnAppQuit = true;
  }
}

/**
 * The six electron-updater events drive the state. Lifecycle decisions (download,
 * install and restart) stay with the manual UpdaterControl flow and
 * runAutomaticUpdateCheck so the user is never restarted without consent.
 */
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

// Runs at app startup: silently checks for an update and, if one is available,
// downloads it. The events above move the state to downloaded, which the
// status bar pill and the banner render. All failures are swallowed so
// unsupported platforms (e.g. unsigned macOS builds) never surface errors
// beyond the error state.
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
    // The error event has already set the state
  }
}
