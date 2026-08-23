import { describe, it, expect, vi } from 'vitest';
import { join } from 'path';

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => (name === 'logs' ? '/home/u/logs' : '/home/u/userData')),
  },
  shell: { openPath: vi.fn(async (path: string) => (path.endsWith('logs') ? '' : 'no such')) },
}));

import { shell } from 'electron';
import { appPath, openAppPath } from './open-path';

describe('appPath', () => {
  it('points data at the clipless-data folder under userData', () => {
    expect(appPath('data')).toBe(join('/home/u/userData', 'clipless-data'));
  });

  it('points logs at the app log folder', () => {
    expect(appPath('logs')).toBe('/home/u/logs');
  });
});

describe('openAppPath', () => {
  it('opens the folder and returns the shell error text', async () => {
    await expect(openAppPath('logs')).resolves.toBe('');
    await expect(openAppPath('data')).resolves.toBe('no such');
    expect(shell.openPath).toHaveBeenCalledTimes(2);
  });
});
