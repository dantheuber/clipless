import { clipboard, nativeImage, BrowserWindow, ipcMain } from 'electron'
import { storage } from './storage'
import type { ClipItem } from '../shared/types'

// Clipboard monitoring state
let lastClipboardContent = '';
let lastClipboardType = '';
let clipboardCheckInterval: NodeJS.Timeout | null = null;

// Helper function to determine the current clipboard type and content
export const getCurrentClipboardData = (): { type: string; content: string } | null => {
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

// Initialize clipboard monitoring
export function initializeClipboardMonitoring(_mainWindow: BrowserWindow | null): void {
  // Initialize with current clipboard content
  const initialClipData = getCurrentClipboardData();
  if (initialClipData) {
    lastClipboardContent = initialClipData.content;
    lastClipboardType = initialClipData.type;
  }
}

// Clipboard change detection function
export const checkClipboard = (mainWindow: BrowserWindow | null) => {
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

// Setup all clipboard-related IPC handlers
export function setupClipboardIPC(mainWindow: BrowserWindow | null): void {
  // Basic clipboard read operations
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

  // Clipboard write operations
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
    clipboardCheckInterval = setInterval(() => checkClipboard(mainWindow), 250); // Check every 250ms
    return true;
  });

  ipcMain.handle('stop-clipboard-monitoring', () => {
    if (clipboardCheckInterval) {
      clearInterval(clipboardCheckInterval);
      clipboardCheckInterval = null;
    }
    return true;
  });

  // Storage integration handlers
  ipcMain.handle('storage-get-clips', async () => {
    try {
      return await storage.getClips();
    } catch (error) {
      console.error('Failed to get clips from storage:', error);
      return [];
    }
  });

  ipcMain.handle('storage-save-clips', async (_event, clips: ClipItem[], lockedIndices: Record<number, boolean>) => {
    try {
      await storage.saveClips(clips, lockedIndices);
      return true;
    } catch (error) {
      console.error('Failed to save clips to storage:', error);
      return false;
    }
  });

  ipcMain.handle('storage-get-settings', async () => {
    try {
      return await storage.getSettings();
    } catch (error) {
      console.error('Failed to get settings from storage:', error);
      return {};
    }
  });

  ipcMain.handle('storage-save-settings', async (_event, settings: any) => {
    try {
      await storage.saveSettings(settings);
      return true;
    } catch (error) {
      console.error('Failed to save settings to storage:', error);
      return false;
    }
  });

  ipcMain.handle('storage-get-stats', async () => {
    try {
      return await storage.getStorageStats();
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return { clipCount: 0, lockedCount: 0, dataSize: 0 };
    }
  });

  ipcMain.handle('storage-export-data', async () => {
    try {
      return await storage.exportData();
    } catch (error) {
      console.error('Failed to export data:', error);
      throw error;
    }
  });

  ipcMain.handle('storage-import-data', async (_event, jsonData: string) => {
    try {
      await storage.importData(jsonData);
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      throw error;
    }
  });

  ipcMain.handle('storage-clear-all', async () => {
    try {
      await storage.clearAllData();
      return true;
    } catch (error) {
      console.error('Failed to clear all data:', error);
      return false;
    }
  });

  // Template management handlers
  ipcMain.handle('templates-get-all', async () => {
    try {
      return await storage.getTemplates();
    } catch (error) {
      console.error('Failed to get templates:', error);
      return [];
    }
  });

  ipcMain.handle('templates-create', async (_event, name: string, content: string) => {
    try {
      return await storage.createTemplate(name, content);
    } catch (error) {
      console.error('Failed to create template:', error);
      throw error;
    }
  });

  ipcMain.handle('templates-update', async (_event, id: string, updates: any) => {
    try {
      return await storage.updateTemplate(id, updates);
    } catch (error) {
      console.error('Failed to update template:', error);
      throw error;
    }
  });

  ipcMain.handle('templates-delete', async (_event, id: string) => {
    try {
      await storage.deleteTemplate(id);
    } catch (error) {
      console.error('Failed to delete template:', error);
      throw error;
    }
  });

  ipcMain.handle('templates-reorder', async (_event, templates: any[]) => {
    try {
      await storage.reorderTemplates(templates);
    } catch (error) {
      console.error('Failed to reorder templates:', error);
      throw error;
    }
  });

  ipcMain.handle('templates-generate-text', async (_event, templateId: string, clipContents: string[]) => {
    try {
      return await storage.generateTextFromTemplate(templateId, clipContents);
    } catch (error) {
      console.error('Failed to generate text from template:', error);
      throw error;
    }
  });
}
