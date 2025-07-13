import { autoUpdater } from 'electron-updater';
import { is } from '@electron-toolkit/utils';

// Helper function to check for updates with timeout and retry
export async function checkForUpdatesWithRetry(retries = 2, timeout = 10000): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Create a promise that resolves with auto-updater events
      const updateCheckPromise = new Promise<any>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Update check timeout'));
        }, timeout);

        // Listen for update events
        const onUpdateAvailable = (info: any) => {
          clearTimeout(timeoutId);
          autoUpdater.off('update-available', onUpdateAvailable);
          autoUpdater.off('update-not-available', onUpdateNotAvailable);
          autoUpdater.off('error', onError);
          resolve(info);
        };

        const onUpdateNotAvailable = (_info: any) => {
          clearTimeout(timeoutId);
          autoUpdater.off('update-available', onUpdateAvailable);
          autoUpdater.off('update-not-available', onUpdateNotAvailable);
          autoUpdater.off('error', onError);
          resolve(null); // No updates available
        };

        const onError = (error: any) => {
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
    // Configure auto-updater settings
    autoUpdater.autoDownload = false; // Don't auto-download, let user control it
    autoUpdater.autoInstallOnAppQuit = false; // Don't auto-install on quit

    // Delay auto-updater check to not block startup
    // Check for updates 10 seconds after startup to avoid blocking UI
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 10000);
  }
}

export function setupAutoUpdaterEvents(): void {
  // Auto-updater events
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
    // Auto-install and restart
    autoUpdater.quitAndInstall();
  });
}
