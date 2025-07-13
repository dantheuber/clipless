import { useState, useEffect } from 'react';
import type { StorageStats } from '../../../../../shared/types';

export const useStorageSettings = () => {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Load stats on mount
  useEffect(() => {
    const loadData = async () => {
      if (!window.api) return;

      try {
        const loadedStats = await window.api.storageGetStats();
        setStats(loadedStats);
      } catch (error) {
        console.error('Failed to load storage stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const refreshStats = async () => {
    if (!window.api) return;

    try {
      const newStats = await window.api.storageGetStats();
      setStats(newStats);
    } catch (error) {
      console.error('Failed to refresh storage stats:', error);
    }
  };

  const handleExportData = async () => {
    if (!window.api) return;

    try {
      const data = await window.api.storageExportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `clipless-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export data:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  const handleImportData = async (file: File): Promise<boolean> => {
    if (!window.api) return false;

    try {
      const text = await file.text();
      const success = await window.api.storageImportData(text);

      if (success) {
        alert('Data imported successfully! Please restart the application.');
        return true;
      } else {
        alert('Failed to import data. Please check the file format.');
        return false;
      }
    } catch (error) {
      console.error('Failed to import data:', error);
      alert('Failed to import data. Please check the file format.');
      return false;
    }
  };

  const handleClearAllData = async (): Promise<boolean> => {
    if (!window.api) return false;

    if (!confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      return false;
    }

    try {
      const success = await window.api.storageClearAll();

      if (success) {
        alert('All data cleared successfully!');
        await refreshStats();
        return true;
      } else {
        alert('Failed to clear data.');
        return false;
      }
    } catch (error) {
      console.error('Failed to clear data:', error);
      alert('Failed to clear data. Please try again.');
      return false;
    }
  };

  return {
    stats,
    loading,
    refreshStats,
    handleExportData,
    handleImportData,
    handleClearAllData,
  };
};
