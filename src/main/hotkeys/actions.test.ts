import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('electron', () => ({
  BrowserWindow: vi.fn(),
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

import { HotkeyActions } from './actions';
import { clipboard } from 'electron';
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
  });
});
