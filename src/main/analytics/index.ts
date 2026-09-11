import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'node:path';
import { UsageAnalytics } from './client';

let analytics: UsageAnalytics | undefined;

export function recordAppActivity(): void {
  void analytics?.recordActivity();
}

export function initializeAnalytics(): void {
  analytics = new UsageAnalytics(
    join(app.getPath('userData'), 'usage-analytics.json'),
    __POSTHOG_PROJECT_TOKEN__,
    __POSTHOG_REGION__,
    app.isPackaged
  );
  ipcMain.handle('analytics-preference', () => analytics!.preference());
  ipcMain.handle('analytics-set-enabled', async (_event, enabled: boolean) => {
    await analytics!.setEnabled(enabled);
    // Choosing to participate is itself an interaction with Clipless.
    if (enabled) recordAppActivity();
    return analytics!.preference();
  });
  const watch = (window: BrowserWindow): void => {
    window.on('focus', recordAppActivity);
    // Deliberately ignore every argument, including key text and mouse coordinates.
    window.webContents.on('before-input-event', recordAppActivity);
    window.webContents.on('before-mouse-event', recordAppActivity);
  };
  BrowserWindow.getAllWindows().forEach(watch);
  app.on('browser-window-created', (_event, window) => watch(window));
  if (BrowserWindow.getFocusedWindow()) recordAppActivity();
  app.on('before-quit', () => analytics?.stop());
}
