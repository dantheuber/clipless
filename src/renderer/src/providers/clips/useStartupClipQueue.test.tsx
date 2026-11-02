import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useStartupClipQueue } from './useStartupClipQueue';
import type { ClipItem, ClipsLoadError } from './types';

const text = (id: string): ClipItem => ({ id, type: 'text', content: id });
const LOAD_ERROR: ClipsLoadError = { message: 'unreadable', recoverable: false };

afterEach(cleanup);

function mount(initial: { isInitiallyLoading: boolean; loadError: ClipsLoadError | null }) {
  const clipboardUpdated = vi.fn();
  const hook = renderHook(
    (props: typeof initial) =>
      useStartupClipQueue(props.isInitiallyLoading, props.loadError, clipboardUpdated),
    { initialProps: initial }
  );
  return { ...hook, clipboardUpdated };
}

describe('useStartupClipQueue', () => {
  it('holds clips while the history is loading and replays them in order once it is applied', () => {
    const { result, rerender, clipboardUpdated } = mount({
      isInitiallyLoading: true,
      loadError: null,
    });

    act(() => {
      result.current(text('first'));
      result.current(text('second'));
    });
    expect(clipboardUpdated).not.toHaveBeenCalled();

    rerender({ isInitiallyLoading: false, loadError: null });

    expect(clipboardUpdated.mock.calls.map(([clip]) => clip.id)).toEqual(['first', 'second']);
  });

  it('passes clips straight through once the history has been applied', () => {
    const { result, clipboardUpdated } = mount({ isInitiallyLoading: false, loadError: null });

    act(() => {
      result.current(text('live'));
    });

    expect(clipboardUpdated).toHaveBeenCalledExactlyOnceWith(text('live'));
  });

  it('replays each clip once', () => {
    const { result, rerender, clipboardUpdated } = mount({
      isInitiallyLoading: true,
      loadError: null,
    });
    act(() => {
      result.current(text('held'));
    });
    rerender({ isInitiallyLoading: false, loadError: null });
    rerender({ isInitiallyLoading: false, loadError: null });

    expect(clipboardUpdated).toHaveBeenCalledTimes(1);
  });

  it('shows the held clips when the load fails, and later clips at once', () => {
    const { result, rerender, clipboardUpdated } = mount({
      isInitiallyLoading: true,
      loadError: null,
    });
    act(() => {
      result.current(text('held'));
    });

    rerender({ isInitiallyLoading: true, loadError: LOAD_ERROR });
    expect(clipboardUpdated).toHaveBeenCalledExactlyOnceWith(text('held'));

    act(() => {
      result.current(text('after'));
    });
    expect(clipboardUpdated).toHaveBeenLastCalledWith(text('after'));
    expect(clipboardUpdated).toHaveBeenCalledTimes(2);
  });
});
