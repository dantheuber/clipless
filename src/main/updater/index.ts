import { autoUpdater, type UpdateInfo } from 'electron-updater';
import { is } from '@electron-toolkit/utils';
import { dialog, type BrowserWindow } from 'electron';
import { storage } from '../storage';

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

export function setupAutoUpdaterEvents(): void {
  // Auto-updater events — logging only. Lifecycle decisions (download,
  // install/restart) are owned by the manual UpdaterControl flow and by
  // runAutomaticUpdateCheck so the user is never restarted without consent.
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info);
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('Update not available:', info);
  });

  autoUpdater.on('error', (err) => {
    console.error('Error in auto-updater:', err);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    console.log('Download progress:', Math.round(progressObj.percent) + '%');
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info);
  });
}

// Runs at app startup: silently checks for an update and, if one is available,
// downloads it and shows a native dialog asking the user to restart now or
// later. All failures are swallowed silently so unsupported platforms (e.g.
// unsigned macOS builds) never surface errors to the user.
export async function runAutomaticUpdateCheck(parentWindow: BrowserWindow | null): Promise<void> {
  if (is.dev) return;

  let enabled = true;
  try {
    const settings = await storage.getSettings();
    enabled = settings.automaticUpdates ?? true;
  } catch {
    return;
  }
  if (!enabled) return;

  const onError = (): void => {
    autoUpdater.off('update-downloaded', onDownloaded);
    autoUpdater.off('error', onError);
  };

  const onDownloaded = async (): Promise<void> => {
    autoUpdater.off('update-downloaded', onDownloaded);
    autoUpdater.off('error', onError);
    const options: Electron.MessageBoxOptions = {
      type: 'info',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'Update Ready',
      message: 'Clipless has been updated.',
      detail: 'Restart now to use the new version, or wait until the next time you quit.',
    };
    try {
      const promise = parentWindow
        ? dialog.showMessageBox(parentWindow, options)
        : dialog.showMessageBox(options);
      const { response } = await promise;
      if (response === 0) {
        autoUpdater.quitAndInstall();
      }
    } catch {
      // Silent: never bother the user with auto-update errors.
    }
  };

  autoUpdater.once('update-downloaded', onDownloaded);
  autoUpdater.once('error', onError);

  try {
    autoUpdater.autoDownload = true;
    await autoUpdater.checkForUpdates();
  } catch {
    autoUpdater.off('update-downloaded', onDownloaded);
    autoUpdater.off('error', onError);
  }
}
