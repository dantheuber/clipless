import { app, shell } from 'electron';
import { join } from 'path';
import type { AppPathName } from '../../shared/types';

export function appPath(name: AppPathName): string {
  return name === 'logs' ? app.getPath('logs') : join(app.getPath('userData'), 'clipless-data'); // the folders the About panel links to (spec 15.4)
}

export async function openAppPath(name: AppPathName): Promise<string> {
  return shell.openPath(appPath(name)); // resolves to shell.openPath's error text, empty when the folder opened
}
