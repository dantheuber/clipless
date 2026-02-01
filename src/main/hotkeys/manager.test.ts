import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('electron', () => ({
  BrowserWindow: vi.fn(),
  globalShortcut: {
    register: vi.fn().mockReturnValue(true),
    unregister: vi.fn(),
  },
  clipboard: { writeText: vi.fn() },
  nativeImage: { createFromDataURL: vi.fn() },
}));

vi.mock('../storage', () => ({
  storage: {
    getSettings: vi.fn(),
    getClips: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../notifications', () => ({
  showNotification: vi.fn(),
}));

import { HotkeyManager } from './manager';
import { storage } from '../storage';
import { globalShortcut } from 'electron';

describe('HotkeyManager', () => {
  let manager: HotkeyManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new HotkeyManager();
  });

  it('initializes and registers hotkeys when enabled', async () => {
    vi.mocked(storage.getSettings).mockResolvedValue({
      maxClips: 100,
      startMinimized: false,
      autoStart: false,
      hotkeys: {
        enabled: true,
        focusWindow: { enabled: true, key: 'Ctrl+Shift+V' },
        quickClip1: { enabled: true, key: 'Ctrl+Shift+1' },
        quickClip2: { enabled: false, key: 'Ctrl+Shift+2' },
        quickClip3: { enabled: false, key: 'Ctrl+Shift+3' },
        quickClip4: { enabled: false, key: 'Ctrl+Shift+4' },
        quickClip5: { enabled: false, key: 'Ctrl+Shift+5' },
        openToolsLauncher: { enabled: false, key: 'Ctrl+Shift+T' },
        searchClips: { enabled: false, key: 'Ctrl+Shift+F' },
      },
    });

    await manager.initialize();

    expect(manager.isInitialized).toBe(true);
    expect(globalShortcut.register).toHaveBeenCalledTimes(2); // focusWindow + quickClip1
  });

  it('does not register hotkeys when disabled', async () => {
    vi.mocked(storage.getSettings).mockResolvedValue({
      maxClips: 100,
      startMinimized: false,
      autoStart: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      hotkeys: { enabled: false } as any,
    });

    await manager.initialize();

    expect(globalShortcut.register).not.toHaveBeenCalled();
  });

  it('does not initialize twice', async () => {
    vi.mocked(storage.getSettings).mockResolvedValue({
      maxClips: 100,
      startMinimized: false,
      autoStart: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      hotkeys: { enabled: false } as any,
    });

    await manager.initialize();
    await manager.initialize();

    expect(storage.getSettings).toHaveBeenCalledTimes(1);
  });

  it('re-registers hotkeys on settings change', async () => {
    vi.mocked(storage.getSettings).mockResolvedValue({
      maxClips: 100,
      startMinimized: false,
      autoStart: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      hotkeys: { enabled: false } as any,
    });

    await manager.initialize();
    await manager.onSettingsChanged();

    expect(storage.getSettings).toHaveBeenCalledTimes(2);
  });

  it('cleanup resets state', async () => {
    vi.mocked(storage.getSettings).mockResolvedValue({
      maxClips: 100,
      startMinimized: false,
      autoStart: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      hotkeys: { enabled: false } as any,
    });

    await manager.initialize();
    manager.cleanup();

    expect(manager.isInitialized).toBe(false);
  });

  it('handles registerHotkeys error gracefully during initialization', async () => {
    vi.mocked(storage.getSettings).mockRejectedValue(new Error('settings fail'));

    await manager.initialize();

    // registerHotkeys catches its own error, so initialization still completes
    expect(manager.isInitialized).toBe(true);
  });

  it('onSettingsChanged initializes when not yet initialized', async () => {
    vi.mocked(storage.getSettings).mockResolvedValue({
      maxClips: 100,
      startMinimized: false,
      autoStart: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      hotkeys: { enabled: false } as any,
    });

    await manager.onSettingsChanged();

    expect(manager.isInitialized).toBe(true);
  });

  it('onSettingsChanged handles error gracefully', async () => {
    // First initialize successfully
    vi.mocked(storage.getSettings).mockResolvedValue({
      maxClips: 100,
      startMinimized: false,
      autoStart: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      hotkeys: { enabled: false } as any,
    });
    await manager.initialize();

    // Then fail on re-register
    vi.mocked(storage.getSettings).mockRejectedValue(new Error('fail'));
    await expect(manager.onSettingsChanged()).resolves.toBeUndefined();
  });

  it('registers tools launcher and search hotkeys', async () => {
    vi.mocked(storage.getSettings).mockResolvedValue({
      maxClips: 100,
      startMinimized: false,
      autoStart: false,
      hotkeys: {
        enabled: true,
        focusWindow: { enabled: false, key: 'Ctrl+Shift+V' },
        quickClip1: { enabled: false, key: 'Ctrl+Shift+1' },
        quickClip2: { enabled: false, key: 'Ctrl+Shift+2' },
        quickClip3: { enabled: false, key: 'Ctrl+Shift+3' },
        quickClip4: { enabled: false, key: 'Ctrl+Shift+4' },
        quickClip5: { enabled: false, key: 'Ctrl+Shift+5' },
        openToolsLauncher: { enabled: true, key: 'Ctrl+Shift+T' },
        searchClips: { enabled: true, key: 'Ctrl+Shift+F' },
      },
    });

    await manager.initialize();

    expect(globalShortcut.register).toHaveBeenCalledTimes(2);
  });

  it('uses default tools launcher config when missing', async () => {
    vi.mocked(storage.getSettings).mockResolvedValue({
      maxClips: 100,
      startMinimized: false,
      autoStart: false,
      hotkeys: {
        enabled: true,
        focusWindow: { enabled: false, key: 'Ctrl+Shift+V' },
        quickClip1: { enabled: false, key: 'Ctrl+Shift+1' },
        quickClip2: { enabled: false, key: 'Ctrl+Shift+2' },
        quickClip3: { enabled: false, key: 'Ctrl+Shift+3' },
        quickClip4: { enabled: false, key: 'Ctrl+Shift+4' },
        quickClip5: { enabled: false, key: 'Ctrl+Shift+5' },
        // openToolsLauncher and searchClips deliberately missing
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });

    await manager.initialize();

    // Default configs have enabled: true so both should register
    expect(globalShortcut.register).toHaveBeenCalledTimes(2);
  });

  it('getCurrentHotkeys returns registered hotkeys', async () => {
    vi.mocked(storage.getSettings).mockResolvedValue({
      maxClips: 100,
      startMinimized: false,
      autoStart: false,
      hotkeys: {
        enabled: true,
        focusWindow: { enabled: true, key: 'Ctrl+Shift+V' },
        quickClip1: { enabled: false, key: 'Ctrl+Shift+1' },
        quickClip2: { enabled: false, key: 'Ctrl+Shift+2' },
        quickClip3: { enabled: false, key: 'Ctrl+Shift+3' },
        quickClip4: { enabled: false, key: 'Ctrl+Shift+4' },
        quickClip5: { enabled: false, key: 'Ctrl+Shift+5' },
        openToolsLauncher: { enabled: false, key: 'Ctrl+Shift+T' },
        searchClips: { enabled: false, key: 'Ctrl+Shift+F' },
      },
    });

    await manager.initialize();

    expect(manager.getCurrentHotkeys()).toContain('Ctrl+Shift+V');
    expect(manager.isHotkeyRegistered('Ctrl+Shift+V')).toBe(true);
  });

  it('setMainWindow sets window on actions', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockWindow = {} as any;
    expect(() => manager.setMainWindow(mockWindow)).not.toThrow();
  });

  it('handles error in initialize when setInitialized throws', async () => {
    vi.mocked(storage.getSettings).mockResolvedValue({
      maxClips: 100,
      startMinimized: false,
      autoStart: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      hotkeys: { enabled: false } as any,
    });

    // Access the private registry to make setInitialized throw
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const registry = (manager as any).registry;
    const origSetInit = registry.setInitialized.bind(registry);
    registry.setInitialized = vi.fn().mockImplementation(() => {
      throw new Error('setInitialized fail');
    });

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await manager.initialize();
    spy.mockRestore();

    // Restore
    registry.setInitialized = origSetInit;
  });

  it('handles error in onSettingsChanged when registerHotkeys throws', async () => {
    vi.mocked(storage.getSettings).mockResolvedValue({
      maxClips: 100,
      startMinimized: false,
      autoStart: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      hotkeys: { enabled: false } as any,
    });
    await manager.initialize();

    // Make registerHotkeys throw by overriding unregisterAllHotkeys to throw outside inner try
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const origMethod = (manager as any).registerHotkeys.bind(manager);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (manager as any).registerHotkeys = vi.fn().mockRejectedValue(new Error('register fail'));

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await manager.onSettingsChanged();
    spy.mockRestore();

    // Restore
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (manager as any).registerHotkeys = origMethod;
  });

  it('registered hotkey callbacks are callable', async () => {
    const callbacks: Record<string, (...args: unknown[]) => unknown> = {};
    vi.mocked(globalShortcut.register).mockImplementation(
      (acc: string, cb: (...args: unknown[]) => unknown) => {
        callbacks[acc] = cb;
        return true;
      }
    );

    vi.mocked(storage.getSettings).mockResolvedValue({
      maxClips: 100,
      startMinimized: false,
      autoStart: false,
      hotkeys: {
        enabled: true,
        focusWindow: { enabled: true, key: 'Ctrl+Shift+V' },
        quickClip1: { enabled: true, key: 'Ctrl+Shift+1' },
        quickClip2: { enabled: false, key: 'Ctrl+Shift+2' },
        quickClip3: { enabled: false, key: 'Ctrl+Shift+3' },
        quickClip4: { enabled: false, key: 'Ctrl+Shift+4' },
        quickClip5: { enabled: false, key: 'Ctrl+Shift+5' },
        openToolsLauncher: { enabled: true, key: 'Ctrl+Shift+T' },
        searchClips: { enabled: true, key: 'Ctrl+Shift+F' },
      },
    });

    await manager.initialize();

    // Invoke each registered callback to cover the callback body lines
    for (const cb of Object.values(callbacks)) {
      cb();
    }
  });
});
