import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import { createTray as createTrayIcon, getTray, setIsQuitting, getIsQuitting } from './tray'
import { initializeClipboardMonitoring, setupClipboardIPC } from './clipboard'
import { storage } from './storage'
import icon from '../../resources/icon.png?asset'

let mainWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;

function createSettingsWindow(): void {
  if (settingsWindow) {     
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 600,
    height: 500,
    show: false,
    autoHideMenuBar: true,
    resizable: false,
    parent: mainWindow || undefined,
    modal: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
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
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    settingsWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/settings.html');
  } else {
    settingsWindow.loadFile(join(__dirname, '../renderer/settings.html'));
  }
}

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  });

  mainWindow.on('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });

  // Handle window close - minimize to tray instead of quitting
  mainWindow.on('close', (event) => {
    if (!getIsQuitting()) {
      event.preventDefault();
      if (mainWindow) {
        mainWindow.hide();
      }
    }
  });

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

  // Settings window IPC handlers
  ipcMain.handle('open-settings', () => {
    createSettingsWindow();
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
}

// Configure auto-updater
if (!is.dev) {
  // Only enable auto-updater in production
  autoUpdater.checkForUpdatesAndNotify();
  
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
};

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
      return await autoUpdater.checkForUpdates();
    }
    return null;
  });

  ipcMain.handle('download-update', async () => {
    if (!is.dev) {
      return await autoUpdater.downloadUpdate();
    }
    return null;
  });

  ipcMain.handle('quit-and-install', () => {
    if (!is.dev) {
      autoUpdater.quitAndInstall();
    }
  });

  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q. With tray, we don't quit when windows are closed.
app.on('window-all-closed', () => {
  // Don't quit the app when all windows are closed if we have a tray
  if (process.platform !== 'darwin' && !getTray()) {
    app.quit()
  }
});

// Handle app before quit to set the quitting flag
app.on('before-quit', () => {
  setIsQuitting(true);
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
