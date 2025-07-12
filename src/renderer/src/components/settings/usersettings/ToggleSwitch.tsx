import React from 'react';
import classNames from 'classnames';
import { useTheme } from '../../../providers/theme';
import styles from '../StorageSettings.module.css';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  label,
}) => {
  const { isLight } = useTheme();

  return (
    <label className={styles.toggleLabel}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className={styles.toggleInput}
        aria-label={label}
      />
      <div
        className={classNames(styles.toggleSwitch, {
          [styles.light]: isLight,
          [styles.toggleSwitchChecked]: checked,
          [styles.toggleSwitchDisabled]: disabled,
        })}
      >
        <div
          className={classNames(styles.toggleSlider, {
            [styles.toggleSliderChecked]: checked,
          })}
        ></div>
      </div>
    </label>
  );
};
