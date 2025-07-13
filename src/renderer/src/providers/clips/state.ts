import { useCallback } from 'react';
import { ClipItem } from './types';
import { createEmptyClip, updateClipsLength } from './utils';

/**
 * Hook for managing clip state operations
 */
export const useClipState = (
  clips: ClipItem[],
  setClips: React.Dispatch<React.SetStateAction<ClipItem[]>>,
  maxClips: number,
  lockedClips: Record<number, boolean>,
  setLockedClips: React.Dispatch<React.SetStateAction<Record<number, boolean>>>,
  setClipCopyIndex: React.Dispatch<React.SetStateAction<number | null>>
) => {
  /**
   * Get the clip at the specified index.
   * @param index the index of the clip to retrieve.
   * @returns the clip at the specified index, or an empty clip if the index is out of bounds.
   */
  const getClip = useCallback(
    (index: number): ClipItem => {
      return clips[index] || createEmptyClip();
    },
    [clips]
  );

  const emptyClip = useCallback(
    (index: number): void => {
      // Prevent emptying the first clip (index 0)
      if (index === 0) {
        console.log('Cannot empty the first clip (index 0)');
        return;
      }

      const newClips = [...clips];
      newClips[index] = createEmptyClip(); // replace the clip at the specified index
      setClips(newClips);
    },
    [clips, setClips]
  );

  /**
   * Update a clip at the specified index with new content
   * @param index the index of the clip to update
   * @param updatedClip the updated clip content
   */
  const updateClip = useCallback(
    (index: number, updatedClip: ClipItem): void => {
      const newClips = [...clips];
      newClips[index] = updatedClip;
      setClips(newClips);
    },
    [clips, setClips]
  );

  /**
   * Toggle the lock state of a clip at the specified index.
   * If the clip is locked, it will be unlocked, and vice versa.
   * Note: The first clip (index 0) cannot be locked.
   * @param index the index of the clip to toggle lock state.
   */
  const toggleClipLock = useCallback(
    (index: number): void => {
      // Prevent locking the first clip (index 0)
      if (index === 0) {
        console.log('Cannot lock the first clip (index 0)');
        return;
      }

      const lockValue = lockedClips[index];
      setLockedClips({
        ...lockedClips,
        [index]: !lockValue, // toggle the lock state
      });
    },
    [setLockedClips, lockedClips]
  );

  /**
   * Check if a clip at the specified index is locked.
   * Note: The first clip (index 0) is never locked.
   * @param index the index of the clip to check.
   * @returns true if the clip is locked, false otherwise.
   */
  const isClipLocked = useCallback(
    (index: number): boolean => {
      // The first clip (index 0) can never be locked
      if (index === 0) return false;

      return lockedClips[index] === true;
    },
    [lockedClips]
  );

  /**
   * Check if a clip item matches the most recent clip in the array.
   * Since the first clip (index 0) can never be locked, it's always the target for new clips.
   * @param newClip the clip to check for duplicates
   * @returns true if the clip is a duplicate of the most recent clip
   */
  const isDuplicateOfMostRecent = useCallback(
    (newClip: ClipItem): boolean => {
      if (clips.length === 0) return false;

      // Since the first clip can never be locked, always check against it
      const mostRecentClip = clips[0];

      // Check if type and content match
      if (mostRecentClip.type !== newClip.type || mostRecentClip.content !== newClip.content) {
        return false;
      }

      // For bookmark type, also check title and url
      if (newClip.type === 'bookmark') {
        return mostRecentClip.title === newClip.title && mostRecentClip.url === newClip.url;
      }

      return true;
    },
    [clips]
  );

  const clipboardUpdated = useCallback(
    (newClip: ClipItem): void => {
      console.log(
        'clipboardUpdated called with:',
        newClip.content.substring(0, 50),
        'type:',
        newClip.type
      );

      // Check if this clip is a duplicate of the most recent clip
      if (isDuplicateOfMostRecent(newClip)) {
        console.log(
          '❌ Duplicate clip detected, not adding to array:',
          newClip.content.substring(0, 50)
        );
        return; // Skip adding duplicate
      }

      console.log(
        '✅ New clipboard content detected, adding to array:',
        newClip.content.substring(0, 50)
      );

      // Only reset copy index when actually adding a new clip (not a hotkey copy)
      console.log('🔄 Resetting clipCopyIndex due to new clip being added');
      setClipCopyIndex(null);

      // Create new clips array by shifting existing clips down
      const newClips = [...clips];
      let lastClip = newClip;

      for (let index = 0; index < maxClips; index++) {
        if (lockedClips[index]) {
          // if the clip is locked, maintain its current value
          continue;
        }

        // Shift the clip down
        const currentClip = newClips[index] || createEmptyClip();
        newClips[index] = lastClip;
        lastClip = currentClip;
      }

      // Ensure the array has the correct length
      const finalClips = updateClipsLength(newClips, maxClips);
      setClips(finalClips);
    },
    [
      clips,
      maxClips,
      lockedClips,
      setClips,
      isDuplicateOfMostRecent,
      setClipCopyIndex,
    ]
  );

  return {
    getClip,
    emptyClip,
    updateClip,
    toggleClipLock,
    isClipLocked,
    isDuplicateOfMostRecent,
    clipboardUpdated,
  };
};
