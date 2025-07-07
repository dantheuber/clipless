import { useState, useCallback, useEffect } from 'react';
import OutsideClickHandler from 'react-outside-click-handler';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useClips } from '../../providers/clips';
import { useTheme } from '../../providers/theme';
import { QuickClipsScanner } from './QuickClipsScanner';
import styles from './ClipOptions.module.css';
import classNames from 'classnames';

export function ClipOptions({ index }): React.JSX.Element {
  const [visible, setVisible] = useState<boolean>(false);
  const [scannerOpen, setScannerOpen] = useState<boolean>(false);
  const { isLight } = useTheme();
  const toggleVisibility = useCallback(() => {
    setVisible(!visible);
  }, [visible, setVisible]);

  const { isClipLocked, toggleClipLock, emptyClip, getClip } = useClips();

  const clip = getClip(index);

  // Check if this is the first clip (cannot be locked or emptied)
  const isFirstClip = index === 0;

  // Check if this clip has patterns (we'll do a simple check)
  const [hasPatterns, setHasPatterns] = useState(false);

  // Check for patterns when component mounts or clip content changes
  useEffect(() => {
    let isCancelled = false;

    const checkPatterns = async () => {
      if (!clip.content || clip.content.trim().length === 0) {
        setHasPatterns(false);
        return;
      }

      try {
        const matches = await window.api.quickClipsScanText(clip.content);
        if (!isCancelled) {
          setHasPatterns(matches.length > 0);
        }
      } catch {
        if (!isCancelled) {
          setHasPatterns(false);
        }
      }
    };

    const timeoutId = setTimeout(checkPatterns, 200);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [clip.content]);

  const handleScanClick = () => {
    setScannerOpen(true);
    setVisible(false); // Close the options menu
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
                hasPatterns ? 'Quick Clips patterns detected!' : 'Scan for Quick Clips patterns'
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

      <QuickClipsScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        clipContent={clip.content}
      />
    </div>
  );
}
