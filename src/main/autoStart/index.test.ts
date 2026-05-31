import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('electron', () => ({
  app: {
    setLoginItemSettings: vi.fn(),
    getLoginItemSettings: vi.fn(),
    isPackaged: true,
  },
}));

import { app } from 'electron';
import { applyAutoStart, isAutoStartSupported, getAutoStartState } from './index';

describe('autoStart', () => {
  const originalPlatform = process.platform;

  const setPlatform = (platform: NodeJS.Platform): void => {
    Object.defineProperty(process, 'platform', { value: platform });
  };

  const setPackaged = (value: boolean): void => {
    Object.defineProperty(app, 'isPackaged', { value, configurable: true });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setPlatform('win32');
    setPackaged(true);
    vi.mocked(app.getLoginItemSettings).mockReturnValue({
      openAtLogin: true,
    } as unknown as Electron.LoginItemSettings);
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
    it('clears the legacy entry then enables login on win32', () => {
      setPlatform('win32');
      applyAutoStart(true);

      expect(app.setLoginItemSettings).toHaveBeenNthCalledWith(1, {
        openAtLogin: false,
        name: 'com.electron',
      });
      expect(app.setLoginItemSettings).toHaveBeenNthCalledWith(2, { openAtLogin: true });
    });

    it('clears the legacy entry then disables login on win32', () => {
      setPlatform('win32');
      applyAutoStart(false);

      expect(app.setLoginItemSettings).toHaveBeenNthCalledWith(1, {
        openAtLogin: false,
        name: 'com.electron',
      });
      expect(app.setLoginItemSettings).toHaveBeenNthCalledWith(2, { openAtLogin: false });
    });

    it('does not touch the legacy entry on darwin', () => {
      setPlatform('darwin');
      applyAutoStart(true);

      expect(app.setLoginItemSettings).toHaveBeenCalledTimes(1);
      expect(app.setLoginItemSettings).toHaveBeenCalledWith({ openAtLogin: true });
    });

    it('does not call setLoginItemSettings on linux', () => {
      setPlatform('linux');
      applyAutoStart(true);
      expect(app.setLoginItemSettings).not.toHaveBeenCalled();
    });

    it('does not call setLoginItemSettings in an unpackaged (dev) build', () => {
      setPlatform('win32');
      setPackaged(false);
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

  describe('getAutoStartState', () => {
    it('returns the OS openAtLogin value on a packaged build', () => {
      setPlatform('win32');
      vi.mocked(app.getLoginItemSettings).mockReturnValue({
        openAtLogin: true,
      } as unknown as Electron.LoginItemSettings);
      expect(getAutoStartState()).toBe(true);

      vi.mocked(app.getLoginItemSettings).mockReturnValue({
        openAtLogin: false,
      } as unknown as Electron.LoginItemSettings);
      expect(getAutoStartState()).toBe(false);
    });

    it('returns null on linux', () => {
      setPlatform('linux');
      expect(getAutoStartState()).toBeNull();
      expect(app.getLoginItemSettings).not.toHaveBeenCalled();
    });

    it('returns null in an unpackaged (dev) build', () => {
      setPlatform('win32');
      setPackaged(false);
      expect(getAutoStartState()).toBeNull();
      expect(app.getLoginItemSettings).not.toHaveBeenCalled();
    });

    it('returns null and logs when getLoginItemSettings throws', () => {
      setPlatform('win32');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(app.getLoginItemSettings).mockImplementationOnce(() => {
        throw new Error('boom');
      });

      expect(getAutoStartState()).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to read auto-start setting:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});
