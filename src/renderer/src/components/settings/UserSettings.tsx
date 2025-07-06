import React, { useState, useEffect } from 'react';
import classNames from 'classnames';
import { useTheme } from '../../providers/theme';
import { useLanguageDetection } from '../../providers/languageDetection';
import type { UserSettings as UserSettingsType } from '../../../../shared/types';
import styles from './StorageSettings.module.css';

interface UserSettingsProps {
  onClose?: () => void;
}

export const UserSettings: React.FC<UserSettingsProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<UserSettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const { isLight } = useTheme();
  const { updateSettings: updateLanguageSettings } = useLanguageDetection();

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      if (!window.api) return;

      try {
        const loadedSettings = await window.api.storageGetSettings();
        setSettings(loadedSettings);
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSettingChange = async (key: keyof UserSettingsType, value: any) => {
    if (!settings || !window.api) return;

    setSaving(true);
    try {
      const updatedSettings = { ...settings, [key]: value };
      const success = await window.api.storageSaveSettings(updatedSettings);
      
      if (success) {
        setSettings(updatedSettings);
        
        // Update language detection settings if code detection was changed
        if (key === 'codeDetectionEnabled') {
          updateLanguageSettings({ codeDetectionEnabled: value });
        }
        
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

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <svg className={styles.spinner} viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          <span className={classNames(styles.loadingText, { [styles.light]: isLight })}>Loading settings...</span>
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

          {/* Code Detection Setting */}
          <div className={classNames(styles.settingItem, { [styles.light]: isLight })}>
            <div className={styles.settingContent}>
              <span className={classNames(styles.settingLabel, { [styles.light]: isLight })}>Code Detection & Highlighting</span>
              <p className={classNames(styles.settingDescription, { [styles.light]: isLight })}>
                Automatically detect programming languages and apply syntax highlighting when editing
              </p>
            </div>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={settings.codeDetectionEnabled ?? true}
                onChange={(e) => handleSettingChange('codeDetectionEnabled', e.target.checked)}
                disabled={saving}
                className={styles.toggleInput}
              />
              <div className={classNames(styles.toggleSwitch, {
                [styles.light]: isLight,
                [styles.toggleSwitchChecked]: settings.codeDetectionEnabled ?? true
              })}>
                <div className={classNames(styles.toggleSlider, {
                  [styles.toggleSliderChecked]: settings.codeDetectionEnabled ?? true
                })}></div>
              </div>
            </label>
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
