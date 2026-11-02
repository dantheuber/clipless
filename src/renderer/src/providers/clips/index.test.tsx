import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, renderHook, screen, act, cleanup, waitFor } from '@testing-library/react';
import type { StoredClipsSnapshot } from '../../../../shared/types';
import { ToastContext, ToastProvider, type ToastFn } from '../../components/Toast';
import { LanguageDetectionProvider } from '../languageDetection';
import { ScanIndexProvider } from '../scan';
import {
  ClipsProvider,
  useClipsActions,
  useClipsData,
  useClipsMeta,
  useClipsPins,
  useQuickLook,
} from './index';

const DECRYPT_ERROR = 'Error while decrypting the ciphertext provided to safeStorage.';

const failed = (): StoredClipsSnapshot => ({
  loadState: { complete: true, error: { message: DECRYPT_ERROR, recoverable: false } },
  clips: [],
});
const loaded = (): StoredClipsSnapshot => ({
  loadState: { complete: true, error: null },
  clips: [{ clip: { id: 'a', type: 'text', content: 'back' }, isLocked: false, timestamp: 1 }],
});

function Probe() {
  const { loadError, saveError } = useClipsMeta();
  return (
    <>
      <div data-testid="load-error">
        {loadError === null ? 'none' : `${loadError.recoverable}:${loadError.message}`}
      </div>
      <div data-testid="save-error">
        {saveError === null ? 'no save error' : `${saveError.source}:${saveError.message}`}
      </div>
    </>
  );
}

const mount = () =>
  render(
    <ToastProvider>
      <LanguageDetectionProvider>
        <ScanIndexProvider>
          <ClipsProvider>
            <Probe />
          </ClipsProvider>
        </ScanIndexProvider>
      </LanguageDetectionProvider>
    </ToastProvider>
  );

const api = () => window.api as unknown as Record<string, ReturnType<typeof vi.fn>>;

let storageReady: (() => void) | null = null;

beforeEach(() => {
  storageReady = null;
  api().storageGetClipsSnapshot.mockReset().mockResolvedValue(failed());
  api()
    .onStorageReady.mockReset()
    .mockImplementation((cb: () => void) => {
      storageReady = cb;
      return () => {
        storageReady = null;
      };
    });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ClipsProvider load error', () => {
  it('hands the storage load error to the meta context and clears it once the history loads', async () => {
    mount();

    expect(await screen.findByText(`false:${DECRYPT_ERROR}`)).toBeInTheDocument();

    api().storageGetClipsSnapshot.mockResolvedValue(loaded());
    await act(async () => {
      storageReady?.();
    });

    expect(await screen.findByText('none')).toBeInTheDocument();
  });
});

const SAVE_REFUSED = 'Storage could not be loaded';

describe('ClipsProvider image copy feedback', () => {
  it.each([false, true])(
    'reports the actual copy result when the full image is available: %s',
    async (available) => {
      const toast = vi.fn<ToastFn>();
      api().storageGetClipsSnapshot.mockResolvedValue({
        loadState: { complete: true, error: null },
        clips: [
          {
            clip: { id: 'image-clip', type: 'image', content: 'image-1', imageId: 'image-1' },
            isLocked: false,
            timestamp: 1,
          },
        ],
      });
      api().storageSaveClips.mockReset().mockResolvedValue(true);
      api().getFullImage.mockResolvedValue(available ? 'data:image/png;base64,fullimage' : null);
      const { result } = renderHook(() => ({ actions: useClipsActions(), data: useClipsData() }), {
        wrapper: ({ children }) => (
          <ToastContext.Provider value={toast}>
            <LanguageDetectionProvider>
              <ScanIndexProvider>
                <ClipsProvider>{children}</ClipsProvider>
              </ScanIndexProvider>
            </LanguageDetectionProvider>
          </ToastContext.Provider>
        ),
      });
      await waitFor(() => expect(result.current.data.clips[0]?.id).toBe('image-clip'));

      await act(async () => {
        await result.current.actions.copyClipToClipboard(0);
      });

      expect(toast).toHaveBeenCalledExactlyOnceWith(
        available ? 'Copied clip 1 to the clipboard' : 'Could not copy clip 1 to the clipboard'
      );
    }
  );
});

const loadedEmpty = (): StoredClipsSnapshot => ({
  loadState: { complete: true, error: null },
  clips: [],
});

