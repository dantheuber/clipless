import { app, BrowserWindow } from 'electron';
import { electronApp, optimizer } from '@electron-toolkit/utils';
import { storage } from '../storage';
import { hotkeyManager } from '../hotkeys';
import { getTray, setIsQuitting } from '../tray';
import { configureAutoUpdater, setupAutoUpdaterEvents } from '../updater';
import { setupMainIPC } from '../ipc';
import { initializeWindowSystem, getMainWindow, getWindowBounds } from '../window';
import { applyWindowSettings } from '../window/settings';

export async function initializeApp(): Promise<void> {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron');

  // Create window first for better perceived performance
  await initializeWindowSystem();

  // Initialize everything else in parallel to avoid blocking UI
  Promise.all([
    // Initialize secure storage in background
    storage
      .initialize()
      .then(() => {
        console.log('Secure storage initialized successfully');
      })
      .catch((error) => {
        console.error('Failed to initialize secure storage:', error);
      }),
  ]);

  // Set up callback to re-apply window settings after background storage loading completes
  storage.setOnBackgroundLoadComplete(() => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      console.log('Background storage loading complete, re-applying window settings');
      applyWindowSettings(mainWindow);
    }
  });

  // Apply window bounds if available after initialization
  const mainWindow = getMainWindow();
  const windowBounds = getWindowBounds();
  if (mainWindow && windowBounds) {
    mainWindow.setBounds(windowBounds);
  }
}

export function setupAppEvents(): void {
  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      initializeWindowSystem();
    }
  });

  // Quit when all windows are closed, except on macOS. There, it's common
  // for applications and their menu bar to stay active until the user quits
  // explicitly with Cmd + Q. With tray, we don't quit when windows are closed.
  app.on('window-all-closed', () => {
    // Don't quit the app when all windows are closed if we have a tray
    if (process.platform !== 'darwin' && !getTray()) {
      app.quit();
    }
  });

  // Handle app before quit to set the quitting flag
  app.on('before-quit', () => {
    setIsQuitting(true);
    hotkeyManager.cleanup();
  });

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });
}

export function initializeServices(): void {
  // Setup IPC handlers
  setupMainIPC();

  // Configure and setup auto-updater
  configureAutoUpdater();
  setupAutoUpdaterEvents();
}
