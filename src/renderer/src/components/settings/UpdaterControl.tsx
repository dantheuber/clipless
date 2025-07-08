import { useState } from 'react';
import classNames from 'classnames';
import { useTheme } from '../../providers/theme';
import styles from './UpdaterControl.module.css';

function UpdaterControl(): React.JSX.Element {
  const [updateStatus, setUpdateStatus] = useState<string>('Ready');
  const [isChecking, setIsChecking] = useState(false);

  const { isLight } = useTheme();

  const handleCheckForUpdates = async (): Promise<void> => {
    setIsChecking(true);
    setUpdateStatus('Checking for updates...');

    try {
      const result = await window.api.checkForUpdates();
      if (result) {
        setUpdateStatus('Update available! Downloading...');
        await window.api.downloadUpdate();
        setUpdateStatus('Update downloaded. Click to restart and install.');
      } else {
        setUpdateStatus('No updates available');
      }
    } catch (error) {
      console.error('Update check failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const normalizedErrorMessage = errorMessage.toLowerCase();

      if (normalizedErrorMessage.includes('network') || normalizedErrorMessage.includes('fetch')) {
        setUpdateStatus('Error: Unable to connect to update server');
      } else if (normalizedErrorMessage.includes('timeout')) {
        setUpdateStatus('Error: Update check timed out');
      } else if (normalizedErrorMessage.includes('github')) {
        setUpdateStatus('Error: GitHub API unavailable');
      } else {
        setUpdateStatus(`Error: ${errorMessage}`);
      }
    } finally {
      setIsChecking(false);
    }
  };

  const handleInstallUpdate = async (): Promise<void> => {
    await window.api.quitAndInstall();
  };

  const getStatusDotClass = () => {
    if (updateStatus.includes('Error')) return styles.statusDotError;
    if (updateStatus.includes('available') || updateStatus.includes('downloaded'))
      return styles.statusDotSuccess;
    if (updateStatus.includes('Checking')) return styles.statusDotChecking;
    return styles.statusDotReady;
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
              {updateStatus}
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

        {updateStatus.includes('downloaded') && (
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
        Updates are automatically downloaded. You'll be notified when a restart is required to
        complete the installation.
      </p>
    </div>
  );
}

export default UpdaterControl;
