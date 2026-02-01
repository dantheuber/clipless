import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('electron', () => ({
  globalShortcut: {
    register: vi.fn().mockReturnValue(true),
    unregister: vi.fn(),
  },
}));

import { HotkeyRegistry } from './registry';
import { globalShortcut } from 'electron';

describe('HotkeyRegistry', () => {
  let registry: HotkeyRegistry;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = new HotkeyRegistry();
  });

  describe('registerHotkey', () => {
    it('registers a hotkey successfully', () => {
      const callback = vi.fn();
      const result = registry.registerHotkey('Ctrl+A', callback);
      expect(result).toBe(true);
      expect(globalShortcut.register).toHaveBeenCalledWith('Ctrl+A', callback);
    });

    it('returns false for duplicate registration', () => {
      registry.registerHotkey('Ctrl+A', vi.fn());
      const result = registry.registerHotkey('Ctrl+A', vi.fn());
      expect(result).toBe(false);
    });

    it('returns false when globalShortcut fails', () => {
      vi.mocked(globalShortcut.register).mockReturnValueOnce(false);
      const result = registry.registerHotkey('Ctrl+A', vi.fn());
      expect(result).toBe(false);
    });
  });

  describe('unregisterAllHotkeys', () => {
    it('unregisters all registered hotkeys', () => {
      registry.registerHotkey('Ctrl+A', vi.fn());
      registry.registerHotkey('Ctrl+B', vi.fn());
      registry.unregisterAllHotkeys();
      expect(globalShortcut.unregister).toHaveBeenCalledTimes(2);
      expect(registry.getCurrentHotkeys()).toEqual([]);
    });
  });

  describe('getCurrentHotkeys', () => {
    it('returns list of registered accelerators', () => {
      registry.registerHotkey('Ctrl+A', vi.fn());
      registry.registerHotkey('Ctrl+B', vi.fn());
      expect(registry.getCurrentHotkeys()).toEqual(['Ctrl+A', 'Ctrl+B']);
    });
  });

  describe('isHotkeyRegistered', () => {
    it('returns true for registered hotkey', () => {
      registry.registerHotkey('Ctrl+A', vi.fn());
      expect(registry.isHotkeyRegistered('Ctrl+A')).toBe(true);
    });

    it('returns false for unregistered hotkey', () => {
      expect(registry.isHotkeyRegistered('Ctrl+A')).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('unregisters all hotkeys and resets initialization', () => {
      registry.setInitialized(true);
      registry.registerHotkey('Ctrl+A', vi.fn());
      registry.cleanup();
      expect(registry.isInitialized).toBe(false);
      expect(registry.getCurrentHotkeys()).toEqual([]);
    });
  });
});
