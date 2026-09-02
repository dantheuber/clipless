import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import { useState } from 'react';
import type { StoredClip, StorageLoadState } from '../../../../shared/types';
import { ToastContext } from '../../components/Toast';
import { DEFAULT_MAX_CLIPS } from '../constants';
import { ClipItem } from './types';
import { updateClipsLength } from './utils';
import { useClipsStorage } from './storage';

const stored = (id: string, content: string, isLocked = false): StoredClip => ({
  clip: { id, type: 'text', content },
  isLocked,
  timestamp: 1,
});

const NOT_LOADED: StorageLoadState = { complete: false, failed: false };
const LOADED: StorageLoadState = { complete: true, failed: false };
const FAILED: StorageLoadState = {
  complete: true,
  failed: true,
  error: 'Error while decrypting the ciphertext provided to safeStorage.decryptString.',
};

let storageReady: (() => void) | null = null;
let observed: { clips: ClipItem[]; isInitiallyLoading: boolean } = {
  clips: [],
  isInitiallyLoading: true,
};

function Probe() {
  const [clips, setClips] = useState<ClipItem[]>(updateClipsLength([], DEFAULT_MAX_CLIPS));
  const [lockedClips, setLockedClips] = useState<Record<number, boolean>>({});
  const [maxClips, setMaxClips] = useState(DEFAULT_MAX_CLIPS);
  const [isInitiallyLoading, setIsInitiallyLoading] = useState(true);
  useClipsStorage(
    clips,
    lockedClips,
    maxClips,
    isInitiallyLoading,
    setClips,
    setLockedClips,
    setMaxClips,
    setIsInitiallyLoading
  );
  observed = { clips, isInitiallyLoading };
  return null;
}

const toast = vi.fn();

function mount() {
  return render(
    <ToastContext.Provider value={toast}>
      <Probe />
    </ToastContext.Provider>
  );
}

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
  toast.mockReset();
  storageReady = null;
  api().storageGetClips.mockReset().mockResolvedValue([]);
  api().storageSaveClips.mockReset().mockResolvedValue(true);
  api().storageGetLoadState.mockReset().mockResolvedValue(LOADED);
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
    api().storageGetLoadState.mockResolvedValueOnce(NOT_LOADED);
    mount();
    await settle();

    expect(api().storageSaveClips).not.toHaveBeenCalled();
    expect(observed.isInitiallyLoading).toBe(true);

    // The background decrypt finishes and the real history becomes available
    api().storageGetClips.mockResolvedValue([stored('a', 'first'), stored('b', 'second', true)]);
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
    expect(toast).not.toHaveBeenCalled();
  });

  it('enables saving once the load is reported complete', async () => {
    api().storageGetClips.mockResolvedValue([stored('a', 'kept')]);
    mount();
    await settle();

    expect(observed.isInitiallyLoading).toBe(false);
    expect(api().storageSaveClips).toHaveBeenCalledTimes(1);
    expect(api().storageSaveClips.mock.calls[0][0][0].content).toBe('kept');
  });

  it('keeps saves disabled and tells the user when the background load failed', async () => {
    api().storageGetLoadState.mockResolvedValue(FAILED);
    mount();
    await settle();
    await act(async () => {
      storageReady?.();
    });
    await settle();

    expect(api().storageSaveClips).not.toHaveBeenCalled();
    expect(observed.isInitiallyLoading).toBe(true);
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast.mock.calls[0][0]).toMatch(/clip history/i);
  });

  it('keeps saves disabled and tells the user when reading storage throws', async () => {
    api().storageGetClips.mockRejectedValue(new Error('ipc down'));
    mount();
    await settle();

    expect(api().storageSaveClips).not.toHaveBeenCalled();
    expect(observed.isInitiallyLoading).toBe(true);
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it('reads the load state before the clips so a load finishing in between cannot be mistaken for empty', async () => {
    const order: string[] = [];
    api().storageGetLoadState.mockImplementation(async () => {
      order.push('state');
      return LOADED;
    });
    api().storageGetClips.mockImplementation(async () => {
      order.push('clips');
      return [];
    });
    mount();
    await settle();

    expect(order.slice(0, 2)).toEqual(['state', 'clips']);
  });
});
