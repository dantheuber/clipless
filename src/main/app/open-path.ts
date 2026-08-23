import { app, shell } from 'electron';
import { join } from 'path';
import type { AppPathName } from '../../shared/types';

/**
 * The folders the About panel links to (spec 15.4). Returns the error text from
 * shell.openPath, empty when the folder opened.
 */
export function appPath(name: AppPathName): string {
  return name === 'logs' ? app.getPath('logs') : join(app.getPath('userData'), 'clipless-data');
}

export async function openAppPath(name: AppPathName): Promise<string> {
  return shell.openPath(appPath(name));
}
