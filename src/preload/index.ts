import { contextBridge } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

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
  setClipboardImage: (imageData: string) =>
    electronAPI.ipcRenderer.invoke('set-clipboard-image', imageData),
  setClipboardBookmark: (bookmarkData: any) =>
    electronAPI.ipcRenderer.invoke('set-clipboard-bookmark', bookmarkData),
  startClipboardMonitoring: () => electronAPI.ipcRenderer.invoke('start-clipboard-monitoring'),
  stopClipboardMonitoring: () => electronAPI.ipcRenderer.invoke('stop-clipboard-monitoring'),
  onClipboardChanged: (callback: (clipData: any) => void) =>
    electronAPI.ipcRenderer.on('clipboard-changed', (_event, clipData) => callback(clipData)),
  removeClipboardListeners: () => electronAPI.ipcRenderer.removeAllListeners('clipboard-changed'),

  // Settings APIs
  openSettings: (tab?: string) => electronAPI.ipcRenderer.invoke('open-settings', tab),
  closeSettings: () => electronAPI.ipcRenderer.invoke('close-settings'),
  getSettings: () => electronAPI.ipcRenderer.invoke('get-settings'),
  settingsChanged: (settings: any) => electronAPI.ipcRenderer.invoke('settings-changed', settings),
  onSettingsUpdated: (callback: (settings: any) => void) => {
    const listener = (_event: any, settings: any) => callback(settings);
    electronAPI.ipcRenderer.on('settings-updated', listener);
    // Return a cleanup function that removes only this specific listener
    return () => electronAPI.ipcRenderer.removeListener('settings-updated', listener);
  },
  removeSettingsListeners: () => electronAPI.ipcRenderer.removeAllListeners('settings-updated'),

  // Storage APIs
  storageGetClips: () => electronAPI.ipcRenderer.invoke('storage-get-clips'),
  storageSaveClips: (clips: any[], lockedIndices: Record<number, boolean>) =>
    electronAPI.ipcRenderer.invoke('storage-save-clips', clips, lockedIndices),
  storageGetSettings: () => electronAPI.ipcRenderer.invoke('storage-get-settings'),
  storageSaveSettings: (settings: any) =>
    electronAPI.ipcRenderer.invoke('storage-save-settings', settings),
  storageGetStats: () => electronAPI.ipcRenderer.invoke('storage-get-stats'),
  storageExportData: () => electronAPI.ipcRenderer.invoke('storage-export-data'),
  storageImportData: (jsonData: string) =>
    electronAPI.ipcRenderer.invoke('storage-import-data', jsonData),
  storageClearAll: () => electronAPI.ipcRenderer.invoke('storage-clear-all'),

  // Template APIs
  templatesGetAll: () => electronAPI.ipcRenderer.invoke('templates-get-all'),
  templatesCreate: (name: string, content: string) =>
    electronAPI.ipcRenderer.invoke('templates-create', name, content),
  templatesUpdate: (id: string, updates: any) =>
    electronAPI.ipcRenderer.invoke('templates-update', id, updates),
  templatesDelete: (id: string) => electronAPI.ipcRenderer.invoke('templates-delete', id),
  templatesReorder: (templates: any[]) =>
    electronAPI.ipcRenderer.invoke('templates-reorder', templates),
  templatesGenerateText: (templateId: string, clipContents: string[]) =>
    electronAPI.ipcRenderer.invoke('templates-generate-text', templateId, clipContents),

  // Quick Clips - Search Terms APIs
  searchTermsGetAll: () => electronAPI.ipcRenderer.invoke('search-terms-get-all'),
  searchTermsCreate: (name: string, pattern: string) =>
    electronAPI.ipcRenderer.invoke('search-terms-create', name, pattern),
  searchTermsUpdate: (id: string, updates: any) =>
    electronAPI.ipcRenderer.invoke('search-terms-update', id, updates),
  searchTermsDelete: (id: string) => electronAPI.ipcRenderer.invoke('search-terms-delete', id),
  searchTermsReorder: (searchTerms: any[]) =>
    electronAPI.ipcRenderer.invoke('search-terms-reorder', searchTerms),
  searchTermsTest: (pattern: string, testText: string) =>
    electronAPI.ipcRenderer.invoke('search-terms-test', pattern, testText),

  // Quick Clips - Tools APIs
  quickToolsGetAll: () => electronAPI.ipcRenderer.invoke('quick-tools-get-all'),
  quickToolsCreate: (name: string, url: string, captureGroups: string[]) =>
    electronAPI.ipcRenderer.invoke('quick-tools-create', name, url, captureGroups),
  quickToolsUpdate: (id: string, updates: any) =>
    electronAPI.ipcRenderer.invoke('quick-tools-update', id, updates),
  quickToolsDelete: (id: string) => electronAPI.ipcRenderer.invoke('quick-tools-delete', id),
  quickToolsReorder: (tools: any[]) => electronAPI.ipcRenderer.invoke('quick-tools-reorder', tools),
  quickToolsValidateUrl: (url: string, captureGroups: string[]) =>
    electronAPI.ipcRenderer.invoke('quick-tools-validate-url', url, captureGroups),

  // Quick Clips - Scanning APIs
  quickClipsScanText: (text: string) =>
    electronAPI.ipcRenderer.invoke('quick-clips-scan-text', text),
  quickClipsOpenTools: (matches: any[], toolIds: string[]) =>
    electronAPI.ipcRenderer.invoke('quick-clips-open-tools', matches, toolIds),
  quickClipsExportConfig: () => electronAPI.ipcRenderer.invoke('quick-clips-export-config'),
  quickClipsImportConfig: (config: any) =>
    electronAPI.ipcRenderer.invoke('quick-clips-import-config', config),
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = api;
}
