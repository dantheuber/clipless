import { describe, it, expect, vi, beforeEach } from 'vitest';

type Listener = (...args: unknown[]) => void;

const { handlers, electronMock, windowMock } = vi.hoisted(() => {
  const handlers = new Map<string, Listener>();
  const electronMock = {
    app: {
      on: vi.fn((event: string, listener: Listener) => {
        handlers.set(event, listener);
      }),
      quit: vi.fn(),
    },
    safeStorage: { setUsePlainTextEncryption: vi.fn() },
  };
  const windowMock = {
    initializeWindowSystem: vi.fn(async () => {}),
    getMainWindow: vi.fn(() => null as unknown),
    syncWindowBoundsWithSetting: vi.fn(),
    applyRememberPositionSetting: vi.fn(),
  };
  return { handlers, electronMock, windowMock };
});

vi.mock('electron', () => electronMock);
vi.mock('@electron-toolkit/utils', () => ({
  electronApp: { setAppUserModelId: vi.fn() },
  optimizer: { watchWindowShortcuts: vi.fn() },
}));
vi.mock('../storage', () => ({
  storage: { initialize: vi.fn(), setOnBackgroundLoadComplete: vi.fn(), getSettings: vi.fn() },
}));
vi.mock('../hotkeys', () => ({ hotkeyManager: { cleanup: vi.fn() } }));
vi.mock('../tray', () => ({ getTray: vi.fn(() => null), setIsQuitting: vi.fn() }));
vi.mock('../updater', () => ({
  configureAutoUpdater: vi.fn(),
  setupAutoUpdaterEvents: vi.fn(),
  runAutomaticUpdateCheck: vi.fn(),
}));
vi.mock('../ipc', () => ({ setupMainIPC: vi.fn() }));
vi.mock('../window', () => windowMock);
vi.mock('../window/settings', () => ({ applyWindowSettings: vi.fn() }));
vi.mock('../window/background', () => ({
  applyWindowBackgroundTheme: vi.fn(),
  watchSystemThemeForWindowBackground: vi.fn(),
}));
vi.mock('../autoStart', () => ({ applyAutoStart: vi.fn() }));
vi.mock('../analytics', () => ({ initializeAnalytics: vi.fn() }));

import { setupAppEvents } from './index';

function makeWindow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    isDestroyed: vi.fn(() => false),
    isMinimized: vi.fn(() => false),
    isVisible: vi.fn(() => true),
    restore: vi.fn(),
    show: vi.fn(),
    focus: vi.fn(),
    ...overrides,
  };
}

function fire(event: string): void {
  const listener = handlers.get(event);
  if (!listener) throw new Error(`no handler registered for ${event}`);
  listener();
}

describe('setupAppEvents', () => {
  beforeEach(() => {
    handlers.clear();
    vi.clearAllMocks();
    windowMock.getMainWindow.mockReturnValue(null);
    setupAppEvents();
  });

  describe('activate', () => {
    it('shows and focuses a hidden main window instead of creating a second one', () => {
      const win = makeWindow({ isVisible: vi.fn(() => false) });
      windowMock.getMainWindow.mockReturnValue(win);

      fire('activate');

      expect(win.show).toHaveBeenCalledTimes(1);
      expect(win.focus).toHaveBeenCalledTimes(1);
      expect(win.restore).not.toHaveBeenCalled();
      expect(windowMock.initializeWindowSystem).not.toHaveBeenCalled();
    });

    it('restores a minimized main window before focusing it', () => {
      const win = makeWindow({ isMinimized: vi.fn(() => true) });
      windowMock.getMainWindow.mockReturnValue(win);

      fire('activate');

      expect(win.restore).toHaveBeenCalledTimes(1);
      expect(win.show).not.toHaveBeenCalled();
      expect(win.focus).toHaveBeenCalledTimes(1);
      expect(windowMock.initializeWindowSystem).not.toHaveBeenCalled();
    });

    it('only focuses an already visible main window', () => {
      const win = makeWindow();
      windowMock.getMainWindow.mockReturnValue(win);

      fire('activate');

      expect(win.show).not.toHaveBeenCalled();
      expect(win.restore).not.toHaveBeenCalled();
      expect(win.focus).toHaveBeenCalledTimes(1);
      expect(windowMock.initializeWindowSystem).not.toHaveBeenCalled();
    });

    it('recreates the window system when there is no main window', () => {
      windowMock.getMainWindow.mockReturnValue(null);

      fire('activate');

      expect(windowMock.initializeWindowSystem).toHaveBeenCalledTimes(1);
    });

    it('recreates the window system when the main window has been destroyed', () => {
      const win = makeWindow({ isDestroyed: vi.fn(() => true) });
      windowMock.getMainWindow.mockReturnValue(win);

      fire('activate');

      expect(win.show).not.toHaveBeenCalled();
      expect(win.focus).not.toHaveBeenCalled();
      expect(windowMock.initializeWindowSystem).toHaveBeenCalledTimes(1);
    });
  });

  describe('second-instance', () => {
    it('restores, shows and focuses the existing main window', () => {
      const win = makeWindow({
        isMinimized: vi.fn(() => true),
        isVisible: vi.fn(() => false),
      });
      windowMock.getMainWindow.mockReturnValue(win);

      fire('second-instance');

      expect(win.restore).toHaveBeenCalledTimes(1);
      expect(win.show).toHaveBeenCalledTimes(1);
      expect(win.focus).toHaveBeenCalledTimes(1);
      expect(windowMock.initializeWindowSystem).not.toHaveBeenCalled();
    });

    it('does nothing when there is no main window', () => {
      windowMock.getMainWindow.mockReturnValue(null);

      expect(() => fire('second-instance')).not.toThrow();
      expect(windowMock.initializeWindowSystem).not.toHaveBeenCalled();
    });
  });
});
