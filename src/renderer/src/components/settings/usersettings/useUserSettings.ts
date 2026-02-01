import { useState, useEffect } from 'react';
import { useLanguageDetection } from '../../../providers/languageDetection';
import { useClips } from '../../../providers/clips';
import type { UserSettings as UserSettingsType } from '../../../../../shared/types';

export const useUserSettings = () => {
  const [settings, setSettings] = useState<UserSettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingMaxClips, setPendingMaxClips] = useState<number | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [tempMaxClips, setTempMaxClips] = useState<number | null>(null);
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);

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

  const handleSettingChange = async (
    key: keyof UserSettingsType,
    value: boolean | number | string
  ) => {
    if (!settings || !window.api) return;

    setSaving(true);
    try {
      const updatedSettings = { ...settings, [key]: value };
      const success = await window.api.storageSaveSettings(updatedSettings);

      if (success) {
        setSettings(updatedSettings);

        // Update temp value if maxClips was changed
        if (key === 'maxClips' && typeof value === 'number') {
          setTempMaxClips(value);
        }

        // Update language detection settings if code detection was changed
        if (key === 'codeDetectionEnabled' && typeof value === 'boolean') {
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
      const nonEmptyClips = clips.filter(
        (clip) => clip.content && clip.content.trim() !== ''
      ).length;

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

  return {
    settings,
    loading,
    saving,
    pendingMaxClips,
    showConfirmDialog,
    tempMaxClips,
    debounceTimeout,
    clips,
    handleSettingChange,
    handleMaxClipsChange,
    confirmMaxClipsChange,
    cancelMaxClipsChange,
  };
};
