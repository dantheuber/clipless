import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/mock/userData'),
  },
  BrowserWindow: vi.fn(),
}));

vi.mock('./data', () => ({
  getCurrentClipboardData: vi.fn(),
}));

vi.mock('../storage/image-store', () => ({
  saveImage: vi.fn(),
}));

vi.mock('../storage/search-terms', () => ({
  generateId: vi.fn(),
}));

import { getCurrentClipboardData } from './data';
import { saveImage } from '../storage/image-store';
import { generateId } from '../storage/search-terms';
import {
  initializeClipboardMonitoring,
  checkClipboard,
  startClipboardMonitoring,
  stopClipboardMonitoring,
  setSkipNextImageChange,
} from './monitoring';

function createMockWindow(destroyed = false): {
  isDestroyed: () => boolean;
  webContents: { send: ReturnType<typeof vi.fn> };
} {
  return {
    isDestroyed: () => destroyed,
    webContents: { send: vi.fn() },
  };
}

describe('monitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Reset internal state by simulating a null clipboard read
    // so lastClipboardContent/lastClipboardType become predictable
    vi.mocked(getCurrentClipboardData).mockReturnValue(null);
  });

  afterEach(() => {
    stopClipboardMonitoring();
    vi.useRealTimers();
  });

  describe('initializeClipboardMonitoring', () => {
    it('captures initial clipboard state when clipboard has data', () => {
      vi.mocked(getCurrentClipboardData).mockReturnValue({ type: 'text', content: 'initial' });
      const mockWindow = createMockWindow();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initializeClipboardMonitoring(mockWindow as any);

      // Verify it captured state by checking that checkClipboard
      // does NOT fire for the same content
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      checkClipboard(mockWindow as any);
      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('handles null clipboard data during initialization', () => {
      vi.mocked(getCurrentClipboardData).mockReturnValue(null);
      const mockWindow = createMockWindow();

      // Should not throw
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initializeClipboardMonitoring(mockWindow as any);

      // After init with null, sending new text should trigger change
      vi.mocked(getCurrentClipboardData).mockReturnValue({ type: 'text', content: 'new' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      checkClipboard(mockWindow as any);
      expect(mockWindow.webContents.send).toHaveBeenCalledWith('clipboard-changed', {
        type: 'text',
        content: 'new',
      });
    });
  });

  describe('checkClipboard', () => {
    it('detects new text content and sends clipboard-changed', async () => {
      // First, set a known baseline state
      vi.mocked(getCurrentClipboardData).mockReturnValue({ type: 'text', content: 'old-text' });
      const mockWindow = createMockWindow();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initializeClipboardMonitoring(mockWindow as any);

      // Now change the clipboard content
      vi.mocked(getCurrentClipboardData).mockReturnValue({ type: 'text', content: 'new-text' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await checkClipboard(mockWindow as any);

      expect(mockWindow.webContents.send).toHaveBeenCalledWith('clipboard-changed', {
        type: 'text',
        content: 'new-text',
      });
    });

    it('skips when content has not changed', async () => {
      vi.mocked(getCurrentClipboardData).mockReturnValue({ type: 'text', content: 'same' });
      const mockWindow = createMockWindow();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initializeClipboardMonitoring(mockWindow as any);

      // Same content, same type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await checkClipboard(mockWindow as any);
      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('detects change when type changes but content is the same', async () => {
      vi.mocked(getCurrentClipboardData).mockReturnValue({ type: 'text', content: 'data' });
      const mockWindow = createMockWindow();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initializeClipboardMonitoring(mockWindow as any);

      // Same content, different type
      vi.mocked(getCurrentClipboardData).mockReturnValue({ type: 'html', content: 'data' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await checkClipboard(mockWindow as any);
      expect(mockWindow.webContents.send).toHaveBeenCalledWith('clipboard-changed', {
        type: 'html',
        content: 'data',
      });
    });

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
      });
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

      // First image - should be skipped
      vi.mocked(getCurrentClipboardData).mockReturnValue({
        type: 'image',
        content: 'data:image/png;base64,first',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await checkClipboard(mockWindow as any);
      expect(mockWindow.webContents.send).not.toHaveBeenCalled();

      // Second image - flag should be cleared, so this should be processed
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

      // Should not throw; no send should occur
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

    it('skipNextImageChange flag does not affect non-image types', async () => {
      vi.mocked(getCurrentClipboardData).mockReturnValue({
        type: 'text',
        content: 'skip-text-base',
      });
      const mockWindow = createMockWindow();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initializeClipboardMonitoring(mockWindow as any);

      setSkipNextImageChange();

      vi.mocked(getCurrentClipboardData).mockReturnValue({
        type: 'text',
        content: 'new-text-content',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await checkClipboard(mockWindow as any);

      // Text changes should still be sent even with skip flag set
      expect(mockWindow.webContents.send).toHaveBeenCalledWith('clipboard-changed', {
        type: 'text',
        content: 'new-text-content',
      });
    });
  });

  describe('setSkipNextImageChange', () => {
    it('sets the flag so next image change is skipped', async () => {
      vi.mocked(getCurrentClipboardData).mockReturnValue({
        type: 'text',
        content: 'flag-test-base',
      });
      const mockWindow = createMockWindow();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initializeClipboardMonitoring(mockWindow as any);

      setSkipNextImageChange();

      vi.mocked(getCurrentClipboardData).mockReturnValue({
        type: 'image',
        content: 'data:image/png;base64,flagtest',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await checkClipboard(mockWindow as any);

      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
    });
  });

  describe('startClipboardMonitoring', () => {
    it('starts interval polling that calls checkClipboard', () => {
      vi.mocked(getCurrentClipboardData).mockReturnValue({
        type: 'text',
        content: 'poll-start',
      });
      const mockWindow = createMockWindow();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initializeClipboardMonitoring(mockWindow as any);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = startClipboardMonitoring(mockWindow as any);
      expect(result).toBe(true);

      // Change clipboard content
      vi.mocked(getCurrentClipboardData).mockReturnValue({
        type: 'text',
        content: 'polled-text',
      });

      // Advance timer by 250ms (one interval)
      vi.advanceTimersByTime(250);

      expect(mockWindow.webContents.send).toHaveBeenCalledWith('clipboard-changed', {
        type: 'text',
        content: 'polled-text',
      });
    });

    it('clears previous interval when called again', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      vi.mocked(getCurrentClipboardData).mockReturnValue({
        type: 'text',
        content: 'double-start',
      });
      const mockWindow = createMockWindow();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initializeClipboardMonitoring(mockWindow as any);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      startClipboardMonitoring(mockWindow as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      startClipboardMonitoring(mockWindow as any);

      // clearInterval should have been called for the first interval
      expect(clearIntervalSpy).toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
    });

    it('returns true', () => {
      const mockWindow = createMockWindow();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = startClipboardMonitoring(mockWindow as any);
      expect(result).toBe(true);
    });
  });

  describe('stopClipboardMonitoring', () => {
    it('stops interval polling and returns true', () => {
      const mockWindow = createMockWindow();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      startClipboardMonitoring(mockWindow as any);

      const result = stopClipboardMonitoring();
      expect(result).toBe(true);

      // Change clipboard - should not trigger send since monitoring stopped
      vi.mocked(getCurrentClipboardData).mockReturnValue({
        type: 'text',
        content: 'after-stop',
      });
      vi.advanceTimersByTime(500);
      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('returns true even when no interval is running', () => {
      const result = stopClipboardMonitoring();
      expect(result).toBe(true);
    });

    it('sets interval reference to null', () => {
      const mockWindow = createMockWindow();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      startClipboardMonitoring(mockWindow as any);
      stopClipboardMonitoring();

      // Calling stop again should still work (no error on clearing null)
      const result = stopClipboardMonitoring();
      expect(result).toBe(true);
    });
  });
});
