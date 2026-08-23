import { app } from 'electron';
import { storage } from '../storage';
import { setIsQuitting } from '../tray';

/**
 * Restart after an import that replaced everything (spec 15.5). Every queued write reaches
 * disk first, so the relaunched process reads what was just imported; the quitting flag
 * lets the main window close instead of hiding to the tray.
 */
export async function restartApp(): Promise<void> {
  await storage.flush();
  setIsQuitting(true);
  app.relaunch();
  app.quit();
}
