import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import type { StoredClipsSnapshot } from '../../../../shared/types';
import { ToastProvider } from '../../components/Toast';
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
  const { loadError } = useClipsMeta();
  return (
    <div data-testid="load-error">
      {loadError === null ? 'none' : `${loadError.recoverable}:${loadError.message}`}
    </div>
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