describe('ClipsProvider clear all', () => {
  it('clears history, locks, pins and the reader, then saves only newly copied clips', async () => {
    vi.useFakeTimers();
    const clearedListeners = new Set<() => void>();
    api().onStorageCleared.mockImplementation((cb: () => void) => {
      clearedListeners.add(cb);
      return () => clearedListeners.delete(cb);
    });
    api().storageGetClipsSnapshot.mockResolvedValue({
      loadState: { complete: true, error: null },
      clips: [
        { clip: { id: 'a', type: 'text', content: 'back' }, isLocked: false, timestamp: 1 },
        { clip: { id: 'b', type: 'text', content: 'back' }, isLocked: true, timestamp: 1 },
      ],
    });
    api().searchTermsGetAll.mockResolvedValue([
      { id: 'secret', name: 'Secret', pattern: '(?<secret>back)', enabled: true },
    ]);
    api().storageSaveClips.mockReset().mockResolvedValue(true);
    try {
      const { result, unmount } = renderHook(
        () => ({
          data: useClipsData(),
          actions: useClipsActions(),
          pins: useClipsPins(),
          reader: useQuickLook(),
        }),
        {
          wrapper: ({ children }) => (
            <ToastProvider>
              <LanguageDetectionProvider>
                <ScanIndexProvider>
                  <ClipsProvider>{children}</ClipsProvider>
                </ScanIndexProvider>
              </LanguageDetectionProvider>
            </ToastProvider>
          ),
        }
      );
      await act(async () => {});
      act(() => {
        result.current.pins.setPins(['secret|back'], true);
        result.current.reader.openQuickLook('a', 0);
      });
      expect(result.current.pins.pins.size).toBe(1);
      expect(result.current.actions.isClipLocked(1)).toBe(true);
      expect(result.current.reader.openClip?.id).toBe('a');

      act(() => clearedListeners.forEach((listener) => listener()));
      await act(async () => vi.advanceTimersByTimeAsync(1500));
      expect(result.current.data.clips.every((clip) => clip.content === '')).toBe(true);
      expect(result.current.actions.isClipLocked(1)).toBe(false);
      expect(result.current.pins.pins.size).toBe(0);
      expect(result.current.reader.openClip).toBeNull();
      for (const [saved] of api().storageSaveClips.mock.calls) {
        expect(saved.every((clip: { content: string }) => clip.content === '')).toBe(true);
      }

      api().storageSaveClips.mockClear();
      act(() =>
        result.current.actions.clipboardUpdated({ id: 'new', type: 'text', content: 'fresh' })
      );
      await act(async () => vi.advanceTimersByTimeAsync(1500));
      expect(api().storageSaveClips).toHaveBeenCalledTimes(1);
      const [saved, locks] = api().storageSaveClips.mock.calls[0];
      expect(saved.filter((clip: { content: string }) => clip.content !== '')).toEqual([
        { id: 'new', type: 'text', content: 'fresh' },
      ]);
      expect(locks).toEqual({});
      unmount();
      expect(clearedListeners.size).toBe(0);
    } finally {
      cleanup();
      vi.useRealTimers();
      api()
        .onStorageCleared.mockReset()
        .mockReturnValue(() => {});
      api().searchTermsGetAll.mockResolvedValue([]);
    }
  });
});

