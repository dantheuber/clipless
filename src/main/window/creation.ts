import { BrowserWindow, shell } from 'electron';
import { join } from 'path';
import { is } from '@electron-toolkit/utils';
import { createTray as createTrayIcon, getIsQuitting } from '../tray';
import { initializeClipboardSystem } from '../clipboard';
import { hotkeyManager } from '../hotkeys';
import {
  applyWindowSettings,
  handleWindowFocus,
  handleWindowBlur,
  calculateWindowPosition,
} from './settings';
import { saveWindowBounds, getWindowBounds } from './bounds';
import icon from '../../../resources/icon.png?asset';

let mainWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function getSettingsWindow(): BrowserWindow | null {
  return settingsWindow;
}

export function createSettingsWindow(tab?: string): void {
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

  // Calculate positioning to keep settings window within screen bounds
  // This uses minimal padding and allows overlap with main window when needed
  // to keep the settings window close to the screen edges
  const settingsWidth = 800;
  const settingsHeight = 650;
  const position = calculateWindowPosition(mainWindow, settingsWidth, settingsHeight);

  settingsWindow = new BrowserWindow({
    width: settingsWidth,
    height: settingsHeight,
    x: position?.x,
    y: position?.y,
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

export async function createWindow(): Promise<void> {
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
  const windowBounds = getWindowBounds();
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
        saveWindowBounds(mainWindow); // Save bounds before hiding
        mainWindow.hide();
      }
    }
  });

  // Save window bounds when moved or resized
  mainWindow.on('moved', () => saveWindowBounds(mainWindow!));
  mainWindow.on('resized', () => saveWindowBounds(mainWindow!));

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

  // Setup clipboard system (IPC handlers and monitoring)
  initializeClipboardSystem(mainWindow);

  // Initialize non-critical components after window loads to improve startup perception
  mainWindow.webContents.once('did-finish-load', async () => {
    // Initialize hotkey manager
    hotkeyManager.setMainWindow(mainWindow);
    await hotkeyManager.initialize();
  });
}
