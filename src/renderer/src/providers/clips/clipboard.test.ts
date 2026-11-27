import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useClipboardOperations } from './clipboard';
import type { ClipItem } from './types';

const fullImage = 'data:image/png;base64,fullimage';
const imageClip: ClipItem = {
  id: 'clip-1',
  type: 'image',
  content: 'image-1',
  imageId: 'image-1',
  thumbnailDataUrl: 'data:image/png;base64,thumbnail',
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  vi.mocked(window.api.getFullImage).mockReset().mockResolvedValue(null);
  vi.mocked(window.api.setClipboardImage).mockReset().mockResolvedValue(undefined);
  vi.mocked(window.api.setClipboardText).mockReset().mockResolvedValue(undefined);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function copyClip(clip: ClipItem) {
  const setClipCopyId = vi.fn();
  const setIsHotkeyOperation = vi.fn();
  const setLastCopiedContent = vi.fn();
  const getClip = () => clip;
  const { result } = renderHook(() =>
    useClipboardOperations(
      false,
      () => false,
      vi.fn(),
      getClip,
      setClipCopyId,
      setIsHotkeyOperation,
      setLastCopiedContent,
      { current: [clip] },
      { current: false },
      { current: null }
    )
  );
  let copied: boolean | undefined;
  await act(async () => {
    copied = await result.current.copyClipToClipboard(0);
  });
  return { copied, setClipCopyId, setIsHotkeyOperation, setLastCopiedContent };
}

describe('copyClipToClipboard images', () => {
  it.each(['missing', 'rejected'])(
    'reports a %s full image without copying its ID',
    async (state) => {
      if (state === 'rejected') {
        vi.mocked(window.api.getFullImage).mockRejectedValueOnce(new Error('Could not load image'));
      }

      const result = await copyClip(imageClip);

      expect(result.copied).toBe(false);
      expect(window.api.setClipboardImage).not.toHaveBeenCalled();
      expect(window.api.setClipboardText).not.toHaveBeenCalled();
      expect(result.setIsHotkeyOperation).toHaveBeenLastCalledWith(false);
      expect(result.setLastCopiedContent).toHaveBeenLastCalledWith(null);
      expect(result.setClipCopyId).toHaveBeenLastCalledWith(null);
    }
  );

  it('rejects an ID-only image without an imageId', async () => {
    const result = await copyClip({ id: 'clip-1', type: 'image', content: 'image-1' });

    expect(result.copied).toBe(false);
    expect(window.api.setClipboardImage).not.toHaveBeenCalled();
    expect(window.api.setClipboardText).not.toHaveBeenCalled();
  });

  it('copies the full stored image rather than its thumbnail', async () => {
    vi.mocked(window.api.getFullImage).mockResolvedValueOnce(fullImage);

    const result = await copyClip(imageClip);

    expect(result.copied).toBe(true);
    expect(window.api.getFullImage).toHaveBeenCalledWith('image-1');
    expect(window.api.setClipboardImage).toHaveBeenCalledWith(fullImage);
    expect(window.api.setClipboardText).not.toHaveBeenCalled();
  });

  it('does not suppress clipboard changes while the full image is still loading', async () => {
    let resolveImage: (value: string) => void = () => {};
    vi.mocked(window.api.getFullImage).mockReturnValueOnce(
      new Promise<string>((resolve) => {
        resolveImage = resolve;
      })
    );
    const setIsHotkeyOperation = vi.fn();
    const { result } = renderHook(() =>
      useClipboardOperations(
        false,
        () => false,
        vi.fn(),
        () => imageClip,
        vi.fn(),
        setIsHotkeyOperation,
        vi.fn(),
        { current: [imageClip] },
        { current: false },
        { current: null }
      )
    );

    let copying: Promise<boolean> = Promise.resolve(false);
    await act(async () => {
      copying = result.current.copyClipToClipboard(0);
    });
    // A screenshot taken now must still be captured
    expect(setIsHotkeyOperation).not.toHaveBeenCalledWith(true);

    await act(async () => {
      resolveImage(fullImage);
      await copying;
    });
    expect(setIsHotkeyOperation).toHaveBeenCalledWith(true);
    expect(window.api.setClipboardImage).toHaveBeenCalledWith(fullImage);
  });

  it('copies legacy inline images', async () => {
    const result = await copyClip({ id: 'clip-1', type: 'image', content: fullImage });

    expect(result.copied).toBe(true);
    expect(window.api.getFullImage).not.toHaveBeenCalled();
    expect(window.api.setClipboardImage).toHaveBeenCalledWith(fullImage);
  });

  it('does not fall back to an ID when writing the full image fails', async () => {
    vi.mocked(window.api.getFullImage).mockResolvedValueOnce(fullImage);
    vi.mocked(window.api.setClipboardImage).mockRejectedValueOnce(new Error('Clipboard failed'));

    const result = await copyClip(imageClip);

    expect(result.copied).toBe(false);
    expect(window.api.setClipboardText).not.toHaveBeenCalled();
  });

  it('preserves the text fallback for legacy inline image data', async () => {
    vi.mocked(window.api.setClipboardImage).mockRejectedValueOnce(new Error('Clipboard failed'));

    const result = await copyClip({ id: 'clip-1', type: 'image', content: fullImage });

    expect(result.copied).toBe(true);
    expect(window.api.setClipboardText).toHaveBeenCalledWith(fullImage);
  });
});

describe('copyClipToClipboard formats', () => {
  it.each([
    ['text', 'plain', 'setClipboardText'],
    ['html', '<p>hello</p>', 'setClipboardHTML'],
    ['rtf', '{\\rtf1 hello}', 'setClipboardRTF'],
  ] as const)('copies %s through its clipboard writer', async (type, content, method) => {
    const result = await copyClip({ id: 'format', type, content });
    expect(result.copied).toBe(true);
    expect(window.api[method]).toHaveBeenCalledWith(content);
    expect(result.setClipCopyId).toHaveBeenLastCalledWith('format');
  });

  it('copies a bookmark through the shared bookmark writer', async () => {
    const result = await copyClip({
      id: 'bookmark',
      type: 'bookmark',
      content: 'Example',
      title: 'Example',
      url: 'https://example.com',
    });
    expect(result.copied).toBe(true);
    expect(window.api.setClipboardBookmark).toHaveBeenCalledWith({
      text: 'https://example.com',
      html: '<a href="https://example.com">Example</a>',
      title: 'Example',
      url: 'https://example.com',
    });
  });
});

describe('quick-clip hotkey requests', () => {
  const clipA: ClipItem = { id: 'a', type: 'text', content: 'A' };
  const clipB: ClipItem = { id: 'b', type: 'text', content: 'B' };
  const clipC: ClipItem = { id: 'c', type: 'text', content: 'C' };

  it('writes and reports the live row when the list changed before the listener refreshed', async () => {
    let hotkey: ((index: number) => Promise<void>) | undefined;
    vi.mocked(window.api.onCopyQuickClip).mockImplementation((callback) => {
      hotkey = callback as typeof hotkey;
      return () => {};
    });
    const rendered = [clipA, clipC];
    const clipsRef = { current: rendered };
    const setClipCopyId = vi.fn();
    renderHook(() =>
      useClipboardOperations(
        false,
        () => false,
        vi.fn(),
        (index) => rendered[index],
        setClipCopyId,
        vi.fn(),
        vi.fn(),
        clipsRef,
        { current: false },
        { current: null }
      )
    );

    // A capture inserts B at the top; the ref is updated during render, the listener is not
    // reinstalled until the effect re-runs.
    clipsRef.current = [clipB, clipA];
    await act(async () => {
      await hotkey!(1);
    });

    expect(window.api.setClipboardText).toHaveBeenCalledExactlyOnceWith('A');
    expect(setClipCopyId).toHaveBeenLastCalledWith('a');
    expect(window.api.quickClipCopyResult).toHaveBeenCalledExactlyOnceWith(clipA);
  });
});
