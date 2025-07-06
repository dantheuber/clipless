import React, { useState, useEffect } from 'react';
import classNames from 'classnames';
import { useTheme } from '../../providers/theme';
import type { UserSettings, StorageStats } from '../../../../shared/types';
import styles from './StorageSettings.module.css';

interface StorageSettingsProps {
  onClose?: () => void;
}

export const StorageSettings: React.FC<StorageSettingsProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const { isLight } = useTheme();

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
        
        // Notify other windows about the settings change
        if (window.api.settingsChanged) {
          await window.api.settingsChanged(updatedSettings);
        }
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
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <svg className={styles.spinner} viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          <span className={classNames(styles.loadingText, { [styles.light]: isLight })}>Loading storage settings...</span>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorContent}>
          <svg className={styles.errorIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.96-.833-2.73 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
          </svg>
          <p className={classNames(styles.errorTitle, { [styles.light]: isLight })}>Failed to load settings</p>
          <p className={classNames(styles.errorDescription, { [styles.light]: isLight })}>Please try refreshing the application</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Storage Statistics */}
      <div className={styles.section}>
        <h3 className={classNames(styles.sectionTitle, { [styles.light]: isLight })}>Storage Statistics</h3>
        {stats && (
          <div className={styles.statsGrid}>
            <div className={classNames(styles.statCard, styles.statCardBlue, { [styles.light]: isLight })}>
              <div className={styles.statIconContainer}>
                <svg className={classNames(styles.statIcon, styles.statIconBlue, { [styles.light]: isLight })} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <div className={styles.statContent}>
                <div className={classNames(styles.statValue, styles.statValueBlue, { [styles.light]: isLight })}>{stats.clipCount}</div>
                <div className={classNames(styles.statLabel, styles.statLabelBlue, { [styles.light]: isLight })}>Total Clips</div>
              </div>
            </div>
            
            <div className={classNames(styles.statCard, styles.statCardGreen, { [styles.light]: isLight })}>
              <div className={styles.statIconContainer}>
                <svg className={classNames(styles.statIcon, styles.statIconGreen, { [styles.light]: isLight })} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
              </div>
              <div className={styles.statContent}>
                <div className={classNames(styles.statValue, styles.statValueGreen, { [styles.light]: isLight })}>{stats.lockedCount}</div>
                <div className={classNames(styles.statLabel, styles.statLabelGreen, { [styles.light]: isLight })}>Locked</div>
              </div>
            </div>
            
            <div className={classNames(styles.statCard, styles.statCardPurple, { [styles.light]: isLight })}>
              <div className={styles.statIconContainer}>
                <svg className={classNames(styles.statIcon, styles.statIconPurple, { [styles.light]: isLight })} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>
                </svg>
              </div>
              <div className={styles.statContent}>
                <div className={classNames(styles.statValue, styles.statValuePurple, { [styles.light]: isLight })}>
                  {(stats.dataSize / 1024).toFixed(1)} KB
                </div>
                <div className={classNames(styles.statLabel, styles.statLabelPurple, { [styles.light]: isLight })}>Storage Size</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Application Settings */}
      <div className={styles.section}>
        <h3 className={classNames(styles.sectionTitle, { [styles.light]: isLight })}>Application Settings</h3>
        
        <div className={styles.settingsContainer}>
          {/* Maximum Clips Setting */}
          <div className={classNames(styles.settingItem, { [styles.light]: isLight })}>
            <div className={styles.settingContent}>
              <label htmlFor="maxClips" className={classNames(styles.settingLabel, { [styles.light]: isLight })}>
                Maximum Clips
              </label>
              <p className={classNames(styles.settingDescription, { [styles.light]: isLight })}>
                Maximum number of clipboard items to store (5-100)
              </p>
            </div>
            <input
              type="number"
              id="maxClips"
              min="5"
              max="100"
              value={settings.maxClips}
              onChange={(e) => handleSettingChange('maxClips', parseInt(e.target.value))}
              disabled={saving}
              className={classNames(styles.input, { [styles.light]: isLight })}
            />
          </div>

          {/* Monitor Clipboard Setting */}
          <div className={classNames(styles.settingItem, { [styles.light]: isLight })}>
            <div className={styles.settingContent}>
              <span className={classNames(styles.settingLabel, { [styles.light]: isLight })}>Monitor Clipboard</span>
              <p className={classNames(styles.settingDescription, { [styles.light]: isLight })}>
                Automatically capture new clipboard content
              </p>
            </div>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={settings.monitorClipboard}
                onChange={(e) => handleSettingChange('monitorClipboard', e.target.checked)}
                disabled={saving}
                className={styles.toggleInput}
              />
              <div className={classNames(styles.toggleSwitch, {
                [styles.light]: isLight,
                [styles.toggleSwitchChecked]: settings.monitorClipboard
              })}>
                <div className={classNames(styles.toggleSlider, {
                  [styles.toggleSliderChecked]: settings.monitorClipboard
                })}></div>
              </div>
            </label>
          </div>

          {/* Start Minimized Setting */}
          <div className={classNames(styles.settingItem, { [styles.light]: isLight })}>
            <div className={styles.settingContent}>
              <span className={classNames(styles.settingLabel, { [styles.light]: isLight })}>Start Minimized</span>
              <p className={classNames(styles.settingDescription, { [styles.light]: isLight })}>
                Launch the application minimized to system tray
              </p>
            </div>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={settings.startMinimized}
                onChange={(e) => handleSettingChange('startMinimized', e.target.checked)}
                disabled={saving}
                className={styles.toggleInput}
              />
              <div className={classNames(styles.toggleSwitch, {
                [styles.light]: isLight,
                [styles.toggleSwitchChecked]: settings.startMinimized
              })}>
                <div className={classNames(styles.toggleSlider, {
                  [styles.toggleSliderChecked]: settings.startMinimized
                })}></div>
              </div>
            </label>
          </div>

          {/* Auto Start Setting */}
          <div className={classNames(styles.settingItem, { [styles.light]: isLight })}>
            <div className={styles.settingContent}>
              <span className={classNames(styles.settingLabel, { [styles.light]: isLight })}>Auto Start with System</span>
              <p className={classNames(styles.settingDescription, { [styles.light]: isLight })}>
                Start Clipless automatically when your computer boots up
              </p>
            </div>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={settings.autoStart}
                onChange={(e) => handleSettingChange('autoStart', e.target.checked)}
                disabled={saving}
                className={styles.toggleInput}
              />
              <div className={classNames(styles.toggleSwitch, {
                [styles.light]: isLight,
                [styles.toggleSwitchChecked]: settings.autoStart
              })}>
                <div className={classNames(styles.toggleSlider, {
                  [styles.toggleSliderChecked]: settings.autoStart
                })}></div>
              </div>
            </label>
          </div>

          {/* Theme Setting */}
          <div className={classNames(styles.settingItem, { [styles.light]: isLight })}>
            <div className={styles.settingContent}>
              <label htmlFor="theme" className={classNames(styles.settingLabel, { [styles.light]: isLight })}>
                Theme
              </label>
              <p className={classNames(styles.settingDescription, { [styles.light]: isLight })}>
                Choose your preferred color scheme
              </p>
            </div>
            <select
              id="theme"
              value={settings.theme || 'system'}
              onChange={(e) => handleSettingChange('theme', e.target.value as 'light' | 'dark' | 'system')}
              disabled={saving}
              className={classNames(styles.select, { [styles.light]: isLight })}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className={styles.section}>
        <h3 className={classNames(styles.sectionTitle, { [styles.light]: isLight })}>Data Management</h3>
        
        <div className={styles.buttonGrid}>
          <button 
            onClick={handleExportData} 
            className={classNames(styles.button, styles.buttonBlue)}
          >
            <svg className={styles.buttonIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"/>
            </svg>
            <span>Export Data</span>
          </button>
          
          <label htmlFor="import-file" className={classNames(styles.button, styles.buttonGreen)}>
            <svg className={styles.buttonIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
            <span>Import Data</span>
            <input
              type="file"
              id="import-file"
              accept=".json"
              onChange={handleImportData}
              className={styles.hiddenInput}
            />
          </label>
          
          <button 
            onClick={handleClearAllData} 
            className={classNames(styles.button, styles.buttonRed)}
          >
            <svg className={styles.buttonIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            <span>Clear All Data</span>
          </button>
        </div>
        
        <div className={classNames(styles.warningCard, { [styles.light]: isLight })}>
          <div className={styles.warningContent}>
            <svg className={classNames(styles.warningIcon, { [styles.light]: isLight })} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.96-.833-2.73 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
            </svg>
            <div>
              <p className={classNames(styles.warningTitle, { [styles.light]: isLight })}>Data Management Warning</p>
              <p className={classNames(styles.warningDescription, { [styles.light]: isLight })}>
                Clearing all data is permanent and cannot be undone. Consider exporting your data first as a backup.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Saving Indicator */}
      {saving && (
        <div className={styles.savingIndicator}>
          <svg className={styles.spinner} viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          <span className={styles.savingText}>Saving...</span>
        </div>
      )}
      
      {onClose && (
        <div className={classNames(styles.closeButtonContainer, { [styles.light]: isLight })}>
          <button 
            onClick={onClose} 
            className={styles.closeButton}
          >
            Close Settings
          </button>
        </div>
      )}
    </div>
  );
};
