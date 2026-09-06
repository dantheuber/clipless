import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../storage', () => ({
  storage: {
    getClipsSnapshot: vi.fn(),
    getLoadState: vi.fn(),
    saveClips: vi.fn(),
    getSettings: vi.fn(),
    saveSettings: vi.fn(),
    getStorageStats: vi.fn(),
    exportData: vi.fn(),
    importData: vi.fn(),
    clearAllData: vi.fn(),
  },
}));

import { storage } from '../storage';
import { DEFAULT_SETTINGS } from '../storage/defaults';
import type { StoredClipsSnapshot } from '../../shared/types';
import {
  getClipsSnapshot,
  saveClips,
  getSettings,
  saveSettings,
  getStorageStats,
  exportData,
  importData,
  clearAllData,
} from './storage-integration';

const mocked = vi.mocked(storage);
const failure = new Error('disk gone');

const snapshot: StoredClipsSnapshot = {
  loadState: { complete: true, error: null },
  clips: [{ clip: { id: 'a', type: 'text', content: 'kept' }, isLocked: false, timestamp: 1 }],
};

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('getClipsSnapshot', () => {
  it('hands the snapshot through', async () => {
    mocked.getClipsSnapshot.mockResolvedValue(snapshot);

    expect(await getClipsSnapshot()).toBe(snapshot);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('reports the current load state with no clips when the read throws', async () => {
    const loadState = {
      complete: true,
      error: { message: 'Stored clips are not a list', recoverable: false },
    };
    mocked.getClipsSnapshot.mockRejectedValue(failure);
    mocked.getLoadState.mockReturnValue(loadState);

    expect(await getClipsSnapshot()).toEqual({ loadState, clips: [] });
    expect(consoleError).toHaveBeenCalledWith('Failed to get clips from storage:', failure);
  });
});

describe('saveClips', () => {
  it('returns true once the clips are saved', async () => {
    mocked.saveClips.mockResolvedValue(undefined);
    const clips = [{ id: 'a', type: 'text' as const, content: 'kept' }];

    expect(await saveClips(clips, { 0: true })).toBe(true);
    expect(mocked.saveClips).toHaveBeenCalledWith(clips, { 0: true });
  });

  it('returns false when the save is refused', async () => {
    mocked.saveClips.mockRejectedValue(new Error('Storage has not finished loading'));

    expect(await saveClips([], {})).toBe(false);
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to save clips to storage:',
      expect.any(Error)
    );
  });
});

describe('getSettings', () => {
  it('hands the settings through', async () => {
    const settings = { ...DEFAULT_SETTINGS, maxClips: 7 };
    mocked.getSettings.mockResolvedValue(settings);

    expect(await getSettings()).toBe(settings);
  });

  it('falls back to the defaults when the read throws', async () => {
    mocked.getSettings.mockRejectedValue(failure);

    const settings = await getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(settings).not.toBe(DEFAULT_SETTINGS);
    expect(consoleError).toHaveBeenCalledWith('Failed to get settings from storage:', failure);
  });
});

describe('saveSettings', () => {
  it('returns true once the settings are saved', async () => {
    mocked.saveSettings.mockResolvedValue(undefined);

    expect(await saveSettings(DEFAULT_SETTINGS)).toBe(true);
    expect(mocked.saveSettings).toHaveBeenCalledWith(DEFAULT_SETTINGS);
  });

  it('returns false when the save throws', async () => {
    mocked.saveSettings.mockRejectedValue(failure);

    expect(await saveSettings(DEFAULT_SETTINGS)).toBe(false);
    expect(consoleError).toHaveBeenCalledWith('Failed to save settings to storage:', failure);
  });
});

describe('getStorageStats', () => {
  it('hands the stats through', async () => {
    const stats = { clipCount: 2, lockedCount: 1, dataSize: 40 };
    mocked.getStorageStats.mockResolvedValue(stats);

    expect(await getStorageStats()).toBe(stats);
  });

  it('reports zeroes when the read throws', async () => {
    mocked.getStorageStats.mockRejectedValue(failure);

    expect(await getStorageStats()).toEqual({ clipCount: 0, lockedCount: 0, dataSize: 0 });
    expect(consoleError).toHaveBeenCalledWith('Failed to get storage stats:', failure);
  });
});

describe('exportData', () => {
  it('hands the export through', async () => {
    mocked.exportData.mockResolvedValue('{"clips":[]}');

    expect(await exportData()).toBe('{"clips":[]}');
  });

  it('logs and rethrows when the export fails', async () => {
    mocked.exportData.mockRejectedValue(failure);

    await expect(exportData()).rejects.toBe(failure);
    expect(consoleError).toHaveBeenCalledWith('Failed to export data:', failure);
  });
});

describe('importData', () => {
  it('returns true once the data is imported', async () => {
    mocked.importData.mockResolvedValue(undefined);

    expect(await importData('{}')).toBe(true);
    expect(mocked.importData).toHaveBeenCalledWith('{}');
  });

  it('logs and rethrows when the import fails', async () => {
    mocked.importData.mockRejectedValue(failure);

    await expect(importData('nonsense')).rejects.toBe(failure);
    expect(consoleError).toHaveBeenCalledWith('Failed to import data:', failure);
  });
});

describe('clearAllData', () => {
  it('returns true once the data is cleared', async () => {
    mocked.clearAllData.mockResolvedValue(undefined);

    expect(await clearAllData()).toBe(true);
  });

  it('returns false when clearing throws', async () => {
    mocked.clearAllData.mockRejectedValue(failure);

    expect(await clearAllData()).toBe(false);
    expect(consoleError).toHaveBeenCalledWith('Failed to clear all data:', failure);
  });
});
