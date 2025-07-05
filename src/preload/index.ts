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
  startClipboardMonitoring: () => electronAPI.ipcRenderer.invoke('start-clipboard-monitoring'),
  stopClipboardMonitoring: () => electronAPI.ipcRenderer.invoke('stop-clipboard-monitoring'),
  onClipboardChanged: (callback: (clipData: any) => void) => electronAPI.ipcRenderer.on('clipboard-changed', (_event, clipData) => callback(clipData)),
  removeClipboardListeners: () => electronAPI.ipcRenderer.removeAllListeners('clipboard-changed')
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
