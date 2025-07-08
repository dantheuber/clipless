import { app, shell, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { autoUpdater } from 'electron-updater';
import { createTray as createTrayIcon, getTray, setIsQuitting, getIsQuitting } from './tray';
import { initializeClipboardMonitoring, setupClipboardIPC } from './clipboard';
import { hotkeyManager } from './hotkeys';
import { storage } from './storage';
import icon from '../../resources/icon.png?asset';

let mainWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let windowBounds: { x: number; y: number; width: number; height: number } | null = null;

// Window management functions
async function loadWindowBounds(): Promise<void> {
  try {
    const settings = await storage.getSettings();
    if (settings.rememberWindowPosition) {
      const bounds = await storage.getWindowBounds();
      if (bounds) {
        windowBounds = bounds;
      }
    }
  } catch (error) {
    console.error('Failed to load window bounds:', error);
  }
}

async function saveWindowBounds(): Promise<void> {
  if (!mainWindow) return;

  try {
    const settings = await storage.getSettings();
    if (settings.rememberWindowPosition) {
      const bounds = mainWindow.getBounds();
      windowBounds = bounds;
      await storage.saveWindowBounds(bounds);
    }
  } catch (error) {
    console.error('Failed to save window bounds:', error);
  }
}

async function applyWindowSettings(window: BrowserWindow): Promise<void> {
  try {
    const settings = await storage.getSettings();

    // Apply transparency
    if (
      settings.transparencyEnabled &&
      settings.windowTransparency &&
      settings.windowTransparency > 0
    ) {
      const opacity = (100 - settings.windowTransparency) / 100;
      window.setOpacity(opacity);
    } else {
      // Reset to fully opaque if transparency is disabled
      window.setOpacity(1.0);
    }

    // Apply always on top
    if (settings.alwaysOnTop) {
      window.setAlwaysOnTop(true);
    } else {
      window.setAlwaysOnTop(false);
    }
  } catch (error) {
    console.error('Failed to apply window settings:', error);
  }
}

async function handleWindowFocus(window: BrowserWindow): Promise<void> {
  try {
    const settings = await storage.getSettings();

    // Make window opaque when focused if the option is enabled
    if (settings.transparencyEnabled && settings.opaqueWhenFocused) {
      window.setOpacity(1.0);
    }
  } catch (error) {
    console.error('Failed to handle window focus:', error);
  }
}

async function handleWindowBlur(window: BrowserWindow): Promise<void> {
  try {
    const settings = await storage.getSettings();

    // Restore transparency when window loses focus
    if (
      settings.transparencyEnabled &&
      settings.opaqueWhenFocused &&
      settings.windowTransparency &&
      settings.windowTransparency > 0
    ) {
      const opacity = (100 - settings.windowTransparency) / 100;
      window.setOpacity(opacity);
    }
  } catch (error) {
    console.error('Failed to handle window blur:', error);
  }
}

function createSettingsWindow(tab?: string): void {
  if (settingsWindow) {
    settingsWindow.focus();
    // If window exists and we have a tab parameter, send message to change tab
    if (tab) {
      settingsWindow.webContents.once('did-finish-load', () => {
        settingsWindow?.webContents.send('settings-set-tab', tab);
      });
    }
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 800,
    height: 650,
    show: false,
    autoHideMenuBar: true,
    resizable: false,
    parent: mainWindow || undefined,
    modal: false,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  });

  settingsWindow.on('ready-to-show', () => {
    if (settingsWindow) {
      settingsWindow.show();
    }
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });

  // Load the settings HTML file - use dev server in development mode
  const baseUrl =
    is.dev && process.env['ELECTRON_RENDERER_URL']
      ? process.env['ELECTRON_RENDERER_URL']
      : 'file://' + join(__dirname, '../renderer');

  const url = baseUrl + '/settings.html' + (tab ? `?tab=${tab}` : '');

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    settingsWindow.loadURL(url);
  } else {
    settingsWindow.loadFile(join(__dirname, '../renderer/settings.html'), {
      search: tab ? `tab=${tab}` : undefined,
    });
  }
}

