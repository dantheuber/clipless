import React from 'react';
import classNames from 'classnames';
import { useTheme } from '../../../providers/theme';
import type { HotkeySettings } from '../../../../../shared/types';
import styles from '../HotkeyManager.module.css';

interface GlobalToggleProps {
  hotkeySettings: HotkeySettings;
  onGlobalToggle: (enabled: boolean) => void;
  saving: boolean;
}

export const GlobalToggle: React.FC<GlobalToggleProps> = ({
  hotkeySettings,
  onGlobalToggle,
  saving,
}) => {
  const { isLight } = useTheme();

  return (
    <div className={classNames(styles.setting, { [styles.light]: isLight })}>
      <div className={styles.settingInfo}>
        <div className={styles.settingLabel}>Enable Hotkeys</div>
        <div className={styles.settingDescription}>
          Master switch to enable or disable all global hotkeys
        </div>
      </div>
      <div className={styles.settingControl}>
        <div className={styles.toggleContainer}>
          <span
            className={classNames(styles.toggleLabel, {
              [styles.enabled]: hotkeySettings.enabled,
              [styles.disabled]: !hotkeySettings.enabled,
            })}
          >
            {hotkeySettings.enabled ? 'ON' : 'OFF'}
          </span>
          <label className={classNames(styles.toggle, { [styles.light]: isLight })}>
            <input
              type="checkbox"
              checked={hotkeySettings.enabled}
              onChange={(e) => onGlobalToggle(e.target.checked)}
              disabled={saving}
            />
            <span className={styles.slider}></span>
          </label>
        </div>
      </div>
    </div>
  );
};
