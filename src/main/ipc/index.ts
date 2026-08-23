import { ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import { is } from '@electron-toolkit/utils';
import { storage } from '../storage';
import { DEFAULT_HOTKEY_SETTINGS } from '../storage/defaults';
import { hotkeyManager } from '../hotkeys';
import { getMainWindow, getSettingsWindow, createSettingsWindow } from '../window/creation';
import { applyWindowSettings } from '../window/settings';
import { applyWindowBackgroundTheme } from '../window/background';
import {
  checkForUpdatesWithRetry,
  getUpdateState,
  setUpdateState,
  updateErrorMessage,
} from '../updater';
import { applyAutoStart } from '../autoStart';
import { restartApp } from '../app/restart';
import { openAppPath } from '../app/open-path';
import type { AppPathName, SettingsApplyResult, UserSettings } from '../../shared/types';

export function setupMainIPC(): void {
  // IPC test
  ipcMain.on('ping', () => console.log('pong'));

  // Settings window IPC handlers
  ipcMain.handle('open-settings', (_event, tab?: string) => {
    createSettingsWindow(tab);
  });

  // The one write path for settings: save, apply, re-register the hotkeys, relay to
  // every window, and answer what the OS refused so the row can say "not saved" (15.3).
  ipcMain.handle(
    'settings-changed',
    async (_event, settings: UserSettings): Promise<SettingsApplyResult> => {
      try {
        const previous = await storage.getSettings();
        await storage.saveSettings(settings);

        // The one expected refusal on General: the OS declining the login item (15.5)
        const autoStartApplied = applyAutoStart(settings.autoStart);
        const autoStartRefused = !autoStartApplied && settings.autoStart !== previous.autoStart;

        const mainWindow = getMainWindow();
        if (mainWindow) {
          await applyWindowSettings(mainWindow);
        }
        applyWindowBackgroundTheme(settings.theme);

        const hotkeys = await hotkeyManager.onSettingsChanged();

        const settingsWindow = getSettingsWindow();
        if (mainWindow) {
          mainWindow.webContents.send('settings-updated', settings);
        }
        if (settingsWindow) {
          settingsWindow.webContents.send('settings-updated', settings);
        }

        if (autoStartRefused) {
          return {
            ok: false,
            failed: hotkeys.failed,
            message: 'the system refused the login item',
          };
        }
        return { ok: hotkeys.ok, failed: hotkeys.failed };
      } catch (error) {
        console.error('Failed to save settings:', error);
        return {
          ok: false,
          failed: [],
          message: error instanceof Error ? error.message : String(error),
        };
      }
    }
  );

  // Import with replace restarts (15.5); the restart waits for the save queue first
  ipcMain.handle('app-restart', () => restartApp());

  // The About panel's data folder and log links (15.4)
  ipcMain.handle('open-app-path', (_event, name: AppPathName) => openAppPath(name));

  // The one copy of the hotkey defaults; the settings window reads them from here
  ipcMain.handle('hotkeys-get-defaults', () => DEFAULT_HOTKEY_SETTINGS);

  // Auto-updater IPC handlers. The electron-updater events move the state; the
  // handlers only cover what the events cannot see (a timeout, a dev build).
  ipcMain.handle('get-update-state', () => getUpdateState());

  ipcMain.handle('check-for-updates', async () => {
    if (!is.dev) {
      try {
        setUpdateState({ status: 'checking' });
        const result = await checkForUpdatesWithRetry();
        return result;
      } catch (error) {
        console.error('Update check failed:', error);
        setUpdateState({ status: 'error', message: updateErrorMessage(error) });
        throw new Error(
          `Failed to check for updates: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
    // Dev builds cannot check; report up to date as the old prose status did
    setUpdateState({ status: 'upToDate' });
    return null;
  });

  ipcMain.handle('download-update', async () => {
    if (!is.dev) {
      try {
        return await autoUpdater.downloadUpdate();
      } catch (error) {
        console.error('Update download failed:', error);
        setUpdateState({ status: 'error', message: updateErrorMessage(error) });
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
