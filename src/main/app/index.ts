import { app, BrowserWindow, safeStorage } from 'electron';
import { electronApp, optimizer } from '@electron-toolkit/utils';
import { storage } from '../storage';
import { hotkeyManager } from '../hotkeys';
import { getTray, setIsQuitting } from '../tray';
import { configureAutoUpdater, setupAutoUpdaterEvents, runAutomaticUpdateCheck } from '../updater';
import { setupMainIPC } from '../ipc';
import { initializeWindowSystem, getMainWindow, getWindowBounds } from '../window';
import { applyWindowSettings } from '../window/settings';
import {
  applyWindowBackgroundTheme,
  watchSystemThemeForWindowBackground,
} from '../window/background';
import { applyAutoStart } from '../autoStart';

export async function initializeApp(): Promise<void> {
  if (process.env.CLIPLESS_PLAINTEXT_STORAGE === '1' && process.platform === 'linux') {
    safeStorage.setUsePlainTextEncryption(true); // e2e only: Playwright's --password-store=basic makes Linux report no encryption, failing every encrypted write
  }

  electronApp.setAppUserModelId('com.clipless.app'); // must be unique: on Windows it doubles as the autostart registry value name, so a shared default would collide with other Electron apps

  watchSystemThemeForWindowBackground();

  await initializeWindowSystem();

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

  storage.setOnBackgroundLoadComplete(async () => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      console.log('Background storage loading complete, re-applying window settings');
      applyWindowSettings(mainWindow);

      mainWindow.webContents.send('storage-ready');
    }

    try {
      const settings = await storage.getSettings();
      applyAutoStart(settings.autoStart);
      applyWindowBackgroundTheme(settings.theme); // windows were created before storage was ready, so their background still reflects the OS preference
    } catch (error) {
      console.error('Failed to apply auto-start setting on startup:', error);
    }

    runAutomaticUpdateCheck(); // errors are swallowed inside so unsupported platforms (e.g. unsigned macOS builds) never surface failures
  });

  const mainWindow = getMainWindow();
  const windowBounds = getWindowBounds();
  if (mainWindow && windowBounds) {
    mainWindow.setBounds(windowBounds);
  }
}

export function setupAppEvents(): void {
  app.on('second-instance', () => {
    const mainWindow = getMainWindow(); // this event fires on the primary instance when a second launch quits itself via the single-instance lock (see index.ts) — surface the existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      mainWindow.focus();
    }
  });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      initializeWindowSystem();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin' && !getTray()) {
      app.quit();
    }
  });

  app.on('before-quit', () => {
    setIsQuitting(true);
    hotkeyManager.cleanup();
  });

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window); // F12 toggles DevTools in dev; CommandOrControl+R is ignored in production
  });
}

export function initializeServices(): void {
  setupMainIPC();

  configureAutoUpdater();
  setupAutoUpdaterEvents();
}
