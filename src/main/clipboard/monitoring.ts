import { app, BrowserWindow, nativeImage } from 'electron';
import { join } from 'path';
import { getCurrentClipboardData } from './data';
import { saveImage } from '../storage/image-store';
import { generateId } from '../storage/search-terms';
import { htmlToText } from './extract-html';
import { rtfToText } from './extract-rtf';

// Clipboard monitoring state
let lastClipboardContent = '';
let lastClipboardType = '';
let clipboardCheckInterval: NodeJS.Timeout | null = null;
let skipNextImageChange = false;
let monitoredWindow: BrowserWindow | null = null;

function getDataPath(): string {
  return join(app.getPath('userData'), 'clipless-data');
}

/**
 * Pixel size and byte size of a captured image, recorded with the clip so the row and the
 * reader can say "1280 x 720, 412 KB" without loading the full image (spec 16 rule 6).
 */
export function imageMetadata(dataUrl: string): {
  imageWidth: number;
  imageHeight: number;
  imageBytes: number;
} {
  const { width, height } = nativeImage.createFromDataURL(dataUrl).getSize();
  const comma = dataUrl.indexOf(',');
  const payload = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return { imageWidth: width, imageHeight: height, imageBytes: Math.round(payload.length * 0.75) };
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

/**
 * Run the poll body once. Returns true when a change was sent to the renderer. The quick
 * look hotkey calls this so a fresh copy reaches the renderer before the reader opens.
 */
export const checkClipboard = async (mainWindow: BrowserWindow | null): Promise<boolean> => {
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
      return false;
    }

    let clipToSend: Record<string, unknown> = currentClipData;

    // For html and rtf, extract the text here so the renderer never parses markup
    if (currentClipData.type === 'html') {
      clipToSend = { ...currentClipData, text: htmlToText(currentClipData.content) };
    } else if (currentClipData.type === 'rtf') {
      clipToSend = { ...currentClipData, text: rtfToText(currentClipData.content) };
    }

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
          ...imageMetadata(currentClipData.content),
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
      return true;
    }
  }
  return false;
};

/**
 * Check the clipboard now, outside the poll, against the window being monitored.
 */
export function checkClipboardNow(): Promise<boolean> {
  return checkClipboard(monitoredWindow);
}

// Start clipboard monitoring
export function startClipboardMonitoring(mainWindow: BrowserWindow | null): boolean {
  if (clipboardCheckInterval) {
    clearInterval(clipboardCheckInterval);
  }
  monitoredWindow = mainWindow;
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
