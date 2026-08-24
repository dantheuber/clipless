import { it, expect, vi } from 'vitest';
import type { HotkeyManager } from './manager';
import { storage } from '../storage';
import { globalShortcut } from 'electron';
import {
  disabledSettings,
  enabledSettings,
  primaryHotkeysSettings,
  settingsWithoutReaderHotkeys,
} from './manager-test-settings';

export function registerManagerLifecycleTests(getManager: () => HotkeyManager): void {
  it('uses the default quick look config when missing', async () => {
    vi.mocked(storage.getSettings).mockResolvedValue(settingsWithoutReaderHotkeys());

    await getManager().initialize();

    expect(globalShortcut.register).toHaveBeenCalledTimes(2);
  });

  it('getCurrentHotkeys returns registered hotkeys', async () => {
    vi.mocked(storage.getSettings).mockResolvedValue(
      enabledSettings({ focusWindow: { enabled: true, key: 'Ctrl+Shift+V' } })
    );

    await getManager().initialize();

    expect(getManager().getCurrentHotkeys()).toContain('Ctrl+Shift+V');
    expect(getManager().isHotkeyRegistered('Ctrl+Shift+V')).toBe(true);
  });

  it('setMainWindow sets window on actions', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockWindow = {} as any;
    expect(() => getManager().setMainWindow(mockWindow)).not.toThrow();
  });

  it('handles error in initialize when setInitialized throws', async () => {
    vi.mocked(storage.getSettings).mockResolvedValue(disabledSettings());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const registry = (getManager() as any).registry;
    const origSetInit = registry.setInitialized.bind(registry);
    registry.setInitialized = vi.fn().mockImplementation(() => {
      throw new Error('setInitialized fail');
    });

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await getManager().initialize();
    spy.mockRestore();

    registry.setInitialized = origSetInit;
  });

  it('handles error in onSettingsChanged when registerHotkeys throws', async () => {
    vi.mocked(storage.getSettings).mockResolvedValue(disabledSettings());
    await getManager().initialize();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const origMethod = (getManager() as any).registerHotkeys.bind(getManager());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getManager() as any).registerHotkeys = vi.fn().mockRejectedValue(new Error('register fail'));

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await getManager().onSettingsChanged();
    spy.mockRestore();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getManager() as any).registerHotkeys = origMethod;
  });

  it('registerQuickClipHotkeys handles undefined hotkeys', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getManager() as any).registerQuickClipHotkeys(undefined);
    expect(globalShortcut.register).not.toHaveBeenCalled();
  });

  it('registered hotkey callbacks are callable', async () => {
    const callbacks: Record<string, (...args: unknown[]) => unknown> = {};
    vi.mocked(globalShortcut.register).mockImplementation(
      (acc: string, cb: (...args: unknown[]) => unknown) => {
        callbacks[acc] = cb;
        return true;
      }
    );

    vi.mocked(storage.getSettings).mockResolvedValue(primaryHotkeysSettings());

    await getManager().initialize();

    for (const cb of Object.values(callbacks)) {
      cb();
    }
  });
}
