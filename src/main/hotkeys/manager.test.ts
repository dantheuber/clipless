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
      hotkeys: { enabled: false } as any,
    });

    await manager.initialize();
    manager.cleanup();

    expect(manager.isInitialized).toBe(false);
  });
});
