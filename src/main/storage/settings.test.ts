import { describe, it, expect } from 'vitest';
import { normalizeSettings, normalizeHotkeys, mergeSettings } from './settings';
import { DEFAULT_HOTKEY_SETTINGS } from './defaults';
import type { HotkeySettings, UserSettings } from '../../shared/types';

const base: UserSettings = { maxClips: 25, startMinimized: false, autoStart: false };

describe('normalizeSettings', () => {
  it('adds default hotkeys when none are stored', () => {
    const result = normalizeSettings(base);
    expect(result.hotkeys).toEqual(DEFAULT_HOTKEY_SETTINGS);
    expect(result.maxClips).toBe(25);
  });

  it('moves openToolsLauncher to quickLook and drops the old key', () => {
    const stored = {
      ...base,
      hotkeys: {
        ...DEFAULT_HOTKEY_SETTINGS,
        quickLook: undefined,
        openToolsLauncher: { enabled: false, key: 'CommandOrControl+Alt+T' },
      } as unknown as HotkeySettings,
    };
    const result = normalizeSettings(stored);
    expect(result.hotkeys?.quickLook).toEqual({ enabled: false, key: 'CommandOrControl+Alt+T' });
    expect('openToolsLauncher' in (result.hotkeys as object)).toBe(false);
  });

  it('is a no-op the second time', () => {
    const stored = {
      ...base,
      hotkeys: {
        enabled: true,
        focusWindow: { enabled: true, key: 'CommandOrControl+Shift+V' },
        openToolsLauncher: { enabled: true, key: 'CommandOrControl+Shift+Y' },
      } as unknown as HotkeySettings,
    };
    const once = normalizeSettings(stored);
    const twice = normalizeSettings(once);
    expect(twice).toEqual(once);
    expect(JSON.stringify(twice)).toBe(JSON.stringify(once));
  });

  it('leaves an already-migrated map untouched', () => {
    const hotkeys: HotkeySettings = {
      ...DEFAULT_HOTKEY_SETTINGS,
      enabled: true,
      quickLook: { enabled: false, key: 'CommandOrControl+Shift+K' },
    };
    const result = normalizeSettings({ ...base, hotkeys });
    expect(result.hotkeys).toEqual(hotkeys);
  });

  it('keeps an existing quickLook when the old key is also present', () => {
    const hotkeys = {
      ...DEFAULT_HOTKEY_SETTINGS,
      quickLook: { enabled: true, key: 'CommandOrControl+Shift+K' },
      openToolsLauncher: { enabled: true, key: 'CommandOrControl+Shift+T' },
    };
    const result = normalizeHotkeys(hotkeys);
    expect(result.quickLook.key).toBe('CommandOrControl+Shift+K');
    expect('openToolsLauncher' in result).toBe(false);
  });

  it('deep-merges a map missing an action with the defaults', () => {
    const result = normalizeHotkeys({
      enabled: true,
      focusWindow: { enabled: false, key: 'CommandOrControl+Shift+V' },
    });
    expect(result.enabled).toBe(true);
    expect(result.focusWindow).toEqual({ enabled: false, key: 'CommandOrControl+Shift+V' });
    expect(result.quickLook).toEqual(DEFAULT_HOTKEY_SETTINGS.quickLook);
    expect(result.searchClips).toEqual(DEFAULT_HOTKEY_SETTINGS.searchClips);
    expect(result.quickClip3).toEqual(DEFAULT_HOTKEY_SETTINGS.quickClip3);
  });

  it('deep-merges an action missing a field', () => {
    const result = normalizeHotkeys({
      searchClips: { key: 'CommandOrControl+Shift+S' } as HotkeySettings['searchClips'],
    });
    expect(result.searchClips).toEqual({ enabled: true, key: 'CommandOrControl+Shift+S' });
    expect(result.enabled).toBe(false);
  });

  it('does not share the default objects with the caller', () => {
    const result = normalizeHotkeys(undefined);
    result.focusWindow.key = 'changed';
    expect(DEFAULT_HOTKEY_SETTINGS.focusWindow.key).toBe('CommandOrControl+Shift+V');
  });
});

describe('mergeSettings', () => {
  it('overlays new values on the existing settings', () => {
    expect(mergeSettings(base, { maxClips: 50 })).toEqual({ ...base, maxClips: 50 });
  });
});
