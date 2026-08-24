import { describe, it, expect, vi } from 'vitest';
import type { HotkeyActions } from './actions';
import { clipboard, nativeImage } from 'electron';
import { storage } from '../storage';
import { loadImage } from '../storage/image-store';
import { setSkipNextImageChange } from '../clipboard/monitoring';
import type { MockWindow } from './actions-test-types';

type WindowGetter = () => MockWindow;
type StoredClipMock = (...clips: Array<{ id: string; type: string; content: string }>) => unknown;
type ImageMock = (empty: boolean) => unknown;

export function registerCopyQuickClipCases(
  getActions: () => HotkeyActions,
  getWindow: WindowGetter,
  mockStoredClips: StoredClipMock,
  mockImage: ImageMock
): void {
  describe('copyQuickClip', () => {
    it('copies text clip to clipboard', async () => {
      mockStoredClips({ id: 'c1', type: 'text', content: 'hello' });
      await getActions().copyQuickClip(0);
      expect(clipboard.writeText).toHaveBeenCalledWith('hello');
    });

    it('copies html clip to clipboard', async () => {
      vi.mocked(storage.getClips).mockResolvedValue([
        { clip: { id: 'c1', type: 'html', content: '<p>hi</p>' }, isLocked: false, timestamp: 1 },
      ]);
      await getActions().copyQuickClip(0);
      expect(clipboard.writeHTML).toHaveBeenCalledWith('<p>hi</p>');
    });

    it('does nothing when index out of range', async () => {
      vi.mocked(storage.getClips).mockResolvedValue([]);
      await getActions().copyQuickClip(5);
      expect(clipboard.writeText).not.toHaveBeenCalled();
    });

    it('sends hotkey-clip-copied event to renderer', async () => {
      mockStoredClips({ id: 'c1', type: 'text', content: 'hello' });
      await getActions().copyQuickClip(0);
      expect(getWindow().webContents.send).toHaveBeenCalledWith('hotkey-clip-copied', 0);
    });

    it('copies rtf clip to clipboard', async () => {
      vi.mocked(storage.getClips).mockResolvedValue([
        {
          clip: { id: 'c1', type: 'rtf', content: '{\\rtf1 hello}' },
          isLocked: false,
          timestamp: 1,
        },
      ]);
      await getActions().copyQuickClip(0);
      expect(clipboard.writeRTF).toHaveBeenCalledWith('{\\rtf1 hello}');
    });

    it('copies bookmark clip with title and url', async () => {
      vi.mocked(storage.getClips).mockResolvedValue([
        {
          clip: {
            id: 'c1',
            type: 'bookmark',
            content: 'Example',
            title: 'Example',
            url: 'https://example.com',
          },
          isLocked: false,
          timestamp: 1,
        },
      ]);
      await getActions().copyQuickClip(0);
      expect(clipboard.writeBookmark).toHaveBeenCalledWith('Example', 'https://example.com');
    });

    it('copies bookmark clip as text when missing title/url', async () => {
      vi.mocked(storage.getClips).mockResolvedValue([
        {
          clip: { id: 'c1', type: 'bookmark', content: 'some content' },
          isLocked: false,
          timestamp: 1,
        },
      ]);
      await getActions().copyQuickClip(0);
      expect(clipboard.writeText).toHaveBeenCalledWith('some content');
    });

    it('copies image clip to clipboard', async () => {
      mockImage(false);
      mockStoredClips({ id: 'c1', type: 'image', content: 'data:image/png;base64,abc' });
      await getActions().copyQuickClip(0);
      expect(clipboard.writeImage).toHaveBeenCalled();
    });

    it('falls back to text for empty image', async () => {
      mockImage(true);
      mockStoredClips({ id: 'c1', type: 'image', content: 'data:image/png;base64,abc' });
      await getActions().copyQuickClip(0);
      expect(clipboard.writeText).toHaveBeenCalledWith('data:image/png;base64,abc');
    });

    it('falls back to text when image copy throws', async () => {
      vi.mocked(nativeImage.createFromDataURL).mockImplementation(() => {
        throw new Error('bad image');
      });
      vi.mocked(storage.getClips).mockResolvedValue([
        { clip: { id: 'c1', type: 'image', content: 'bad-data' }, isLocked: false, timestamp: 1 },
      ]);
      await getActions().copyQuickClip(0);
      expect(clipboard.writeText).toHaveBeenCalledWith('bad-data');
    });

    it('loads full image from image store when imageId is present', async () => {
      vi.mocked(loadImage).mockResolvedValue('data:image/png;base64,fullimage');
      mockImage(false);
      vi.mocked(storage.getClips).mockResolvedValue([
        {
          clip: {
            id: 'c1',
            type: 'image',
            content: 'data:image/png;base64,thumbnail',
            imageId: 'img-123',
          },
          isLocked: false,
          timestamp: 1,
        },
      ]);
      await getActions().copyQuickClip(0);
      expect(loadImage).toHaveBeenCalledWith('img-123', expect.stringContaining('clipless-data'));
      expect(setSkipNextImageChange).toHaveBeenCalled();
      expect(nativeImage.createFromDataURL).toHaveBeenCalledWith('data:image/png;base64,fullimage');
      expect(clipboard.writeImage).toHaveBeenCalled();
    });

    it('copies unknown type as text', async () => {
      vi.mocked(storage.getClips).mockResolvedValue([
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          clip: { id: 'c1', type: 'unknown' as any, content: 'fallback' },
          isLocked: false,
          timestamp: 1,
        },
      ]);
      await getActions().copyQuickClip(0);
      expect(clipboard.writeText).toHaveBeenCalledWith('fallback');
    });

    it('does not send event when window is destroyed', async () => {
      getWindow().isDestroyed.mockReturnValue(true);
      vi.mocked(storage.getClips).mockResolvedValue([
        { clip: { id: 'c1', type: 'text', content: 'hello' }, isLocked: false, timestamp: 1 },
      ]);
      await getActions().copyQuickClip(0);
      expect(getWindow().webContents.send).not.toHaveBeenCalled();
    });

    it('handles storage error gracefully', async () => {
      vi.mocked(storage.getClips).mockRejectedValue(new Error('fail'));
      await expect(getActions().copyQuickClip(0)).resolves.toBeUndefined();
    });

    it('handles null clip at valid index', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sparseClips = [null as any, { clip: { id: 'c1', type: 'text', content: 'hello' } }];
      vi.mocked(storage.getClips).mockResolvedValue(sparseClips);
      await getActions().copyQuickClip(0);
      expect(clipboard.writeText).not.toHaveBeenCalled();
    });
  });
}
