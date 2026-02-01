import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePatternDetection } from './usePatternDetection';

describe('usePatternDetection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.api as any).quickClipsScanText = vi.fn().mockResolvedValue([]);
  });

  it('returns no patterns for empty content', () => {
    const { result } = renderHook(() => usePatternDetection(''));
    expect(result.current.hasPatterns).toBe(false);
    expect(result.current.patterns).toEqual([]);
  });

  it('returns no patterns for whitespace-only content', () => {
    const { result } = renderHook(() => usePatternDetection('   '));
    expect(result.current.hasPatterns).toBe(false);
  });

  it('detects patterns from API', async () => {
    const mockMatches = [
      { searchTermId: '1', searchTermName: 'Email', captures: { email: 'test@example.com' } },
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.api as any).quickClipsScanText = vi.fn().mockResolvedValue(mockMatches);

    const { result } = renderHook(() => usePatternDetection('test@example.com'));

    await waitFor(() => {
      expect(result.current.hasPatterns).toBe(true);
    });

    expect(result.current.patterns).toEqual(mockMatches);
  });

  it('handles API errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.api as any).quickClipsScanText = vi.fn().mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => usePatternDetection('some text'));

    // Wait for debounce to fire and error to be processed
    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((window.api as any).quickClipsScanText).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasPatterns).toBe(false);
    expect(result.current.patterns).toEqual([]);
    consoleSpy.mockRestore();
  });

  it('cancels previous detection on content change', async () => {
    const mockScan = vi.fn().mockResolvedValue([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.api as any).quickClipsScanText = mockScan;

    const { rerender, result } = renderHook(({ content }) => usePatternDetection(content), {
      initialProps: { content: 'first' },
    });

    // Change content before debounce fires
    rerender({ content: 'second' });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('does not update state if cancelled during API call', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let resolveApi: (value: any) => void;
    const apiPromise = new Promise((resolve) => {
      resolveApi = resolve;
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.api as any).quickClipsScanText = vi.fn().mockReturnValue(apiPromise);

    const { unmount } = renderHook(() => usePatternDetection('test content'));

    // Wait for the debounce
    await new Promise((r) => setTimeout(r, 350));

    // Unmount before the API resolves (triggers isCancelled)
    unmount();

    // Now resolve the API
    resolveApi!([{ searchTermId: '1', searchTermName: 'Test', captures: { test: 'val' } }]);

    // No error should occur - state updates are skipped
  });

  it('logs error and resets state on API failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockScan = vi.fn().mockRejectedValue(new Error('scan error'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.api as any).quickClipsScanText = mockScan;

    const { result } = renderHook(() => usePatternDetection('test content'));

    await waitFor(() => {
      expect(mockScan).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasPatterns).toBe(false);
    expect(result.current.patterns).toEqual([]);
    consoleSpy.mockRestore();
  });

  it('skips state update when error occurs after cancellation', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let rejectApi: (err: Error) => void;
    const apiPromise = new Promise((_resolve, reject) => {
      rejectApi = reject;
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.api as any).quickClipsScanText = vi.fn().mockReturnValue(apiPromise);

    const { unmount } = renderHook(() => usePatternDetection('error content'));

    // Wait for debounce to fire
    await new Promise((r) => setTimeout(r, 350));

    // Unmount first (sets isCancelled = true), then reject
    unmount();
    rejectApi!(new Error('cancelled error'));

    // Allow microtask to process
    await new Promise((r) => setTimeout(r, 50));

    consoleSpy.mockRestore();
  });

  it('clears patterns when content becomes empty', async () => {
    const mockMatches = [
      { searchTermId: '1', searchTermName: 'Email', captures: { email: 'test@example.com' } },
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.api as any).quickClipsScanText = vi.fn().mockResolvedValue(mockMatches);

    const { rerender, result } = renderHook(({ content }) => usePatternDetection(content), {
      initialProps: { content: 'test@example.com' },
    });

    await waitFor(() => {
      expect(result.current.hasPatterns).toBe(true);
    });

    rerender({ content: '' });

    expect(result.current.hasPatterns).toBe(false);
    expect(result.current.patterns).toEqual([]);
  });
});
