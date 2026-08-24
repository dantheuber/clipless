import type { HotkeySettings, UserSettings } from '../../shared/types';
import { DEFAULT_HOTKEY_SETTINGS } from './defaults';

export function normalizeSettings(settings: Partial<UserSettings>): UserSettings {
  const normalizedSettings = { ...settings } as UserSettings;
  normalizedSettings.hotkeys = normalizeHotkeys(settings.hotkeys);
  return normalizedSettings;
}

type StoredHotkeys = Partial<HotkeySettings> & {
  openToolsLauncher?: HotkeySettings['quickLook'];
};

export function normalizeHotkeys(stored: StoredHotkeys | undefined): HotkeySettings {
  const { openToolsLauncher, ...rest } = stored ?? {};
  const migrated: Partial<HotkeySettings> = { ...rest };
  if (openToolsLauncher && !migrated.quickLook) {
    migrated.quickLook = openToolsLauncher;
  }

  const result = { ...DEFAULT_HOTKEY_SETTINGS } as HotkeySettings;
  result.enabled = migrated.enabled ?? DEFAULT_HOTKEY_SETTINGS.enabled;
  for (const key of Object.keys(DEFAULT_HOTKEY_SETTINGS) as (keyof HotkeySettings)[]) {
    if (key === 'enabled') continue;
    const action = migrated[key];
    result[key] = action
      ? { ...DEFAULT_HOTKEY_SETTINGS[key], ...action }
      : { ...DEFAULT_HOTKEY_SETTINGS[key] };
  }
  return result;
}

export function mergeSettings(
  existingSettings: UserSettings,
  newSettings: Partial<UserSettings>
): UserSettings {
  return {
    ...existingSettings,
    ...newSettings,
  };
}
