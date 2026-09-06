import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import { useState } from 'react';
import type { StoredClip, StoredClipsSnapshot } from '../../../../shared/types';
import { DEFAULT_MAX_CLIPS } from '../constants';
import { ClipItem, ClipsLoadError } from './types';
import { updateClipsLength } from './utils';
import { useClipsStorage } from './storage';

const stored = (id: string, content: string, isLocked = false): StoredClip => ({
  clip: { id, type: 'text', content },
  isLocked,
  timestamp: 1,
});

const DECRYPT_ERROR =
  'Error while decrypting the ciphertext provided to safeStorage.decryptString.';

const notLoaded = (): StoredClipsSnapshot => ({
  loadState: { complete: false, error: null },
  clips: [],
});
const loaded = (clips: StoredClip[] = []): StoredClipsSnapshot => ({
  loadState: { complete: true, error: null },
  clips,
});
const failed = (): StoredClipsSnapshot => ({
  loadState: { complete: true, error: { message: DECRYPT_ERROR, recoverable: false } },
  clips: [],
});

let storageReady: (() => void) | null = null;
let settingsUpdated: ((settings: unknown) => void) | null = null;
let observed: {
  clips: ClipItem[];
  lockedClips: Record<number, boolean>;
  maxClips: number;
  isInitiallyLoading: boolean;
  loadError: ClipsLoadError | null;
} = {
  clips: [],
  lockedClips: {},
  maxClips: DEFAULT_MAX_CLIPS,
  isInitiallyLoading: true,
  loadError: null,
};

function Probe() {
  const [clips, setClips] = useState<ClipItem[]>(updateClipsLength([], DEFAULT_MAX_CLIPS));
  const [lockedClips, setLockedClips] = useState<Record<number, boolean>>({});
  const [maxClips, setMaxClips] = useState(DEFAULT_MAX_CLIPS);
  const [isInitiallyLoading, setIsInitiallyLoading] = useState(true);
  const { loadError } = useClipsStorage(
    clips,
    lockedClips,
    maxClips,
    isInitiallyLoading,
    setClips,
    setLockedClips,
    setMaxClips,
    setIsInitiallyLoading
  );
  observed = { clips, lockedClips, maxClips, isInitiallyLoading, loadError };
  return null;
}

const mount = () => render(<Probe />);

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const settle = async () => {
  await flush();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1500);
  });
};

const api = () => window.api as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  vi.useFakeTimers();
  storageReady = null;
  api().storageGetClipsSnapshot.mockReset().mockResolvedValue(loaded());
  api().storageSaveClips.mockReset().mockResolvedValue(true);
  api().storageSaveSettings.mockReset().mockResolvedValue(undefined);
  api().storageGetSettings.mockReset().mockResolvedValue({ maxClips: DEFAULT_MAX_CLIPS });
  settingsUpdated = null;
  api()
    .onSettingsUpdated.mockReset()
    .mockImplementation((cb: (settings: unknown) => void) => {
      settingsUpdated = cb;
      return () => {
        settingsUpdated = null;
      };
    });
  api()
    .onStorageReady.mockReset()
    .mockImplementation((cb: () => void) => {
      storageReady = cb;
      return () => {
        storageReady = null;
      };
    });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useClipsStorage load guard', () => {
  it('never saves the blank list when clips read as empty before the background load completes', async () => {
    api().storageGetClipsSnapshot.mockResolvedValueOnce(notLoaded());
    mount();
    await settle();

    expect(api().storageSaveClips).not.toHaveBeenCalled();
    expect(observed.isInitiallyLoading).toBe(true);

    // The background decrypt finishes and the real history becomes available
    api().storageGetClipsSnapshot.mockResolvedValue(
      loaded([stored('a', 'first'), stored('b', 'second', true)])
    );
    await act(async () => {
      storageReady?.();
    });
    await settle();

    expect(observed.isInitiallyLoading).toBe(false);
    expect(observed.clips.slice(0, 2).map((c) => c.content)).toEqual(['first', 'second']);
    // The only save, if any, carries the loaded history rather than the blank seed
    for (const [saved] of api().storageSaveClips.mock.calls) {
      expect(saved.slice(0, 2).map((c: ClipItem) => c.content)).toEqual(['first', 'second']);
    }
    expect(observed.loadError).toBeNull();
  });

  it('enables saving once the load is reported complete', async () => {
    api().storageGetClipsSnapshot.mockResolvedValue(loaded([stored('a', 'kept')]));
    mount();
    await settle();

    expect(observed.isInitiallyLoading).toBe(false);
    expect(api().storageSaveClips).toHaveBeenCalledTimes(1);
    expect(api().storageSaveClips.mock.calls[0][0][0].content).toBe('kept');
  });

  it('keeps saves disabled and reports the error when the background load failed', async () => {
    api().storageGetClipsSnapshot.mockResolvedValue(failed());
    mount();
    await settle();
    await act(async () => {
      storageReady?.();
    });
    await settle();

    expect(api().storageSaveClips).not.toHaveBeenCalled();
    expect(observed.isInitiallyLoading).toBe(true);
    expect(observed.loadError).toEqual({ message: DECRYPT_ERROR, recoverable: false });
  });

  it('keeps saves disabled and reports the error when reading storage throws', async () => {
    api().storageGetClipsSnapshot.mockRejectedValue(new Error('ipc down'));
    mount();
    await settle();

    expect(api().storageSaveClips).not.toHaveBeenCalled();
    expect(observed.isInitiallyLoading).toBe(true);
    expect(observed.loadError).toEqual({ message: 'ipc down', recoverable: true });
  });

  it('clears the error once a later load succeeds', async () => {
    api().storageGetClipsSnapshot.mockResolvedValueOnce(failed());
    mount();
    await settle();
    expect(observed.loadError).toEqual({ message: DECRYPT_ERROR, recoverable: false });

    api().storageGetClipsSnapshot.mockResolvedValue(loaded([stored('a', 'back')]));
    await act(async () => {
      storageReady?.();
    });
    await settle();

    expect(observed.loadError).toBeNull();
    expect(observed.isInitiallyLoading).toBe(false);
    expect(observed.clips[0].content).toBe('back');
  });
});

