import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { getCurrentClipboardData } from './data';
import { saveImage } from '../storage/image-store';
import { generateId } from '../storage/search-terms';

// Clipboard monitoring state
let lastClipboardContent = '';
let lastClipboardType = '';
let clipboardCheckInterval: NodeJS.Timeout | null = null;
let skipNextImageChange = false;

function getDataPath(): string {
  return join(app.getPath('userData'), 'clipless-data');
}

// Initialize clipboard monitoring
export function initializeClipboardMonitoring(_mainWindow: BrowserWindow | null): void {
  // Initialize with current clipboard content
  const initialClipData = getCurrentClipboardData();
  if (initialClipData) {
    lastClipboardContent = initialClipData.content;
    lastClipboardType = initialClipData.type;
  }
}

/**
 * Set flag to skip the next image clipboard change detection.
 * Used when copying an image clip back to the system clipboard
 * to prevent re-detecting it as a new clip.
 */
export function setSkipNextImageChange(): void {
  skipNextImageChange = true;
}

// Clipboard change detection function
export const checkClipboard = async (mainWindow: BrowserWindow | null): Promise<void> => {
  const currentClipData = getCurrentClipboardData();

  // Check if clipboard content has changed
  if (
    currentClipData &&
    (currentClipData.content !== lastClipboardContent || currentClipData.type !== lastClipboardType)
  ) {
    // Update last known values before any async work
    lastClipboardContent = currentClipData.content;
    lastClipboardType = currentClipData.type;

    // For images, check skip flag (set when copying image clip back to clipboard)
    if (currentClipData.type === 'image' && skipNextImageChange) {
      skipNextImageChange = false;
      return;
    }

    let clipToSend: Record<string, unknown> = currentClipData;

    // For images, save to image store and send thumbnail instead of full data URL
    if (currentClipData.type === 'image') {
      try {
        const imageId = generateId();
        const dataPath = getDataPath();
        const thumbnailDataUrl = await saveImage(imageId, currentClipData.content, dataPath);
        clipToSend = {
          type: 'image',
          content: imageId,
          imageId,
          thumbnailDataUrl,
        };
      } catch (error) {
        console.error('Failed to save image to image store:', error);
        // Fallback: send the full data URL inline
        clipToSend = currentClipData;
      }
    }

    // Send clipboard change to renderer (renderer will handle duplicate detection)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('clipboard-changed', clipToSend);
    }
  }
};

// Start clipboard monitoring
export function startClipboardMonitoring(mainWindow: BrowserWindow | null): boolean {
  if (clipboardCheckInterval) {
    clearInterval(clipboardCheckInterval);
  }
  clipboardCheckInterval = setInterval(() => checkClipboard(mainWindow), 250); // Check every 250ms
  return true;
}

// Stop clipboard monitoring
export function stopClipboardMonitoring(): boolean {
  if (clipboardCheckInterval) {
    clearInterval(clipboardCheckInterval);
    clipboardCheckInterval = null;
  }
  return true;
}
