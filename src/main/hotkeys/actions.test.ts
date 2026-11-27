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

vi.mock('../analytics', () => ({ recordFeatureUsage: vi.fn() }));

vi.mock('../clipboard/monitoring', () => ({
  setSkipNextImageChange: vi.fn(),
  checkClipboardNow: vi.fn().mockResolvedValue(false),
}));

import { HotkeyActions, clipSummary, reportQuickClipCopy } from './actions';
import { clipboard, app } from 'electron';
import { storage } from '../storage';
import { recordFeatureUsage } from '../analytics';
import { showNotification } from '../notifications';
import { checkClipboardNow } from '../clipboard/monitoring';

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
    it('asks the renderer to copy the live row without reading saved clips', async () => {
      await actions.copyQuickClip(1);
      expect(mockWindow.webContents.send).toHaveBeenCalledExactlyOnceWith('copy-quick-clip', 1);
      expect(storage.getClips).not.toHaveBeenCalled();
      expect(clipboard.writeText).not.toHaveBeenCalled();
      expect(recordFeatureUsage).not.toHaveBeenCalled();
      expect(showNotification).not.toHaveBeenCalled();
    });

    it('does nothing without a window or with a destroyed window', async () => {
      actions.setMainWindow(null);
      await actions.copyQuickClip(0);
      actions.setMainWindow(mockWindow);
      mockWindow.isDestroyed.mockReturnValue(true);
      await actions.copyQuickClip(0);
      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
      expect(storage.getClips).not.toHaveBeenCalled();
    });

    it('reports failure if the renderer cannot be reached', async () => {
      mockWindow.webContents.send.mockImplementation(() => {
        throw new Error('unavailable');
      });
      await expect(actions.copyQuickClip(0)).resolves.toBeUndefined();
      expect(showNotification).toHaveBeenCalledWith('Could not copy clip', expect.any(String));
      expect(recordFeatureUsage).not.toHaveBeenCalled();
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

  it('reports failed copies without recording usage', () => {
    reportQuickClipCopy(null);
    expect(showNotification).toHaveBeenCalledExactlyOnceWith(
      'Could not copy clip',
      expect.any(String)
    );
    expect(recordFeatureUsage).not.toHaveBeenCalled();
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
      reportQuickClipCopy({ id: 'c1', type: 'text', content: 'hello there\nmore' });
      expect(recordFeatureUsage).toHaveBeenCalledExactlyOnceWith('quick_clip_hotkey');
      expect(showNotification).toHaveBeenCalledWith('Clip copied', 'hello there');
    });
  });
});
