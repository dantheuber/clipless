import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useState,
  useEffect,
} from 'react';
import { DEFAULT_MAX_CLIPS } from './constants';

/**
 * ClipsContext provides a context for managing clipboard clips.
 * It allows components to access and manipulate the array of clips,
 * including locking and unlocking clips, and retrieving clip values.
 */

/**
 * Supported clipboard types based on Electron's clipboard API
 */
export type ClipType = 'text' | 'html' | 'image' | 'rtf' | 'bookmark';

/**
 * Represents a single clipboard item with its content and type
 */
export interface ClipItem {
  type: ClipType;
  content: string;
  title?: string; // for bookmark type
  url?: string;   // for bookmark type
}

/**
 * Creates an empty clip item with default text type
 */
const createEmptyClip = (): ClipItem => ({
  type: 'text',
  content: '',
});

/**
 * Utility functions for creating different types of clips
 */
export const createTextClip = (content: string): ClipItem => ({
  type: 'text',
  content,
});

export const createHtmlClip = (content: string): ClipItem => ({
  type: 'html',
  content,
});

export const createImageClip = (content: string): ClipItem => ({
  type: 'image',
  content, // This would be a data URL or file path for the image
});

export const createRtfClip = (content: string): ClipItem => ({
  type: 'rtf',
  content,
});

export const createBookmarkClip = (title: string, url: string): ClipItem => ({
  type: 'bookmark',
  content: url,
  title,
  url,
});

/**
 * Updates the length of the clips array to ensure it has the set maximum number of clips.
 * If the clips array is shorter than the maximum, it fills the remaining slots with empty clips.
 * @param clips the current array of clips.
 * @param maxClips the maximum number of clips allowed.
 * @returns a new array of clips with the specified maximum length, filling empty slots with empty clips.
 * If the clips array is already at or above the maximum length, it returns the original array
 */
const updateClipsLength = (clips: ClipItem[], maxClips: number): ClipItem[] => {
  if (clips.length < maxClips) {
    for (let index = 0; index < maxClips; index++) {
      if (!clips[index]) {
        clips[index] = createEmptyClip();
      }
    }
  }
  return [...clips];
};

export const ClipsContext = createContext({});

// useClips type definition
export type ClipsContextType = {
  clips: ClipItem[];
  setClips: React.Dispatch<React.SetStateAction<ClipItem[]>>;
  getClip: (index: number) => ClipItem;
  toggleClipLock: (index: number) => void;
  isClipLocked: (index: number) => boolean;
  clipboardUpdated: (newClip: ClipItem) => void;
  readCurrentClipboard: () => Promise<void>;
  copyClipToClipboard: (index: number) => Promise<void>;
  emptyClip: (index: number) => void;
  setMaxClips: React.Dispatch<React.SetStateAction<number>>;
  maxClips: number;
};

export const useClips = (): ClipsContextType => useContext(ClipsContext) as ClipsContextType;

