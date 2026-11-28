import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

import {
  HotkeyActions,
  QUICK_CLIP_REPLY_DEADLINE_MS,
  clipSummary,
  reportQuickClipCopy,
} from './actions';
import type { ClipItem, QuickClipCopyRequest } from '../../shared/types';
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
    const sentRequestIds = (): number[] =>
      mockWindow.webContents.send.mock.calls.map(
        (call: [string, QuickClipCopyRequest]) => call[1].requestId
      );
    const sentRequestId = (): number => sentRequestIds()[0];

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.clearAllTimers();
      vi.useRealTimers();
    });

    it('asks the renderer to copy the live row without reading saved clips', async () => {
      await actions.copyQuickClip(1);
      expect(mockWindow.webContents.send).toHaveBeenCalledExactlyOnceWith('copy-quick-clip', {
        requestId: expect.any(Number),
        index: 1,
      });
      expect(storage.getClips).not.toHaveBeenCalled();
      expect(clipboard.writeText).not.toHaveBeenCalled();
      expect(recordFeatureUsage).not.toHaveBeenCalled();
      expect(showNotification).not.toHaveBeenCalled();
    });

    it('gives every request its own id', async () => {
      await actions.copyQuickClip(0);
      await actions.copyQuickClip(0);
      const [first, second] = sentRequestIds();
      expect(first).not.toBe(second);
    });

    it('does nothing without a window or with a destroyed window', async () => {
      actions.setMainWindow(null);
      await actions.copyQuickClip(0);
      actions.setMainWindow(mockWindow);
      mockWindow.isDestroyed.mockReturnValue(true);
      await actions.copyQuickClip(0);
      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
      expect(storage.getClips).not.toHaveBeenCalled();
      vi.advanceTimersByTime(QUICK_CLIP_REPLY_DEADLINE_MS * 2);
      expect(showNotification).not.toHaveBeenCalled();
    });

    it('reports failure if the renderer cannot be reached', async () => {
      mockWindow.webContents.send.mockImplementation(() => {
        throw new Error('unavailable');
      });
      await expect(actions.copyQuickClip(0)).resolves.toBeUndefined();
      expect(showNotification).toHaveBeenCalledExactlyOnceWith(
        'Could not copy clip',
        expect.any(String)
      );
      expect(recordFeatureUsage).not.toHaveBeenCalled();
      // The failed send is not reported a second time as a missed deadline.
      vi.advanceTimersByTime(QUICK_CLIP_REPLY_DEADLINE_MS * 2);
      expect(showNotification).toHaveBeenCalledTimes(1);
    });

    it('reports failure when the renderer does not answer within the deadline', async () => {
      await actions.copyQuickClip(0);
      vi.advanceTimersByTime(QUICK_CLIP_REPLY_DEADLINE_MS - 1);
      expect(showNotification).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(showNotification).toHaveBeenCalledExactlyOnceWith(
        'Could not copy clip',
        expect.any(String)
      );
      expect(recordFeatureUsage).not.toHaveBeenCalled();
    });

    it('records and announces a copied reply, and does not time out afterwards', async () => {
      await actions.copyQuickClip(0);
      const clip: ClipItem = { id: 'c1', type: 'text', content: 'hello there\nmore' };
      reportQuickClipCopy({ requestId: sentRequestId(), status: 'copied', clip });
      expect(recordFeatureUsage).toHaveBeenCalledExactlyOnceWith('quick_clip_hotkey');
      expect(showNotification).toHaveBeenCalledExactlyOnceWith('Clip copied', 'hello there');
      vi.advanceTimersByTime(QUICK_CLIP_REPLY_DEADLINE_MS * 2);
      expect(showNotification).toHaveBeenCalledTimes(1);
    });

    it('stays silent for an empty slot and does not time out afterwards', async () => {
      await actions.copyQuickClip(2);
      reportQuickClipCopy({ requestId: sentRequestId(), status: 'empty' });
      vi.advanceTimersByTime(QUICK_CLIP_REPLY_DEADLINE_MS * 2);
      expect(showNotification).not.toHaveBeenCalled();
      expect(recordFeatureUsage).not.toHaveBeenCalled();
    });

    it.each(['failed', 'copied'] as const)(
      'reports a %s reply without a clip as a failure once, without recording usage',
      async (status) => {
        await actions.copyQuickClip(0);
        reportQuickClipCopy({ requestId: sentRequestId(), status });
        expect(showNotification).toHaveBeenCalledExactlyOnceWith(
          'Could not copy clip',
          expect.any(String)
        );
        expect(recordFeatureUsage).not.toHaveBeenCalled();
        vi.advanceTimersByTime(QUICK_CLIP_REPLY_DEADLINE_MS * 2);
        expect(showNotification).toHaveBeenCalledTimes(1);
      }
    );

    it('ignores a reply that arrives after the deadline', async () => {
      await actions.copyQuickClip(0);
      vi.advanceTimersByTime(QUICK_CLIP_REPLY_DEADLINE_MS);
      expect(showNotification).toHaveBeenCalledTimes(1);

      const clip: ClipItem = { id: 'c1', type: 'text', content: 'late' };
      reportQuickClipCopy({ requestId: sentRequestId(), status: 'copied', clip });
      expect(recordFeatureUsage).not.toHaveBeenCalled();
      expect(showNotification).toHaveBeenCalledTimes(1);
    });

    it('ignores a reply to a request it never sent, and a second reply to the same request', async () => {
      reportQuickClipCopy({ requestId: 999999, status: 'failed' });
      expect(showNotification).not.toHaveBeenCalled();

      await actions.copyQuickClip(0);
      const clip: ClipItem = { id: 'c1', type: 'text', content: 'once' };
      const reply = { requestId: sentRequestId(), status: 'copied', clip } as const;
      reportQuickClipCopy(reply);
      reportQuickClipCopy(reply);
      expect(recordFeatureUsage).toHaveBeenCalledTimes(1);
      expect(showNotification).toHaveBeenCalledTimes(1);
    });

    it('matches each reply to its own request', async () => {
      await actions.copyQuickClip(0);
      await actions.copyQuickClip(1);
      const [first, second] = sentRequestIds();
      reportQuickClipCopy({ requestId: second, status: 'empty' });
      vi.advanceTimersByTime(QUICK_CLIP_REPLY_DEADLINE_MS);
      // Only the unanswered first request is reported.
      expect(showNotification).toHaveBeenCalledExactlyOnceWith(
        'Could not copy clip',
        expect.any(String)
      );
      reportQuickClipCopy({ requestId: first, status: 'empty' });
      expect(showNotification).toHaveBeenCalledTimes(1);
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
  });
});
