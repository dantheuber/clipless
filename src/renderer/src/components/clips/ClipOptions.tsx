import { useState, useCallback } from 'react';
import OutsideClickHandler from 'react-outside-click-handler';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useClips } from '../../providers/clips';
import { useTheme } from '../../providers/theme';
import styles from './ClipOptions.module.css';
import classNames from 'classnames';

export const ClipOptions = ({ index }): React.JSX.Element => {
  const [visible, setVisible] = useState<boolean>(false);
  const { isLight } = useTheme();
  const toggleVisibility = useCallback(() => {
    setVisible(!visible);
  }, [visible, setVisible]);

  const {
    isClipLocked,
    toggleClipLock,
    emptyClip
  } = useClips();

  return (
    <div className={styles.optionsContainer}>
      <OutsideClickHandler onOutsideClick={() => setVisible(false)}>
        {visible && (
          <div className={classNames(styles.optionsMenu, { [styles.light]: isLight })}>
            <button 
              key="trash" 
              className={classNames(styles.optionButton, styles.trash, { [styles.light]: isLight })}
              onClick={() => emptyClip(index)}
            >
              <FontAwesomeIcon icon="trash" />
            </button>
            <button 
              key="lock" 
              className={classNames(styles.optionButton, styles.lock, { [styles.light]: isLight })}
              onClick={() => toggleClipLock(index)}
            >
              <FontAwesomeIcon icon={isClipLocked(index) ? 'lock-open' : 'lock'} />
            </button>
            <button 
              key="scan" 
              className={classNames(styles.optionButton, styles.scan, { [styles.light]: isLight })}
              onClick={() => console.log('Scan functionality not implemented')}
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
              [styles.active]: visible
            }
          )}
          onClick={() => toggleVisibility()}
        >
          <FontAwesomeIcon icon={isClipLocked(index) ? 'lock' : 'gear'} />
        </button>
      </OutsideClickHandler>
    </div>
  );
};