import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('electron', () => ({
  app: {
    setLoginItemSettings: vi.fn(),
  },
}));

import { app } from 'electron';
import { applyAutoStart, isAutoStartSupported } from './index';

describe('autoStart', () => {
  const originalPlatform = process.platform;

  const setPlatform = (platform: NodeJS.Platform): void => {
    Object.defineProperty(process, 'platform', { value: platform });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    setPlatform(originalPlatform);
  });

  describe('isAutoStartSupported', () => {
    it('returns true on win32', () => {
      setPlatform('win32');
      expect(isAutoStartSupported()).toBe(true);
    });

    it('returns true on darwin', () => {
      setPlatform('darwin');
      expect(isAutoStartSupported()).toBe(true);
    });

    it('returns false on linux', () => {
      setPlatform('linux');
      expect(isAutoStartSupported()).toBe(false);
    });
  });

  describe('applyAutoStart', () => {
    it('calls setLoginItemSettings with openAtLogin true on win32', () => {
      setPlatform('win32');
      applyAutoStart(true);
      expect(app.setLoginItemSettings).toHaveBeenCalledWith({ openAtLogin: true });
    });

    it('calls setLoginItemSettings with openAtLogin false on win32', () => {
      setPlatform('win32');
      applyAutoStart(false);
      expect(app.setLoginItemSettings).toHaveBeenCalledWith({ openAtLogin: false });
    });

    it('calls setLoginItemSettings on darwin', () => {
      setPlatform('darwin');
      applyAutoStart(true);
      expect(app.setLoginItemSettings).toHaveBeenCalledWith({ openAtLogin: true });
    });

    it('does not call setLoginItemSettings on linux', () => {
      setPlatform('linux');
      applyAutoStart(true);
      expect(app.setLoginItemSettings).not.toHaveBeenCalled();
    });

    it('swallows errors thrown by setLoginItemSettings', () => {
      setPlatform('win32');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(app.setLoginItemSettings).mockImplementationOnce(() => {
        throw new Error('boom');
      });

      expect(() => applyAutoStart(true)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to apply auto-start setting:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});
