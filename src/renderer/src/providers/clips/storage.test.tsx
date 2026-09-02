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
  loadState: { complete: false, error: null, recoverable: false },
  clips: [],
});
const loaded = (clips: StoredClip[] = []): StoredClipsSnapshot => ({
  loadState: { complete: true, error: null, recoverable: false },
  clips,
});
const failed = (): StoredClipsSnapshot => ({
  loadState: { complete: true, error: DECRYPT_ERROR, recoverable: false },
  clips: [],
});

let storageReady: (() => void) | null = null;
let observed: { clips: ClipItem[]; isInitiallyLoading: boolean; loadError: ClipsLoadError | null } =
  {
    clips: [],
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
  observed = { clips, isInitiallyLoading, loadError };
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
