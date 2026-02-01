import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('electron', () => ({
  BrowserWindow: vi.fn(),
  app: {
    focus: vi.fn(),
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

vi.mock('../window/creation.js', () => ({
  createToolsLauncherWindow: vi.fn(),
}));

import { HotkeyActions } from './actions';
import { clipboard, nativeImage, app } from 'electron';
import { storage } from '../storage';

describe('HotkeyActions', () => {
  let actions: HotkeyActions;
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
        { clip: { type: 'text', content: 'hello' }, isLocked: false, timestamp: 1 },
      ]);
      await actions.copyQuickClip(0);
      expect(clipboard.writeText).toHaveBeenCalledWith('hello');
    });

    it('copies html clip to clipboard', async () => {
      vi.mocked(storage.getClips).mockResolvedValue([
        { clip: { type: 'html', content: '<p>hi</p>' }, isLocked: false, timestamp: 1 },
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
        { clip: { type: 'text', content: 'hello' }, isLocked: false, timestamp: 1 },
      ]);
      await actions.copyQuickClip(0);
      expect(mockWindow.webContents.send).toHaveBeenCalledWith('hotkey-clip-copied', 0);
    });

    it('copies rtf clip to clipboard', async () => {
      vi.mocked(storage.getClips).mockResolvedValue([
        { clip: { type: 'rtf', content: '{\\rtf1 hello}' }, isLocked: false, timestamp: 1 },
      ]);
      await actions.copyQuickClip(0);
      expect(clipboard.writeRTF).toHaveBeenCalledWith('{\\rtf1 hello}');
    });

    it('copies bookmark clip with title and url', async () => {
      vi.mocked(storage.getClips).mockResolvedValue([
        {
          clip: { type: 'bookmark', content: 'Example', title: 'Example', url: 'https://example.com' },
          isLocked: false,
          timestamp: 1,
        },
      ]);
      await actions.copyQuickClip(0);
      expect(clipboard.writeBookmark).toHaveBeenCalledWith('Example', 'https://example.com');
    });

    it('copies bookmark clip as text when missing title/url', async () => {
      vi.mocked(storage.getClips).mockResolvedValue([
        { clip: { type: 'bookmark', content: 'some content' }, isLocked: false, timestamp: 1 },
      ]);
      await actions.copyQuickClip(0);
      expect(clipboard.writeText).toHaveBeenCalledWith('some content');
    });

    it('copies image clip to clipboard', async () => {
      vi.mocked(nativeImage.createFromDataURL).mockReturnValue({
        isEmpty: () => false,
      } as any);
      vi.mocked(storage.getClips).mockResolvedValue([
        { clip: { type: 'image', content: 'data:image/png;base64,abc' }, isLocked: false, timestamp: 1 },
      ]);
      await actions.copyQuickClip(0);
      expect(clipboard.writeImage).toHaveBeenCalled();
    });

    it('falls back to text for empty image', async () => {
      vi.mocked(nativeImage.createFromDataURL).mockReturnValue({
        isEmpty: () => true,
      } as any);
      vi.mocked(storage.getClips).mockResolvedValue([
        { clip: { type: 'image', content: 'data:image/png;base64,abc' }, isLocked: false, timestamp: 1 },
      ]);
      await actions.copyQuickClip(0);
      expect(clipboard.writeText).toHaveBeenCalledWith('data:image/png;base64,abc');
    });

    it('falls back to text when image copy throws', async () => {
      vi.mocked(nativeImage.createFromDataURL).mockImplementation(() => {
        throw new Error('bad image');
      });
      vi.mocked(storage.getClips).mockResolvedValue([
        { clip: { type: 'image', content: 'bad-data' }, isLocked: false, timestamp: 1 },
      ]);
      await actions.copyQuickClip(0);
      expect(clipboard.writeText).toHaveBeenCalledWith('bad-data');
    });

    it('copies unknown type as text', async () => {
      vi.mocked(storage.getClips).mockResolvedValue([
        { clip: { type: 'unknown', content: 'fallback' }, isLocked: false, timestamp: 1 },
      ]);
      await actions.copyQuickClip(0);
      expect(clipboard.writeText).toHaveBeenCalledWith('fallback');
    });

    it('does not send event when window is destroyed', async () => {
      mockWindow.isDestroyed.mockReturnValue(true);
      vi.mocked(storage.getClips).mockResolvedValue([
        { clip: { type: 'text', content: 'hello' }, isLocked: false, timestamp: 1 },
      ]);
      await actions.copyQuickClip(0);
      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('handles storage error gracefully', async () => {
      vi.mocked(storage.getClips).mockRejectedValue(new Error('fail'));
      await expect(actions.copyQuickClip(0)).resolves.toBeUndefined();
    });

    it('handles null clip at valid index', async () => {
      const sparseClips = [null as any, { clip: { type: 'text', content: 'hello' } }];
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

  describe('openToolsLauncher', () => {
    it('opens tools launcher with first clip content', async () => {
      vi.mocked(storage.getClips).mockResolvedValue([
        { clip: { type: 'text', content: 'hello' }, isLocked: false, timestamp: 1 },
      ]);

      await actions.openToolsLauncher();

      const { createToolsLauncherWindow } = await import('../window/creation.js');
      expect(createToolsLauncherWindow).toHaveBeenCalledWith('hello');
    });

    it('does nothing when no clips available', async () => {
      vi.mocked(storage.getClips).mockResolvedValue([]);
      await expect(actions.openToolsLauncher()).resolves.toBeUndefined();
    });

    it('does nothing when first clip is null', async () => {
      vi.mocked(storage.getClips).mockResolvedValue([null as any]);
      await expect(actions.openToolsLauncher()).resolves.toBeUndefined();
    });

    it('handles error gracefully', async () => {
      vi.mocked(storage.getClips).mockRejectedValue(new Error('fail'));
      await expect(actions.openToolsLauncher()).resolves.toBeUndefined();
    });
  });
});
