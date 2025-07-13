import { useState, useEffect } from 'react';
import type { UserSettings, HotkeySettings } from '../../../../../shared/types';

// Default hotkey configurations
export const defaultHotkeySettings: HotkeySettings = {
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

export const hotkeyDescriptions = {
  focusWindow: 'Show/Focus Clipless Window',
  quickClip1: 'Copy 1st Clip',
  quickClip2: 'Copy 2nd Clip',
  quickClip3: 'Copy 3rd Clip',
  quickClip4: 'Copy 4th Clip',
  quickClip5: 'Copy 5th Clip',
};

export const useHotkeyManager = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [hotkeySettings, setHotkeySettings] = useState<HotkeySettings>(defaultHotkeySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingHotkey, setEditingHotkey] = useState<string | null>(null);
  const [listeningForKey, setListeningForKey] = useState(false);

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

      // Use the settings-changed IPC to properly notify main process
      const success = await window.api.settingsChanged(updatedSettings);

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

  return {
    settings,
    hotkeySettings,
    loading,
    saving,
    editingHotkey,
    listeningForKey,
    handleGlobalToggle,
    handleHotkeyToggle,
    handleHotkeyChange,
    startKeyCapture,
    cancelKeyCapture,
  };
};
