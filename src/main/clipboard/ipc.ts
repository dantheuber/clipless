import { ipcMain, BrowserWindow } from 'electron';
import {
  getCurrentClipboardData,
  getClipboardText,
  getClipboardHTML,
  getClipboardRTF,
  getClipboardImage,
  getClipboardBookmark,
  setClipboardText,
  setClipboardHTML,
  setClipboardRTF,
  setClipboardImage,
  setClipboardBookmark,
} from './data';
import { startClipboardMonitoring, stopClipboardMonitoring } from './monitoring';
import {
  getClips,
  saveClips,
  getSettings,
  saveSettings,
  getStorageStats,
  exportData,
  importData,
  clearAllData,
} from './storage-integration';
import {
  getAllTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  reorderTemplates,
  generateTextFromTemplate,
} from './templates';
import {
  getAllSearchTerms,
  createSearchTerm,
  updateSearchTerm,
  deleteSearchTerm,
  reorderSearchTerms,
  testSearchTerm,
} from './search-terms';
import {
  getAllQuickTools,
  createQuickTool,
  updateQuickTool,
  deleteQuickTool,
  reorderQuickTools,
  validateToolUrl,
} from './quick-tools';
import {
  scanTextForPatterns,
  openToolsForMatches,
  exportQuickClipsConfig,
  importQuickClipsConfig,
} from './quick-clips';
import type { ClipItem } from '../../shared/types';
import { showNotification } from '../notifications';

let ipcHandlersRegistered = false; // Guard to prevent multiple IPC registrations

// Setup all clipboard-related IPC handlers
export function setupClipboardIPC(mainWindow: BrowserWindow | null): void {
  // Prevent multiple registrations of IPC handlers
  if (ipcHandlersRegistered) {
    console.log('Clipboard IPC handlers already registered, skipping...');
    return;
  }

  // Basic clipboard read operations
  ipcMain.handle('get-clipboard-text', () => getClipboardText());
  ipcMain.handle('get-clipboard-html', () => getClipboardHTML());
  ipcMain.handle('get-clipboard-rtf', () => getClipboardRTF());
  ipcMain.handle('get-clipboard-image', () => getClipboardImage());
  ipcMain.handle('get-clipboard-bookmark', () => getClipboardBookmark());

  // Get current clipboard data using same prioritization as monitoring
  ipcMain.handle('get-current-clipboard-data', () => getCurrentClipboardData());

  // Clipboard write operations
  ipcMain.handle('set-clipboard-text', (_event, text: string) => setClipboardText(text));
  ipcMain.handle('set-clipboard-html', (_event, html: string) => setClipboardHTML(html));
  ipcMain.handle('set-clipboard-rtf', (_event, rtf: string) => setClipboardRTF(rtf));
  ipcMain.handle('set-clipboard-image', (_event, imageData: string) =>
    setClipboardImage(imageData)
  );
  ipcMain.handle(
    'set-clipboard-bookmark',
    (_event, bookmarkData: { text: string; html: string; title?: string; url?: string }) =>
      setClipboardBookmark(bookmarkData)
  );

  // Notification for click-to-copy with clip index
  ipcMain.handle('notify-clip-copied', (_event, index: number) => {
    showNotification('Clip Copied', `Clip ${index + 1} copied to clipboard`);
  });

  // Clipboard monitoring control
  ipcMain.handle('start-clipboard-monitoring', () => startClipboardMonitoring(mainWindow));
  ipcMain.handle('stop-clipboard-monitoring', () => stopClipboardMonitoring());

  // Storage integration handlers
  ipcMain.handle('storage-get-clips', async () => getClips());
  ipcMain.handle(
    'storage-save-clips',
    async (_event, clips: ClipItem[], lockedIndices: Record<number, boolean>) =>
      saveClips(clips, lockedIndices)
  );
  ipcMain.handle('storage-get-settings', async () => getSettings());
  ipcMain.handle('storage-save-settings', async (_event, settings: any) => saveSettings(settings));
  ipcMain.handle('storage-get-stats', async () => getStorageStats());
  ipcMain.handle('storage-export-data', async () => exportData());
  ipcMain.handle('storage-import-data', async (_event, jsonData: string) => importData(jsonData));
  ipcMain.handle('storage-clear-all', async () => clearAllData());

  // Template management handlers
  ipcMain.handle('templates-get-all', async () => getAllTemplates());
  ipcMain.handle('templates-create', async (_event, name: string, content: string) =>
    createTemplate(name, content)
  );
  ipcMain.handle('templates-update', async (_event, id: string, updates: any) =>
    updateTemplate(id, updates)
  );
  ipcMain.handle('templates-delete', async (_event, id: string) => deleteTemplate(id));
  ipcMain.handle('templates-reorder', async (_event, templates: any[]) =>
    reorderTemplates(templates)
  );
  ipcMain.handle(
    'templates-generate-text',
    async (_event, templateId: string, clipContents: string[], captures?: Record<string, string>) => {
      const templates = await getAllTemplates();
      const template = templates.find((t: any) => t.id === templateId);
      const templateName = template?.name || 'Unknown';
      const result = await generateTextFromTemplate(templateId, clipContents, captures);
      showNotification('Template Generated', `"${templateName}" text copied to clipboard`);
      return result;
    }
  );

  // Search terms IPC handlers
  ipcMain.handle('search-terms-get-all', async () => getAllSearchTerms());
  ipcMain.handle('search-terms-create', async (_event, name: string, pattern: string) =>
    createSearchTerm(name, pattern)
  );
  ipcMain.handle('search-terms-update', async (_event, id: string, updates: any) =>
    updateSearchTerm(id, updates)
  );
  ipcMain.handle('search-terms-delete', async (_event, id: string) => deleteSearchTerm(id));
  ipcMain.handle('search-terms-reorder', async (_event, searchTerms: any[]) =>
    reorderSearchTerms(searchTerms)
  );
  ipcMain.handle('search-terms-test', async (_event, pattern: string, testText: string) =>
    testSearchTerm(pattern, testText)
  );

  // Quick tools IPC handlers
  ipcMain.handle('quick-tools-get-all', async () => getAllQuickTools());
  ipcMain.handle(
    'quick-tools-create',
    async (_event, name: string, url: string, captureGroups: string[]) =>
      createQuickTool(name, url, captureGroups)
  );
  ipcMain.handle('quick-tools-update', async (_event, id: string, updates: any) =>
    updateQuickTool(id, updates)
  );
  ipcMain.handle('quick-tools-delete', async (_event, id: string) => deleteQuickTool(id));
  ipcMain.handle('quick-tools-reorder', async (_event, tools: any[]) => reorderQuickTools(tools));
  ipcMain.handle('quick-tools-validate-url', async (_event, url: string, captureGroups: string[]) =>
    validateToolUrl(url, captureGroups)
  );

  // Quick clips scanning IPC handlers
  ipcMain.handle('quick-clips-scan-text', async (_event, text: string) =>
    scanTextForPatterns(text)
  );
  ipcMain.handle('quick-clips-open-tools', async (_event, matches: any[], toolIds: string[]) =>
    openToolsForMatches(matches, toolIds)
  );
  ipcMain.handle('quick-clips-export-config', async () => exportQuickClipsConfig());
  ipcMain.handle('quick-clips-import-config', async (_event, config: any) =>
    importQuickClipsConfig(config)
  );

  // Mark IPC handlers as registered
  ipcHandlersRegistered = true;
  console.log('Clipboard IPC handlers registered successfully');
}
