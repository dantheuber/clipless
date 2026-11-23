import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/mock/userData'),
  },
  BrowserWindow: vi.fn(),
  nativeImage: {
    createFromDataURL: vi.fn().mockReturnValue({ getSize: () => ({ width: 640, height: 480 }) }),
  },
}));

vi.mock('./data', () => ({
  getCurrentClipboardData: vi.fn(),
  imageDataUrlFingerprint: vi.fn((dataUrl: string) => `fp:${dataUrl}`),
}));

vi.mock('../storage/image-store', () => ({
  saveImage: vi.fn(),
}));

vi.mock('../storage/search-terms', () => ({
  generateId: vi.fn(),
}));

import { getCurrentClipboardData, imageDataUrlFingerprint } from './data';
import { saveImage } from '../storage/image-store';
import { generateId } from '../storage/search-terms';
import {
  initializeClipboardMonitoring,
  checkClipboard,
  startClipboardMonitoring,
  stopClipboardMonitoring,
  setSkipNextImageChange,
  checkClipboardNow,
  imageMetadata,
  readClipboardForRenderer,
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

    it('returns whether a change was sent', async () => {
      vi.mocked(getCurrentClipboardData).mockReturnValue({ type: 'text', content: 'r1' });
      const mockWindow = createMockWindow();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initializeClipboardMonitoring(mockWindow as any);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(checkClipboard(mockWindow as any)).resolves.toBe(false);
      vi.mocked(getCurrentClipboardData).mockReturnValue({ type: 'text', content: 'r2' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(checkClipboard(mockWindow as any)).resolves.toBe(true);
      vi.mocked(getCurrentClipboardData).mockReturnValue({ type: 'text', content: 'r3' });
      await expect(checkClipboard(null)).resolves.toBe(false);
    });

    it('extracts text for html clips before sending', async () => {
      vi.mocked(getCurrentClipboardData).mockReturnValue({ type: 'text', content: 'pre-html' });
      const mockWindow = createMockWindow();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initializeClipboardMonitoring(mockWindow as any);

      vi.mocked(getCurrentClipboardData).mockReturnValue({
        type: 'html',
        content: '<p>Hi &amp; <b>bye</b></p><script>alert(1)</script>',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await checkClipboard(mockWindow as any);

      expect(mockWindow.webContents.send).toHaveBeenCalledWith('clipboard-changed', {
        type: 'html',
        content: '<p>Hi &amp; <b>bye</b></p><script>alert(1)</script>',
        text: 'Hi & bye',
      });
    });

    it('extracts text for rtf clips before sending', async () => {
      vi.mocked(getCurrentClipboardData).mockReturnValue({ type: 'text', content: 'pre-rtf' });
      const mockWindow = createMockWindow();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initializeClipboardMonitoring(mockWindow as any);

      vi.mocked(getCurrentClipboardData).mockReturnValue({
        type: 'rtf',
        content: "{\\rtf1 caf\\'e9\\par done}",
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await checkClipboard(mockWindow as any);

      expect(mockWindow.webContents.send).toHaveBeenCalledWith('clipboard-changed', {
        type: 'rtf',
        content: "{\\rtf1 caf\\'e9\\par done}",
        text: 'café\ndone',
      });
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
        text: 'data',
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

      setSkipNextImageChange('data:image/png;base64,skip-me');

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

      setSkipNextImageChange('data:image/png;base64,first');

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
        imageWidth: 640,
        imageHeight: 480,
        imageBytes: 5,
      });
    });

    it('captures a different image that arrives while a skip is pending', async () => {
      vi.mocked(getCurrentClipboardData).mockReturnValue({ type: 'text', content: 'base3' });
      const mockWindow = createMockWindow();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initializeClipboardMonitoring(mockWindow as any);

      setSkipNextImageChange('data:image/png;base64,written');

      vi.mocked(getCurrentClipboardData).mockReturnValue({
        type: 'image',
        content: 'data:image/png;base64,screenshot',
      });
      vi.mocked(generateId).mockReturnValue('img-shot');
      vi.mocked(saveImage).mockResolvedValue('data:image/png;base64,thumb-shot');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(checkClipboard(mockWindow as any)).resolves.toBe(true);
      expect(saveImage).toHaveBeenCalledWith(
        'img-shot',
        'data:image/png;base64,screenshot',
        expect.any(String)
      );
    });

    it('re-writing the image already on the clipboard does not drop the next screenshot', async () => {
      // Row 1 is the image on the clipboard; monitoring has already seen it
      vi.mocked(getCurrentClipboardData).mockReturnValue({
        type: 'image',
        content: 'data:image/png;base64,row1',
      });
      const mockWindow = createMockWindow();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initializeClipboardMonitoring(mockWindow as any);

      // Clicking row 1 writes the same image back: the poll sees no change
      setSkipNextImageChange('data:image/png;base64,row1');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(checkClipboard(mockWindow as any)).resolves.toBe(false);

      // The next screenshot must be captured
      vi.mocked(getCurrentClipboardData).mockReturnValue({
        type: 'image',
        content: 'data:image/png;base64,row2',
      });
      vi.mocked(generateId).mockReturnValue('img-row2');
      vi.mocked(saveImage).mockResolvedValue('data:image/png;base64,thumb-row2');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(checkClipboard(mockWindow as any)).resolves.toBe(true);
      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        'clipboard-changed',
        expect.objectContaining({ type: 'image', imageId: 'img-row2' })
      );
    });

    it('a text change after the write clears the pending skip', async () => {
      vi.mocked(getCurrentClipboardData).mockReturnValue({ type: 'text', content: 'base4' });
      const mockWindow = createMockWindow();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initializeClipboardMonitoring(mockWindow as any);

      // The hotkey fell back to writing the data URL as text
      setSkipNextImageChange('data:image/png;base64,fallback-text');
      vi.mocked(getCurrentClipboardData).mockReturnValue({
        type: 'text',
        content: 'data:image/png;base64,fallback-text',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(checkClipboard(mockWindow as any)).resolves.toBe(true);

      // A later image with the same content as the write is a real copy, not the echo
      vi.mocked(getCurrentClipboardData).mockReturnValue({
        type: 'image',
        content: 'data:image/png;base64,fallback-text',
      });
      vi.mocked(generateId).mockReturnValue('img-later');
      vi.mocked(saveImage).mockResolvedValue('data:image/png;base64,thumb-later');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(checkClipboard(mockWindow as any)).resolves.toBe(true);
      expect(saveImage).toHaveBeenCalledWith('img-later', expect.any(String), expect.any(String));
    });

    it('a stale skip does not survive an unchanged poll', async () => {
      vi.mocked(getCurrentClipboardData).mockReturnValue({ type: 'text', content: 'base5' });
      const mockWindow = createMockWindow();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initializeClipboardMonitoring(mockWindow as any);

      setSkipNextImageChange('data:image/png;base64,stale');
      // Nothing changed on the clipboard after the write
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(checkClipboard(mockWindow as any)).resolves.toBe(false);

      vi.mocked(getCurrentClipboardData).mockReturnValue({
        type: 'image',
        content: 'data:image/png;base64,stale',
      });
      vi.mocked(generateId).mockReturnValue('img-stale');
      vi.mocked(saveImage).mockResolvedValue('data:image/png;base64,thumb-stale');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(checkClipboard(mockWindow as any)).resolves.toBe(true);
    });

    it('skips an image whose data URL was re-encoded but decodes to the written pixels', async () => {
      vi.mocked(getCurrentClipboardData).mockReturnValue({ type: 'text', content: 'base6' });
      const mockWindow = createMockWindow();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initializeClipboardMonitoring(mockWindow as any);

      vi.mocked(imageDataUrlFingerprint).mockReturnValue('same-pixels');
      setSkipNextImageChange('data:image/jpeg;base64,written-jpeg');

      vi.mocked(getCurrentClipboardData).mockReturnValue({
        type: 'image',
        content: 'data:image/png;base64,read-back-png',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(checkClipboard(mockWindow as any)).resolves.toBe(false);
      expect(saveImage).not.toHaveBeenCalled();
      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
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

      setSkipNextImageChange('data:image/png;base64,written');

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

      setSkipNextImageChange('data:image/png;base64,flagtest');

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

  describe('checkClipboardNow', () => {
    it('checks against the monitored window and reports a change', async () => {
      vi.mocked(getCurrentClipboardData).mockReturnValue({ type: 'text', content: 'now-base' });
      const mockWindow = createMockWindow();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initializeClipboardMonitoring(mockWindow as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      startClipboardMonitoring(mockWindow as any);

      vi.mocked(getCurrentClipboardData).mockReturnValue({ type: 'text', content: 'now-new' });
      await expect(checkClipboardNow()).resolves.toBe(true);
      expect(mockWindow.webContents.send).toHaveBeenCalledWith('clipboard-changed', {
        type: 'text',
        content: 'now-new',
      });

      await expect(checkClipboardNow()).resolves.toBe(false);
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

  describe('readClipboardForRenderer', () => {
    it('extracts the text of html and rtf, as a monitored change does', () => {
      vi.mocked(getCurrentClipboardData).mockReturnValue({ type: 'html', content: '<b>hello</b>' });
      expect(readClipboardForRenderer()).toEqual({
        type: 'html',
        content: '<b>hello</b>',
        text: 'hello',
      });

      const rtf = '{\\rtf1 hello}';
      vi.mocked(getCurrentClipboardData).mockReturnValue({ type: 'rtf', content: rtf });
      expect(readClipboardForRenderer()).toMatchObject({
        type: 'rtf',
        content: rtf,
        text: 'hello',
      });
    });

    it('passes the other types and an empty clipboard through', () => {
      vi.mocked(getCurrentClipboardData).mockReturnValue({ type: 'text', content: 'plain' });
      expect(readClipboardForRenderer()).toEqual({ type: 'text', content: 'plain' });

      vi.mocked(getCurrentClipboardData).mockReturnValue(null);
      expect(readClipboardForRenderer()).toBeNull();
    });
  });
});
