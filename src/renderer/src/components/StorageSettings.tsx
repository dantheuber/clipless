import React, { useState, useEffect } from 'react';
import type { UserSettings, StorageStats } from '../../../shared/types';

interface StorageSettingsProps {
  onClose?: () => void;
}

export const StorageSettings: React.FC<StorageSettingsProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load settings and stats on mount
  useEffect(() => {
    const loadData = async () => {
      if (!window.api) return;

      try {
        const [loadedSettings, loadedStats] = await Promise.all([
          window.api.storageGetSettings(),
          window.api.storageGetStats()
        ]);

        setSettings(loadedSettings);
        setStats(loadedStats);
      } catch (error) {
        console.error('Failed to load storage data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSettingChange = async (key: keyof UserSettings, value: any) => {
    if (!settings || !window.api) return;

    setSaving(true);
    try {
      const updatedSettings = { ...settings, [key]: value };
      const success = await window.api.storageSaveSettings(updatedSettings);
      
      if (success) {
        setSettings(updatedSettings);
      } else {
        console.error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
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

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !window.api) return;

    try {
      const text = await file.text();
      const success = await window.api.storageImportData(text);
      
      if (success) {
        alert('Data imported successfully! Please restart the application.');
      } else {
        alert('Failed to import data. Please check the file format.');
      }
    } catch (error) {
      console.error('Failed to import data:', error);
      alert('Failed to import data. Please check the file format.');
    }

    // Reset file input
    event.target.value = '';
  };

  const handleClearAllData = async () => {
    if (!window.api) return;

    if (!confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      return;
    }

    try {
      const success = await window.api.storageClearAll();
      
      if (success) {
        alert('All data cleared successfully!');
        // Reload stats
        const newStats = await window.api.storageGetStats();
        setStats(newStats);
      } else {
        alert('Failed to clear data.');
      }
    } catch (error) {
      console.error('Failed to clear data:', error);
      alert('Failed to clear data. Please try again.');
    }
  };

  if (loading) {
    return <div className="storage-settings loading">Loading storage settings...</div>;
  }

  if (!settings) {
    return <div className="storage-settings error">Failed to load settings</div>;
  }

  return (
    <div className="storage-settings">
      <h2>Storage & Settings</h2>
      
      {/* Storage Statistics */}
      <section className="storage-stats">
        <h3>Storage Statistics</h3>
        {stats && (
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Total Clips:</span>
              <span className="stat-value">{stats.clipCount}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Locked Clips:</span>
              <span className="stat-value">{stats.lockedCount}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Storage Size:</span>
              <span className="stat-value">{(stats.dataSize / 1024).toFixed(2)} KB</span>
            </div>
          </div>
        )}
      </section>

      {/* Application Settings */}
      <section className="app-settings">
        <h3>Application Settings</h3>
        
        <div className="setting-item">
          <label htmlFor="maxClips">Maximum Clips:</label>
          <input
            type="number"
            id="maxClips"
            min="5"
            max="100"
            value={settings.maxClips}
            onChange={(e) => handleSettingChange('maxClips', parseInt(e.target.value))}
            disabled={saving}
          />
        </div>

        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={settings.monitorClipboard}
              onChange={(e) => handleSettingChange('monitorClipboard', e.target.checked)}
              disabled={saving}
            />
            Monitor Clipboard
          </label>
        </div>

        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={settings.startMinimized}
              onChange={(e) => handleSettingChange('startMinimized', e.target.checked)}
              disabled={saving}
            />
            Start Minimized
          </label>
        </div>

        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={settings.autoStart}
              onChange={(e) => handleSettingChange('autoStart', e.target.checked)}
              disabled={saving}
            />
            Auto Start with System
          </label>
        </div>

        <div className="setting-item">
          <label htmlFor="theme">Theme:</label>
          <select
            id="theme"
            value={settings.theme || 'system'}
            onChange={(e) => handleSettingChange('theme', e.target.value as 'light' | 'dark' | 'system')}
            disabled={saving}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </section>

      {/* Data Management */}
      <section className="data-management">
        <h3>Data Management</h3>
        
        <div className="button-group">
          <button onClick={handleExportData} className="export-btn">
            Export Data
          </button>
          
          <label htmlFor="import-file" className="import-btn">
            Import Data
            <input
              type="file"
              id="import-file"
              accept=".json"
              onChange={handleImportData}
              style={{ display: 'none' }}
            />
          </label>
          
          <button 
            onClick={handleClearAllData} 
            className="clear-btn danger"
          >
            Clear All Data
          </button>
        </div>
      </section>

      {saving && <div className="saving-indicator">Saving...</div>}
      
      {onClose && (
        <button onClick={onClose} className="close-btn">
          Close
        </button>
      )}
    </div>
  );
};
