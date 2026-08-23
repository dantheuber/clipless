import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import { useTheme } from '../providers/theme';
import type { UpdateState } from '../../../shared/types';
import styles from './UpdateBanner.module.css';

/**
 * Shows once an update has downloaded. Renders from the main process's update state; the
 * status bar pill replaces this strip in step 2 of the quick look plan.
 */
export const UpdateBanner: React.FC = () => {
  const { isLight } = useTheme();
  const [state, setState] = useState<UpdateState>({ status: 'idle' });
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);

  useEffect(() => {
    window.api
      .getUpdateState()
      .then(setState)
      .catch((error) => console.error('Failed to read update state:', error));
    return window.api.onUpdateState(setState);
  }, []);

  const handleRestart = async (): Promise<void> => {
    try {
      await window.api.quitAndInstall();
    } catch (error) {
      console.error('Failed to restart for update:', error);
    }
  };

  const version = state.status === 'downloaded' ? (state.version ?? '') : null;
  const visible = version !== null && dismissedVersion !== version;

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
            onClick={() => setDismissedVersion(version)}
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
