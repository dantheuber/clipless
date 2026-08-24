import { describe, it, expect, vi } from 'vitest';
import { getCurrentClipboardData } from './data';
import {
  initializeClipboardMonitoring,
  checkClipboard,
  setSkipNextImageChange,
} from './monitoring';

type MockWindowFactory = (destroyed?: boolean) => {
  isDestroyed: () => boolean;
  webContents: { send: ReturnType<typeof vi.fn> };
};

export function registerClipboardTextCases(createMockWindow: MockWindowFactory): void {
  describe('checkClipboard text formats', () => {
    it('detects new text content and sends clipboard-changed', async () => {
      vi.mocked(getCurrentClipboardData).mockReturnValue({ type: 'text', content: 'old-text' });
      const mockWindow = createMockWindow();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initializeClipboardMonitoring(mockWindow as any);

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

      vi.mocked(getCurrentClipboardData).mockReturnValue({ type: 'html', content: 'data' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await checkClipboard(mockWindow as any);
      expect(mockWindow.webContents.send).toHaveBeenCalledWith('clipboard-changed', {
        type: 'html',
        content: 'data',
        text: 'data',
      });
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

      expect(mockWindow.webContents.send).toHaveBeenCalledWith('clipboard-changed', {
        type: 'text',
        content: 'new-text-content',
      });
    });
  });
}
