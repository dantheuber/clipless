import { contextBridge } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import type {
  BookmarkData,
  ClipItem,
  UserSettings,
  HotkeySettings,
  StoredClip,
  Template,
  SearchTerm,
  QuickTool,
  QuickClipsConfig,
  QuickClipsImportMode,
  GroupColours,
  UpdateState,
  SettingsApplyResult,
  AppPathName,
} from '../shared/types';

/**
 * Every on* method returns a function that removes only its own listener, so two
 * subscribers to one channel never remove each other.
 */
function subscribe<Args extends unknown[]>(
  channel: string,
  handler: (...args: Args) => void
): () => void {
  const listener = (_event: Electron.IpcRendererEvent, ...args: unknown[]) =>
    handler(...(args as Args));
  electronAPI.ipcRenderer.on(channel, listener);
  return () => electronAPI.ipcRenderer.removeListener(channel, listener);
}

// Custom APIs for renderer
const api = {
  // Platform info
  platform: process.platform,
  arch: process.arch,

  // Auto-updater APIs
  checkForUpdates: () => electronAPI.ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => electronAPI.ipcRenderer.invoke('download-update'),
  quitAndInstall: () => electronAPI.ipcRenderer.invoke('quit-and-install'),
  getUpdateState: (): Promise<UpdateState> => electronAPI.ipcRenderer.invoke('get-update-state'),
  onUpdateState: (callback: (state: UpdateState) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: UpdateState) => callback(state);
    electronAPI.ipcRenderer.on('update-state', listener);
    return () => electronAPI.ipcRenderer.removeListener('update-state', listener);
  },

  // Clipboard APIs
  getCurrentClipboardData: () => electronAPI.ipcRenderer.invoke('get-current-clipboard-data'),
  setClipboardText: (text: string) => electronAPI.ipcRenderer.invoke('set-clipboard-text', text),
  setClipboardHTML: (html: string) => electronAPI.ipcRenderer.invoke('set-clipboard-html', html),
  setClipboardRTF: (rtf: string) => electronAPI.ipcRenderer.invoke('set-clipboard-rtf', rtf),
  setClipboardImage: (imageData: string) =>
    electronAPI.ipcRenderer.invoke('set-clipboard-image', imageData),
  setClipboardBookmark: (bookmarkData: BookmarkData) =>
    electronAPI.ipcRenderer.invoke('set-clipboard-bookmark', bookmarkData),
  getFullImage: (imageId: string) => electronAPI.ipcRenderer.invoke('get-full-image', imageId),
  htmlSanitize: (html: string): Promise<{ html: string; removed: Record<string, number> }> =>
    electronAPI.ipcRenderer.invoke('html-sanitize', html),
  startClipboardMonitoring: () => electronAPI.ipcRenderer.invoke('start-clipboard-monitoring'),
  stopClipboardMonitoring: () => electronAPI.ipcRenderer.invoke('stop-clipboard-monitoring'),
  onClipboardChanged: (callback: (clipData: ClipItem) => void) =>
    subscribe('clipboard-changed', (clipData: ClipItem) => callback(clipData)),
  onHotkeyClipCopied: (callback: (clipIndex: number) => void) =>
    subscribe('hotkey-clip-copied', (clipIndex: number) => callback(clipIndex)),

  // Settings APIs
  openSettings: (tab?: string) => electronAPI.ipcRenderer.invoke('open-settings', tab),
  getAutoStartState: (): Promise<boolean | null> =>
    electronAPI.ipcRenderer.invoke('auto-start-get-state'),
  settingsChanged: (settings: UserSettings): Promise<SettingsApplyResult> =>
    electronAPI.ipcRenderer.invoke('settings-changed', settings),
  // Import with replace restarts the app after the save queue drains (spec 15.5)
  restartApp: (): Promise<void> => electronAPI.ipcRenderer.invoke('app-restart'),
  // The About panel's folder links; resolves to the shell's error text, empty on success
  openAppPath: (name: AppPathName): Promise<string> =>
    electronAPI.ipcRenderer.invoke('open-app-path', name),
  onSettingsUpdated: (callback: (settings: UserSettings) => void) =>
    subscribe('settings-updated', (settings: UserSettings) => callback(settings)),
  hotkeysGetDefaults: (): Promise<HotkeySettings> =>
    electronAPI.ipcRenderer.invoke('hotkeys-get-defaults'),

  // Storage APIs
  onStorageReady: (callback: () => void) => subscribe('storage-ready', () => callback()),
  storageGetClips: () => electronAPI.ipcRenderer.invoke('storage-get-clips'),
  storageSaveClips: (clips: StoredClip[], lockedIndices: Record<number, boolean>) =>
    electronAPI.ipcRenderer.invoke('storage-save-clips', clips, lockedIndices),
  storageGetSettings: () => electronAPI.ipcRenderer.invoke('storage-get-settings'),
  storageSaveSettings: (settings: UserSettings) =>
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
  templatesUpdate: (id: string, updates: Partial<Template>) =>
    electronAPI.ipcRenderer.invoke('templates-update', id, updates),
  templatesDelete: (id: string) => electronAPI.ipcRenderer.invoke('templates-delete', id),
  templatesReorder: (templates: Template[]) =>
    electronAPI.ipcRenderer.invoke('templates-reorder', templates),

  // Quick Clips - Search Terms APIs
  searchTermsGetAll: () => electronAPI.ipcRenderer.invoke('search-terms-get-all'),
  searchTermsCreate: (name: string, pattern: string) =>
    electronAPI.ipcRenderer.invoke('search-terms-create', name, pattern),
  searchTermsUpdate: (id: string, updates: Partial<SearchTerm>) =>
    electronAPI.ipcRenderer.invoke('search-terms-update', id, updates),
  searchTermsDelete: (id: string) => electronAPI.ipcRenderer.invoke('search-terms-delete', id),

  // Quick Clips - Tools APIs
  quickToolsGetAll: () => electronAPI.ipcRenderer.invoke('quick-tools-get-all'),
  quickToolsCreate: (name: string, url: string, captureGroups: string[]) =>
    electronAPI.ipcRenderer.invoke('quick-tools-create', name, url, captureGroups),
  quickToolsUpdate: (id: string, updates: Partial<QuickTool>) =>
    electronAPI.ipcRenderer.invoke('quick-tools-update', id, updates),
  quickToolsDelete: (id: string) => electronAPI.ipcRenderer.invoke('quick-tools-delete', id),

  // Tabs from the tray and the reader: http and https only, opened in order (spec 17.3)
  openExternalUrls: (urls: string[]): Promise<number> =>
    electronAPI.ipcRenderer.invoke('open-external-urls', urls),
  quickClipsExportConfig: (): Promise<QuickClipsConfig> =>
    electronAPI.ipcRenderer.invoke('quick-clips-export-config'),
  quickClipsImportConfig: (config: QuickClipsConfig, mode: QuickClipsImportMode = 'merge') =>
    electronAPI.ipcRenderer.invoke('quick-clips-import-config', { config, mode }),
  onQuickClipsConfigChanged: (callback: () => void) => {
    const listener = () => callback();
    electronAPI.ipcRenderer.on('quick-clips-config-changed', listener);
    return () => electronAPI.ipcRenderer.removeListener('quick-clips-config-changed', listener);
  },

  // Group colours
  groupColoursGet: (): Promise<GroupColours> => electronAPI.ipcRenderer.invoke('group-colours-get'),
  groupColoursSet: (groupColours: GroupColours): Promise<GroupColours> =>
    electronAPI.ipcRenderer.invoke('group-colours-set', groupColours),
  // Tools Launcher Window APIs
  openToolsLauncher: (clipContent: string) =>
    electronAPI.ipcRenderer.invoke('open-tools-launcher', clipContent),
  closeToolsLauncher: () => electronAPI.ipcRenderer.invoke('close-tools-launcher'),
  toolsLauncherReady: () => electronAPI.ipcRenderer.invoke('tools-launcher-ready'),
  onToolsLauncherInitialize: (callback: (clipContent: string) => void) =>
    subscribe('tools-launcher-initialize', (clipContent: string) => callback(clipContent)),
  onToggleSearch: (callback: () => void) => subscribe('toggle-search', () => callback()),
  // The quick look hotkey; pending says a clipboard change is on its way (spec 17.3)
  onOpenQuickLook: (callback: (payload: { pending: boolean }) => void) =>
    subscribe('open-quick-look', (payload: { pending: boolean }) => callback(payload)),
  removeAllListeners: (channel: string) => electronAPI.ipcRenderer.removeAllListeners(channel),
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
