import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { DEFAULT_MAX_CLIPS } from './constants';

/**
 * ClipsContext provides a context for managing clipboard clips.
 * It allows components to access and manipulate the array of clips,
 * including locking and unlocking clips, and retrieving clip values.
 */

/**
 * Updates the length of the clips array to ensure it has the set maximum number of clips.
 * If the clips array is shorter than the maximum, it fills the remaining slots with empty strings.
 * @param clips the current array of clips.
 * @param maxClips the maximum number of clips allowed.
 * @returns a new array of clips with the specified maximum length, filling empty slots with empty strings.
 * If the clips array is already at or above the maximum length, it returns the original array
 */
const updateClipsLength = (clips: string[], maxClips: number): string[] => {
  if (clips.length < maxClips) {
    for (let index = 0; index < maxClips; index++) {
      if (typeof clips[index] !== 'string') {
        clips[index] = '';
      }
    }
  }
  return [...clips];
};

export const ClipsContext = createContext({});

// useClips type definition
export type ClipsContextType = {
  clips: string[];
  setClips: React.Dispatch<React.SetStateAction<string[]>>;
  getClip: (index: number) => string;
  toggleClipLock: (index: number) => void;
  isClipLocked: (index: number) => boolean;
  clipboardUpdated: (newValue: string) => void;
  setMaxClips: React.Dispatch<React.SetStateAction<number>>;
  maxClips: number;
};

export const useClips = (): ClipsContextType => useContext(ClipsContext) as ClipsContextType;

export const ClipsProvider = ({ children }: { children: React.ReactNode }) => {
  // the array of clip values
  const [clips, setClips] = useState<string[]>(updateClipsLength([], DEFAULT_MAX_CLIPS));
  // the maximum number of clips to store
  const [maxClips, setMaxClips] = useState<number>(DEFAULT_MAX_CLIPS);

  // track locked clips by their index with boolean values
  const [lockedClips, setLockedClips] = useState<object>({});

  /**
   * Get the value of the clip at the specified index.
   * @param index the index of the clip to retrieve.
   * @returns the clip value at the specified index, or an empty string if the index is out of bounds.
   */
  const getClip = useCallback((index: number): string => {
    return clips[index] || '';
  }, [clips]);

  /**
   * Toggle the lock state of a clip at the specified index.
   * If the clip is locked, it will be unlocked, and vice versa.
   * @param index the index of the clip to toggle lock state.
   */
  const toggleClipLock = useCallback((index: number): void => {
    const lockValue = lockedClips[index];
    setLockedClips({
      ...lockedClips,
      [index]: !lockValue, // toggle the lock state
    });
  }, [setLockedClips, lockedClips]);

  /**
   * Check if a clip at the specified index is locked.
   * @param index the index of the clip to check.
   * @returns true if the clip is locked, false otherwise.
   */
  const isClipLocked = useCallback((index: number): boolean => 
    lockedClips[index] === true,
    [lockedClips]
  );

  const clipboardUpdated = useCallback((newValue: string): void => {
    // add new clipboard value to the start of the clips array
    const newState = updateClipsLength(clips, maxClips);
    let lastClip = newValue;
    setClips(newState.map((clip, index) => {
      if (lockedClips[index]) {
        // if the clip is locked, maintain its current value
        return clip;
      }
      const value = lastClip;
      lastClip = clip; // store the previous value for the next iteration
      return value;
    }));
  }, [clips, maxClips, lockedClips, setClips]);

  const providerValue = useMemo(() => ({
    // clips management
    clips,
    setClips,
    getClip,
    toggleClipLock,
    isClipLocked,
    clipboardUpdated,
    // max clips management
    setMaxClips,
    maxClips,
  }),
  [clips, setClips, getClip]);

  return (
    <ClipsContext.Provider value={providerValue}>
      {children}
    </ClipsContext.Provider>
  );
};