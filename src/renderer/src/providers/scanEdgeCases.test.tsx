import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as scanModule from '../../../shared/scan';
import { EMPTY_SCAN, SCAN_CACHE_LIMIT, ScanIndexProvider, useScanIndex } from './scan';
import { Row } from './scanTestHarness';
import { api, clip, configureScanApi, flush, renderScanIndexCapture } from './scanTestData';

vi.mock('../../../shared/scan', async (loadActual) => {
  const actual = await loadActual<typeof scanModule>();
  return Object.assign({}, actual, { scanText: vi.fn(actual.scanText) });
});

const scanText = vi.mocked(scanModule.scanText);
let capturedGetScan: ReturnType<typeof useScanIndex>['getScan'] = () => null;

function CaptureGetScan() {
  capturedGetScan = useScanIndex().getScan;
  return null;
}

function stubIdleCallbacks(): (() => void)[] {
  const callbacks: (() => void)[] = [];
  vi.stubGlobal('requestIdleCallback', (callback: () => void) => {
    callbacks.push(callback);
    return callbacks.length;
  });
  return callbacks;
}

const largeClip = () => clip('big', '10.0.0.1 ' + 'x'.repeat(scanModule.LARGE_CLIP_THRESHOLD));

function renderLargeClip() {
  const big = largeClip();
  return {
    big,
    ...render(
      <ScanIndexProvider>
        <Row clip={big} />
      </ScanIndexProvider>
    ),
  };
}

beforeEach(() => configureScanApi(() => {}));
afterEach(cleanup);

describe('ScanIndexProvider edge cases', () => {
  it('treats a missing colour map as empty', async () => {
    api().groupColoursGet.mockResolvedValue(undefined);
    const index = renderScanIndexCapture();
    await flush();
    expect(index.current!.slotFor('ticket')).toBe(2);
  });

  it('logs and keeps going when the terms fail to load', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    api().searchTermsGetAll.mockRejectedValue(new Error('ipc down'));
    render(
      <ScanIndexProvider>
        <Row clip={clip('a', 'host 10.0.0.1')} />
      </ScanIndexProvider>
    );
    await flush();
    expect(error).toHaveBeenCalledWith(
      'Failed to load the Quick Clips config for scanning:',
      expect.any(Error)
    );
    expect(screen.getByTestId('row-a')).toHaveTextContent('none');
    error.mockRestore();
  });

  it('defers a large clip to an idle callback and reports loading until it lands', async () => {
    const idle = stubIdleCallbacks();
    try {
      const { big, rerender } = renderLargeClip();
      await flush();
      expect(screen.getByTestId('row-big')).toHaveTextContent('loading');
      expect(scanText).not.toHaveBeenCalled();
      rerender(
        <ScanIndexProvider>
          <Row clip={big} />
        </ScanIndexProvider>
      );
      expect(idle).toHaveLength(1);
      await act(async () => idle[0]());
      expect(scanText).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('row-big')).toHaveTextContent('chips:1');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('falls back to a timeout when requestIdleCallback is missing', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('requestIdleCallback', undefined);
    try {
      const big = largeClip();
      render(
        <ScanIndexProvider>
          <Row clip={big} />
        </ScanIndexProvider>
      );
      await flush();
      expect(screen.getByTestId('row-big')).toHaveTextContent('loading');
      await act(async () => vi.runAllTimersAsync());
      expect(screen.getByTestId('row-big')).toHaveTextContent('chips:1');
    } finally {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });

  it('drops a deferred scan whose clip changed while it waited', async () => {
    const idle = stubIdleCallbacks();
    try {
      const { rerender } = renderLargeClip();
      await flush();
      rerender(
        <ScanIndexProvider>
          <Row clip={clip('big', 'now small 10.0.0.2')} />
        </ScanIndexProvider>
      );
      expect(screen.getByTestId('row-big')).toHaveTextContent('chips:1');
      const before = scanText.mock.calls.length;
      await act(async () => idle[0]());
      expect(scanText.mock.calls.length).toBe(before);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('evicts the oldest entries past the cache limit', async () => {
    render(
      <ScanIndexProvider>
        <CaptureGetScan />
      </ScanIndexProvider>
    );
    await flush();
    const first = clip('first', 'host 10.0.0.1');
    capturedGetScan(first);
    for (let i = 0; i < SCAN_CACHE_LIMIT; i++) capturedGetScan(clip(`c${i}`, `n ${i}`));
    const before = scanText.mock.calls.length;
    capturedGetScan(first);
    expect(scanText.mock.calls.length).toBe(before + 1);
  });

  it('returns the shared empty scan for clips without text', async () => {
    render(
      <ScanIndexProvider>
        <CaptureGetScan />
      </ScanIndexProvider>
    );
    await flush();
    expect(capturedGetScan(clip('e', ''))).toBe(EMPTY_SCAN);
  });

  it('throws outside the provider', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Row clip={clip('a', 'x')} />)).toThrow(
      'useScanIndex must be used within ScanIndexProvider'
    );
    error.mockRestore();
  });
});
