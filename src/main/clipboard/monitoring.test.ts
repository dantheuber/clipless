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
}));

vi.mock('../storage/image-store', () => ({
  saveImage: vi.fn(),
}));

vi.mock('../storage/search-terms', () => ({
  generateId: vi.fn(),
}));

import { getCurrentClipboardData } from './data';
import { registerMonitoringLifecycleCases } from './monitoring-lifecycle-cases';
import { registerClipboardTextCases } from './monitoring-text-cases';
import { registerClipboardImageCases } from './monitoring-image-cases';
import {
  initializeClipboardMonitoring,
  checkClipboard,
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      checkClipboard(mockWindow as any);
      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('handles null clipboard data during initialization', () => {
      vi.mocked(getCurrentClipboardData).mockReturnValue(null);
      const mockWindow = createMockWindow();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initializeClipboardMonitoring(mockWindow as any);

      vi.mocked(getCurrentClipboardData).mockReturnValue({ type: 'text', content: 'new' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      checkClipboard(mockWindow as any);
      expect(mockWindow.webContents.send).toHaveBeenCalledWith('clipboard-changed', {
        type: 'text',
        content: 'new',
      });
    });
  });

  registerClipboardImageCases(createMockWindow);
  registerClipboardTextCases(createMockWindow);

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

  registerMonitoringLifecycleCases(createMockWindow);
});
