import type { UserSettings } from '../../shared/types';
import { DEFAULT_HOTKEY_SETTINGS } from './defaults';

/**
 * Ensure settings have all required fields with defaults
 */
export function normalizeSettings(settings: Partial<UserSettings>): UserSettings {
  // Ensure hotkey settings exist with defaults if not present
  const normalizedSettings = { ...settings } as UserSettings;
  if (!normalizedSettings.hotkeys) {
    normalizedSettings.hotkeys = DEFAULT_HOTKEY_SETTINGS;
  }
  return normalizedSettings;
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
