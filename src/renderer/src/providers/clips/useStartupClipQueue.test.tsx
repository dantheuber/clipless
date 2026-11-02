import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
      useStartupClipQueue(props.isInitiallyLoading, props.loadError, clipboardUpdated, {
        current: [],
      }),
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

  describe('while an image is compared with the stored row 1', () => {
    const DATA_URL = 'data:image/png;base64,AAAA';
    const inlineImage: ClipItem = { id: 'startup', type: 'image', content: DATA_URL };
    const storedImage: ClipItem = {
      id: 'stored',
      type: 'image',
      content: 'img-1',
      imageId: 'img-1',
    };
    const api = () => window.api as unknown as Record<string, ReturnType<typeof vi.fn>>;

    let finishLookup: (image: string | null) => void;
    let clearStorage: () => void;

    beforeEach(() => {
      api()
        .getFullImage.mockReset()
        .mockImplementation(
          () => new Promise<string | null>((resolve) => (finishLookup = resolve))
        );
      api()
        .onStorageCleared.mockReset()
        .mockImplementation((cb: () => void) => {
          clearStorage = cb;
          return () => {};
        });
    });

    afterEach(() => {
      api().getFullImage.mockReset().mockResolvedValue(null);
      api()
        .onStorageCleared.mockReset()
        .mockReturnValue(() => {});
    });

    /** Holds the image, then lands the history so the comparison starts and waits. */
    function startComparison() {
      const first = vi.fn();
      const hook = renderHook(
        (props: { isInitiallyLoading: boolean; clipboardUpdated: (clip: ClipItem) => void }) =>
          useStartupClipQueue(props.isInitiallyLoading, null, props.clipboardUpdated, {
            current: [storedImage],
          }),
        { initialProps: { isInitiallyLoading: true, clipboardUpdated: first } }
      );
      act(() => hook.result.current(inlineImage));
      hook.rerender({ isInitiallyLoading: false, clipboardUpdated: first });
      expect(api().getFullImage).toHaveBeenCalledWith('img-1');
      return { ...hook, first };
    }

    it('drops the image when all data is cleared before the comparison returns', async () => {
      const { first } = startComparison();

      clearStorage();
      await act(async () => finishLookup(null));

      expect(first).not.toHaveBeenCalled();
    });

    it('holds clips captured meanwhile, so they stay newer than the image', async () => {
      const { result, first } = startComparison();

      act(() => result.current(text('later')));
      expect(first).not.toHaveBeenCalled();
      await act(async () => finishLookup('data:image/png;base64,BBBB'));

      expect(first.mock.calls.map(([clip]) => clip.id)).toEqual(['startup', 'later']);
      act(() => result.current(text('after')));
      expect(first).toHaveBeenLastCalledWith(text('after'));
    });

    it('inserts through the current clipboardUpdated, with the locks made meanwhile', async () => {
      const { rerender, first } = startComparison();
      const afterLock = vi.fn();

      rerender({ isInitiallyLoading: false, clipboardUpdated: afterLock });
      await act(async () => finishLookup(null));

      expect(first).not.toHaveBeenCalled();
      expect(afterLock).toHaveBeenCalledWith(inlineImage);
    });

    it('keeps an image that follows another held clip, since row 1 is no longer the stored one', async () => {
      const clipboardUpdated = vi.fn();
      const hook = renderHook(
        (props: { isInitiallyLoading: boolean }) =>
          useStartupClipQueue(props.isInitiallyLoading, null, clipboardUpdated, {
            current: [storedImage],
          }),
        { initialProps: { isInitiallyLoading: true } }
      );
      act(() => {
        hook.result.current(text('first'));
        hook.result.current(inlineImage);
      });

      hook.rerender({ isInitiallyLoading: false });

      expect(api().getFullImage).not.toHaveBeenCalled();
      expect(clipboardUpdated.mock.calls.map(([clip]) => clip.id)).toEqual(['first', 'startup']);
    });

    it('compares an image that arrives after the history has landed', async () => {
      const clipboardUpdated = vi.fn();
      const { result } = renderHook(() =>
        useStartupClipQueue(false, null, clipboardUpdated, { current: [storedImage] })
      );

      act(() => result.current(inlineImage));
      act(() => result.current(text('later')));
      expect(api().getFullImage).toHaveBeenCalledWith('img-1');
      expect(clipboardUpdated).not.toHaveBeenCalled();
      await act(async () => finishLookup(DATA_URL));

      expect(clipboardUpdated.mock.calls.map(([clip]) => clip.id)).toEqual(['later']);
    });

    it('keeps an image captured right after a clip that has not rendered yet', () => {
      const clipboardUpdated = vi.fn();
      const { result } = renderHook(() =>
        useStartupClipQueue(false, null, clipboardUpdated, { current: [storedImage] })
      );

      act(() => {
        result.current(text('latest-text'));
        result.current(inlineImage);
      });

      expect(api().getFullImage).not.toHaveBeenCalled();
      expect(clipboardUpdated.mock.calls.map(([clip]) => clip.id)).toEqual([
        'latest-text',
        'startup',
      ]);
    });

    it('recovers when an insert throws, so captures are not held forever', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      const clipboardUpdated = vi.fn().mockImplementationOnce(() => {
        throw new Error('insert failed');
      });
      const { result } = renderHook(() =>
        useStartupClipQueue(false, null, clipboardUpdated, { current: [storedImage] })
      );

      act(() => result.current(inlineImage));
      await act(async () => finishLookup(null));
      act(() => result.current(text('after')));

      expect(clipboardUpdated).toHaveBeenLastCalledWith(text('after'));
      expect(error).toHaveBeenCalled();
      error.mockRestore();
    });

    it('stops comparing once the provider has gone', async () => {
      const { unmount, first } = startComparison();

      unmount();
      await act(async () => finishLookup(null));

      expect(first).not.toHaveBeenCalled();
    });
  });
});
