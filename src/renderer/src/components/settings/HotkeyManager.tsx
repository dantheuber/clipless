import React, { useState, useEffect } from 'react';
import classNames from 'classnames';
import { useTheme } from '../../providers/theme';
import type { UserSettings, HotkeySettings } from '../../../../shared/types';
import styles from './HotkeyManager.module.css';

interface HotkeyManagerProps {
  onClose?: () => void;
}

// Default hotkey configurations
const defaultHotkeySettings: HotkeySettings = {
  enabled: false,
  focusWindow: {
    enabled: true,
    key: 'CommandOrControl+Shift+V',
  },
  quickClip1: {
    enabled: true,
    key: 'CommandOrControl+Shift+1',
  },
  quickClip2: {
    enabled: true,
    key: 'CommandOrControl+Shift+2',
  },
  quickClip3: {
    enabled: true,
    key: 'CommandOrControl+Shift+3',
  },
  quickClip4: {
    enabled: true,
    key: 'CommandOrControl+Shift+4',
  },
  quickClip5: {
    enabled: true,
    key: 'CommandOrControl+Shift+5',
  },
};

const hotkeyDescriptions = {
  focusWindow: 'Show/Focus Clipless Window',
  quickClip1: 'Copy 1st Recent Clip',
  quickClip2: 'Copy 2nd Recent Clip',
  quickClip3: 'Copy 3rd Recent Clip',
  quickClip4: 'Copy 4th Recent Clip',
  quickClip5: 'Copy 5th Recent Clip',
};

