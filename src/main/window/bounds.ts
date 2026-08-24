import { app, BrowserWindow } from 'electron';
import { promises as fs } from 'fs';
import { join } from 'path';
import { storage } from '../storage';

let windowBounds: { x: number; y: number; width: number; height: number } | null = null;

export async function loadWindowBounds(): Promise<void> {
  try {
    const dataPath = join(app.getPath('userData'), 'clipless-data');
    const boundsPath = join(dataPath, 'window-bounds.json'); // read directly: SecureStorage isn't ready yet; rememberWindowPosition is checked later once it is
    const data = await fs.readFile(boundsPath, 'utf-8');
    windowBounds = JSON.parse(data);
  } catch {
    // ignore
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
