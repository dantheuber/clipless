import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // Auto-updater APIs
  checkForUpdates: () => electronAPI.ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => electronAPI.ipcRenderer.invoke('download-update'),
  quitAndInstall: () => electronAPI.ipcRenderer.invoke('quit-and-install'),
  
  // Clipboard APIs
  getClipboardText: () => electronAPI.ipcRenderer.invoke('get-clipboard-text'),
  getClipboardHTML: () => electronAPI.ipcRenderer.invoke('get-clipboard-html'),
  getClipboardRTF: () => electronAPI.ipcRenderer.invoke('get-clipboard-rtf'),
  getClipboardImage: () => electronAPI.ipcRenderer.invoke('get-clipboard-image'),
  getClipboardBookmark: () => electronAPI.ipcRenderer.invoke('get-clipboard-bookmark'),
  getCurrentClipboardData: () => electronAPI.ipcRenderer.invoke('get-current-clipboard-data'),
  setClipboardText: (text: string) => electronAPI.ipcRenderer.invoke('set-clipboard-text', text),
  setClipboardHTML: (html: string) => electronAPI.ipcRenderer.invoke('set-clipboard-html', html),
  setClipboardRTF: (rtf: string) => electronAPI.ipcRenderer.invoke('set-clipboard-rtf', rtf),
  setClipboardImage: (imageData: string) => electronAPI.ipcRenderer.invoke('set-clipboard-image', imageData),
  setClipboardBookmark: (bookmarkData: any) => electronAPI.ipcRenderer.invoke('set-clipboard-bookmark', bookmarkData),
  startClipboardMonitoring: () => electronAPI.ipcRenderer.invoke('start-clipboard-monitoring'),
  stopClipboardMonitoring: () => electronAPI.ipcRenderer.invoke('stop-clipboard-monitoring'),
  onClipboardChanged: (callback: (clipData: any) => void) => electronAPI.ipcRenderer.on('clipboard-changed', (_event, clipData) => callback(clipData)),
  removeClipboardListeners: () => electronAPI.ipcRenderer.removeAllListeners('clipboard-changed'),
  
  // Settings APIs
  openSettings: () => electronAPI.ipcRenderer.invoke('open-settings'),
  closeSettings: () => electronAPI.ipcRenderer.invoke('close-settings'),
  getSettings: () => electronAPI.ipcRenderer.invoke('get-settings'),
  settingsChanged: (settings: any) => electronAPI.ipcRenderer.invoke('settings-changed', settings),
  onSettingsUpdated: (callback: (settings: any) => void) => electronAPI.ipcRenderer.on('settings-updated', (_event, settings) => callback(settings)),
  removeSettingsListeners: () => electronAPI.ipcRenderer.removeAllListeners('settings-updated')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
