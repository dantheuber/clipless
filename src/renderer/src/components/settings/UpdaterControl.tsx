import { useEffect, useState } from 'react';
import classNames from 'classnames';
import { useTheme } from '../../providers/theme';
import type { UpdateState } from '../../../../shared/types';
import { updateStatusText } from './updateStatusText';
import styles from './UpdaterControl.module.css';

function UpdaterControl(): React.JSX.Element {
  const [state, setState] = useState<UpdateState>({ status: 'idle' });
  const [isChecking, setIsChecking] = useState(false);

  const { isLight } = useTheme();

  useEffect(() => {
    window.api
      .getUpdateState()
      .then(setState)
      .catch((error) => console.error('Failed to read update state:', error));
    return window.api.onUpdateState(setState);
  }, []);

  const handleCheckForUpdates = async (): Promise<void> => {
    setIsChecking(true);
    try {
      const result = await window.api.checkForUpdates();
      if (result) {
        await window.api.downloadUpdate();
      }
    } catch (error) {
      // The main process has already moved the state to error
      console.error('Update check failed:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleInstallUpdate = async (): Promise<void> => {
    await window.api.quitAndInstall();
  };

  const getStatusDotClass = () => {
    switch (state.status) {
      case 'error':
        return styles.statusDotError;
      case 'available':
      case 'downloading':
      case 'downloaded':
        return styles.statusDotSuccess;
      case 'checking':
        return styles.statusDotChecking;
      default:
        return styles.statusDotReady;
    }
  };

  return (
    <div className={styles.container}>
      {/* Status Display */}
      <div className={classNames(styles.statusCard, { [styles.light]: isLight })}>
        <div className={styles.statusContent}>
          <div className={classNames(styles.statusDot, getStatusDotClass())}></div>
          <span className={classNames(styles.statusText, { [styles.light]: isLight })}>
            Status:{' '}
            <span className={classNames(styles.statusValue, { [styles.light]: isLight })}>
              {updateStatusText(state)}
            </span>
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className={styles.buttonContainer}>
        <button
          onClick={handleCheckForUpdates}
          disabled={isChecking}
          className={classNames(styles.button, styles.buttonPrimary, {
            [styles.light]: isLight && isChecking,
          })}
        >
          {isChecking ? (
            <>
              <svg className={styles.spinner} viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Checking...</span>
            </>
          ) : (
            'Check for Updates'
          )}
        </button>

        {state.status === 'downloaded' && (
          <button
            onClick={handleInstallUpdate}
            className={classNames(styles.button, styles.buttonSuccess)}
          >
            Restart & Install
          </button>
        )}
      </div>

      {/* Helper Text */}
      <p className={classNames(styles.helperText, { [styles.light]: isLight })}>
        Updates are checked automatically when Clipless starts (configurable in Application
        Settings). Use this button to check manually.
      </p>
    </div>
  );
}

export default UpdaterControl;
