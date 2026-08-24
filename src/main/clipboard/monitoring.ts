import { app, BrowserWindow, nativeImage } from 'electron';
import { join } from 'path';
import { getCurrentClipboardData } from './data';
import { saveImage } from '../storage/image-store';
import { generateId } from '../storage/search-terms';
import { htmlToText } from './extract-html';
import { rtfToText } from './extract-rtf';

let lastClipboardContent = '';
let lastClipboardType = '';
let clipboardCheckInterval: NodeJS.Timeout | null = null;
let skipNextImageChange = false;
let monitoredWindow: BrowserWindow | null = null;

function getDataPath(): string {
  return join(app.getPath('userData'), 'clipless-data');
}

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

export function initializeClipboardMonitoring(_mainWindow: BrowserWindow | null): void {
  const initialClipData = getCurrentClipboardData();
  if (initialClipData) {
    lastClipboardContent = initialClipData.content;
    lastClipboardType = initialClipData.type;
  }
}

export function setSkipNextImageChange(): void {
  skipNextImageChange = true;
}

export const checkClipboard = async (mainWindow: BrowserWindow | null): Promise<boolean> => {
  const currentClipData = getCurrentClipboardData();

  if (
    currentClipData &&
    (currentClipData.content !== lastClipboardContent || currentClipData.type !== lastClipboardType)
  ) {
    lastClipboardContent = currentClipData.content;
    lastClipboardType = currentClipData.type;

    if (currentClipData.type === 'image' && skipNextImageChange) {
      skipNextImageChange = false;
      return false;
    }

    let clipToSend: Record<string, unknown> = currentClipData;

    if (currentClipData.type === 'html') {
      clipToSend = { ...currentClipData, text: htmlToText(currentClipData.content) };
    } else if (currentClipData.type === 'rtf') {
      clipToSend = { ...currentClipData, text: rtfToText(currentClipData.content) };
    }

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
        clipToSend = currentClipData;
      }
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('clipboard-changed', clipToSend);
      return true;
    }
  }
  return false;
};

export function checkClipboardNow(): Promise<boolean> {
  return checkClipboard(monitoredWindow);
}

export function startClipboardMonitoring(mainWindow: BrowserWindow | null): boolean {
  if (clipboardCheckInterval) {
    clearInterval(clipboardCheckInterval);
  }
  monitoredWindow = mainWindow;
  clipboardCheckInterval = setInterval(() => checkClipboard(mainWindow), 250);
  return true;
}

export function stopClipboardMonitoring(): boolean {
  if (clipboardCheckInterval) {
    clearInterval(clipboardCheckInterval);
    clipboardCheckInterval = null;
  }
  return true;
}
