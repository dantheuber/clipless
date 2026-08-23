import type { HotkeySettings, UserSettings } from '../../shared/types';
import { DEFAULT_HOTKEY_SETTINGS } from './defaults';

/**
 * Bring a stored settings object up to the current shape. Every settings read passes
 * through here (storage.getSettings), so it has to be a no-op once applied: the caller
 * compares the result with what it had and writes only when they differ.
 *
 * - A settings object without hotkeys gets the defaults.
 * - hotkeys.openToolsLauncher moves to hotkeys.quickLook (the action was renamed when the
 *   launcher window gave way to quick look). An existing quickLook wins; the old key is
 *   dropped either way.
 * - Every action is deep-merged with its default, so a map saved by an older build that
 *   lacks an action no longer throws in the hotkey manager.
 */
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

/**
 * Merge settings with existing settings
 */
export function mergeSettings(
  existingSettings: UserSettings,
  newSettings: Partial<UserSettings>
): UserSettings {
  return {
    ...existingSettings,
    ...newSettings,
  };
}