export const ClipsProvider = ({ children }: { children: React.ReactNode }) => {
  // the array of clip values
  const [clips, setClips] = useState<ClipItem[]>(updateClipsLength([], DEFAULT_MAX_CLIPS));
  const [clipCopyIndex, setClipCopyIndex] = useState<number|null>(null)
  // the maximum number of clips to store
  const [maxClips, setMaxClips] = useState<number>(DEFAULT_MAX_CLIPS);

  // track locked clips by their index with boolean values
  const [lockedClips, setLockedClips] = useState<object>({});

  /**
   * Get the clip at the specified index.
   * @param index the index of the clip to retrieve.
   * @returns the clip at the specified index, or an empty clip if the index is out of bounds.
   */
  const getClip = useCallback((index: number): ClipItem => {
    return clips[index] || createEmptyClip();
  }, [clips]);

  const emptyClip = useCallback((index: number): void => {
    const newClips = [...clips];
    newClips[index] = createEmptyClip(); // replace the clip at the specified index
    setClips(newClips);
  }, [clips, setClips]);
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

  /**
   * Check if a clip item matches the most recent clip in the array
   * @param newClip the clip to check for duplicates
   * @returns true if the clip is a duplicate of the most recent clip
   */
  const isDuplicateOfMostRecent = useCallback((newClip: ClipItem): boolean => {
    if (clips.length === 0) return false;
    
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
  }, [clips]);

  const clipboardUpdated = useCallback((newClip: ClipItem): void => {
    if (clipCopyIndex !== null
        // If a clip is being copied, check if the new clip is the same as the copied one
        && clips[clipCopyIndex] 
        && clips[clipCopyIndex].content === newClip.content
        && clips[clipCopyIndex].type === newClip.type
    ) {
      console.log('Clipboard update matches copied clip, not adding:', newClip);
      return; // Skip adding if it's the same as the copied clip
    } else {
      console.log('New clipboard content detected:', newClip);
      setClipCopyIndex(null); // Reset copy index since we're adding a new clip
    }
    // Check if this clip is a duplicate of the most recent clip
    if (isDuplicateOfMostRecent(newClip)) {
      console.log('Duplicate clip detected, not adding to array:', newClip);
      return; // Skip adding duplicate
    }

    // add new clipboard item to the start of the clips array
    const newState = updateClipsLength(clips, maxClips);
    let lastClip = newClip;
    setClips(newState.map((clip, index) => {
      if (lockedClips[index]) {
        // if the clip is locked, maintain its current value
        return clip;
      }
      const value = lastClip;
      lastClip = clip; // store the previous value for the next iteration
      return value;
    }));
  }, [clips, maxClips, lockedClips, setClips, clipCopyIndex, setClipCopyIndex, isDuplicateOfMostRecent]);

  /**
   * Manually read the current clipboard content and add it to clips
   */
  const readCurrentClipboard = useCallback(async (): Promise<void> => {
    if (!window.api) return;

    try {
      // Use the new prioritized clipboard data getter
      const clipData = await window.api.getCurrentClipboardData();
      
      if (!clipData) {
        console.log('No clipboard content available');
        return;
      }

      let newClip: ClipItem | null = null;

      // Convert clipboard data to ClipItem based on type
      switch (clipData.type) {
        case 'text':
          newClip = createTextClip(clipData.content);
          break;
        case 'rtf':
          newClip = createRtfClip(clipData.content);
          break;
        case 'html':
          newClip = createHtmlClip(clipData.content);
          break;
        case 'image':
          newClip = createImageClip(clipData.content);
          break;
        case 'bookmark':
          try {
            const bookmarkData = JSON.parse(clipData.content);
            newClip = createBookmarkClip(bookmarkData.title || 'Bookmark', bookmarkData.url);
          } catch (error) {
            console.error('Failed to parse bookmark data:', error);
            newClip = createTextClip(clipData.content);
          }
          break;
        default:
          newClip = createTextClip(clipData.content);
      }

      if (newClip && !isDuplicateOfMostRecent(newClip)) {
        clipboardUpdated(newClip);
      } else if (newClip) {
        console.log('Current clipboard content is the same as most recent clip, not adding');
      }
    } catch (error) {
      console.error('Failed to read clipboard:', error);
    }
  }, [clipboardUpdated, isDuplicateOfMostRecent]);

  /**
   * Copy a clip's content to the system clipboard
   * @param index the index of the clip to copy
   */
  const copyClipToClipboard = useCallback(async (index: number): Promise<void> => {
    if (!window.api) return;
    setClipCopyIndex(index);
    const clip = getClip(index);
    if (!clip || !clip.content) {
      console.warn('No clip content to copy at index:', index);
      return;
    }

    try {
      // Copy the clip content with the appropriate format based on its type
      switch (clip.type) {
        case 'text':
          await window.api.setClipboardText(clip.content);
          console.log('Copied text to clipboard');
          break;
          
        case 'html':
          await window.api.setClipboardHTML(clip.content);
          console.log('Copied HTML to clipboard');
          break;
          
        case 'rtf':
          await window.api.setClipboardRTF(clip.content);
          console.log('Copied RTF to clipboard');
          break;
          
        case 'image':
          await window.api.setClipboardImage(clip.content);
          console.log('Copied image to clipboard');
          break;
          
        case 'bookmark':
          // For bookmarks, we'll write both text (URL) and HTML (formatted link)
          const bookmarkData = {
            text: clip.url || clip.content,
            html: `<a href="${clip.url || clip.content}">${clip.title || clip.url || clip.content}</a>`,
            title: clip.title,
            url: clip.url || clip.content
          };
          await window.api.setClipboardBookmark(bookmarkData);
          console.log('Copied bookmark to clipboard:', clip.title, clip.url);
          break;
          
        default:
          // Fallback to text for unknown types
          await window.api.setClipboardText(clip.content);
          console.log('Copied unknown type as text to clipboard');
      }
    } catch (error) {
      console.error('Failed to copy clip to clipboard:', error);
      
      // Fallback: try to copy as plain text if the specific format failed
      try {
        await window.api.setClipboardText(clip.content);
        console.log('Fallback: copied as text to clipboard');
      } catch (fallbackError) {
        console.error('Fallback copy also failed:', fallbackError);
      }
    }
  }, [getClip, setClipCopyIndex]);

  // Start clipboard monitoring when component mounts
  useEffect(() => {
    const startMonitoring = async () => {
      if (window.api) {
        try {
          // Read current clipboard content first
          await readCurrentClipboard();
          
          // Then start monitoring for changes
          await window.api.startClipboardMonitoring();
          
          // Set up clipboard change listener
          window.api.onClipboardChanged((clipData: { type: string; content: string }) => {
            let newClip: ClipItem;
            console.log('Clipboard change detected:', clipData);
            switch (clipData.type) {
              case 'text':
                newClip = createTextClip(clipData.content);
                break;
              case 'rtf':
                newClip = createRtfClip(clipData.content);
                break;
              case 'html':
                newClip = createHtmlClip(clipData.content);
                break;
              case 'image':
                newClip = createImageClip(clipData.content);
                break;
              case 'bookmark':
                try {
                  const bookmarkData = JSON.parse(clipData.content);
                  newClip = createBookmarkClip(bookmarkData.title || 'Bookmark', bookmarkData.url);
                } catch (error) {
                  console.error('Failed to parse bookmark data:', error);
                  newClip = createTextClip(clipData.content);
                }
                break;
              default:
                newClip = createTextClip(clipData.content);
            }
            
            // Only trigger clipboard updated if it's not a duplicate
            if (!isDuplicateOfMostRecent(newClip)) {
              clipboardUpdated(newClip);
            } else {
              console.log('Clipboard change detected but content is duplicate, not adding');
            }
          });
        } catch (error) {
          console.error('Failed to start clipboard monitoring:', error);
        }
      }
    };

    startMonitoring();

    // Cleanup function to stop monitoring when component unmounts
    return () => {
      if (window.api) {
        window.api.stopClipboardMonitoring();
        window.api.removeClipboardListeners();
      }
    };
  }, [clipboardUpdated, readCurrentClipboard, isDuplicateOfMostRecent]); // Include all dependencies

  const providerValue = useMemo(() => ({
    // clips management
    clips,
    setClips,
    getClip,
    emptyClip,
    // clip locking
    toggleClipLock,
    isClipLocked,
    // clipboard management
    clipboardUpdated,
    readCurrentClipboard,
    copyClipToClipboard,
    // max clips management
    setMaxClips,
    maxClips,
  }),
  [clips, setClips, getClip, toggleClipLock, isClipLocked, clipboardUpdated, readCurrentClipboard, copyClipToClipboard, setMaxClips, maxClips]);

  return (
    <ClipsContext.Provider value={providerValue}>
      {children}
    </ClipsContext.Provider>
  );
};