import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { format as formatUrl } from 'url';
import {
  MIN_WIDTH,
  MIN_HEIGHT,
  DEFAULT_STORE_VALUE,
  DEFAULT_CONFIG_FILENAME,
  ALWAYS_ON_TOP_SETTING,
  TRANSPARENT_SETTING,
  OPACITY_SETTING,
} from './constants';
import Store from './store';
import windowTracking from './window-tracking';
import handleMessages from './handle-messages';
import keyboardShortcuts from './keyboard-shortcuts';

const isDevelopment = process.env.NODE_ENV !== 'production';

const store = new Store({
  configName: DEFAULT_CONFIG_FILENAME,
  defaults: DEFAULT_STORE_VALUE,
});

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

  window.webContents.on('devtools-opened', () => {
    window.focus();
    setImmediate(() => {
      window.focus();
    });
  });

  return window;
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
  windowTracking(mainWindow, store);
  keyboardShortcuts(app, mainWindow);
  handleMessages(app, mainWindow, store);
});
