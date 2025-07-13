import React from 'react';
import classNames from 'classnames';
import { useTheme } from '../../../providers/theme';
import styles from '../StorageSettings.module.css';

interface ErrorStateProps {
  title?: string;
  message?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to load settings',
  message = 'Please try refreshing the application',
}) => {
  const { isLight } = useTheme();

  return (
    <div className={styles.errorContainer}>
      <div className={styles.errorContent}>
        <svg className={styles.errorIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.96-.833-2.73 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
        <p className={classNames(styles.errorTitle, { [styles.light]: isLight })}>{title}</p>
        <p className={classNames(styles.errorDescription, { [styles.light]: isLight })}>
          {message}
        </p>
      </div>
    </div>
  );
};
