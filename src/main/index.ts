import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import icon from '../../resources/icon.png?asset'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
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
    mainWindow.show()
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
