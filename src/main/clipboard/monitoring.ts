import { BrowserWindow } from 'electron';
import { getCurrentClipboardData } from './data';

// Clipboard monitoring state
let lastClipboardContent = '';
let lastClipboardType = '';
let clipboardCheckInterval: NodeJS.Timeout | null = null;

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
