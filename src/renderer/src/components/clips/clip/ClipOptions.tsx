import { useState, useCallback } from 'react';
import OutsideClickHandler from 'react-outside-click-handler';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useClipsActions } from '../../../providers/clips';
import { useTheme } from '../../../providers/theme';
import styles from './ClipOptions.module.css';
import classNames from 'classnames';

interface ClipOptionsProps {
  index: number;
  hasPatterns: boolean;
  clipContent: string;
}

export function ClipOptions({ index, hasPatterns, clipContent }: ClipOptionsProps) {
  const [visible, setVisible] = useState<boolean>(false);
  const { isLight } = useTheme();
  const toggleVisibility = useCallback(() => {
    setVisible((v) => !v);
  }, []);

  const { isClipLocked, toggleClipLock, emptyClip } = useClipsActions();

  // Check if this is the first clip (cannot be locked or emptied)
  const isFirstClip = index === 0;

  const handleScanClick = async () => {
    try {
      await window.api.openToolsLauncher(clipContent);
      setVisible(false); // Close the options menu
    } catch (error) {
      console.error('Failed to open tools launcher:', error);
    }
  };

  return (
    <div className={styles.optionsContainer}>
      <OutsideClickHandler onOutsideClick={() => setVisible(false)}>
        {visible && (
          <div className={classNames(styles.optionsMenu, { [styles.light]: isLight })}>
            <button
              key="trash"
              className={classNames(
                styles.optionButton,
                styles.trash,
                { [styles.light]: isLight },
                { [styles.disabled]: isFirstClip }
              )}
              onClick={() => !isFirstClip && emptyClip(index)}
              disabled={isFirstClip}
              title={isFirstClip ? 'Cannot empty the first clip' : 'Empty this clip'}
            >
              <FontAwesomeIcon icon="trash" />
            </button>
            <button
              key="lock"
              className={classNames(
                styles.optionButton,
                styles.lock,
                { [styles.light]: isLight },
                { [styles.disabled]: isFirstClip }
              )}
              onClick={() => !isFirstClip && toggleClipLock(index)}
              disabled={isFirstClip}
              title={
                isFirstClip
                  ? 'Cannot lock the first clip'
                  : isClipLocked(index)
                    ? 'Unlock this clip'
                    : 'Lock this clip'
              }
            >
              <FontAwesomeIcon icon={isClipLocked(index) ? 'lock-open' : 'lock'} />
            </button>
            <button
              key="scan"
              className={classNames(
                styles.optionButton,
                styles.scan,
                { [styles.light]: isLight },
                { [styles.hasPatterns]: hasPatterns }
              )}
              onClick={handleScanClick}
              title={
                hasPatterns ? 'Patterns detected! Open Tools Launcher' : 'Scan with Tools Launcher'
              }
            >
              <FontAwesomeIcon icon="search" />
            </button>
          </div>
        )}
        <button
          className={classNames(
            styles.toggleButton,
            { [styles.light]: isLight },
            {
              [styles.locked]: isClipLocked(index),
              [styles.active]: visible,
            }
          )}
          onClick={() => toggleVisibility()}
        >
          <FontAwesomeIcon icon={isClipLocked(index) ? 'lock' : 'gear'} />
        </button>
      </OutsideClickHandler>
    </div>
  );
}
