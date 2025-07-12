import React from 'react';
import classNames from 'classnames';
import { useTheme } from '../../../providers/theme';
import type { UserSettings as UserSettingsType } from '../../../../../shared/types';
import { SettingItem } from './SettingItem';
import { ToggleSwitch } from './ToggleSwitch';
import styles from '../StorageSettings.module.css';

interface WindowSettingsProps {
  settings: UserSettingsType;
  onSettingChange: (key: keyof UserSettingsType, value: any) => void;
  saving: boolean;
}

export const WindowSettings: React.FC<WindowSettingsProps> = ({
  settings,
  onSettingChange,
  saving,
}) => {
  const { isLight } = useTheme();

  return (
    <div className={styles.section}>
      <h3 className={classNames(styles.sectionTitle, { [styles.light]: isLight })}>
        Window Settings
      </h3>

      <div className={styles.settingsContainer}>
        {/* Enable Window Transparency Setting */}
        <SettingItem
          label="Enable Window Transparency"
          description="Allow the window to be made transparent"
        >
          <ToggleSwitch
            checked={settings.transparencyEnabled ?? false}
            onChange={(checked) => onSettingChange('transparencyEnabled', checked)}
            disabled={saving}
            label="Enable Window Transparency"
          />
        </SettingItem>

        {/* Window Transparency Setting */}
        <SettingItem
          label="Window Transparency Level"
          description="Set window transparency level (0% = fully opaque, 100% = fully transparent)"
          disabled={!(settings.transparencyEnabled ?? false)}
          htmlFor="windowTransparency"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="range"
              id="windowTransparency"
              min="0"
              max="100"
              step="5"
              value={settings.windowTransparency ?? 0}
              onChange={(e) =>
                onSettingChange('windowTransparency', parseInt(e.target.value))
              }
              disabled={saving || !(settings.transparencyEnabled ?? false)}
              className={classNames(styles.rangeSlider, { [styles.light]: isLight })}
            />
            <span
              className={classNames(styles.settingLabel, {
                [styles.light]: isLight,
                [styles.disabled]: !(settings.transparencyEnabled ?? false),
              })}
              style={{ minWidth: '40px' }}
            >
              {settings.windowTransparency ?? 0}%
            </span>
          </div>
        </SettingItem>

        {/* Opaque When Focused Setting */}
        <SettingItem
          label="Opaque When Focused"
          description="Make window fully opaque when it has focus, transparent when it doesn't"
          disabled={!(settings.transparencyEnabled ?? false)}
        >
          <ToggleSwitch
            checked={settings.opaqueWhenFocused ?? true}
            onChange={(checked) => onSettingChange('opaqueWhenFocused', checked)}
            disabled={saving || !(settings.transparencyEnabled ?? false)}
            label="Opaque When Focused"
          />
        </SettingItem>

        {/* Always On Top Setting */}
        <SettingItem
          label="Always On Top"
          description="Keep the main window always on top of other windows"
        >
          <ToggleSwitch
            checked={settings.alwaysOnTop ?? false}
            onChange={(checked) => onSettingChange('alwaysOnTop', checked)}
            disabled={saving}
            label="Always On Top"
          />
        </SettingItem>

        {/* Remember Window Position Setting */}
        <SettingItem
          label="Remember Window Position"
          description="Save and restore window position when the application is closed and reopened"
        >
          <ToggleSwitch
            checked={settings.rememberWindowPosition ?? true}
            onChange={(checked) => onSettingChange('rememberWindowPosition', checked)}
            disabled={saving}
            label="Remember Window Position"
          />
        </SettingItem>
      </div>
    </div>
  );
};
