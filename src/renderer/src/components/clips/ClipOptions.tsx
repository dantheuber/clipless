import { useState, useCallback } from 'react';
import OutsideClickHandler from 'react-outside-click-handler';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useClips } from '../../providers/clips';
import styles from './ClipOptions.module.css';

export const ClipOptions = ({ index }): React.JSX.Element => {
  const [visible, setVisible] = useState<boolean>(false);
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
          <div className={styles.optionsMenu}>
            <button 
              key="trash" 
              className={`${styles.optionButton} ${styles.trash}`}
              onClick={() => emptyClip(index)}
            >
              <FontAwesomeIcon icon="trash" />
            </button>
            <button 
              key="lock" 
              className={`${styles.optionButton} ${styles.lock}`}
              onClick={() => toggleClipLock(index)}
            >
              <FontAwesomeIcon icon={isClipLocked(index) ? 'lock-open' : 'lock'} />
            </button>
            <button 
              key="scan" 
              className={`${styles.optionButton} ${styles.scan}`}
              onClick={() => console.log('Scan functionality not implemented')}
            >
              <FontAwesomeIcon icon="search" />
            </button>
          </div>
        )}
        <button 
          className={`${styles.toggleButton} ${isClipLocked(index) ? styles.locked : ''}`}
          onClick={() => toggleVisibility()}
        >
          <FontAwesomeIcon icon={isClipLocked(index) ? 'lock' : 'gear'} />
        </button>
      </OutsideClickHandler>
    </div>
  );
};