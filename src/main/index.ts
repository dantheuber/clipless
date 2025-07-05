import { app, shell, BrowserWindow, ipcMain, clipboard, nativeImage } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import icon from '../../resources/icon.png?asset'

let mainWindow: BrowserWindow | null = null;

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
  })

  mainWindow.on('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Clipboard monitoring
  let lastClipboardContent = '';
  let lastClipboardType = '';
  let clipboardCheckInterval: NodeJS.Timeout | null = null;

  // Helper function to determine the current clipboard type and content
  const getCurrentClipboardData = (): { type: string; content: string } | null => {
    // Priority: text > rtf > html > image > bookmark
    const text = clipboard.readText();
    if (text && text.trim()) {
      return { type: 'text', content: text };
    }

    const rtf = clipboard.readRTF();
    if (rtf && rtf.trim()) {
      return { type: 'rtf', content: rtf };
    }

    const html = clipboard.readHTML();
    if (html && html.trim()) {
      return { type: 'html', content: html };
    }

    const image = clipboard.readImage();
    if (!image.isEmpty()) {
      return { type: 'image', content: image.toDataURL() };
    }

    try {
      const bookmark = clipboard.readBookmark();
      if (bookmark && bookmark.url) {
        return { type: 'bookmark', content: JSON.stringify(bookmark) };
      }
    } catch (error) {
      // Bookmark not available on all platforms
    }

    return null;
  };

  // Initialize with current clipboard content
  const initialClipData = getCurrentClipboardData();
  if (initialClipData) {
    lastClipboardContent = initialClipData.content;
    lastClipboardType = initialClipData.type;
  }

  const checkClipboard = () => {
    const currentClipData = getCurrentClipboardData();
    
    // Check if clipboard content has changed
    if (currentClipData && 
        (currentClipData.content !== lastClipboardContent || 
         currentClipData.type !== lastClipboardType)) {
      
      // Send clipboard change to renderer (renderer will handle duplicate detection)
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('clipboard-changed', currentClipData);
      }
      
      // Update last known values
      lastClipboardContent = currentClipData.content;
      lastClipboardType = currentClipData.type;
    }
  };

  // Clipboard IPC handlers
  ipcMain.handle('get-clipboard-text', () => clipboard.readText());
  ipcMain.handle('get-clipboard-html', () => clipboard.readHTML());
  ipcMain.handle('get-clipboard-rtf', () => clipboard.readRTF());
  ipcMain.handle('get-clipboard-image', () => {
    const image = clipboard.readImage();
    if (!image.isEmpty()) {
      return image.toDataURL();
    }
    return null;
  });
  ipcMain.handle('get-clipboard-bookmark', () => {
    try {
      return clipboard.readBookmark();
    } catch (error) {
      return null; // Not available on all platforms
    }
  });

  // Get current clipboard data using same prioritization as monitoring
  ipcMain.handle('get-current-clipboard-data', () => {
    return getCurrentClipboardData();
  });

  ipcMain.handle('set-clipboard-text', (_event, text: string) => {
    clipboard.writeText(text);
  });

  ipcMain.handle('set-clipboard-html', (_event, html: string) => {
    clipboard.writeHTML(html);
  });

  ipcMain.handle('set-clipboard-rtf', (_event, rtf: string) => {
    clipboard.writeRTF(rtf);
  });

  ipcMain.handle('set-clipboard-image', (_event, imageData: string) => {
    try {
      // Convert base64 data URL to NativeImage
      const image = nativeImage.createFromDataURL(imageData);
      clipboard.writeImage(image);
    } catch (error) {
      console.error('Failed to write image to clipboard:', error);
      throw error;
    }
  });

  ipcMain.handle('set-clipboard-bookmark', (_event, bookmarkData: { text: string; html: string; title?: string; url?: string }) => {
    try {
      // Write both text and HTML formats for maximum compatibility
      clipboard.write({
        text: bookmarkData.text,
        html: bookmarkData.html
      });
    } catch (error) {
      console.error('Failed to write bookmark to clipboard:', error);
      throw error;
    }
  });

  // Clipboard monitoring control
  ipcMain.handle('start-clipboard-monitoring', () => {
    if (clipboardCheckInterval) {
      clearInterval(clipboardCheckInterval);
    }
    clipboardCheckInterval = setInterval(checkClipboard, 500); // Check every 500ms
    return true;
  });

  ipcMain.handle('stop-clipboard-monitoring', () => {
    if (clipboardCheckInterval) {
      clearInterval(clipboardCheckInterval);
      clipboardCheckInterval = null;
    }
    return true;
  });
}

// Configure auto-updater
if (!is.dev) {
  // Only enable auto-updater in production
  autoUpdater.checkForUpdatesAndNotify()
  
  // Auto-updater events
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...')
  })
  
  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info)
  })
  
  autoUpdater.on('update-not-available', (info) => {
    console.log('Update not available:', info)
  })
  
  autoUpdater.on('error', (err) => {
    console.error('Error in auto-updater:', err)
  })
  
  autoUpdater.on('download-progress', (progressObj) => {
    console.log('Download progress:', Math.round(progressObj.percent) + '%')
  })
  
  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info)
    // Auto-install and restart
    autoUpdater.quitAndInstall()
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Auto-updater IPC handlers
  ipcMain.handle('check-for-updates', async () => {
    if (!is.dev) {
      return await autoUpdater.checkForUpdates()
    }
    return null
  })

  ipcMain.handle('download-update', async () => {
    if (!is.dev) {
      return await autoUpdater.downloadUpdate()
    }
    return null
  })

  ipcMain.handle('quit-and-install', () => {
    if (!is.dev) {
      autoUpdater.quitAndInstall()
    }
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
