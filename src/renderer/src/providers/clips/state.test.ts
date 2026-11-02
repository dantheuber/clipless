import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { useClipState } from './state';
import type { ClipItem } from './types';
import { updateClipsLength } from './utils';

const text = (id: string, content: string): ClipItem => ({ id, type: 'text', content });

function useProbe(maxClips: number, initialLocks: Record<number, boolean> = {}) {
  const [clips, setClips] = useState<ClipItem[]>(() => updateClipsLength([], maxClips));
  const [lockedClips, setLockedClips] = useState(initialLocks);
  const state = useClipState(clips, setClips, maxClips, lockedClips, setLockedClips);
  return { clips, ...state };
}

afterEach(cleanup);

describe('clipboardUpdated', () => {
  it('applies clips called in the same tick in order, newest first', () => {
    const { result } = renderHook(() => useProbe(5));

    act(() => {
      result.current.clipboardUpdated(text('a', 'first'));
      result.current.clipboardUpdated(text('b', 'second'));
      result.current.clipboardUpdated(text('c', 'third'));
    });

    expect(result.current.clips.map((clip) => clip.content)).toEqual([
      'third',
      'second',
      'first',
      '',
      '',
    ]);
  });

  it('skips a clip that duplicates the row 1 reached by the previous call', () => {
    const { result } = renderHook(() => useProbe(5));

    act(() => {
      result.current.clipboardUpdated(text('a', 'same'));
      result.current.clipboardUpdated(text('b', 'same'));
    });

    expect(result.current.clips.map((clip) => clip.content)).toEqual(['same', '', '', '', '']);
  });

  it('keeps locked rows in place and drops the oldest unlocked clip at the limit', () => {
    const { result } = renderHook(() => useProbe(3, { 1: true }));
    act(() => {
      result.current.clipboardUpdated(text('a', 'one'));
      result.current.clipboardUpdated(text('b', 'two'));
      result.current.clipboardUpdated(text('c', 'three'));
    });
    expect(result.current.clips.map((clip) => clip.content)).toEqual(['three', '', 'two']);

    act(() => {
      result.current.clipboardUpdated(text('d', 'four'));
    });

    expect(result.current.clips.map((clip) => clip.content)).toEqual(['four', '', 'three']);
  });
});
