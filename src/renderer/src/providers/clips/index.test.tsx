import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import type { StoredClipsSnapshot } from '../../../../shared/types';
import { ToastContext, ToastProvider, type ToastFn } from '../../components/Toast';
import { LanguageDetectionProvider } from '../languageDetection';
import { ScanIndexProvider } from '../scan';
import { ClipsProvider, useClipsMeta } from './index';

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
      <div data-testid="save-error">{saveError ?? 'no save error'}</div>
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

const loadedEmpty = (): StoredClipsSnapshot => ({
  loadState: { complete: true, error: null },
  clips: [],
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

    expect(screen.getByTestId('save-error')).toHaveTextContent(SAVE_REFUSED);
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

    expect(screen.getByTestId('save-error')).toHaveTextContent('no disk');
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
