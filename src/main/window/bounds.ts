import { BrowserWindow } from 'electron';
import { storage } from '../storage';

let windowBounds: { x: number; y: number; width: number; height: number } | null = null;

export async function loadWindowBounds(): Promise<void> {
  try {
    const settings = await storage.getSettings();
    if (settings.rememberWindowPosition) {
      const bounds = await storage.getWindowBounds();
      if (bounds) {
        windowBounds = bounds;
      }
    }
  } catch (error) {
    console.error('Failed to load window bounds:', error);
  }
}

export async function saveWindowBounds(mainWindow: BrowserWindow): Promise<void> {
  if (!mainWindow) return;

  try {
    const settings = await storage.getSettings();
    if (settings.rememberWindowPosition) {
      const bounds = mainWindow.getBounds();
      windowBounds = bounds;
      await storage.saveWindowBounds(bounds);
    }
  } catch (error) {
    console.error('Failed to save window bounds:', error);
  }
}

export function getWindowBounds(): { x: number; y: number; width: number; height: number } | null {
  return windowBounds;
}

export function setWindowBounds(bounds: { x: number; y: number; width: number; height: number }): void {
  windowBounds = bounds;
}
