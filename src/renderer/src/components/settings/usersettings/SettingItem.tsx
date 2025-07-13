import React from 'react';
import classNames from 'classnames';
import { useTheme } from '../../../providers/theme';
import styles from '../StorageSettings.module.css';

interface SettingItemProps {
  label: string;
  description: string;
  children: React.ReactNode;
  disabled?: boolean;
  htmlFor?: string;
}

export const SettingItem: React.FC<SettingItemProps> = ({
  label,
  description,
  children,
  disabled = false,
  htmlFor,
}) => {
  const { isLight } = useTheme();

  return (
    <div
      className={classNames(styles.settingItem, {
        [styles.light]: isLight,
        [styles.settingItemDisabled]: disabled,
      })}
    >
      <div className={styles.settingContent}>
        <label
          htmlFor={htmlFor}
          className={classNames(styles.settingLabel, {
            [styles.light]: isLight,
            [styles.disabled]: disabled,
          })}
        >
          {label}
        </label>
        <p
          className={classNames(styles.settingDescription, {
            [styles.light]: isLight,
            [styles.disabled]: disabled,
          })}
        >
          {description}
        </p>
      </div>
      {children}
    </div>
  );
};