describe('ClipsProvider save error', () => {
  let toast: ReturnType<typeof vi.fn<ToastFn>>;
  // Several providers listen; the settings window's update reaches all of them
  let settingsListeners: ((settings: unknown) => void)[];

  const mountWithToastSpy = () =>
    render(
      <ToastContext.Provider value={toast}>
        <LanguageDetectionProvider>
          <ScanIndexProvider>
            <ClipsProvider>
              <Probe />
            </ClipsProvider>
          </ScanIndexProvider>
        </LanguageDetectionProvider>
      </ToastContext.Provider>
    );

  // A change from the settings window is the cheapest way to make the debounced save run again
  const changeLimit = async (maxClips: number) => {
    await act(async () => {
      settingsListeners.forEach((listener) => listener({ maxClips }));
    });
    await settle();
  };

  const settle = async () => {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
  };

  beforeEach(() => {
    vi.useFakeTimers();
    toast = vi.fn<ToastFn>();
    settingsListeners = [];
    api().storageGetClipsSnapshot.mockResolvedValue(loadedEmpty());
    api().storageSaveClips.mockReset().mockResolvedValue(true);
    api()
      .onSettingsUpdated.mockReset()
      .mockImplementation((cb: (settings: unknown) => void) => {
        settingsListeners.push(cb);
        return () => {
          settingsListeners = settingsListeners.filter((listener) => listener !== cb);
        };
      });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('toasts the reason once when saves start failing and not again on every retry', async () => {
    api().storageSaveClips.mockRejectedValue(new Error(SAVE_REFUSED));
    mountWithToastSpy();
    await settle();

    expect(screen.getByTestId('save-error')).toHaveTextContent(`clips:${SAVE_REFUSED}`);
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith(expect.stringMatching(/could not be saved/i), SAVE_REFUSED);

    // The save is retried on every change, and a toast per debounce tick would be spam
    await changeLimit(40);
    await changeLimit(30);

    expect(api().storageSaveClips.mock.calls.length).toBeGreaterThan(1);
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it('toasts again when saves fail after recovering', async () => {
    api().storageSaveClips.mockRejectedValue(new Error(SAVE_REFUSED));
    mountWithToastSpy();
    await settle();
    expect(toast).toHaveBeenCalledTimes(1);

    api().storageSaveClips.mockResolvedValue(true);
    await changeLimit(40);
    expect(screen.getByTestId('save-error')).toHaveTextContent('no save error');

    api().storageSaveClips.mockRejectedValue(new Error('no disk'));
    await changeLimit(30);

    expect(screen.getByTestId('save-error')).toHaveTextContent('clips:no disk');
    expect(toast).toHaveBeenCalledTimes(2);
  });

  it('says nothing while saves keep landing', async () => {
    mountWithToastSpy();
    await settle();
    await changeLimit(40);

    expect(screen.getByTestId('save-error')).toHaveTextContent('no save error');
    expect(toast).not.toHaveBeenCalled();
  });
});

describe('ClipsProvider clips captured during startup', () => {
  type ClipboardListener = (clip: { type: string; content: string }) => void;
  let clipboardListeners: ClipboardListener[];
  let finishLoad: (snapshot: StoredClipsSnapshot) => void;

  const history = (...contents: string[]): StoredClipsSnapshot => ({
    loadState: { complete: true, error: null },
    clips: contents.map((content, index) => ({
      clip: { id: `stored-${index}`, type: 'text', content },
      isLocked: false,
      timestamp: 1,
    })),
  });
  const notLoaded = (): StoredClipsSnapshot => ({
    loadState: { complete: false, error: null },
    clips: [],
  });

  const mountProbe = () =>
    renderHook(() => ({ data: useClipsData(), meta: useClipsMeta() }), {
      wrapper: ({ children }) => (
        <ToastProvider>
          <LanguageDetectionProvider>
            <ScanIndexProvider>
              <ClipsProvider>{children}</ClipsProvider>
            </ScanIndexProvider>
          </LanguageDetectionProvider>
        </ToastProvider>
      ),
    });

  const flush = async () => {
    await act(async () => {
      await Promise.resolve();
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
  const contents = (clips: { content: string }[]) =>
    clips.filter((clip) => clip.content !== '').map((clip) => clip.content);

  beforeEach(() => {
    vi.useFakeTimers();
    clipboardListeners = [];
    finishLoad = () => {};
    api().getCurrentClipboardData.mockResolvedValue({ type: 'text', content: 'startup' });
    // The history takes two round trips to arrive; the test decides when it lands
    api().storageGetClipsSnapshot.mockImplementation(
      () => new Promise<StoredClipsSnapshot>((resolve) => (finishLoad = resolve))
    );
    api().storageSaveClips.mockReset().mockResolvedValue(true);
    api().onClipboardChanged.mockImplementation((cb: ClipboardListener) => {
      clipboardListeners.push(cb);
      return () => {
        clipboardListeners = clipboardListeners.filter((listener) => listener !== cb);
      };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    api().getCurrentClipboardData.mockReset().mockResolvedValue(null);
    api()
      .onClipboardChanged.mockReset()
      .mockReturnValue(() => {});
    api().storageGetClipsSnapshot.mockReset().mockResolvedValue(failed());
  });

  it('keeps the clipboard read at row 1 above the history that loads after it', async () => {
    const { result } = mountProbe();
    await flush();
    expect(api().getCurrentClipboardData).toHaveBeenCalled();

    await act(async () => {
      finishLoad(history('older', 'oldest'));
    });
    await settle();

    expect(contents(result.current.data.clips)).toEqual(['startup', 'older', 'oldest']);
    expect(result.current.meta.loadError).toBeNull();
    const saved = api().storageSaveClips.mock.calls.at(-1)?.[0];
    expect(contents(saved)).toEqual(['startup', 'older', 'oldest']);
  });

  it('does not duplicate a clipboard read that equals the stored row 1', async () => {
    api().getCurrentClipboardData.mockResolvedValue({ type: 'text', content: 'older' });
    const { result } = mountProbe();
    await flush();

    await act(async () => {
      finishLoad(history('older', 'oldest'));
    });
    await settle();

    expect(contents(result.current.data.clips)).toEqual(['older', 'oldest']);
  });

  it('keeps a clip copied while the background load is pending above the reloaded history', async () => {
    let storageReady: (() => void) | null = null;
    api().onStorageReady.mockImplementation((cb: () => void) => {
      storageReady = cb;
      return () => {
        storageReady = null;
      };
    });
    const { result } = mountProbe();
    await flush();
    await act(async () => {
      finishLoad(notLoaded());
    });
    await flush();
    expect(api().startClipboardMonitoring).toHaveBeenCalled();
    expect(clipboardListeners.length).toBeGreaterThan(0);

    // Copied after monitoring started and before the history arrived
    act(() => {
      clipboardListeners.forEach((listener) => listener({ type: 'text', content: 'copied' }));
    });
    expect(api().storageSaveClips).not.toHaveBeenCalled();

    await act(async () => {
      storageReady?.();
    });
    await flush();
    await act(async () => {
      finishLoad(history('older', 'oldest'));
    });
    await settle();

    expect(contents(result.current.data.clips)).toEqual(['copied', 'startup', 'older', 'oldest']);
    const saved = api().storageSaveClips.mock.calls.at(-1)?.[0];
    expect(contents(saved)).toEqual(['copied', 'startup', 'older', 'oldest']);
  });

  it.each([
    ['mount load first', [0, 1]],
    ['reload first', [1, 0]],
  ])(
    'keeps a clip copied while two startup loads overlap and both complete, %s',
    async (_order, resolveOrder) => {
      let storageReady: (() => void) | null = null;
      api().onStorageReady.mockImplementation((cb: () => void) => {
        storageReady = cb;
        return () => {
          storageReady = null;
        };
      });
      // The background load finishes between the mount load's two round trips, so the
      // storage-ready reload starts while the mount load is still waiting on its snapshot
      const pendingLoads: ((snapshot: StoredClipsSnapshot) => void)[] = [];
      api().storageGetClipsSnapshot.mockImplementation(
        () => new Promise<StoredClipsSnapshot>((resolve) => pendingLoads.push(resolve))
      );
      const { result } = mountProbe();
      await flush();
      await act(async () => {
        storageReady?.();
      });
      await flush();
      expect(pendingLoads).toHaveLength(2);
      expect(clipboardListeners.length).toBeGreaterThan(0);

      act(() => {
        clipboardListeners.forEach((listener) => listener({ type: 'text', content: 'copied' }));
      });

      for (const index of resolveOrder) {
        await act(async () => {
          pendingLoads[index](history('older', 'oldest'));
        });
        await flush();
      }
      await settle();

      expect(contents(result.current.data.clips)).toEqual(['copied', 'startup', 'older', 'oldest']);
      expect(result.current.meta.loadError).toBeNull();
      const saved = api().storageSaveClips.mock.calls.at(-1)?.[0];
      expect(contents(saved)).toEqual(['copied', 'startup', 'older', 'oldest']);
    }
  );

  it('shows the captured clips without saving them when the history cannot be loaded', async () => {
    const { result } = mountProbe();
    await flush();

    await act(async () => {
      finishLoad(failed());
    });
    await settle();

    expect(contents(result.current.data.clips)).toEqual(['startup']);
    expect(result.current.meta.loadError).not.toBeNull();
    expect(api().storageSaveClips).not.toHaveBeenCalled();

    // Something copied while the history is unreadable is shown at once, unsaved
    act(() => {
      clipboardListeners.forEach((listener) => listener({ type: 'text', content: 'later' }));
    });
    await settle();
    expect(contents(result.current.data.clips)).toEqual(['later', 'startup']);
    expect(api().storageSaveClips).not.toHaveBeenCalled();
  });
});
