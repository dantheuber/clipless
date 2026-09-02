import { useCallback, useEffect, useRef, useState } from 'react';
import { ClipItem, ClipsLoadError } from './types';
import { DEFAULT_MAX_CLIPS } from '../constants';
import { shrinkClips, updateClipsLength } from './utils';
import { errorText } from '../../utils/errorText';
import { UserSettings, StoredClip } from '../../../../shared/types';

/**
 * Hook for managing storage operations for clips and settings.
 *
 * Returns `loadError`, the reason the stored history could not be read, or null. While it
 * is set the list shows a banner and saving stays off for the rest of the session.
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
): { loadError: ClipsLoadError | null } => {
  const [loadError, setLoadError] = useState<ClipsLoadError | null>(null);

  // Shared function to load all stored data (clips + settings).
  // Saving stays disabled (isInitiallyLoading) until this has applied a successfully loaded
  // history: the main process serves empty defaults while its background load runs, and a
  // save of those would overwrite the real history and delete the images it references.
  const loadStoredData = useCallback(async () => {
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

      // The clips arrive with the load state they were read under, so the placeholder
      // served during the background load cannot be mistaken for an empty history
      const { loadState, clips: storedClips } = await window.api.storageGetClipsSnapshot();

      if (!loadState.complete) {
        // The storage-ready event triggers another load once the history is available
        console.log('Storage still loading, waiting for storage-ready');
        return;
      }

      if (loadState.error !== null) {
        // The history is unreadable, so the clips returned are not it: leave the window
        // as it is and leave saving disabled rather than write blank state over the file.
        console.error('Stored clip history could not be loaded:', loadState.error);
        setLoadError({ message: loadState.error, recoverable: loadState.recoverable });
        return;
      }

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

      // Only a load that got this far may enable saving
      setLoadError(null);
      setIsInitiallyLoading(false);
    } catch (error) {
      console.error('Failed to load data from storage:', error);
      // The main process could not be reached or threw; a restart may well clear that
      setLoadError({ message: errorText(error), recoverable: true });
    }
  }, [setClips, setLockedClips, setMaxClips, setIsInitiallyLoading]);

  // Load data from storage on mount
  useEffect(() => {
    loadStoredData();
  }, [loadStoredData]);

  // Re-load data when background storage loading completes
  useEffect(() => {
    if (!window.api?.onStorageReady) return;

    return window.api.onStorageReady(() => {
      console.log('Storage ready event received, re-loading data');
      loadStoredData();
    });
  }, [loadStoredData]);

  // The latest list and locks, for the settings listener below
  const latest = useRef({ clips, lockedClips });
  latest.current = { clips, lockedClips };

  // Listen for settings updates from other windows (like settings window)
  useEffect(() => {
    if (!window.api?.onSettingsUpdated) return;

    const handleSettingsUpdate = (updatedSettings: UserSettings) => {
      console.log('Received settings update from other window:', updatedSettings);
      if (updatedSettings && typeof updatedSettings.maxClips === 'number') {
        const max = updatedSettings.maxClips;
        setMaxClips(max);

        // A lower limit drops the oldest unlocked clips first; locked clips stay (15.5)
        const shrunk = shrinkClips(latest.current.clips, latest.current.lockedClips, max);
        setClips(shrunk.clips);
        setLockedClips(shrunk.locked);
      }
      // Note: codeDetectionEnabled is now handled by LanguageDetectionProvider
    };

    return window.api.onSettingsUpdated(handleSettingsUpdate);
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

  return { loadError };
};