async function createWindow(): Promise<void> {
  // Create the browser window.
  const windowOptions: any = {
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  };

  // Apply saved window bounds if available
  if (windowBounds) {
    windowOptions.x = windowBounds.x;
    windowOptions.y = windowBounds.y;
    windowOptions.width = windowBounds.width;
    windowOptions.height = windowBounds.height;
  }

  mainWindow = new BrowserWindow(windowOptions);

  mainWindow.on('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
      // Apply window settings after the window is ready
      applyWindowSettings(mainWindow);
    }
  });

  // Handle window close - minimize to tray instead of quitting
  mainWindow.on('close', (event) => {
    if (!getIsQuitting()) {
      event.preventDefault();
      if (mainWindow) {
        saveWindowBounds(); // Save bounds before hiding
        mainWindow.hide();
      }
    }
  });

  // Save window bounds when moved or resized
  mainWindow.on('moved', saveWindowBounds);
  mainWindow.on('resized', saveWindowBounds);

  // Handle focus/blur for transparency settings
  mainWindow.on('focus', () => handleWindowFocus(mainWindow!));
  mainWindow.on('blur', () => handleWindowBlur(mainWindow!));

  // Create system tray
  createTrayIcon(mainWindow, createSettingsWindow);

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // Initialize clipboard functionality
  initializeClipboardMonitoring(mainWindow);
  setupClipboardIPC(mainWindow);

  // Initialize hotkey manager
  hotkeyManager.setMainWindow(mainWindow);
  await hotkeyManager.initialize();

  // Settings window IPC handlers
  ipcMain.handle('open-settings', (_event, tab?: string) => {
    createSettingsWindow(tab);
  });

  ipcMain.handle('close-settings', () => {
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
      if (mainWindow) {
        await applyWindowSettings(mainWindow);
      }

      // Update hotkeys if settings changed
      await hotkeyManager.onSettingsChanged();

      // Relay settings changes to all windows
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

  // Apply saved window bounds if available
  loadWindowBounds().then(() => {
    if (mainWindow && windowBounds) {
      mainWindow.setBounds(windowBounds);
    }
  });

  // Apply window settings (transparency, always on top)
  applyWindowSettings(mainWindow);
}

// Define the type for update check results
type UpdateCheckResult = {
  version: string;
  releaseNotes?: string;
  releaseDate?: Date;
};

// Helper function to check for updates with timeout and retry
async function checkForUpdatesWithRetry(retries = 2, timeout = 10000): Promise<UpdateCheckResult | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Create a promise that resolves with auto-updater events
      const updateCheckPromise = new Promise<UpdateCheckResult | null>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Update check timeout'));
        }, timeout);
        
        // Listen for update events
        const onUpdateAvailable = (info: UpdateCheckResult) => {
          clearTimeout(timeoutId);
          autoUpdater.removeAllListeners('update-available');
          autoUpdater.removeAllListeners('update-not-available');
          autoUpdater.removeAllListeners('error');
          resolve(info);
        };
        
        const onUpdateNotAvailable = (_info: any) => {
          clearTimeout(timeoutId);
          autoUpdater.removeAllListeners('update-available');
          autoUpdater.removeAllListeners('update-not-available');
          autoUpdater.removeAllListeners('error');
          resolve(null); // No updates available
        };
        
        const onError = (error: any) => {
          clearTimeout(timeoutId);
          autoUpdater.removeAllListeners('update-available');
          autoUpdater.removeAllListeners('update-not-available');
          autoUpdater.removeAllListeners('error');
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
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Configure auto-updater
if (!is.dev) {
  // Configure auto-updater settings
  autoUpdater.autoDownload = false; // Don't auto-download, let user control it
  autoUpdater.autoInstallOnAppQuit = false; // Don't auto-install on quit
  
  // Only enable auto-updater in production
  autoUpdater.checkForUpdatesAndNotify();
}

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

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron');

  // Initialize secure storage
  try {
    await storage.initialize();
    console.log('Secure storage initialized successfully');
  } catch (error) {
    console.error('Failed to initialize secure storage:', error);
  }

  // Load window bounds before creating the window
  await loadWindowBounds();

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // IPC test
  ipcMain.on('ping', () => console.log('pong'));

  // Auto-updater IPC handlers
  ipcMain.handle('check-for-updates', async () => {
    if (!is.dev) {
      try {
        const result = await checkForUpdatesWithRetry();
        return result;
      } catch (error) {
        console.error('Update check failed:', error);
        throw new Error(`Failed to check for updates: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        throw new Error(`Failed to download update: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        throw new Error(`Failed to install update: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  });

  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
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

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
