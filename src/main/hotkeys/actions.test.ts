import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('electron', () => ({
  BrowserWindow: vi.fn(),
  app: {
    focus: vi.fn(),
    getPath: vi.fn().mockReturnValue('/mock/userData'),
  },
  clipboard: {
    writeText: vi.fn(),
    writeHTML: vi.fn(),
    writeRTF: vi.fn(),
    writeImage: vi.fn(),
    writeBookmark: vi.fn(),
  },
  nativeImage: {
    createFromDataURL: vi.fn().mockReturnValue({
      isEmpty: () => false,
    }),
  },
}));

vi.mock('../storage', () => ({
  storage: {
    getClips: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../notifications', () => ({
  showNotification: vi.fn(),
}));

vi.mock('../storage/image-store', () => ({
  loadImage: vi.fn().mockResolvedValue('data:image/png;base64,fullimage'),
}));

vi.mock('../clipboard/monitoring', () => ({
  setSkipNextImageChange: vi.fn(),
  checkClipboardNow: vi.fn().mockResolvedValue(false),
}));

import { HotkeyActions, clipSummary } from './actions';
import { clipboard, nativeImage, app } from 'electron';
import { storage } from '../storage';
import { showNotification } from '../notifications';
import { loadImage } from '../storage/image-store';
import { setSkipNextImageChange, checkClipboardNow } from '../clipboard/monitoring';

describe('HotkeyActions', () => {
  let actions: HotkeyActions;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockWindow: any;

  beforeEach(() => {
    vi.clearAllMocks();
    actions = new HotkeyActions();
    mockWindow = {
      isVisible: vi.fn().mockReturnValue(true),
      isFocused: vi.fn().mockReturnValue(false),
      isMinimized: vi.fn().mockReturnValue(false),
      isDestroyed: vi.fn().mockReturnValue(false),
      show: vi.fn(),
      hide: vi.fn(),
      focus: vi.fn(),
      restore: vi.fn(),
      webContents: { send: vi.fn() },
    };
    actions.setMainWindow(mockWindow);
  });

  describe('focusWindow', () => {
    it('hides window when visible and focused', () => {
      mockWindow.isFocused.mockReturnValue(true);
      actions.focusWindow();
      expect(mockWindow.hide).toHaveBeenCalled();
    });

    it('shows and focuses window when not focused', () => {
      actions.focusWindow();
      expect(mockWindow.show).toHaveBeenCalled();
      expect(mockWindow.focus).toHaveBeenCalled();
    });

    it('restores minimized window', () => {
      mockWindow.isMinimized.mockReturnValue(true);
      actions.focusWindow();
      expect(mockWindow.restore).toHaveBeenCalled();
    });

    it('does nothing when no window set', () => {
      actions.setMainWindow(null);
      expect(() => actions.focusWindow()).not.toThrow();
    });
  });

  describe('copyQuickClip', () => {
    it('copies text clip to clipboard', async () => {
      vi.mocked(storage.getClips).mockResolvedValue([
        { clip: { id: 'c1', type: 'text', content: 'hello' }, isLocked: false, timestamp: 1 },
      ]);
      await actions.copyQuickClip(0);
      expect(clipboard.writeText).toHaveBeenCalledWith('hello');
    });

    it('copies html clip to clipboard', async () => {
      vi.mocked(storage.getClips).mockResolvedValue([
        { clip: { id: 'c1', type: 'html', content: '<p>hi</p>' }, isLocked: false, timestamp: 1 },
      ]);
      await actions.copyQuickClip(0);
      expect(clipboard.writeHTML).toHaveBeenCalledWith('<p>hi</p>');
    });

    it('does nothing when index out of range', async () => {
      vi.mocked(storage.getClips).mockResolvedValue([]);
      await actions.copyQuickClip(5);
      expect(clipboard.writeText).not.toHaveBeenCalled();
    });

    it('sends hotkey-clip-copied event to renderer', async () => {
      vi.mocked(storage.getClips).mockResolvedValue([
        { clip: { id: 'c1', type: 'text', content: 'hello' }, isLocked: false, timestamp: 1 },
      ]);
      await actions.copyQuickClip(0);
      expect(mockWindow.webContents.send).toHaveBeenCalledWith('hotkey-clip-copied', 0);
    });

    it('copies rtf clip to clipboard', async () => {
      vi.mocked(storage.getClips).mockResolvedValue([
        {
          clip: { id: 'c1', type: 'rtf', content: '{\\rtf1 hello}' },
          isLocked: false,
          timestamp: 1,
        },
      ]);
      await actions.copyQuickClip(0);
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
      await actions.copyQuickClip(0);
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
      await actions.copyQuickClip(0);
      expect(clipboard.writeText).toHaveBeenCalledWith('some content');
    });

    it('copies image clip to clipboard', async () => {
      vi.mocked(nativeImage.createFromDataURL).mockReturnValue({
        isEmpty: () => false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      vi.mocked(storage.getClips).mockResolvedValue([
        {
          clip: { id: 'c1', type: 'image', content: 'data:image/png;base64,abc' },
          isLocked: false,
          timestamp: 1,
        },
      ]);
      await actions.copyQuickClip(0);
      expect(clipboard.writeImage).toHaveBeenCalled();
    });

    it('falls back to text for empty image', async () => {
      vi.mocked(nativeImage.createFromDataURL).mockReturnValue({
        isEmpty: () => true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      vi.mocked(storage.getClips).mockResolvedValue([
        {
          clip: { id: 'c1', type: 'image', content: 'data:image/png;base64,abc' },
          isLocked: false,
          timestamp: 1,
        },
      ]);
      await actions.copyQuickClip(0);
      expect(clipboard.writeText).toHaveBeenCalledWith('data:image/png;base64,abc');
    });

    it('falls back to text when image copy throws', async () => {
      vi.mocked(nativeImage.createFromDataURL).mockImplementation(() => {
        throw new Error('bad image');
      });
      vi.mocked(storage.getClips).mockResolvedValue([
        { clip: { id: 'c1', type: 'image', content: 'bad-data' }, isLocked: false, timestamp: 1 },
      ]);
      await actions.copyQuickClip(0);
      expect(clipboard.writeText).toHaveBeenCalledWith('bad-data');
    });

    it('loads full image from image store when imageId is present', async () => {
      vi.mocked(loadImage).mockResolvedValue('data:image/png;base64,fullimage');
      vi.mocked(nativeImage.createFromDataURL).mockReturnValue({
        isEmpty: () => false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
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
      await actions.copyQuickClip(0);
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
      await actions.copyQuickClip(0);
      expect(clipboard.writeText).toHaveBeenCalledWith('fallback');
    });

    it('does not send event when window is destroyed', async () => {
      mockWindow.isDestroyed.mockReturnValue(true);
      vi.mocked(storage.getClips).mockResolvedValue([
        { clip: { id: 'c1', type: 'text', content: 'hello' }, isLocked: false, timestamp: 1 },
      ]);
      await actions.copyQuickClip(0);
      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('handles storage error gracefully', async () => {
      vi.mocked(storage.getClips).mockRejectedValue(new Error('fail'));
      await expect(actions.copyQuickClip(0)).resolves.toBeUndefined();
    });

    it('handles null clip at valid index', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sparseClips = [null as any, { clip: { id: 'c1', type: 'text', content: 'hello' } }];
      vi.mocked(storage.getClips).mockResolvedValue(sparseClips);
      await actions.copyQuickClip(0);
      expect(clipboard.writeText).not.toHaveBeenCalled();
    });
  });

  describe('toggleSearchBar', () => {
    it('sends toggle-search event', () => {
      actions.toggleSearchBar();
      expect(mockWindow.webContents.send).toHaveBeenCalledWith('toggle-search');
    });

    it('shows window if hidden', () => {
      mockWindow.isVisible.mockReturnValue(false);
      actions.toggleSearchBar();
      expect(mockWindow.show).toHaveBeenCalled();
    });

    it('restores minimized window before toggling search', () => {
      mockWindow.isVisible.mockReturnValue(true);
      mockWindow.isMinimized.mockReturnValue(true);
      actions.toggleSearchBar();
      expect(mockWindow.restore).toHaveBeenCalled();
      expect(mockWindow.webContents.send).toHaveBeenCalledWith('toggle-search');
    });

    it('does nothing when no window set', () => {
      actions.setMainWindow(null);
      expect(() => actions.toggleSearchBar()).not.toThrow();
    });

    it('handles error gracefully', () => {
      mockWindow.isVisible.mockImplementation(() => {
        throw new Error('error');
      });
      expect(() => actions.toggleSearchBar()).not.toThrow();
    });
  });

  describe('focusWindow - additional', () => {
    it('handles error gracefully', () => {
      mockWindow.isVisible.mockImplementation(() => {
        throw new Error('error');
      });
      expect(() => actions.focusWindow()).not.toThrow();
    });

    it('calls app.focus on macOS when showing window', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin', writable: true });

      mockWindow.isVisible.mockReturnValue(false);
      mockWindow.isMinimized.mockReturnValue(false);

      actions.focusWindow();

      expect(app.focus).toHaveBeenCalled();

      Object.defineProperty(process, 'platform', { value: originalPlatform, writable: true });
    });
  });

  describe('toggleSearchBar - macOS', () => {
    it('calls app.focus on macOS when showing window', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin', writable: true });

      mockWindow.isVisible.mockReturnValue(false);
      mockWindow.isMinimized.mockReturnValue(false);

      actions.toggleSearchBar();

      expect(app.focus).toHaveBeenCalled();

      Object.defineProperty(process, 'platform', { value: originalPlatform, writable: true });
    });
  });

  describe('quickLook', () => {
    it('checks the clipboard, shows the window and sends open-quick-look with pending', async () => {
      vi.mocked(checkClipboardNow).mockResolvedValue(true);

      await actions.quickLook();

      expect(checkClipboardNow).toHaveBeenCalledTimes(1);
      expect(mockWindow.show).toHaveBeenCalled();
      expect(mockWindow.focus).toHaveBeenCalled();
      expect(mockWindow.webContents.send).toHaveBeenCalledWith('open-quick-look', {
        pending: true,
      });
    });

    it('reports pending false when the poll found no change', async () => {
      vi.mocked(checkClipboardNow).mockResolvedValue(false);
      mockWindow.isMinimized.mockReturnValue(true);

      await actions.quickLook();

      expect(mockWindow.restore).toHaveBeenCalled();
      expect(mockWindow.webContents.send).toHaveBeenCalledWith('open-quick-look', {
        pending: false,
      });
    });

    it('does nothing without a window or with a destroyed one', async () => {
      actions.setMainWindow(null);
      await expect(actions.quickLook()).resolves.toBeUndefined();
      expect(checkClipboardNow).not.toHaveBeenCalled();

      mockWindow.isDestroyed.mockReturnValue(true);
      actions.setMainWindow(mockWindow);
      await actions.quickLook();
      expect(checkClipboardNow).not.toHaveBeenCalled();
    });

    it('logs and keeps going when the clipboard check throws', async () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(checkClipboardNow).mockRejectedValue(new Error('poll failed'));
      await expect(actions.quickLook()).resolves.toBeUndefined();
      expect(errSpy).toHaveBeenCalledWith('Error opening quick look:', expect.any(Error));
      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
      errSpy.mockRestore();
    });
  });

  describe('clipSummary', () => {
    it('names the first non-empty line, trimmed to 80 characters', () => {
      expect(clipSummary({ id: 'a', type: 'text', content: '\n  first line \nsecond' })).toBe(
        'first line'
      );
      const long = 'x'.repeat(100);
      expect(clipSummary({ id: 'a', type: 'text', content: long })).toHaveLength(80);
      expect(clipSummary({ id: 'a', type: 'text', content: '   ' })).toBe('');
    });

    it('uses the extracted text for html, the title for a bookmark, and Image for images', () => {
      expect(clipSummary({ id: 'a', type: 'html', content: '<p>x</p>', text: 'plain' })).toBe(
        'plain'
      );
      expect(clipSummary({ id: 'a', type: 'rtf', content: '{\\rtf1 x}' })).toBe('{\\rtf1 x}');
      expect(
        clipSummary({
          id: 'a',
          type: 'bookmark',
          content: 'https://x',
          title: 'T',
          url: 'https://x',
        })
      ).toBe('T');
      expect(
        clipSummary({ id: 'a', type: 'bookmark', content: 'https://x', url: 'https://x' })
      ).toBe('https://x');
      expect(clipSummary({ id: 'a', type: 'bookmark', content: 'https://c' })).toBe('https://c');
      expect(clipSummary({ id: 'a', type: 'image', content: 'img' })).toBe('Image');
    });

    it('is what the hotkey copy notification says', async () => {
      vi.mocked(storage.getClips).mockResolvedValue([
        {
          clip: { id: 'c1', type: 'text', content: 'hello there\nmore' },
          isLocked: false,
          timestamp: 1,
        },
      ]);
      await actions.copyQuickClip(0);
      expect(showNotification).toHaveBeenCalledWith('Clip copied', 'hello there');
    });
  });
});
