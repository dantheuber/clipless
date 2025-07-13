import React from 'react';
import classNames from 'classnames';
import { useTheme } from '../../../providers/theme';
import styles from '../StorageSettings.module.css';

interface DataManagementProps {
  onExportData: () => Promise<void>;
  onImportData: (file: File) => Promise<boolean>;
  onClearAllData: () => Promise<boolean>;
}

export const DataManagement: React.FC<DataManagementProps> = ({
  onExportData,
  onImportData,
  onClearAllData,
}) => {
  const { isLight } = useTheme();

  const handleImportChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await onImportData(file);

    // Reset file input
    event.target.value = '';
  };

  return (
    <div className={styles.section}>
      <h3 className={classNames(styles.sectionTitle, { [styles.light]: isLight })}>
        Data Management
      </h3>

      <div className={styles.buttonGrid}>
        <button onClick={onExportData} className={classNames(styles.button, styles.buttonBlue)}>
          <svg className={styles.buttonIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
            />
          </svg>
          <span>Export Data</span>
        </button>

        <label htmlFor="import-file" className={classNames(styles.button, styles.buttonGreen)}>
          <svg className={styles.buttonIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <span>Import Data</span>
          <input
            type="file"
            id="import-file"
            accept=".json"
            onChange={handleImportChange}
            className={styles.hiddenInput}
          />
        </label>

        <button onClick={onClearAllData} className={classNames(styles.button, styles.buttonRed)}>
          <svg className={styles.buttonIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          <span>Clear All Data</span>
        </button>
      </div>

      <div className={classNames(styles.warningCard, { [styles.light]: isLight })}>
        <div className={styles.warningContent}>
          <svg
            className={classNames(styles.warningIcon, { [styles.light]: isLight })}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.96-.833-2.73 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <div>
            <p className={classNames(styles.warningTitle, { [styles.light]: isLight })}>
              Data Management Warning
            </p>
            <p className={classNames(styles.warningDescription, { [styles.light]: isLight })}>
              Clearing all data is permanent and cannot be undone. Consider exporting your data
              first as a backup.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
