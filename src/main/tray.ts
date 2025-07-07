import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron'
import icon from '../../resources/icon.png?asset'

let tray: Tray | null = null;
let isQuitting = false;

export function createTray(mainWindow: BrowserWindow | null, createSettingsWindow: (tab?: string) => void): Tray | null {
  const trayIcon = nativeImage.createFromPath(icon);
  trayIcon.setTemplateImage(true);
  
  tray = new Tray(trayIcon);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Clipless',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Settings...',
      click: () => {
        createSettingsWindow();
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        setIsQuitting(true);
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
  tray.setToolTip('Clipless - Clipboard Manager');
  
  // Double-click to show main window
  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  return tray;
}

export function getTray(): Tray | null {
  return tray;
}

export function setIsQuitting(value: boolean): void {
  isQuitting = value;
}

export function getIsQuitting(): boolean {
  return isQuitting;
}
