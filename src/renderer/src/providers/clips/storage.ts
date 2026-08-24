import { useCallback, useEffect, useRef } from 'react';
import { ClipItem } from './types';
import { DEFAULT_MAX_CLIPS } from '../constants';
import { shrinkClips, updateClipsLength } from './utils';
import { UserSettings, StoredClip } from '../../../../shared/types';

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
  const loadStoredData = useCallback(async () => {
    if (!window.api) {
      setIsInitiallyLoading(false);
      return;
    }

    try {
      const settings = await window.api.storageGetSettings();
      if (settings && typeof settings.maxClips === 'number') {
        setMaxClips(settings.maxClips);
      }
      const storedClips = await window.api.storageGetClips();

      if (storedClips && storedClips.length > 0) {
        const loadedClips: ClipItem[] = [];
        const loadedLocks: Record<number, boolean> = {};

        let clipIndex = 0;
        storedClips.forEach((storedClip: StoredClip) => {
          if (storedClip.clip?.content && storedClip.clip.content.trim() !== '') {
            loadedClips.push(storedClip.clip);
            if (storedClip.isLocked && clipIndex > 0) {
              loadedLocks[clipIndex] = true;
            }
            clipIndex++;
          }
        });

        if (loadedLocks[0]) {
          delete loadedLocks[0];
        }

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
  }, [setClips, setLockedClips, setMaxClips, setIsInitiallyLoading]);

  useEffect(() => {
    loadStoredData();
  }, [loadStoredData]);

  useEffect(() => {
    if (!window.api?.onStorageReady) return;

    return window.api.onStorageReady(() => {
      console.log('Storage ready event received, re-loading data');
      loadStoredData();
    });
  }, [loadStoredData]);

  const latest = useRef({ clips, lockedClips });
  latest.current = { clips, lockedClips };

  useEffect(() => {
    if (!window.api?.onSettingsUpdated) return;

    const handleSettingsUpdate = (updatedSettings: UserSettings) => {
      console.log('Received settings update from other window:', updatedSettings);
      if (updatedSettings && typeof updatedSettings.maxClips === 'number') {
        const max = updatedSettings.maxClips;
        setMaxClips(max);

        const shrunk = shrinkClips(latest.current.clips, latest.current.lockedClips, max);
        setClips(shrunk.clips);
        setLockedClips(shrunk.locked);
      }
    };

    return window.api.onSettingsUpdated(handleSettingsUpdate);
  }, [setMaxClips, setClips, setLockedClips]);

  useEffect(() => {
    if (isInitiallyLoading) return;

    const saveClipsToStorage = async () => {
      if (!window.api) return;

      try {
        await window.api.storageSaveClips(clips, lockedClips);
      } catch (error) {
        console.error('Failed to save clips to storage:', error);
      }
    };

    const timeoutId = setTimeout(saveClipsToStorage, 1000);
    return () => clearTimeout(timeoutId);
  }, [clips, lockedClips, isInitiallyLoading]);

  useEffect(() => {
    if (isInitiallyLoading) return;

    const saveSettingsToStorage = async () => {
      if (!window.api) return;

      try {
        await window.api.storageSaveSettings({ maxClips });
      } catch (error) {
        console.error('Failed to save settings to storage:', error);
      }
    };

    const timeoutId = setTimeout(saveSettingsToStorage, 500);
    return () => clearTimeout(timeoutId);
  }, [maxClips, isInitiallyLoading]);
};
