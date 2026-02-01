import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePatternDetection } from './usePatternDetection';

describe('usePatternDetection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    (window.api as any).quickClipsScanText = vi.fn().mockResolvedValue(mockMatches);

    const { result } = renderHook(() => usePatternDetection('test@example.com'));

    await waitFor(() => {
      expect(result.current.hasPatterns).toBe(true);
    });

    expect(result.current.patterns).toEqual(mockMatches);
  });

  it('handles API errors gracefully', async () => {
    (window.api as any).quickClipsScanText = vi.fn().mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => usePatternDetection('some text'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasPatterns).toBe(false);
    expect(result.current.patterns).toEqual([]);
  });
});
