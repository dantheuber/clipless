import { useEffect } from 'react';
import { ClipItem } from './types';
import { DEFAULT_MAX_CLIPS } from '../constants';
import { updateClipsLength } from './utils';
import { UserSettings, StoredClip } from '../../../../shared/types';

/**
 * Hook for managing storage operations for clips and settings
 */
export const useClipsStorage = (
  clips: ClipItem[],
  lockedClips: Record<number, boolean>,
  maxClips: number,
  isInitiallyLoading: boolean,
  setClips: React.Dispatch<React.SetStateAction<ClipItem[]>>,
  setLockedClips: React.Dispatch<React.SetStateAction<Record<number, boolean>>>,
  setMaxClips: React.Dispatch<React.SetStateAction<number>>,
  setIsInitiallyLoading: React.Dispatch<React.SetStateAction<boolean>>
) => {
  // Load data from storage on mount
  useEffect(() => {
    const loadStoredData = async () => {
      if (!window.api) {
        setIsInitiallyLoading(false);
        return;
      }

      try {
        // Load settings first
        const settings = await window.api.storageGetSettings();
        if (settings && typeof settings.maxClips === 'number') {
          setMaxClips(settings.maxClips);
        }
        // Note: codeDetectionEnabled is now handled by LanguageDetectionProvider

        // Load clips from storage
        const storedClips = await window.api.storageGetClips();

        if (storedClips && storedClips.length > 0) {
          const loadedClips: ClipItem[] = [];
          const loadedLocks: Record<number, boolean> = {};

          // Process stored clips and rebuild the array properly
          let clipIndex = 0;
          storedClips.forEach((storedClip: StoredClip) => {
            if (storedClip.clip?.content && storedClip.clip.content.trim() !== '') {
              loadedClips.push(storedClip.clip); // Use push instead of index assignment
              // Only allow locking for clips at index 1 and higher
              if (storedClip.isLocked && clipIndex > 0) {
                loadedLocks[clipIndex] = true;
              }
              clipIndex++;
            }
          });

          // Ensure the first clip (index 0) is never locked
          if (loadedLocks[0]) {
            delete loadedLocks[0];
          }

          // Always update clips state, even if empty, to ensure proper initialization
          const currentMaxClips = settings?.maxClips || DEFAULT_MAX_CLIPS;
          const paddedClips = updateClipsLength(loadedClips, currentMaxClips);
          setClips(paddedClips);
          setLockedClips(loadedLocks);

          if (loadedClips.length > 0) {
            console.log(`Successfully loaded ${loadedClips.length} clips from storage`);
          }
        } else {
          console.log('No stored clips found');
        }
      } catch (error) {
        console.error('Failed to load data from storage:', error);
      } finally {
        setIsInitiallyLoading(false);
      }
    };

    loadStoredData();
  }, [setClips, setLockedClips, setMaxClips, setIsInitiallyLoading]); // Dependencies are stable setter functions

  // Listen for settings updates from other windows (like settings window)
  useEffect(() => {
    if (!window.api?.onSettingsUpdated) return;

    const handleSettingsUpdate = (updatedSettings: UserSettings) => {
      console.log('Received settings update from other window:', updatedSettings);
      if (updatedSettings && typeof updatedSettings.maxClips === 'number') {
        setMaxClips(updatedSettings.maxClips);

        // Update clips array to match new max clips limit
        setClips((prevClips) => updateClipsLength(prevClips, updatedSettings.maxClips));

        // Update locked clips to remove any locks beyond the new maxClips limit
        setLockedClips((prevLocked) => {
          const newLocked: Record<number, boolean> = {};
          Object.keys(prevLocked).forEach((key) => {
            const index = parseInt(key);
            if (index < updatedSettings.maxClips) {
              newLocked[index] = prevLocked[index];
            }
          });
          return newLocked;
        });
      }
      // Note: codeDetectionEnabled is now handled by LanguageDetectionProvider
    };

    window.api.onSettingsUpdated(handleSettingsUpdate);

    // Cleanup listener on unmount
    return () => {
      if (window.api?.removeSettingsListeners) {
        window.api.removeSettingsListeners();
      }
    };
  }, [setMaxClips, setClips, setLockedClips]);

  // Save clips to storage whenever they change
  useEffect(() => {
    // Don't save during initial loading
    if (isInitiallyLoading) return;

    const saveClipsToStorage = async () => {
      if (!window.api) return;

      try {
        // Save all clips, including empty ones to preserve array structure
        // Filter will be done on the storage side if needed
        await window.api.storageSaveClips(clips, lockedClips);
      } catch (error) {
        console.error('Failed to save clips to storage:', error);
      }
    };

    // Debounce saves to avoid excessive writes
    const timeoutId = setTimeout(saveClipsToStorage, 1000);
    return () => clearTimeout(timeoutId);
  }, [clips, lockedClips, isInitiallyLoading]);

  // Save settings whenever maxClips changes
  useEffect(() => {
    // Don't save during initial loading
    if (isInitiallyLoading) return;

    const saveSettingsToStorage = async () => {
      if (!window.api) return;

      try {
        await window.api.storageSaveSettings({ maxClips });
      } catch (error) {
        console.error('Failed to save settings to storage:', error);
      }
    };

    // Debounce saves
    const timeoutId = setTimeout(saveSettingsToStorage, 500);
    return () => clearTimeout(timeoutId);
  }, [maxClips, isInitiallyLoading]);

  // Settings listener
  useEffect(() => {
    if (window.api) {
      window.api.onSettingsUpdated((settings: UserSettings) => {
        console.log('Settings updated in main window:', settings);
        // Handle settings changes here if needed
      });

      // Cleanup
      return () => {
        if (window.api) {
          window.api.removeSettingsListeners();
        }
      };
    }

    return () => {}; // Return empty cleanup function if window.api is not available
  }, []);
};
