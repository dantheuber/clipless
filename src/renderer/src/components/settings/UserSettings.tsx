import React, { useState, useEffect } from 'react';
import classNames from 'classnames';
import { useTheme } from '../../providers/theme';
import { useLanguageDetection } from '../../providers/languageDetection';
import { useClips } from '../../providers/clips';
import { ConfirmDialog } from '../ConfirmDialog';
import type { UserSettings as UserSettingsType } from '../../../../shared/types';
import styles from './StorageSettings.module.css';

interface UserSettingsProps {
  onClose?: () => void;
}

export const UserSettings: React.FC<UserSettingsProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<UserSettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingMaxClips, setPendingMaxClips] = useState<number | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [tempMaxClips, setTempMaxClips] = useState<number | null>(null);
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);

  const { isLight } = useTheme();
  const { updateSettings: updateLanguageSettings } = useLanguageDetection();
  const { clips } = useClips();

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      if (!window.api) return;

      try {
        const loadedSettings = await window.api.storageGetSettings();
        setSettings(loadedSettings);
        setTempMaxClips(loadedSettings.maxClips); // Initialize temp value
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, [debounceTimeout]);

  const handleSettingChange = async (key: keyof UserSettingsType, value: any) => {
    if (!settings || !window.api) return;

    setSaving(true);
    try {
      const updatedSettings = { ...settings, [key]: value };
      const success = await window.api.storageSaveSettings(updatedSettings);

      if (success) {
        setSettings(updatedSettings);

        // Update temp value if maxClips was changed
        if (key === 'maxClips') {
          setTempMaxClips(value);
        }

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

  const handleMaxClipsChange = (value: number) => {
    // Allow any value during typing for better UX
    // Validation will happen after debounce period
    setTempMaxClips(value);

    // Clear any existing timeout
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    // Set a new timeout to process the change after user stops typing
    const newTimeout = setTimeout(() => {
      // Validate the final value
      if (value > 100) {
        // Reset to current setting if over maximum
        if (settings) {
          setTempMaxClips(settings.maxClips);
        }
        setDebounceTimeout(null);
        return;
      }

      // Auto-correct to minimum if below 15
      const correctedValue = value < 15 ? 15 : value;
      
      // Update temp value to show the correction
      if (correctedValue !== value) {
        setTempMaxClips(correctedValue);
      }

      // Count non-empty clips
      const nonEmptyClips = clips.filter(clip => clip.content && clip.content.trim() !== '').length;
      
      // Check if reducing the limit would cause data loss
      if (nonEmptyClips > correctedValue) {
        setPendingMaxClips(correctedValue);
        setShowConfirmDialog(true);
      } else {
        handleSettingChange('maxClips', correctedValue);
      }
      setDebounceTimeout(null);
    }, 3000); // 3 second debounce

    setDebounceTimeout(newTimeout);
  };

  const confirmMaxClipsChange = async () => {
    if (pendingMaxClips !== null) {
      // Save settings change directly - let the clips provider handle the array update
      await handleSettingChange('maxClips', pendingMaxClips);
      setTempMaxClips(pendingMaxClips); // Update temp value to match confirmed value
    }

    setPendingMaxClips(null);
    setShowConfirmDialog(false);
  };

  const cancelMaxClipsChange = () => {
    // Reset temp value to current setting
    if (settings) {
      setTempMaxClips(settings.maxClips);
    }
    setPendingMaxClips(null);
    setShowConfirmDialog(false);
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
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
          <span className={classNames(styles.loadingText, { [styles.light]: isLight })}>
            Loading settings...
          </span>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorContent}>
          <svg className={styles.errorIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.96-.833-2.73 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <p className={classNames(styles.errorTitle, { [styles.light]: isLight })}>
            Failed to load settings
          </p>
          <p className={classNames(styles.errorDescription, { [styles.light]: isLight })}>
            Please try refreshing the application
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Application Settings */}
      <div className={styles.section}>
        <h3 className={classNames(styles.sectionTitle, { [styles.light]: isLight })}>
          Application Settings
        </h3>

        <div className={styles.settingsContainer}>
          {/* Maximum Clips Setting */}
          <div className={classNames(styles.settingItem, { [styles.light]: isLight })}>
            <div className={styles.settingContent}>
              <label
                htmlFor="maxClips"
                className={classNames(styles.settingLabel, { [styles.light]: isLight })}
              >
                Maximum Clips
              </label>
              <p className={classNames(styles.settingDescription, { [styles.light]: isLight })}>
                Maximum number of clipboard items to store (15-100). Reducing this number will require confirmation if it would result in data loss.
                {debounceTimeout && <span style={{ color: '#ffa500', fontWeight: 'bold' }}> (Change pending...)</span>}
              </p>
            </div>
            <input
              type="number"
              id="maxClips"
              min="15"
              max="100"
              value={tempMaxClips ?? settings.maxClips}
              onChange={(e) => handleMaxClipsChange(parseInt(e.target.value))}
              disabled={saving}
              className={classNames(styles.input, { [styles.light]: isLight })}
            />
          </div>

          {/* Start Minimized Setting */}
          <div className={classNames(styles.settingItem, { [styles.light]: isLight })}>
            <div className={styles.settingContent}>
              <span className={classNames(styles.settingLabel, { [styles.light]: isLight })}>
                Start Minimized
              </span>
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
              <div
                className={classNames(styles.toggleSwitch, {
                  [styles.light]: isLight,
                  [styles.toggleSwitchChecked]: settings.startMinimized,
                })}
              >
                <div
                  className={classNames(styles.toggleSlider, {
                    [styles.toggleSliderChecked]: settings.startMinimized,
                  })}
                ></div>
              </div>
            </label>
          </div>

          {/* Auto Start Setting */}
          <div className={classNames(styles.settingItem, { [styles.light]: isLight })}>
            <div className={styles.settingContent}>
              <span className={classNames(styles.settingLabel, { [styles.light]: isLight })}>
                Auto Start with System
              </span>
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
              <div
                className={classNames(styles.toggleSwitch, {
                  [styles.light]: isLight,
                  [styles.toggleSwitchChecked]: settings.autoStart,
                })}
              >
                <div
                  className={classNames(styles.toggleSlider, {
                    [styles.toggleSliderChecked]: settings.autoStart,
                  })}
                ></div>
              </div>
            </label>
          </div>

          {/* Theme Setting */}
          <div className={classNames(styles.settingItem, { [styles.light]: isLight })}>
            <div className={styles.settingContent}>
              <label
                htmlFor="theme"
                className={classNames(styles.settingLabel, { [styles.light]: isLight })}
              >
                Theme
              </label>
              <p className={classNames(styles.settingDescription, { [styles.light]: isLight })}>
                Choose your preferred color scheme
              </p>
            </div>
            <select
              id="theme"
              value={settings.theme || 'system'}
              onChange={(e) =>
                handleSettingChange('theme', e.target.value as 'light' | 'dark' | 'system')
              }
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
              <span className={classNames(styles.settingLabel, { [styles.light]: isLight })}>
                Code Detection & Highlighting
              </span>
              <p className={classNames(styles.settingDescription, { [styles.light]: isLight })}>
                Automatically detect programming languages and apply syntax highlighting when
                editing
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
              <div
                className={classNames(styles.toggleSwitch, {
                  [styles.light]: isLight,
                  [styles.toggleSwitchChecked]: settings.codeDetectionEnabled ?? true,
                })}
              >
                <div
                  className={classNames(styles.toggleSlider, {
                    [styles.toggleSliderChecked]: settings.codeDetectionEnabled ?? true,
                  })}
                ></div>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Window Settings */}
      <div className={styles.section}>
        <h3 className={classNames(styles.sectionTitle, { [styles.light]: isLight })}>
          Window Settings
        </h3>

        <div className={styles.settingsContainer}>
          {/* Enable Window Transparency Setting */}
          <div className={classNames(styles.settingItem, { [styles.light]: isLight })}>
            <div className={styles.settingContent}>
              <span className={classNames(styles.settingLabel, { [styles.light]: isLight })}>
                Enable Window Transparency
              </span>
              <p className={classNames(styles.settingDescription, { [styles.light]: isLight })}>
                Allow the window to be made transparent
              </p>
            </div>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={settings.transparencyEnabled ?? false}
                onChange={(e) => handleSettingChange('transparencyEnabled', e.target.checked)}
                disabled={saving}
                className={styles.toggleInput}
              />
              <div
                className={classNames(styles.toggleSwitch, {
                  [styles.light]: isLight,
                  [styles.toggleSwitchChecked]: settings.transparencyEnabled ?? false,
                })}
              >
                <div
                  className={classNames(styles.toggleSlider, {
                    [styles.toggleSliderChecked]: settings.transparencyEnabled ?? false,
                  })}
                ></div>
              </div>
            </label>
          </div>

          {/* Window Transparency Setting */}
          <div
            className={classNames(styles.settingItem, {
              [styles.light]: isLight,
              [styles.settingItemDisabled]: !(settings.transparencyEnabled ?? false),
            })}
          >
            <div className={styles.settingContent}>
              <label
                htmlFor="windowTransparency"
                className={classNames(styles.settingLabel, {
                  [styles.light]: isLight,
                  [styles.disabled]: !(settings.transparencyEnabled ?? false),
                })}
              >
                Window Transparency Level
              </label>
              <p
                className={classNames(styles.settingDescription, {
                  [styles.light]: isLight,
                  [styles.disabled]: !(settings.transparencyEnabled ?? false),
                })}
              >
                Set window transparency level (0% = fully opaque, 100% = fully transparent)
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="range"
                id="windowTransparency"
                min="0"
                max="100"
                step="5"
                value={settings.windowTransparency ?? 0}
                onChange={(e) =>
                  handleSettingChange('windowTransparency', parseInt(e.target.value))
                }
                disabled={saving || !(settings.transparencyEnabled ?? false)}
                className={classNames(styles.rangeSlider, { [styles.light]: isLight })}
              />
              <span
                className={classNames(styles.settingLabel, {
                  [styles.light]: isLight,
                  [styles.disabled]: !(settings.transparencyEnabled ?? false),
                })}
                style={{ minWidth: '40px' }}
              >
                {settings.windowTransparency ?? 0}%
              </span>
            </div>
          </div>

          {/* Opaque When Focused Setting */}
          <div
            className={classNames(styles.settingItem, {
              [styles.light]: isLight,
              [styles.settingItemDisabled]: !(settings.transparencyEnabled ?? false),
            })}
          >
            <div className={styles.settingContent}>
              <span
                className={classNames(styles.settingLabel, {
                  [styles.light]: isLight,
                  [styles.disabled]: !(settings.transparencyEnabled ?? false),
                })}
              >
                Opaque When Focused
              </span>
              <p
                className={classNames(styles.settingDescription, {
                  [styles.light]: isLight,
                  [styles.disabled]: !(settings.transparencyEnabled ?? false),
                })}
              >
                Make window fully opaque when it has focus, transparent when it doesn't
              </p>
            </div>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={settings.opaqueWhenFocused ?? true}
                onChange={(e) => handleSettingChange('opaqueWhenFocused', e.target.checked)}
                disabled={saving || !(settings.transparencyEnabled ?? false)}
                className={styles.toggleInput}
              />
              <div
                className={classNames(styles.toggleSwitch, {
                  [styles.light]: isLight,
                  [styles.toggleSwitchChecked]: settings.opaqueWhenFocused ?? true,
                  [styles.toggleSwitchDisabled]: !(settings.transparencyEnabled ?? false),
                })}
              >
                <div
                  className={classNames(styles.toggleSlider, {
                    [styles.toggleSliderChecked]: settings.opaqueWhenFocused ?? true,
                  })}
                ></div>
              </div>
            </label>
          </div>

          {/* Always On Top Setting */}
          <div className={classNames(styles.settingItem, { [styles.light]: isLight })}>
            <div className={styles.settingContent}>
              <span className={classNames(styles.settingLabel, { [styles.light]: isLight })}>
                Always On Top
              </span>
              <p className={classNames(styles.settingDescription, { [styles.light]: isLight })}>
                Keep the main window always on top of other windows
              </p>
            </div>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={settings.alwaysOnTop ?? false}
                onChange={(e) => handleSettingChange('alwaysOnTop', e.target.checked)}
                disabled={saving}
                className={styles.toggleInput}
              />
              <div
                className={classNames(styles.toggleSwitch, {
                  [styles.light]: isLight,
                  [styles.toggleSwitchChecked]: settings.alwaysOnTop ?? false,
                })}
              >
                <div
                  className={classNames(styles.toggleSlider, {
                    [styles.toggleSliderChecked]: settings.alwaysOnTop ?? false,
                  })}
                ></div>
              </div>
            </label>
          </div>

          {/* Remember Window Position Setting */}
          <div className={classNames(styles.settingItem, { [styles.light]: isLight })}>
            <div className={styles.settingContent}>
              <span className={classNames(styles.settingLabel, { [styles.light]: isLight })}>
                Remember Window Position
              </span>
              <p className={classNames(styles.settingDescription, { [styles.light]: isLight })}>
                Save and restore window position when the application is closed and reopened
              </p>
            </div>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={settings.rememberWindowPosition ?? true}
                onChange={(e) => handleSettingChange('rememberWindowPosition', e.target.checked)}
                disabled={saving}
                className={styles.toggleInput}
              />
              <div
                className={classNames(styles.toggleSwitch, {
                  [styles.light]: isLight,
                  [styles.toggleSwitchChecked]: settings.rememberWindowPosition ?? true,
                })}
              >
                <div
                  className={classNames(styles.toggleSlider, {
                    [styles.toggleSliderChecked]: settings.rememberWindowPosition ?? true,
                  })}
                ></div>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Saving Indicator */}
      {saving && (
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
          <span className={styles.savingText}>Saving...</span>
        </div>
      )}

      {onClose && (
        <div className={classNames(styles.closeButtonContainer, { [styles.light]: isLight })}>
          <button onClick={onClose} className={styles.closeButton}>
            Close Settings
          </button>
        </div>
      )}

      {/* Confirm Dialog for Max Clips Change */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Confirm Max Clips Change"
        message={`Changing the maximum clips from ${settings?.maxClips || 100} to ${pendingMaxClips} will result in the loss of ${Math.max(0, clips.filter(clip => clip.content && clip.content.trim() !== '').length - (pendingMaxClips || 0))} clips that cannot be recovered. The oldest clips will be removed. Are you sure you want to proceed?`}
        onConfirm={confirmMaxClipsChange}
        onCancel={cancelMaxClipsChange}
        confirmText="Yes, change"
        cancelText="Cancel"
        type="warning"
      />
    </div>
  );
};
