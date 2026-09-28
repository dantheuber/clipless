import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('electron', () => ({
  app: { getPath: vi.fn().mockReturnValue('/mock/userData') },
  screen: { getAllDisplays: vi.fn(), getPrimaryDisplay: vi.fn() },
}));

vi.mock('fs', () => ({
  promises: { readFile: vi.fn() },
}));

vi.mock('../storage', () => ({
  storage: {
    getSettings: vi.fn(),
    saveWindowBounds: vi.fn().mockResolvedValue(undefined),
    clearWindowBounds: vi.fn().mockResolvedValue(undefined),
  },
}));

import { promises as fs } from 'fs';
import { screen } from 'electron';
import { storage } from '../storage';

const laptop = { workArea: { x: 0, y: 0, width: 1920, height: 1040 } } as Electron.Display;
const saved = { x: 100, y: 120, width: 900, height: 670 };

let bounds: typeof import('./bounds.js');

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  bounds = await import('./bounds.js');
  vi.mocked(screen.getAllDisplays).mockReturnValue([laptop]);
  vi.mocked(screen.getPrimaryDisplay).mockReturnValue(laptop);
});

describe('getStartupWindowBounds', () => {
  it('is null before anything is loaded', () => {
    expect(bounds.getStartupWindowBounds()).toBeNull();
  });

  it('restores the loaded bounds when they are on a display', async () => {
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(saved) as never);
    await bounds.loadWindowBounds();
    expect(bounds.getStartupWindowBounds()).toEqual(saved);
  });

  it('keeps only the size when the loaded bounds are off every display', async () => {
    const offscreen = { ...saved, x: 4000, y: 4000 };
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(offscreen) as never);
    await bounds.loadWindowBounds();
    expect(bounds.getStartupWindowBounds()).toEqual({ width: 900, height: 670 });
  });
});

describe('syncWindowBoundsWithSetting', () => {
  beforeEach(async () => {
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(saved) as never);
    await bounds.loadWindowBounds();
  });

  it('forgets the saved bounds when remembering is turned off', async () => {
    await bounds.syncWindowBoundsWithSetting({ rememberWindowPosition: false });
    expect(storage.clearWindowBounds).toHaveBeenCalledTimes(1);
    expect(bounds.getWindowBounds()).toBeNull();
    expect(bounds.getStartupWindowBounds()).toBeNull();
  });

  it('leaves the saved bounds alone while remembering is on', async () => {
    await bounds.syncWindowBoundsWithSetting({ rememberWindowPosition: true });
    await bounds.syncWindowBoundsWithSetting({});
    expect(storage.clearWindowBounds).not.toHaveBeenCalled();
    expect(bounds.getWindowBounds()).toEqual(saved);
  });

  it('does nothing once there is nothing left to forget', async () => {
    await bounds.syncWindowBoundsWithSetting({ rememberWindowPosition: false });
    await bounds.syncWindowBoundsWithSetting({ rememberWindowPosition: false });
    expect(storage.clearWindowBounds).toHaveBeenCalledTimes(1);
  });

  it('keeps the in-memory copy if the file could not be removed', async () => {
    vi.mocked(storage.clearWindowBounds).mockRejectedValueOnce(new Error('EACCES'));
    await expect(
      bounds.syncWindowBoundsWithSetting({ rememberWindowPosition: false })
    ).resolves.toBeUndefined();
    expect(bounds.getWindowBounds()).toEqual(saved);
  });
});

describe('saveWindowBounds', () => {
  it('writes only while remembering is on', async () => {
    const win = { getBounds: () => saved } as unknown as Electron.BrowserWindow;

    vi.mocked(storage.getSettings).mockResolvedValueOnce({
      rememberWindowPosition: false,
    } as never);
    await bounds.saveWindowBounds(win);
    expect(storage.saveWindowBounds).not.toHaveBeenCalled();
    expect(bounds.getWindowBounds()).toBeNull();

    vi.mocked(storage.getSettings).mockResolvedValueOnce({ rememberWindowPosition: true } as never);
    await bounds.saveWindowBounds(win);
    expect(storage.saveWindowBounds).toHaveBeenCalledWith(saved);
    expect(bounds.getWindowBounds()).toEqual(saved);
  });
});
