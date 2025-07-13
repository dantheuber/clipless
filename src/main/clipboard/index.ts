import { BrowserWindow } from 'electron';
import { initializeClipboardMonitoring } from './monitoring';
import { setupClipboardIPC } from './ipc';

// Re-export all clipboard functionality
export * from './data';
export * from './monitoring';
export * from './storage-integration';
export * from './templates';
export * from './search-terms';
export * from './quick-tools';
export * from './quick-clips';
export { setupClipboardIPC } from './ipc';

// Main initialization function for clipboard functionality
export function initializeClipboardSystem(mainWindow: BrowserWindow | null): void {
  // Initialize clipboard monitoring
  initializeClipboardMonitoring(mainWindow);
  
  // Setup IPC handlers
  setupClipboardIPC(mainWindow);
}
