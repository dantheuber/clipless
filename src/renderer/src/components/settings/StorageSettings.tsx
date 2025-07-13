import React from 'react';
import { LoadingState } from './usersettings/LoadingState';
import { CloseButton } from './usersettings/CloseButton';
import { StorageStatistics } from './storagesettings/StorageStatistics';
import { DataManagement } from './storagesettings/DataManagement';
import { useStorageSettings } from './storagesettings/useStorageSettings';
import styles from './StorageSettings.module.css';

interface StorageSettingsProps {
  onClose?: () => void;
}

export const StorageSettings: React.FC<StorageSettingsProps> = ({ onClose }) => {
  const {
    stats,
    loading,
    handleExportData,
    handleImportData,
    handleClearAllData,
  } = useStorageSettings();

  if (loading) {
    return <LoadingState message="Loading storage data..." />;
  }

  return (
    <div className={styles.container}>
      {/* Storage Statistics */}
      {stats && <StorageStatistics stats={stats} />}

      {/* Data Management */}
      <DataManagement
        onExportData={handleExportData}
        onImportData={handleImportData}
        onClearAllData={handleClearAllData}
      />

      {/* Close Button */}
      {onClose && <CloseButton onClose={onClose} />}
    </div>
  );
};
