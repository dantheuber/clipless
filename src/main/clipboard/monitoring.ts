import { app, BrowserWindow, nativeImage } from 'electron';
import { join } from 'path';
import { getCurrentClipboardData, imageDataUrlFingerprint } from './data';
import { saveImage } from '../storage/image-store';
import { generateId } from '../storage/search-terms';
import { htmlToText } from './extract-html';
import { rtfToText } from './extract-rtf';

// Clipboard monitoring state
let lastClipboardContent = '';
let lastClipboardType = '';
let clipboardCheckInterval: NodeJS.Timeout | null = null;
/**
 * The image most recently written back to the clipboard by this app, armed until the next
 * poll. Only an image change that matches it is skipped, and the next poll clears it whether
 * or not it matched, so a no-op write (the image was already on the clipboard) or a text
 * fallback can never leave a skip armed that would swallow the next real screenshot.
 */
let pendingImageSkip: { dataUrl: string; fingerprint: string } | null = null;
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

/** For html and rtf, extract the text here so the renderer never parses markup. */
function withExtractedText(data: { type: string; content: string }): Record<string, unknown> {
  if (data.type === 'html') return { ...data, text: htmlToText(data.content) };
  if (data.type === 'rtf') return { ...data, text: rtfToText(data.content) };
  return data;
}

/**
 * The clipboard as the renderer's startup read sees it: the same text extraction as a
 * monitored change, since that clip now reaches the stored history.
 */
export function readClipboardForRenderer(): Record<string, unknown> | null {
  const data = getCurrentClipboardData();
  return data && withExtractedText(data);
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
 * Skip the image change the next poll sees if it is `dataUrl`, the image being copied back
 * to the system clipboard, so it is not re-detected as a new clip. Call this right before
 * the write. The skip lasts one poll: any other outcome of that poll discards it.
 */
export function setSkipNextImageChange(dataUrl: string): void {
  pendingImageSkip = { dataUrl, fingerprint: imageDataUrlFingerprint(dataUrl) };
}

/** Whether an image now on the clipboard is the one a pending skip was armed for. */
function matchesPendingSkip(
  skip: { dataUrl: string; fingerprint: string },
  content: string
): boolean {
  return skip.dataUrl === content || skip.fingerprint === imageDataUrlFingerprint(content);
}

/**
 * Run the poll body once. Returns true when a change was sent to the renderer. The quick
 * look hotkey calls this so a fresh copy reaches the renderer before the reader opens.
 */
export const checkClipboard = async (mainWindow: BrowserWindow | null): Promise<boolean> => {
  const currentClipData = getCurrentClipboardData();
  // The pending skip applies to this poll only, whatever it finds
  const imageSkip = pendingImageSkip;
  pendingImageSkip = null;

  // Check if clipboard content has changed
  if (
    currentClipData &&
    (currentClipData.content !== lastClipboardContent || currentClipData.type !== lastClipboardType)
  ) {
    // Update last known values before any async work
    lastClipboardContent = currentClipData.content;
    lastClipboardType = currentClipData.type;

    // Skip the image this app just copied back to the clipboard (and only that image)
    if (
      currentClipData.type === 'image' &&
      imageSkip &&
      matchesPendingSkip(imageSkip, currentClipData.content)
    ) {
      return false;
    }

    let clipToSend = withExtractedText(currentClipData);

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
