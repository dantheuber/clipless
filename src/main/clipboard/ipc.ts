import { ipcMain, BrowserWindow } from 'electron';
import {
  getCurrentClipboardData,
  setClipboardText,
  setClipboardHTML,
  setClipboardRTF,
  setClipboardImage,
  setClipboardBookmark,
} from './data';
import {
  startClipboardMonitoring,
  stopClipboardMonitoring,
  setSkipNextImageChange,
} from './monitoring';
import {
  getClipsSnapshot,
  saveClips,
  getSettings,
  saveSettings,
  getStorageStats,
  exportData,
  importData,
  clearAllData,
} from './storage-integration';
import { applyAutoStart, getAutoStartState } from '../autoStart';
import {
  getAllTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  reorderTemplates,
} from './templates';
import {
  getAllSearchTerms,
  createSearchTerm,
  updateSearchTerm,
  deleteSearchTerm,
} from './search-terms';
import { getAllQuickTools, createQuickTool, updateQuickTool, deleteQuickTool } from './quick-tools';
import { exportQuickClipsConfig, importQuickClipsConfig } from './quick-clips-config';
import { openExternalUrls } from './open-external';
import type {
  ClipItem,
  UserSettings,
  Template,
  SearchTerm,
  QuickTool,
  QuickClipsConfig,
  QuickClipsImportMode,
  GroupColours,
} from '../../shared/types';
import { loadImage } from '../storage/image-store';
import { storage } from '../storage';
import { sanitizeHtml } from './sanitize-html';

let ipcHandlersRegistered = false; // Guard to prevent multiple IPC registrations

/**
 * Tell every window a search term, tool, template or group colour changed, so the clips
 * window's scan cache can clear. Wraps a handler so the broadcast follows its write.
 */
function broadcastConfigChanged(): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send('quick-clips-config-changed');
    }
  }
}

function thenBroadcast<T>(work: () => Promise<T>): Promise<T> {
  return work().then((result) => {
    broadcastConfigChanged();
    return result;
  });
}

