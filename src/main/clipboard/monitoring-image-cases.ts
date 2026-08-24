import { describe, it, expect, vi } from 'vitest';
import { getCurrentClipboardData } from './data';
import { saveImage } from '../storage/image-store';
import { generateId } from '../storage/search-terms';
import {
  initializeClipboardMonitoring,
  checkClipboard,
  setSkipNextImageChange,
  imageMetadata,
} from './monitoring';

type MockWindowFactory = (destroyed?: boolean) => {
  isDestroyed: () => boolean;
  webContents: { send: ReturnType<typeof vi.fn> };
};

export function registerClipboardImageCases(createMockWindow: MockWindowFactory): void {
  describe('checkClipboard images', () => {
    it('handles image content - saves to image store and sends with imageId + thumbnailDataUrl', async () => {
      vi.mocked(getCurrentClipboardData).mockReturnValue({ type: 'text', content: 'baseline' });
      const mockWindow = createMockWindow();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initializeClipboardMonitoring(mockWindow as any);

      vi.mocked(getCurrentClipboardData).mockReturnValue({
        type: 'image',
        content: 'data:image/png;base64,fulldata',
      });
      vi.mocked(generateId).mockReturnValue('img-uuid-123');
      vi.mocked(saveImage).mockResolvedValue('data:image/png;base64,thumbnail');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await checkClipboard(mockWindow as any);

      expect(generateId).toHaveBeenCalled();
      expect(saveImage).toHaveBeenCalledWith(
        'img-uuid-123',
        'data:image/png;base64,fulldata',
        expect.stringContaining('clipless-data')
      );
      expect(mockWindow.webContents.send).toHaveBeenCalledWith('clipboard-changed', {
        type: 'image',
        content: 'img-uuid-123',
        imageId: 'img-uuid-123',
        thumbnailDataUrl: 'data:image/png;base64,thumbnail',
        imageWidth: 640,
        imageHeight: 480,
        imageBytes: 6, // "fulldata" is 8 base64 characters
      });
    });

    it('imageMetadata measures a data URL without a comma as all payload', () => {
      expect(imageMetadata('abcd')).toEqual({ imageWidth: 640, imageHeight: 480, imageBytes: 3 });
    });

    it('skips image when skipNextImageChange flag is set', async () => {
      vi.mocked(getCurrentClipboardData).mockReturnValue({ type: 'text', content: 'base' });
      const mockWindow = createMockWindow();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initializeClipboardMonitoring(mockWindow as any);

      setSkipNextImageChange();

      vi.mocked(getCurrentClipboardData).mockReturnValue({
        type: 'image',
        content: 'data:image/png;base64,skip-me',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await checkClipboard(mockWindow as any);

      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
      expect(saveImage).not.toHaveBeenCalled();
    });

    it('resets skipNextImageChange flag after skipping once', async () => {
      vi.mocked(getCurrentClipboardData).mockReturnValue({ type: 'text', content: 'base2' });
      const mockWindow = createMockWindow();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initializeClipboardMonitoring(mockWindow as any);

      setSkipNextImageChange();

      vi.mocked(getCurrentClipboardData).mockReturnValue({
        type: 'image',
        content: 'data:image/png;base64,first',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await checkClipboard(mockWindow as any);
      expect(mockWindow.webContents.send).not.toHaveBeenCalled();

      vi.mocked(getCurrentClipboardData).mockReturnValue({
        type: 'image',
        content: 'data:image/png;base64,second',
      });
      vi.mocked(generateId).mockReturnValue('img-2');
      vi.mocked(saveImage).mockResolvedValue('data:image/png;base64,thumb2');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await checkClipboard(mockWindow as any);
      expect(mockWindow.webContents.send).toHaveBeenCalledWith('clipboard-changed', {
        type: 'image',
        content: 'img-2',
        imageId: 'img-2',
        thumbnailDataUrl: 'data:image/png;base64,thumb2',
        imageWidth: 640,
        imageHeight: 480,
        imageBytes: 5,
      });
    });

    it('handles image save failure by falling back to sending raw data', async () => {
      vi.mocked(getCurrentClipboardData).mockReturnValue({ type: 'text', content: 'pre-fail' });
      const mockWindow = createMockWindow();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initializeClipboardMonitoring(mockWindow as any);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(getCurrentClipboardData).mockReturnValue({
        type: 'image',
        content: 'data:image/png;base64,fallback',
      });
      vi.mocked(generateId).mockReturnValue('fail-id');
      vi.mocked(saveImage).mockRejectedValue(new Error('disk full'));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await checkClipboard(mockWindow as any);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to save image to image store:',
        expect.any(Error)
      );
      expect(mockWindow.webContents.send).toHaveBeenCalledWith('clipboard-changed', {
        type: 'image',
        content: 'data:image/png;base64,fallback',
      });

      consoleErrorSpy.mockRestore();
    });

    it('does nothing when clipboard data is null', async () => {
      vi.mocked(getCurrentClipboardData).mockReturnValue({ type: 'text', content: 'setup' });
      const mockWindow = createMockWindow();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initializeClipboardMonitoring(mockWindow as any);

      vi.mocked(getCurrentClipboardData).mockReturnValue(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await checkClipboard(mockWindow as any);

      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('does nothing when mainWindow is null', async () => {
      vi.mocked(getCurrentClipboardData).mockReturnValue({ type: 'text', content: 'null-win' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initializeClipboardMonitoring(null as any);

      vi.mocked(getCurrentClipboardData).mockReturnValue({ type: 'text', content: 'changed' });
      await checkClipboard(null);
    });

    it('does nothing when mainWindow is destroyed', async () => {
      vi.mocked(getCurrentClipboardData).mockReturnValue({
        type: 'text',
        content: 'destroyed-win',
      });
      const mockWindow = createMockWindow(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initializeClipboardMonitoring(mockWindow as any);

      const destroyedWindow = createMockWindow(true);
      vi.mocked(getCurrentClipboardData).mockReturnValue({
        type: 'text',
        content: 'after-destroy',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await checkClipboard(destroyedWindow as any);

      expect(destroyedWindow.webContents.send).not.toHaveBeenCalled();
    });
  });
}
