import { app } from 'electron';
import { storage } from '../storage';
import { setIsQuitting } from '../tray';

export async function restartApp(): Promise<void> {
  await storage.flush(); // restart follows an import that replaced everything (spec 15.5): every queued write reaches disk first, so the relaunched process reads what was just imported
  setIsQuitting(true); // lets the main window close instead of hiding to the tray
  app.relaunch();
  app.quit();
}
