import { useCallback } from 'react';
import { ClipItem } from './types';
import { createEmptyClip, updateClipsLength } from './utils';

export const useClipState = (
  clips: ClipItem[],
  setClips: React.Dispatch<React.SetStateAction<ClipItem[]>>,
  maxClips: number,
  lockedClips: Record<number, boolean>,
  setLockedClips: React.Dispatch<React.SetStateAction<Record<number, boolean>>>
) => {
  const getClip = useCallback(
    (index: number): ClipItem => {
      return clips[index] || createEmptyClip();
    },
    [clips]
  );

  const emptyClip = useCallback(
    (index: number): void => {
      if (index === 0) {
        console.log('Cannot empty the first clip (index 0)');
        return;
      }

      const newClips = [...clips];
      newClips[index] = createEmptyClip();
      setClips(newClips);
    },
    [clips, setClips]
  );

  const updateClip = useCallback(
    (index: number, updatedClip: ClipItem): void => {
      const newClips = [...clips];
      newClips[index] = updatedClip;
      setClips(newClips);
    },
    [clips, setClips]
  );

  const toggleClipLock = useCallback(
    (index: number): void => {
      if (index === 0) {
        console.log('Cannot lock the first clip (index 0)');
        return;
      }

      const lockValue = lockedClips[index];
      setLockedClips({
        ...lockedClips,
        [index]: !lockValue,
      });
    },
    [setLockedClips, lockedClips]
  );

  const isClipLocked = useCallback(
    (index: number): boolean => {
      if (index === 0) return false;

      return lockedClips[index] === true;
    },
    [lockedClips]
  );

  const isDuplicateOfMostRecent = useCallback(
    (newClip: ClipItem): boolean => {
      if (clips.length === 0) return false;

      const mostRecentClip = clips[0];
      if (mostRecentClip.type !== newClip.type || mostRecentClip.content !== newClip.content) {
        return false;
      }

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

      if (isDuplicateOfMostRecent(newClip)) {
        console.log(
          '❌ Duplicate clip detected, not adding to array:',
          newClip.content.substring(0, 50)
        );
        return;
      }

      console.log(
        '✅ New clipboard content detected, adding to array:',
        newClip.content.substring(0, 50)
      );

      const newClips = [...clips];
      let lastClip = newClip;

      for (let index = 0; index < maxClips; index++) {
        if (lockedClips[index]) {
          continue;
        }

        const currentClip = newClips[index] || createEmptyClip();
        newClips[index] = lastClip;
        lastClip = currentClip;
      }

      const finalClips = updateClipsLength(newClips, maxClips);
      setClips(finalClips);
    },
    [clips, maxClips, lockedClips, setClips, isDuplicateOfMostRecent]
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
