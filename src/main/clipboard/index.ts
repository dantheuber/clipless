import { BrowserWindow } from 'electron';
import { initializeClipboardMonitoring } from './monitoring';
import { setupClipboardIPC } from './ipc';

export * from './data';
export * from './monitoring';
export * from './storage-integration';
export * from './templates';
export * from './search-terms';
export * from './quick-tools';
export * from './quick-clips-config';

export function initializeClipboardSystem(mainWindow: BrowserWindow | null): void {
  initializeClipboardMonitoring(mainWindow);

  setupClipboardIPC(mainWindow);
}