describe('useClipsStorage without the preload api', () => {
  it('finishes loading at once and never tries to save', async () => {
    const preload = window.api;
    (window as unknown as { api: unknown }).api = undefined;
    try {
      mount();
      await settle();
      expect(observed.isInitiallyLoading).toBe(false);
      expect(observed.loadError).toBeNull();
    } finally {
      window.api = preload;
    }

    expect(preload.storageSaveClips).not.toHaveBeenCalled();
    expect(preload.storageSaveSettings).not.toHaveBeenCalled();
  });
});

describe('useClipsStorage stored data', () => {
  it('keeps the default limit when the settings carry none', async () => {
    api().storageGetSettings.mockResolvedValue({});
    api().storageGetClipsSnapshot.mockResolvedValue(loaded([stored('a', 'one')]));
    mount();
    await settle();

    expect(observed.maxClips).toBe(DEFAULT_MAX_CLIPS);
    expect(observed.clips).toHaveLength(DEFAULT_MAX_CLIPS);
    expect(observed.clips[0].content).toBe('one');
  });

  it('copes with settings that are missing altogether', async () => {
    api().storageGetSettings.mockResolvedValue(null);
    api().storageGetClipsSnapshot.mockResolvedValue(loaded([stored('a', 'one')]));
    mount();
    await settle();

    expect(observed.clips[0].content).toBe('one');
    expect(observed.isInitiallyLoading).toBe(false);
  });

  it('applies the stored limit and restores locks for every clip but the newest', async () => {
    api().storageGetSettings.mockResolvedValue({ maxClips: 5 });
    api().storageGetClipsSnapshot.mockResolvedValue(
      loaded([stored('a', 'one', true), stored('b', 'two', true), stored('c', 'three')])
    );
    mount();
    await settle();

    expect(observed.maxClips).toBe(5);
    expect(observed.clips).toHaveLength(5);
    expect(observed.clips.slice(0, 3).map((c) => c.content)).toEqual(['one', 'two', 'three']);
    expect(observed.lockedClips).toEqual({ 1: true });
  });

  it('skips stored entries without usable content', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    api().storageGetClipsSnapshot.mockResolvedValue(
      loaded([
        stored('a', '   '),
        stored('b', ''),
        { clip: undefined, isLocked: false, timestamp: 1 } as unknown as StoredClip,
      ])
    );
    mount();
    await settle();

    expect(observed.clips.every((c) => c.content === '')).toBe(true);
    expect(observed.isInitiallyLoading).toBe(false);
    expect(log).not.toHaveBeenCalledWith(expect.stringMatching(/Successfully loaded/));
    expect(log).not.toHaveBeenCalledWith('No stored clips found');
  });

  it('treats a snapshot without a clip list as an empty history', async () => {
    api().storageGetClipsSnapshot.mockResolvedValue({
      loadState: { complete: true, error: null },
      clips: undefined as unknown as StoredClip[],
    });
    mount();
    await settle();

    expect(observed.isInitiallyLoading).toBe(false);
    expect(observed.loadError).toBeNull();
  });
});

describe('useClipsStorage settings updates from another window', () => {
  it('applies a lower limit by dropping the oldest unlocked clips', async () => {
    api().storageGetClipsSnapshot.mockResolvedValue(
      loaded([stored('a', 'one'), stored('b', 'two', true), stored('c', 'three')])
    );
    mount();
    await settle();
    expect(observed.lockedClips).toEqual({ 1: true });

    await act(async () => {
      settingsUpdated?.({ maxClips: 2 });
    });

    expect(observed.maxClips).toBe(2);
    expect(observed.clips.map((c) => c.content)).toEqual(['one', 'two']);
    expect(observed.lockedClips).toEqual({ 1: true });
  });

  it('ignores an update that carries no numeric limit', async () => {
    api().storageGetClipsSnapshot.mockResolvedValue(loaded([stored('a', 'one')]));
    mount();
    await settle();

    await act(async () => {
      settingsUpdated?.({ theme: 'dark' });
      settingsUpdated?.(null);
    });

    expect(observed.maxClips).toBe(DEFAULT_MAX_CLIPS);
    expect(observed.clips).toHaveLength(DEFAULT_MAX_CLIPS);
  });
});

describe('useClipsStorage save failures', () => {
  it('logs a refused clip save and a failed settings save', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    api().storageSaveClips.mockRejectedValue(new Error('Storage could not be loaded'));
    api().storageSaveSettings.mockRejectedValue(new Error('no disk'));
    mount();
    await settle();

    expect(error).toHaveBeenCalledWith('Failed to save clips to storage:', expect.any(Error));
    expect(error).toHaveBeenCalledWith('Failed to save settings to storage:', expect.any(Error));
  });
});
