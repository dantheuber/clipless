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
import { registerManagerLifecycleTests } from './manager-lifecycle-cases';
import { disabledSettings, enabledSettings, basicHotkeySettings } from './manager-test-settings';

describe('HotkeyManager', () => {
  let manager: HotkeyManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new HotkeyManager();
  });

  it('initializes and registers hotkeys when enabled', async () => {
    vi.mocked(storage.getSettings).mockResolvedValue(basicHotkeySettings());

    await manager.initialize();

    expect(manager.isInitialized).toBe(true);
    expect(globalShortcut.register).toHaveBeenCalledTimes(2); // focusWindow + quickClip1
  });

  it('does not register hotkeys when disabled', async () => {
    vi.mocked(storage.getSettings).mockResolvedValue(disabledSettings());

    await manager.initialize();

    expect(globalShortcut.register).not.toHaveBeenCalled();
  });

  it('does not initialize twice', async () => {
    vi.mocked(storage.getSettings).mockResolvedValue(disabledSettings());

    await manager.initialize();
    await manager.initialize();

    expect(storage.getSettings).toHaveBeenCalledTimes(1);
  });

  it('re-registers hotkeys on settings change', async () => {
    vi.mocked(storage.getSettings).mockResolvedValue(disabledSettings());

    await manager.initialize();
    await manager.onSettingsChanged();

    expect(storage.getSettings).toHaveBeenCalledTimes(2);
  });

  it('cleanup resets state', async () => {
    vi.mocked(storage.getSettings).mockResolvedValue(disabledSettings());

    await manager.initialize();
    manager.cleanup();

    expect(manager.isInitialized).toBe(false);
  });

  it('handles registerHotkeys error gracefully during initialization', async () => {
    vi.mocked(storage.getSettings).mockRejectedValue(new Error('settings fail'));

    await manager.initialize();

    expect(manager.isInitialized).toBe(true);
  });

  it('onSettingsChanged initializes when not yet initialized', async () => {
    vi.mocked(storage.getSettings).mockResolvedValue(disabledSettings());

    await manager.onSettingsChanged();

    expect(manager.isInitialized).toBe(true);
  });

  it('onSettingsChanged handles error gracefully', async () => {
    vi.mocked(storage.getSettings).mockResolvedValue(disabledSettings());
    await manager.initialize();

    vi.mocked(storage.getSettings).mockRejectedValue(new Error('fail'));
    await expect(manager.onSettingsChanged()).resolves.toEqual({ ok: false, failed: [] });
  });

  it('reports the accelerators the OS refused, per row', async () => {
    vi.mocked(globalShortcut.register).mockImplementation((acc: string) => acc !== 'Ctrl+Shift+1');
    vi.mocked(storage.getSettings).mockResolvedValue(
      enabledSettings({
        focusWindow: { enabled: true, key: 'Ctrl+Shift+V' },
        quickClip1: { enabled: true, key: 'Ctrl+Shift+1' },
        quickLook: { enabled: true, key: 'Ctrl+Shift+T' },
      })
    );

    await manager.initialize();
    const result = await manager.onSettingsChanged();

    expect(result).toEqual({ ok: false, failed: ['Ctrl+Shift+1'] });
    expect(manager.isHotkeyRegistered('Ctrl+Shift+V')).toBe(true);
    expect(manager.isHotkeyRegistered('Ctrl+Shift+1')).toBe(false);
  });

  it('two rows on one accelerator: the second is refused and reported', async () => {
    vi.mocked(storage.getSettings).mockResolvedValue(
      enabledSettings({
        focusWindow: { enabled: true, key: 'Ctrl+Shift+V' },
        quickClip1: { enabled: true, key: 'Ctrl+Shift+V' },
      })
    );

    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await manager.onSettingsChanged();
    spy.mockRestore();

    expect(manager.isInitialized).toBe(true);
    expect(result).toEqual({ ok: false, failed: ['Ctrl+Shift+V'] });
    expect(globalShortcut.register).toHaveBeenCalledTimes(1);
  });

  it('answers ok with no failures when every enabled row registers', async () => {
    vi.mocked(globalShortcut.register).mockImplementation(() => true);
    vi.mocked(storage.getSettings).mockResolvedValue(
      enabledSettings({
        focusWindow: { enabled: true, key: 'Ctrl+Shift+V' },
        quickClip1: { enabled: true, key: 'Ctrl+Shift+1' },
        quickClip2: { enabled: true, key: 'Ctrl+Shift+2' },
        quickClip3: { enabled: true, key: 'Ctrl+Shift+3' },
        quickClip4: { enabled: true, key: 'Ctrl+Shift+4' },
        quickClip5: { enabled: true, key: 'Ctrl+Shift+5' },
        quickLook: { enabled: true, key: 'Ctrl+Shift+T' },
        searchClips: { enabled: true, key: 'Ctrl+Shift+F' },
      })
    );

    await manager.initialize();
    await expect(manager.onSettingsChanged()).resolves.toEqual({ ok: true, failed: [] });
  });

  it('registers quick look and search hotkeys', async () => {
    vi.mocked(storage.getSettings).mockResolvedValue(
      enabledSettings({
        quickLook: { enabled: true, key: 'Ctrl+Shift+T' },
        searchClips: { enabled: true, key: 'Ctrl+Shift+F' },
      })
    );

    await manager.initialize();

    expect(globalShortcut.register).toHaveBeenCalledTimes(2);
  });

  registerManagerLifecycleTests(() => manager);
});
