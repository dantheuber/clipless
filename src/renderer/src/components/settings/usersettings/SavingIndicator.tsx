import React from 'react';
import styles from '../StorageSettings.module.css';

interface SavingIndicatorProps {
  message?: string;
}

export const SavingIndicator: React.FC<SavingIndicatorProps> = ({ 
  message = "Saving..." 
}) => {

  return (
    <div className={styles.savingIndicator}>
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
      <span className={styles.savingText}>{message}</span>
    </div>
  );
};