export const HotkeyManager: React.FC<HotkeyManagerProps> = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [hotkeySettings, setHotkeySettings] = useState<HotkeySettings>(defaultHotkeySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingHotkey, setEditingHotkey] = useState<string | null>(null);
  const [listeningForKey, setListeningForKey] = useState(false);

  const { isLight } = useTheme();

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      if (!window.api) return;

      try {
        const loadedSettings = await window.api.storageGetSettings();
        setSettings(loadedSettings);

        // Use existing hotkey settings or defaults
        if (loadedSettings.hotkeys) {
          setHotkeySettings(loadedSettings.hotkeys);
        } else {
          setHotkeySettings(defaultHotkeySettings);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const saveSettings = async (newHotkeySettings: HotkeySettings) => {
    if (!settings || !window.api) return false;

    setSaving(true);
    try {
      const updatedSettings: UserSettings = {
        ...settings,
        hotkeys: newHotkeySettings,
      };

      const success = await window.api.storageSaveSettings(updatedSettings);

      if (success) {
        setSettings(updatedSettings);
        setHotkeySettings(newHotkeySettings);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to save hotkey settings:', error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleGlobalToggle = async (enabled: boolean) => {
    const updatedSettings = { ...hotkeySettings, enabled };
    await saveSettings(updatedSettings);
  };

  const handleHotkeyToggle = async (
    hotkeyKey: keyof Omit<HotkeySettings, 'enabled'>,
    enabled: boolean
  ) => {
    const updatedSettings = {
      ...hotkeySettings,
      [hotkeyKey]: { ...hotkeySettings[hotkeyKey], enabled },
    };
    await saveSettings(updatedSettings);
  };

  const handleHotkeyChange = async (
    hotkeyKey: keyof Omit<HotkeySettings, 'enabled'>,
    key: string
  ) => {
    const updatedSettings = {
      ...hotkeySettings,
      [hotkeyKey]: { ...hotkeySettings[hotkeyKey], key },
    };
    await saveSettings(updatedSettings);
    setEditingHotkey(null);
    setListeningForKey(false);
  };

  const startKeyCapture = (hotkeyKey: string) => {
    setEditingHotkey(hotkeyKey);
    setListeningForKey(true);
  };

  const cancelKeyCapture = () => {
    setEditingHotkey(null);
    setListeningForKey(false);
  };

  // Handle key capture
  useEffect(() => {
    if (!listeningForKey || !editingHotkey) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      // Build key combination
      const modifiers: string[] = [];
      if (event.ctrlKey || event.metaKey) modifiers.push('CommandOrControl');
      if (event.shiftKey) modifiers.push('Shift');
      if (event.altKey) modifiers.push('Alt');

      // Get the main key (ignore modifier keys)
      let mainKey = event.key;
      if (['Control', 'Shift', 'Alt', 'Meta', 'Cmd', 'Command'].includes(mainKey)) {
        return; // Don't accept modifier-only hotkeys
      }

      // Handle special keys
      if (mainKey === ' ') mainKey = 'Space';
      if (mainKey === 'Escape') {
        cancelKeyCapture();
        return;
      }

      // Convert to title case for letter keys
      if (mainKey.length === 1 && /[a-z]/.test(mainKey)) {
        mainKey = mainKey.toUpperCase();
      }

      const keyCombo = modifiers.length > 0 ? `${modifiers.join('+')}+${mainKey}` : mainKey;

      // Ensure we have at least one modifier for global hotkeys
      if (modifiers.length === 0) {
        alert('Global hotkeys must include at least one modifier key (Ctrl/Cmd, Shift, or Alt)');
        return;
      }

      handleHotkeyChange(editingHotkey as keyof Omit<HotkeySettings, 'enabled'>, keyCombo);
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [listeningForKey, editingHotkey]);

  if (loading) {
    return (
      <div className={classNames(styles.container, { [styles.light]: isLight })}>
        <div className={styles.loading}>Loading hotkey settings...</div>
      </div>
    );
  }

  return (
    <div className={classNames(styles.container, { [styles.light]: isLight })}>
      <div className={styles.header}>
        <p className={styles.description}>
          Configure global hotkeys for quick access to Clipless features. Hotkeys work even when the
          application is minimized or in the background.
        </p>
      </div>

      {/* Global Enable/Disable */}
      <div className={classNames(styles.setting, { [styles.light]: isLight })}>
        <div className={styles.settingInfo}>
          <div className={styles.settingLabel}>Enable Hotkeys</div>
          <div className={styles.settingDescription}>
            Master switch to enable or disable all global hotkeys
          </div>
        </div>
        <div className={styles.settingControl}>
          <div className={styles.toggleContainer}>
            <span
              className={classNames(styles.toggleLabel, {
                [styles.enabled]: hotkeySettings.enabled,
                [styles.disabled]: !hotkeySettings.enabled,
              })}
            >
              {hotkeySettings.enabled ? 'ON' : 'OFF'}
            </span>
            <label className={classNames(styles.toggle, { [styles.light]: isLight })}>
              <input
                type="checkbox"
                checked={hotkeySettings.enabled}
                onChange={(e) => handleGlobalToggle(e.target.checked)}
                disabled={saving}
              />
              <span className={styles.slider}></span>
            </label>
          </div>
        </div>
      </div>

      {/* Individual Hotkey Settings */}
      {hotkeySettings.enabled && (
        <div className={styles.hotkeyList}>
          {Object.entries(hotkeyDescriptions).map(([key, description]) => {
            const hotkeyKey = key as keyof Omit<HotkeySettings, 'enabled'>;
            const config = hotkeySettings[hotkeyKey];
            const isEditing = editingHotkey === key;

            return (
              <div key={key} className={classNames(styles.hotkeyItem, { [styles.light]: isLight })}>
                <div className={styles.hotkeyInfo}>
                  <div className={styles.hotkeyLabel}>{description}</div>
                  <div className={styles.hotkeyKey}>
                    {isEditing ? (
                      <span className={styles.listening}>
                        {listeningForKey ? 'Press keys...' : 'Click to set'}
                      </span>
                    ) : (
                      <code className={styles.keyDisplay}>{config.key}</code>
                    )}
                  </div>
                </div>
                <div className={styles.hotkeyControls}>
                  <button
                    className={classNames(styles.editButton, { [styles.light]: isLight })}
                    onClick={() => (isEditing ? cancelKeyCapture() : startKeyCapture(key))}
                    disabled={saving}
                  >
                    {isEditing ? 'Cancel' : 'Edit'}
                  </button>
                  <div className={styles.toggleContainer}>
                    <span
                      className={classNames(styles.toggleLabel, {
                        [styles.enabled]: config.enabled,
                        [styles.disabled]: !config.enabled,
                      })}
                    >
                      {config.enabled ? 'ON' : 'OFF'}
                    </span>
                    <label
                      className={classNames(styles.toggle, styles.small, {
                        [styles.light]: isLight,
                      })}
                    >
                      <input
                        type="checkbox"
                        checked={config.enabled}
                        onChange={(e) => handleHotkeyToggle(hotkeyKey, e.target.checked)}
                        disabled={saving || isEditing}
                      />
                      <span className={styles.slider}></span>
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Instructions */}
      {hotkeySettings.enabled && (
        <div className={classNames(styles.instructions, { [styles.light]: isLight })}>
          <h3>Instructions:</h3>
          <ul>
            <li>Click "Edit" next to any hotkey to change it</li>
            <li>Press the desired key combination (must include Ctrl/Cmd, Shift, or Alt)</li>
            <li>Press Escape to cancel editing</li>
            <li>Use the toggle switches to enable/disable individual hotkeys</li>
          </ul>
          <p className={styles.note}>
            <strong>Note:</strong> Hotkeys may conflict with other applications. Choose combinations
            that aren't commonly used by your system or other software.
          </p>
        </div>
      )}

      {saving && <div className={styles.savingIndicator}>Saving settings...</div>}
    </div>
  );
};

export default HotkeyManager;
