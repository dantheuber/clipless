import React from 'react';
import classNames from 'classnames';
import { useTheme } from '../../../providers/theme';
import type { UserSettings as UserSettingsType } from '../../../../../shared/types';
import { SettingItem } from './SettingItem';
import { ToggleSwitch } from './ToggleSwitch';
import styles from '../StorageSettings.module.css';

interface ApplicationSettingsProps {
  settings: UserSettingsType;
  onSettingChange: (key: keyof UserSettingsType, value: any) => void;
  onMaxClipsChange: (value: number) => void;
  saving: boolean;
  tempMaxClips: number | null;
  debounceTimeout: NodeJS.Timeout | null;
}

export const ApplicationSettings: React.FC<ApplicationSettingsProps> = ({
  settings,
  onSettingChange,
  onMaxClipsChange,
  saving,
  tempMaxClips,
  debounceTimeout,
}) => {
  const { isLight } = useTheme();

  return (
    <div className={styles.section}>
      <h3 className={classNames(styles.sectionTitle, { [styles.light]: isLight })}>
        Application Settings
      </h3>

      <div className={styles.settingsContainer}>
        {/* Maximum Clips Setting */}
        <SettingItem
          label="Maximum Clips"
          description={`Maximum number of clipboard items to store (15-100). Reducing this number will require confirmation if it would result in data loss.${
            debounceTimeout ? ' (Change pending...)' : ''
          }`}
          htmlFor="maxClips"
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
            <input
              type="number"
              id="maxClips"
              min="15"
              max="100"
              value={tempMaxClips ?? settings.maxClips}
              onChange={(e) => onMaxClipsChange(parseInt(e.target.value))}
              disabled={saving}
              className={classNames(styles.input, { [styles.light]: isLight })}
            />
            {debounceTimeout && (
              <span style={{ color: '#ffa500', fontWeight: 'bold', fontSize: '0.75rem' }}>
                Change pending...
              </span>
            )}
          </div>
        </SettingItem>

        {/* Start Minimized Setting */}
        <SettingItem
          label="Start Minimized"
          description="Launch the application minimized to system tray"
        >
          <ToggleSwitch
            checked={settings.startMinimized}
            onChange={(checked) => onSettingChange('startMinimized', checked)}
            disabled={saving}
            label="Start Minimized"
          />
        </SettingItem>

        {/* Auto Start Setting */}
        <SettingItem
          label="Auto Start with System"
          description="Start Clipless automatically when your computer boots up"
        >
          <ToggleSwitch
            checked={settings.autoStart}
            onChange={(checked) => onSettingChange('autoStart', checked)}
            disabled={saving}
            label="Auto Start with System"
          />
        </SettingItem>

        {/* Theme Setting */}
        <SettingItem
          label="Theme"
          description="Choose your preferred color scheme"
          htmlFor="theme"
        >
          <select
            id="theme"
            value={settings.theme || 'system'}
            onChange={(e) =>
              onSettingChange('theme', e.target.value as 'light' | 'dark' | 'system')
            }
            disabled={saving}
            className={classNames(styles.select, { [styles.light]: isLight })}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </SettingItem>

        {/* Code Detection Setting */}
        <SettingItem
          label="Code Detection & Highlighting"
          description="Automatically detect programming languages and apply syntax highlighting when editing"
        >
          <ToggleSwitch
            checked={settings.codeDetectionEnabled ?? true}
            onChange={(checked) => onSettingChange('codeDetectionEnabled', checked)}
            disabled={saving}
            label="Code Detection & Highlighting"
          />
        </SettingItem>
      </div>
    </div>
  );
};