// Setup all clipboard-related IPC handlers
export function setupClipboardIPC(mainWindow: BrowserWindow | null): void {
  // Prevent multiple registrations of IPC handlers
  if (ipcHandlersRegistered) {
    console.log('Clipboard IPC handlers already registered, skipping...');
    return;
  }

  // Get current clipboard data using same prioritization as monitoring
  ipcMain.handle('get-current-clipboard-data', () => getCurrentClipboardData());

  // Clipboard write operations
  ipcMain.handle('set-clipboard-text', (_event, text: string) => setClipboardText(text));
  ipcMain.handle('set-clipboard-html', (_event, html: string) => setClipboardHTML(html));
  ipcMain.handle('set-clipboard-rtf', (_event, rtf: string) => setClipboardRTF(rtf));
  ipcMain.handle('set-clipboard-image', (_event, imageData: string) => {
    setSkipNextImageChange();
    return setClipboardImage(imageData);
  });
  ipcMain.handle(
    'set-clipboard-bookmark',
    (_event, bookmarkData: { text: string; html: string; title?: string; url?: string }) =>
      setClipboardBookmark(bookmarkData)
  );

  // Clipboard monitoring control
  ipcMain.handle('start-clipboard-monitoring', () => startClipboardMonitoring(mainWindow));
  ipcMain.handle('stop-clipboard-monitoring', () => stopClipboardMonitoring());

  // Storage integration handlers
  ipcMain.handle('storage-get-clips-snapshot', async () => getClipsSnapshot());
  ipcMain.handle(
    'storage-save-clips',
    async (_event, clips: ClipItem[], lockedIndices: Record<number, boolean>) =>
      saveClips(clips, lockedIndices)
  );
  ipcMain.handle('storage-get-settings', async () => getSettings());
  ipcMain.handle('storage-save-settings', async (_event, settings: UserSettings) => {
    const result = await saveSettings(settings);
    applyAutoStart(settings.autoStart);
    return result;
  });
  // Actual OS login-item state, so the renderer can reflect reality rather than
  // only the persisted preference. Returns null when not OS-managed (Linux/dev).
  ipcMain.handle('auto-start-get-state', async () => getAutoStartState());
  ipcMain.handle('storage-get-stats', async () => getStorageStats());
  ipcMain.handle('storage-export-data', async () => exportData());
  ipcMain.handle('storage-import-data', async (_event, jsonData: string) => importData(jsonData));
  ipcMain.handle('storage-clear-all', async () => clearAllData());

  // Rendered view of an html clip: sanitised here, shown only in a sandboxed iframe.
  // Called when the user switches to the rendered view, never at capture.
  ipcMain.handle('html-sanitize', (_event, html: string) => sanitizeHtml(html));

  // Image storage handler - load full image on demand
  ipcMain.handle('get-full-image', async (_event, imageId: string) => {
    try {
      const { app } = await import('electron');
      const { join } = await import('path');
      const dataPath = join(app.getPath('userData'), 'clipless-data');
      return await loadImage(imageId, dataPath);
    } catch (error) {
      console.error('Failed to load full image:', error);
      return null;
    }
  });

  // Template management handlers
  ipcMain.handle('templates-get-all', async () => getAllTemplates());
  ipcMain.handle('templates-create', async (_event, name: string, content: string) =>
    thenBroadcast(() => createTemplate(name, content))
  );
  ipcMain.handle('templates-update', async (_event, id: string, updates: Partial<Template>) =>
    thenBroadcast(() => updateTemplate(id, updates))
  );
  ipcMain.handle('templates-delete', async (_event, id: string) =>
    thenBroadcast(() => deleteTemplate(id))
  );
  ipcMain.handle('templates-reorder', async (_event, templates: Template[]) =>
    thenBroadcast(() => reorderTemplates(templates))
  );

  // Search terms IPC handlers
  ipcMain.handle('search-terms-get-all', async () => getAllSearchTerms());
  ipcMain.handle('search-terms-create', async (_event, name: string, pattern: string) =>
    thenBroadcast(() => createSearchTerm(name, pattern))
  );
  ipcMain.handle('search-terms-update', async (_event, id: string, updates: Partial<SearchTerm>) =>
    thenBroadcast(() => updateSearchTerm(id, updates))
  );
  ipcMain.handle('search-terms-delete', async (_event, id: string) =>
    thenBroadcast(() => deleteSearchTerm(id))
  );

  // Quick tools IPC handlers
  ipcMain.handle('quick-tools-get-all', async () => getAllQuickTools());
  ipcMain.handle(
    'quick-tools-create',
    async (_event, name: string, url: string, captureGroups: string[]) =>
      thenBroadcast(() => createQuickTool(name, url, captureGroups))
  );
  ipcMain.handle('quick-tools-update', async (_event, id: string, updates: Partial<QuickTool>) =>
    thenBroadcast(() => updateQuickTool(id, updates))
  );
  ipcMain.handle('quick-tools-delete', async (_event, id: string) =>
    thenBroadcast(() => deleteQuickTool(id))
  );

  // Tabs from the tray and the reader: http and https only, in order (spec 17.3)
  ipcMain.handle('open-external-urls', async (_event, urls: string[]) => openExternalUrls(urls));
  ipcMain.handle('quick-clips-export-config', async () => exportQuickClipsConfig());
  ipcMain.handle(
    'quick-clips-import-config',
    async (_event, args: { config: QuickClipsConfig; mode?: QuickClipsImportMode }) =>
      thenBroadcast(() => importQuickClipsConfig(args.config, args.mode ?? 'merge'))
  );

  // Group colours: a slot index per capture group, stored beside the search terms
  ipcMain.handle('group-colours-get', async () => storage.getGroupColours());
  ipcMain.handle('group-colours-set', async (_event, groupColours: GroupColours) =>
    thenBroadcast(() => storage.setGroupColours(groupColours))
  );

  // Mark IPC handlers as registered
  ipcHandlersRegistered = true;
  console.log('Clipboard IPC handlers registered successfully');
}
