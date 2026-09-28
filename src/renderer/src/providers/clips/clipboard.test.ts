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
