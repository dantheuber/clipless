import { ipcMain, Menu, MenuItemConstructorOptions } from 'electron';
import { autoUpdater } from 'electron-updater';
import { is } from '@electron-toolkit/utils';
import { storage } from '../storage';
import { hotkeyManager } from '../hotkeys';
import {
  getMainWindow,
  getSettingsWindow,
  createSettingsWindow,
  createToolsLauncherWindow,
  getToolsLauncherWindow,
} from '../window/creation';
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

  // Tools Launcher window IPC handlers
  ipcMain.handle('open-tools-launcher', (_event, clipContent: string) => {
    createToolsLauncherWindow(clipContent);
  });

  ipcMain.handle('close-tools-launcher', () => {
    const toolsLauncherWindow = getToolsLauncherWindow();
    if (toolsLauncherWindow) {
      toolsLauncherWindow.close();
    }
  });

  ipcMain.handle('tools-launcher-ready', () => {
    // This is called when the tools launcher window is ready to receive data
    // The actual data sending is handled in the window creation
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

  // Context Menu IPC handler
  ipcMain.handle(
    'show-clip-context-menu',
    async (
      event,
      options: {
        index: number;
        isFirstClip: boolean;
        isLocked: boolean;
        hasPatterns: boolean;
      }
    ) => {
      const { index, isFirstClip, isLocked, hasPatterns } = options;

      const template: MenuItemConstructorOptions[] = [
        {
          label: 'Copy to Clipboard',
          click: () => {
            event.sender.send('context-menu-action', { action: 'copy', index });
          },
        },
        { type: 'separator' },
        {
          label: hasPatterns ? 'Scan with Quick Clips ⚡' : 'Scan with Quick Clips',
          click: () => {
            event.sender.send('context-menu-action', { action: 'scan', index });
          },
        },
        { type: 'separator' },
        {
          label: isLocked ? 'Unlock Clip' : 'Lock Clip',
          enabled: !isFirstClip,
          click: () => {
            event.sender.send('context-menu-action', { action: 'lock', index });
          },
        },
        {
          label: 'Delete Clip',
          enabled: !isFirstClip,
          click: () => {
            event.sender.send('context-menu-action', { action: 'delete', index });
          },
        },
      ];

      const contextMenu = Menu.buildFromTemplate(template);
      const window = getMainWindow();
      if (window) {
        contextMenu.popup({ window });
      }
    }
  );

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
