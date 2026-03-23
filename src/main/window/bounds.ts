import { app, BrowserWindow } from 'electron';
import { promises as fs } from 'fs';
import { join } from 'path';
import { storage } from '../storage';

let windowBounds: { x: number; y: number; width: number; height: number } | null = null;

/**
 * Load window bounds directly from window-bounds.json — no SecureStorage dependency.
 * The rememberWindowPosition setting is checked later when storage is ready.
 */
export async function loadWindowBounds(): Promise<void> {
  try {
    const dataPath = join(app.getPath('userData'), 'clipless-data');
    const boundsPath = join(dataPath, 'window-bounds.json');
    const data = await fs.readFile(boundsPath, 'utf-8');
    windowBounds = JSON.parse(data);
  } catch {
    // File doesn't exist or is invalid, no saved bounds
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

export function setWindowBounds(bounds: {
  x: number;
  y: number;
  width: number;
  height: number;
}): void {
  windowBounds = bounds;
}
