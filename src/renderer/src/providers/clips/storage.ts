import { useCallback, useEffect, useRef } from 'react';
import { ClipItem } from './types';
import { DEFAULT_MAX_CLIPS } from '../constants';
import { shrinkClips, updateClipsLength } from './utils';
import { UserSettings, StoredClip } from '../../../../shared/types';
import { useToast } from '../../components/Toast';

// Shown when the stored history could not be read; the message stays up long enough to read
export const LOAD_FAILED_TITLE = "Couldn't load your clip history";
export const LOAD_FAILED_DETAIL = [
  'Saving is paused so the stored history is not overwritten.',
  'Restart Clipless to try again.',
];
const LOAD_FAILED_TOAST_DURATION = 12000;

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
  const toast = useToast();
  // The mount load and the storage-ready reload can both see a failed load; tell the user once
  const reportedLoadFailure = useRef(false);

  const reportLoadFailure = useCallback(() => {
    if (reportedLoadFailure.current) return;
    reportedLoadFailure.current = true;
    toast(LOAD_FAILED_TITLE, LOAD_FAILED_DETAIL, { duration: LOAD_FAILED_TOAST_DURATION });
  }, [toast]);

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
      // Ask about the load before reading anything: whatever is read after a completed
      // load is the stored data, whereas data read before it is the placeholder.
      const loadState = await window.api.storageGetLoadState();

      if (!loadState.complete) {
        // The storage-ready event triggers another load once the history is available
        console.log('Storage still loading, waiting for storage-ready');
        return;
      }

      // Load settings first
      const settings = await window.api.storageGetSettings();
      if (settings && typeof settings.maxClips === 'number') {
        setMaxClips(settings.maxClips);
      }
      // Note: codeDetectionEnabled is now handled by LanguageDetectionProvider

      if (loadState.failed) {
        // The history is unreadable, so what getClips returns is not it: leave the window
        // as it is and leave saving disabled rather than write blank state over the file.
        console.error('Stored clip history could not be loaded:', loadState.error);
        reportLoadFailure();
        return;
      }

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

      // Only a load that got this far may enable saving
      setIsInitiallyLoading(false);
    } catch (error) {
      console.error('Failed to load data from storage:', error);
      reportLoadFailure();
    }
  }, [setClips, setLockedClips, setMaxClips, setIsInitiallyLoading, reportLoadFailure]);

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
};
