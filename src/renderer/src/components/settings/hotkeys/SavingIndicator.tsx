import React from 'react';
import styles from '../HotkeyManager.module.css';

interface SavingIndicatorProps {
  saving: boolean;
}

export const SavingIndicator: React.FC<SavingIndicatorProps> = ({ saving }) => {
  if (!saving) {
    return null;
  }

  return <div className={styles.savingIndicator}>Saving settings...</div>;
};
