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

import { registerCopyQuickClipCases } from './actions-copy-cases';
import { registerClipSummaryCases, registerQuickLookCases } from './actions-reader-cases';
import { HotkeyActions } from './actions';
import { nativeImage, app } from 'electron';
import { storage } from '../storage';
import { createMockBrowserWindow } from '../__mocks__/electron';

const mockStoredClips = (...clips: Array<{ id: string; type: string; content: string }>) =>
  vi.mocked(storage.getClips).mockResolvedValue(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    clips.map((clip) => ({ clip, isLocked: false, timestamp: 1 })) as any
  );

const mockImage = (empty: boolean) =>
  vi.mocked(nativeImage.createFromDataURL).mockReturnValue({
    isEmpty: () => empty,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

const runOnDarwin = (action: () => void): void => {
  const originalPlatform = process.platform;
  Object.defineProperty(process, 'platform', { value: 'darwin', writable: true });
  action();
  Object.defineProperty(process, 'platform', { value: originalPlatform, writable: true });
};

describe('HotkeyActions', () => {
  let actions: HotkeyActions;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockWindow: any;

  beforeEach(() => {
    vi.clearAllMocks();
    actions = new HotkeyActions();
    mockWindow = createMockBrowserWindow();
    actions.setMainWindow(mockWindow);
  });

  registerCopyQuickClipCases(
    () => actions,
    () => mockWindow,
    mockStoredClips,
    mockImage
  );
  registerQuickLookCases(
    () => actions,
    () => mockWindow
  );
  registerClipSummaryCases(() => actions);

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
      runOnDarwin(() => {
        mockWindow.isVisible.mockReturnValue(false);
        mockWindow.isMinimized.mockReturnValue(false);
        actions.focusWindow();
      });

      expect(app.focus).toHaveBeenCalled();
    });
  });

  describe('toggleSearchBar - macOS', () => {
    it('calls app.focus on macOS when showing window', () => {
      runOnDarwin(() => {
        mockWindow.isVisible.mockReturnValue(false);
        mockWindow.isMinimized.mockReturnValue(false);
        actions.toggleSearchBar();
      });

      expect(app.focus).toHaveBeenCalled();
    });
  });
});
