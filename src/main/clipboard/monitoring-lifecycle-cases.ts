import { describe, it, expect, vi } from 'vitest';
import { getCurrentClipboardData } from './data';
import {
  initializeClipboardMonitoring,
  startClipboardMonitoring,
  stopClipboardMonitoring,
  checkClipboardNow,
} from './monitoring';

type MockWindowFactory = (destroyed?: boolean) => {
  isDestroyed: () => boolean;
  webContents: { send: ReturnType<typeof vi.fn> };
};

export function registerMonitoringLifecycleCases(createMockWindow: MockWindowFactory): void {
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

      vi.mocked(getCurrentClipboardData).mockReturnValue({
        type: 'text',
        content: 'polled-text',
      });

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

      const result = stopClipboardMonitoring();
      expect(result).toBe(true);
    });
  });
}
