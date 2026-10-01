import { app, screen, BrowserWindow } from 'electron';
import { promises as fs } from 'fs';
import { join } from 'path';
import { storage } from '../storage';
import type { UserSettings } from '../../shared/types';
import { resolveWindowPlacement, type Rect, type WindowPlacement } from './placement';

let windowBounds: Rect | null = null;

/**
 * Load window bounds directly from window-bounds.json — no SecureStorage dependency.
 * Settings are decrypted in the background after the window exists, so the
 * rememberWindowPosition setting cannot gate this read; instead the file is removed
 * whenever that setting is off (see syncWindowBoundsWithSetting), so a saved position
 * only exists while the user wants it remembered.
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

/**
 * Forget the saved position, in memory and on disk, when Remember position is off.
 * Called whenever settings are saved and once they finish loading at startup, so a
 * position saved before the setting was turned off is not restored on the next launch.
 */
export async function syncWindowBoundsWithSetting(
  settings: Pick<UserSettings, 'rememberWindowPosition'>
): Promise<void> {
  if (settings.rememberWindowPosition !== false || windowBounds === null) return;

  try {
    await storage.clearWindowBounds();
    windowBounds = null;
  } catch (error) {
    console.error('Failed to clear window bounds:', error);
  }
}

export function getWindowBounds(): Rect | null {
  return windowBounds;
}

/**
 * The bounds to open the main window with: the saved ones checked against the displays
 * attached right now, so a position left on an unplugged monitor is not reused.
 */
export function getStartupWindowBounds(): WindowPlacement | null {
  const placement = resolveWindowPlacement(
    windowBounds,
    screen.getAllDisplays(),
    screen.getPrimaryDisplay()
  );
  restoredPosition =
    placement?.x !== undefined && placement.y !== undefined
      ? { x: placement.x, y: placement.y }
      : null;
  return placement;
}

/** The saved x and y the last getStartupWindowBounds call handed out, if any. */
let restoredPosition: { x: number; y: number } | null = null;

/**
 * The window opens at the saved position before the encrypted settings can be read, so a
 * bounds file left behind by a build that did not delete it (see loadWindowBounds) still
 * places the window on the first launch with Remember position off. Once the settings are
 * in, move such a window to where it would have opened without the file: centred.
 *
 * Settings decrypt in the background, so this runs twice: from ready-to-show, where
 * storage.getSettings still returns the defaults if the load has not finished, and again
 * from the background-load callback once the persisted value is known. Whichever call
 * sees the setting off does the move. A window the user has already dragged elsewhere
 * is left where they put it.
 */
export function applyRememberPositionSetting(
  mainWindow: BrowserWindow,
  settings: Pick<UserSettings, 'rememberWindowPosition'>
): void {
  if (settings.rememberWindowPosition !== false || restoredPosition === null) return;
  const { x, y } = restoredPosition;
  restoredPosition = null;
  const [currentX, currentY] = mainWindow.getPosition();
  if (currentX !== x || currentY !== y) return;
  mainWindow.center();
}

export function setWindowBounds(bounds: Rect): void {
  windowBounds = bounds;
}
