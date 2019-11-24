'use strict'

import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
} from 'electron';
import * as path from 'path';
import { format as formatUrl } from 'url';
import {
  CLIPS,
  MIN_WIDTH,
  MIN_HEIGHT,
  DEFAULT_STORE_VALUE,
  DEFAULT_CONFIG_FILENAME,
  ALWAYS_ON_TOP_SETTING,
  TRANSPARENT_SETTING,
  OPACITY_SETTING,
  NUMBER_OF_CLIPS_SETTING,
} from './constants';
import Store from './store';

const isDevelopment = process.env.NODE_ENV !== 'production';

const store = new Store({
  configName: DEFAULT_CONFIG_FILENAME,
  defaults: DEFAULT_STORE_VALUE,
})

// global reference to mainWindow (necessary to prevent window from being garbage collected)
let mainWindow;

function createMainWindow() {
  const { width, height } = store.get('windowBounds');
  const { x, y } = store.get('position');
  const transparent = store.get(TRANSPARENT_SETTING);
  const alwaysOnTop = store.get(ALWAYS_ON_TOP_SETTING);
  const window = new BrowserWindow({
    fullscreenable: false,
    frame: false,
    transparent,
    alwaysOnTop,
    height,
    width,
    x,
    y,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    maxHeight: MIN_HEIGHT, // locking height for now until we have a nice handling of height changes
    webPreferences: {
      nodeIntegration: true,
    }
  });

  if (transparent) {
    window.setOpacity(store.get(OPACITY_SETTING));
  }

  if (isDevelopment) {
    window.webContents.openDevTools();
  }

  if (isDevelopment) {
    window.loadURL(`http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}`);
  }
  else {
    window.loadURL(formatUrl({
      pathname: path.join(__dirname, 'index.html'),
      protocol: 'file',
      slashes: true
    }));
  }

  window.on('closed', () => {
    mainWindow = null
  });

  window.on('resize', () => {
    const { width, height } = window.getBounds();
    store.set('windowBounds', { width, height });
  });

  window.on('move', () => {
    const pos = window.getPosition();
    store.set('position', {
      x: pos[0],
      y: pos[1],
    });
  });

  window.webContents.on('devtools-opened', () => {
    window.focus();
    setImmediate(() => {
      window.focus();
    });
  });

  return window;
}

function registerShortcuts(window) {
  [1,2,3,4,5,6,7,8,9,0].forEach((key) => {
    globalShortcut.register(`CommandOrControl+${key}`, () => {
      let index = key - 1;
      if (key === 0) index = 9;
      window.webContents.send('get-clip', { index });
    });
  });
}

// quit application when all windows are closed
app.on('window-all-closed', () => {
  // on macOS it is common for applications to stay open until the user explicitly quits
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // on macOS it is common to re-create a window even after all windows have been closed
  if (mainWindow === null) {
    mainWindow = createMainWindow();
  }
});

// create main BrowserWindow when electron is ready
app.on('ready', () => {
  mainWindow = createMainWindow();
  registerShortcuts(mainWindow);
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

ipcMain.on('set-always-on-top', (e, { preference }) => {
  mainWindow.setAlwaysOnTop(preference);
  store.set(ALWAYS_ON_TOP_SETTING, preference);
});

ipcMain.on('set-transparent', (e, { preference }) => {
  mainWindow.setOpacity(preference ? store.get(OPACITY_SETTING) : 1);
  store.set(TRANSPARENT_SETTING, preference);
});

ipcMain.on('set-opacity', (e, { opacity }) => {
  mainWindow.setOpacity(opacity);
  store.set(OPACITY_SETTING, opacity);
});

ipcMain.on('set-number-of-clips', (e, { numberOfclips }) => {
  store.set(NUMBER_OF_CLIPS_SETTING, numberOfclips);
});

ipcMain.on('save-clips', (e, { clips }) => {
  store.set(CLIPS, clips);
});

ipcMain.on('load-clips', (event) => {
  event.returnValue = store.get(CLIPS);
});

ipcMain.on('quit-app', () => {
  app.quit();
});
