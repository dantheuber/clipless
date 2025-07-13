import React from 'react';
import classNames from 'classnames';
import { useTheme } from '../../../providers/theme';
import styles from '../HotkeyManager.module.css';

export const LoadingState: React.FC = () => {
  const { isLight } = useTheme();

  return (
    <div className={classNames(styles.container, { [styles.light]: isLight })}>
      <div className={styles.loading}>Loading hotkey settings...</div>
    </div>
  );
};
