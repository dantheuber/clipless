import React from 'react';
import classNames from 'classnames';
import { useTheme } from '../../../providers/theme';
import type { HotkeySettings } from '../../../../../shared/types';
import { hotkeyDescriptions } from './useHotkeyManager';
import styles from '../HotkeyManager.module.css';

interface HotkeyListProps {
  hotkeySettings: HotkeySettings;
  editingHotkey: string | null;
  listeningForKey: boolean;
  saving: boolean;
  onStartKeyCapture: (key: string) => void;
  onCancelKeyCapture: () => void;
  onHotkeyToggle: (hotkeyKey: keyof Omit<HotkeySettings, 'enabled'>, enabled: boolean) => void;
}

export const HotkeyList: React.FC<HotkeyListProps> = ({
  hotkeySettings,
  editingHotkey,
  listeningForKey,
  saving,
  onStartKeyCapture,
  onCancelKeyCapture,
  onHotkeyToggle,
}) => {
  const { isLight } = useTheme();

  if (!hotkeySettings.enabled) {
    return null;
  }

  return (
    <div className={styles.hotkeyList}>
      {Object.entries(hotkeyDescriptions).map(([key, description]) => {
        const hotkeyKey = key as keyof Omit<HotkeySettings, 'enabled'>;
        const config = hotkeySettings[hotkeyKey];
        const isEditing = editingHotkey === key;

        return (
          <div key={key} className={classNames(styles.hotkeyItem, { [styles.light]: isLight })}>
            <div className={styles.hotkeyInfo}>
              <div className={styles.hotkeyLabel}>{description}</div>
              <div className={styles.hotkeyKey}>
                {isEditing ? (
                  <span className={styles.listening}>
                    {listeningForKey ? 'Press keys...' : 'Click to set'}
                  </span>
                ) : (
                  <code className={styles.keyDisplay}>{config.key}</code>
                )}
              </div>
            </div>
            <div className={styles.hotkeyControls}>
              <button
                className={classNames(styles.editButton, { [styles.light]: isLight })}
                onClick={() => (isEditing ? onCancelKeyCapture() : onStartKeyCapture(key))}
                disabled={saving}
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
              <div className={styles.toggleContainer}>
                <span
                  className={classNames(styles.toggleLabel, {
                    [styles.enabled]: config.enabled,
                    [styles.disabled]: !config.enabled,
                  })}
                >
                  {config.enabled ? 'ON' : 'OFF'}
                </span>
                <label
                  className={classNames(styles.toggle, styles.small, {
                    [styles.light]: isLight,
                  })}
                >
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) => onHotkeyToggle(hotkeyKey, e.target.checked)}
                    disabled={saving || isEditing}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
