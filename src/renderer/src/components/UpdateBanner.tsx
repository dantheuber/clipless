import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import { useTheme } from '../providers/theme';
import styles from './UpdateBanner.module.css';

export const UpdateBanner: React.FC = () => {
  const { isLight } = useTheme();
  const [version, setVersion] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const unsubscribe = window.api.onUpdateDownloaded((info) => {
      setVersion(info.version);
      setDismissed(false);
    });
    return unsubscribe;
  }, []);

  const handleRestart = async (): Promise<void> => {
    try {
      await window.api.quitAndInstall();
    } catch (error) {
      console.error('Failed to restart for update:', error);
    }
  };

  const handleDismiss = (): void => {
    setDismissed(true);
  };

  const visible = version !== null && !dismissed;

  return (
    <div className={classNames(styles.wrapper, { [styles.visible]: visible })}>
      <div className={classNames(styles.banner, { [styles.light]: isLight })}>
        <div className={styles.message}>
          <FontAwesomeIcon icon="circle-arrow-up" className={styles.icon} />
          <span className={styles.text}>Version {version} available!</span>
        </div>
        <div className={styles.actions}>
          <button type="button" onClick={handleRestart} className={styles.restartButton}>
            Restart Now
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className={styles.dismissButton}
            aria-label="Dismiss update notification"
            title="Dismiss"
          >
            <FontAwesomeIcon icon="xmark" />
          </button>
        </div>
      </div>
    </div>
  );
};
