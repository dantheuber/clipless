import { BrowserWindow, shell, type BrowserWindowConstructorOptions } from 'electron';
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
import { resolveWindowBackground } from './background';
import { storage } from '../storage';
import icon from '../../../resources/icon.png?asset';

const SETTINGS_WINDOW = { width: 900, height: 600, minWidth: 720, minHeight: 440 }; // below 720 wide the General grid collapses to one column and scrolls; nothing is designed under 720 x 440 (spec 15.2, 14.8)

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
    if (tab) {
      settingsWindow.webContents.once('did-finish-load', () => {
        settingsWindow?.webContents.send('settings-set-tab', tab);
      });
    }
    return;
  }

  const settingsWidth = SETTINGS_WINDOW.width;
  const settingsHeight = SETTINGS_WINDOW.height;
  const position = calculateWindowPosition(mainWindow, settingsWidth, settingsHeight);

  settingsWindow = new BrowserWindow({
    width: settingsWidth,
    height: settingsHeight,
    minWidth: SETTINGS_WINDOW.minWidth,
    minHeight: SETTINGS_WINDOW.minHeight,
    x: position?.x,
    y: position?.y,
    show: false,
    autoHideMenuBar: true,
    resizable: true,
    parent: mainWindow || undefined,
    modal: false,
    icon,
    backgroundColor: resolveWindowBackground(),
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
  const windowOptions: BrowserWindowConstructorOptions = {
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    icon,
    backgroundColor: resolveWindowBackground(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  };

  const windowBounds = getWindowBounds();
  if (windowBounds) {
    windowOptions.x = windowBounds.x;
    windowOptions.y = windowBounds.y;
    windowOptions.width = windowBounds.width;
    windowOptions.height = windowBounds.height;
  }

  mainWindow = new BrowserWindow(windowOptions);

  mainWindow.on('ready-to-show', async () => {
    if (!mainWindow) {
      return;
    }

    let startMinimized = false; // "Start Minimized" keeps launch hidden to the tray; if settings aren't loaded yet this default safely shows the window
    try {
      const settings = await storage.getSettings();
      startMinimized = settings.startMinimized;
    } catch (error) {
      console.error('Failed to read startMinimized setting:', error);
    }

    if (!startMinimized) {
      mainWindow.show();
    }

    applyWindowSettings(mainWindow);
  });

  mainWindow.on('close', (event) => {
    if (!getIsQuitting()) {
      event.preventDefault();
      if (mainWindow) {
        saveWindowBounds(mainWindow); // Save bounds before hiding
        mainWindow.hide();
      }
    }
  });

  mainWindow.on('moved', () => saveWindowBounds(mainWindow!));
  mainWindow.on('resized', () => saveWindowBounds(mainWindow!));

  mainWindow.on('focus', () => handleWindowFocus(mainWindow!));
  mainWindow.on('blur', () => handleWindowBlur(mainWindow!));

  createTrayIcon(mainWindow, createSettingsWindow);

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  initializeClipboardSystem(mainWindow);

  mainWindow.webContents.once('did-finish-load', async () => {
    hotkeyManager.setMainWindow(mainWindow); // hotkey init is deferred until load to improve startup perception
    await hotkeyManager.initialize();
  });
}
