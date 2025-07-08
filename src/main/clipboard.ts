import { clipboard, nativeImage, BrowserWindow, ipcMain } from 'electron';
import { storage } from './storage';
import type { ClipItem, PatternMatch } from '../shared/types';

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
  } catch {
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
  if (
    currentClipData &&
    (currentClipData.content !== lastClipboardContent || currentClipData.type !== lastClipboardType)
  ) {
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
    } catch {
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

  ipcMain.handle(
    'set-clipboard-bookmark',
    (_event, bookmarkData: { text: string; html: string; title?: string; url?: string }) => {
      try {
        // Write both text and HTML formats for maximum compatibility
        clipboard.write({
          text: bookmarkData.text,
          html: bookmarkData.html,
        });
      } catch (error) {
        console.error('Failed to write bookmark to clipboard:', error);
        throw error;
      }
    }
  );

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

  ipcMain.handle(
    'storage-save-clips',
    async (_event, clips: ClipItem[], lockedIndices: Record<number, boolean>) => {
      try {
        await storage.saveClips(clips, lockedIndices);
        return true;
      } catch (error) {
        console.error('Failed to save clips to storage:', error);
        return false;
      }
    }
  );

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

  ipcMain.handle(
    'templates-generate-text',
    async (_event, templateId: string, clipContents: string[]) => {
      try {
        return await storage.generateTextFromTemplate(templateId, clipContents);
      } catch (error) {
        console.error('Failed to generate text from template:', error);
        throw error;
      }
    }
  );

  // ===== SEARCH TERMS IPC HANDLERS =====

  ipcMain.handle('search-terms-get-all', async () => {
    try {
      return await storage.getSearchTerms();
    } catch (error) {
      console.error('Failed to get search terms:', error);
      throw error;
    }
  });

  ipcMain.handle('search-terms-create', async (_event, name: string, pattern: string) => {
    try {
      return await storage.createSearchTerm(name, pattern);
    } catch (error) {
      console.error('Failed to create search term:', error);
      throw error;
    }
  });

  ipcMain.handle('search-terms-update', async (_event, id: string, updates: any) => {
    try {
      return await storage.updateSearchTerm(id, updates);
    } catch (error) {
      console.error('Failed to update search term:', error);
      throw error;
    }
  });

  ipcMain.handle('search-terms-delete', async (_event, id: string) => {
    try {
      await storage.deleteSearchTerm(id);
    } catch (error) {
      console.error('Failed to delete search term:', error);
      throw error;
    }
  });

  ipcMain.handle('search-terms-reorder', async (_event, searchTerms: any[]) => {
    try {
      await storage.reorderSearchTerms(searchTerms);
    } catch (error) {
      console.error('Failed to reorder search terms:', error);
      throw error;
    }
  });

  ipcMain.handle('search-terms-test', async (_event, pattern: string, testText: string) => {
    try {
      // Test a single pattern against text
      const regex = new RegExp(pattern, 'g');
      const matches: PatternMatch[] = [];
      let match;

      while ((match = regex.exec(testText)) !== null) {
        const captures: Record<string, string> = {};

        // Extract named groups
        if (match.groups) {
          Object.entries(match.groups).forEach(([groupName, value]) => {
            if (value !== undefined && value !== null && typeof value === 'string') {
              captures[groupName] = value;
            }
          });
        }

        if (Object.keys(captures).length > 0) {
          matches.push({
            searchTermId: 'test',
            searchTermName: 'Test Pattern',
            captures,
          });
        }
      }

      return matches;
    } catch (error) {
      console.error('Failed to test search term:', error);
      throw error;
    }
  });

  // ===== QUICK TOOLS IPC HANDLERS =====

  ipcMain.handle('quick-tools-get-all', async () => {
    try {
      return await storage.getQuickTools();
    } catch (error) {
      console.error('Failed to get quick tools:', error);
      throw error;
    }
  });

  ipcMain.handle(
    'quick-tools-create',
    async (_event, name: string, url: string, captureGroups: string[]) => {
      try {
        return await storage.createQuickTool(name, url, captureGroups);
      } catch (error) {
        console.error('Failed to create quick tool:', error);
        throw error;
      }
    }
  );

  ipcMain.handle('quick-tools-update', async (_event, id: string, updates: any) => {
    try {
      return await storage.updateQuickTool(id, updates);
    } catch (error) {
      console.error('Failed to update quick tool:', error);
      throw error;
    }
  });

  ipcMain.handle('quick-tools-delete', async (_event, id: string) => {
    try {
      await storage.deleteQuickTool(id);
    } catch (error) {
      console.error('Failed to delete quick tool:', error);
      throw error;
    }
  });

  ipcMain.handle('quick-tools-reorder', async (_event, tools: any[]) => {
    try {
      await storage.reorderQuickTools(tools);
    } catch (error) {
      console.error('Failed to reorder quick tools:', error);
      throw error;
    }
  });

  ipcMain.handle(
    'quick-tools-validate-url',
    async (_event, url: string, captureGroups: string[]) => {
      try {
        const errors: string[] = [];

        // Check if URL is valid
        try {
          new URL(url.replace(/\{[^}]+\}/g, 'test')); // Replace tokens with test values
        } catch {
          errors.push('Invalid URL format');
        }

        // Check if all capture groups in URL are in the provided list
        const urlTokens = url.match(/\{([^}]+)\}/g) || [];
        const urlCaptureGroups = urlTokens.map((token) => token.slice(1, -1));

        for (const group of urlCaptureGroups) {
          if (!captureGroups.includes(group)) {
            errors.push(`Token '{${group}}' is not in the selected capture groups`);
          }
        }

        return {
          isValid: errors.length === 0,
          errors,
        };
      } catch (error) {
        console.error('Failed to validate tool URL:', error);
        throw error;
      }
    }
  );

  // ===== QUICK CLIPS SCANNING IPC HANDLERS =====

  ipcMain.handle('quick-clips-scan-text', async (_event, text: string) => {
    try {
      const searchTerms = await storage.getSearchTerms();
      const matches: PatternMatch[] = [];

      for (const searchTerm of searchTerms) {
        if (!searchTerm.enabled) continue;

        try {
          const regex = new RegExp(searchTerm.pattern, 'g');
          let match;

          while ((match = regex.exec(text)) !== null) {
            const captures: Record<string, string> = {};

            // Extract named groups
            if (match.groups) {
              Object.entries(match.groups).forEach(([groupName, value]) => {
                if (value !== undefined && value !== null && typeof value === 'string') {
                  captures[groupName] = value;
                }
              });
            }

            if (Object.keys(captures).length > 0) {
              matches.push({
                searchTermId: searchTerm.id,
                searchTermName: searchTerm.name,
                captures,
              });
            }
          }
        } catch (error) {
          console.error(`Failed to test pattern for search term ${searchTerm.name}:`, error);
          // Continue with other patterns
        }
      }

      return matches;
    } catch (error) {
      console.error('Failed to scan text:', error);
      throw error;
    }
  });

  ipcMain.handle('quick-clips-open-tools', async (_event, matches: any[], toolIds: string[]) => {
    try {
      const { shell } = require('electron');
      const tools = await storage.getQuickTools();

      for (const toolId of toolIds) {
        const tool = tools.find((t) => t.id === toolId);
        if (!tool) continue;

        // Find matches that contain capture groups needed by this tool
        const applicableMatches = matches.filter((match) =>
          tool.captureGroups.some((group) => group in match.captures)
        );

        if (applicableMatches.length === 0) continue;

        // Parse the URL to find tokens with multiple capture groups (e.g., {email|domain|phone})
        const multiTokenRegex = /\{([^}]+)\}/g;
        const urlsToOpen = new Set<string>();

        // Use the first applicable match to build the URL(s)
        const match = applicableMatches[0];

        // Find all tokens in the URL
        const tokens = [...tool.url.matchAll(multiTokenRegex)];

        if (tokens.length === 0) {
          // No tokens, just open the URL as-is
          urlsToOpen.add(tool.url);
        } else {
          // Process each token
          const tokenReplacements: Array<{ token: string; values: string[]; isUrl: boolean }> = [];

          for (const tokenMatch of tokens) {
            const fullToken = tokenMatch[0]; // e.g., "{email|domain|phone}"
            const tokenContent = tokenMatch[1]; // e.g., "email|domain|phone"
            const captureGroups = tokenContent.split('|').map((g) => g.trim());

            // Find values for this token from the matches
            const values: string[] = [];
            let isUrl = false;
            for (const group of captureGroups) {
              if (group in match.captures && match.captures[group]) {
                values.push(match.captures[group]);
                // Check if this is a URL capture group
                if (group === 'url') {
                  isUrl = true;
                }
              }
            }

            tokenReplacements.push({ token: fullToken, values, isUrl });
          }

          // Generate URLs for each combination of values
          if (tokenReplacements.every((tr) => tr.values.length > 0)) {
            // Special case: if the tool URL is just a token that captures a URL, use it directly
            if (
              tokenReplacements.length === 1 &&
              tokenReplacements[0].isUrl &&
              tool.url === tokenReplacements[0].token
            ) {
              tokenReplacements[0].values.forEach((url) => urlsToOpen.add(url));
            } else {
              // Get all combinations of values
              const generateCombinations = (replacements: typeof tokenReplacements): string[] => {
                if (replacements.length === 0) return [''];
                if (replacements.length === 1) {
                  const replacement = replacements[0];
                  return replacement.values.map((value) => {
                    // Don't encode URLs if they're being used as direct replacements for URL tokens
                    const encodedValue = replacement.isUrl ? value : encodeURIComponent(value);
                    return tool.url.replace(replacement.token, encodedValue);
                  });
                }

                // For multiple tokens, generate all combinations
                const [first, ...rest] = replacements;
                const restCombinations = generateCombinations(rest);
                const combinations: string[] = [];

                for (const value of first.values) {
                  for (const restUrl of restCombinations) {
                    // Don't encode URLs if they're being used as direct replacements for URL tokens
                    const encodedValue = first.isUrl ? value : encodeURIComponent(value);
                    const url = restUrl.replace(first.token, encodedValue);
                    combinations.push(url);
                  }
                }

                return combinations;
              };

              const combinations = generateCombinations(tokenReplacements);
              combinations.forEach((url) => urlsToOpen.add(url));
            }
          }
        }

        // Open all generated URLs
        for (const url of urlsToOpen) {
          await shell.openExternal(url);
        }
      }
    } catch (error) {
      console.error('Failed to open tools:', error);
      throw error;
    }
  });

  ipcMain.handle('quick-clips-export-config', async () => {
    try {
      const searchTerms = await storage.getSearchTerms();
      const tools = await storage.getQuickTools();

      return {
        searchTerms,
        tools,
        version: '1.0.0',
      };
    } catch (error) {
      console.error('Failed to export quick clips config:', error);
      throw error;
    }
  });

  ipcMain.handle('quick-clips-import-config', async (_event, config: any) => {
    try {
      // Use the new batch import method to avoid race conditions
      await storage.importQuickClipsConfig(config);
    } catch (error) {
      console.error('Failed to import quick clips config:', error);
      throw error;
    }
  });
}
