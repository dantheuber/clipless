import React from 'react';
import classNames from 'classnames';
import { useTheme } from '../../../providers/theme';
import styles from '../StorageSettings.module.css';

interface CloseButtonProps {
  onClose: () => void;
}

export const CloseButton: React.FC<CloseButtonProps> = ({ onClose }) => {
  const { isLight } = useTheme();

  return (
    <div className={classNames(styles.closeButtonContainer, { [styles.light]: isLight })}>
      <button onClick={onClose} className={styles.closeButton}>
        Close Settings
      </button>
    </div>
  );
};
