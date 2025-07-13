import { ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import { is } from '@electron-toolkit/utils';
import { storage } from '../storage';
import { hotkeyManager } from '../hotkeys';
import { getMainWindow, getSettingsWindow, createSettingsWindow } from '../window/creation';
import { applyWindowSettings } from '../window/settings';
import { checkForUpdatesWithRetry } from '../updater';

export function setupMainIPC(): void {
  // IPC test
  ipcMain.on('ping', () => console.log('pong'));

  // Settings window IPC handlers
  ipcMain.handle('open-settings', (_event, tab?: string) => {
    createSettingsWindow(tab);
  });

  ipcMain.handle('close-settings', () => {
    const settingsWindow = getSettingsWindow();
    if (settingsWindow) {
      settingsWindow.close();
    }
  });

  // Settings communication between windows
  ipcMain.handle('settings-changed', async (_event, settings) => {
    try {
      // Save settings to storage
      await storage.saveSettings(settings);

      // Apply window settings immediately
      const mainWindow = getMainWindow();
      if (mainWindow) {
        await applyWindowSettings(mainWindow);
      }

      // Update hotkeys if settings changed
      await hotkeyManager.onSettingsChanged();

      // Relay settings changes to all windows
      const settingsWindow = getSettingsWindow();
      if (mainWindow) {
        mainWindow.webContents.send('settings-updated', settings);
      }
      if (settingsWindow) {
        settingsWindow.webContents.send('settings-updated', settings);
      }

      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  });

  ipcMain.handle('get-settings', async () => {
    try {
      return await storage.getSettings();
    } catch (error) {
      console.error('Failed to get settings:', error);
      return {};
    }
  });

  // Auto-updater IPC handlers
  ipcMain.handle('check-for-updates', async () => {
    if (!is.dev) {
      try {
        const result = await checkForUpdatesWithRetry();
        return result;
      } catch (error) {
        console.error('Update check failed:', error);
        throw new Error(
          `Failed to check for updates: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
    return null;
  });

  ipcMain.handle('download-update', async () => {
    if (!is.dev) {
      try {
        return await autoUpdater.downloadUpdate();
      } catch (error) {
        console.error('Update download failed:', error);
        throw new Error(
          `Failed to download update: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
    return null;
  });

  ipcMain.handle('quit-and-install', () => {
    if (!is.dev) {
      try {
        autoUpdater.quitAndInstall();
      } catch (error) {
        console.error('Failed to quit and install:', error);
        throw new Error(
          `Failed to install update: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  });
}
