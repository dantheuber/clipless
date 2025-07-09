import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useState,
  useEffect,
  useRef,
} from 'react';
import { DEFAULT_MAX_CLIPS } from './constants';
import { detectLanguage, isCode } from '../utils/languageDetection';
import { useLanguageDetection } from './languageDetection';

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
  url?: string; // for bookmark type
  language?: string; // detected programming language
  isCode?: boolean; // whether the content appears to be code
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
export const createTextClip = (content: string, enableDetection: boolean = true): ClipItem => {
  let language: string | undefined;
  let isCodeContent: boolean | undefined;

  if (enableDetection) {
    language = detectLanguage(content) || undefined;
    isCodeContent = isCode(content);
  }

  return {
    type: 'text',
    content,
    ...(language && { language }),
    ...(isCodeContent !== undefined && { isCode: isCodeContent }),
  };
};

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
  clipCopyIndex: number | null;
  emptyClip: (index: number) => void;
  updateClip: (index: number, updatedClip: ClipItem) => void;
  setMaxClips: React.Dispatch<React.SetStateAction<number>>;
  maxClips: number;
};

export const useClips = (): ClipsContextType => useContext(ClipsContext) as ClipsContextType;

export function ClipsProvider({ children }: { children: React.ReactNode }) {
  // the array of clip values
  const [clips, setClips] = useState<ClipItem[]>(updateClipsLength([], DEFAULT_MAX_CLIPS));
  const [clipCopyIndex, setClipCopyIndex] = useState<number | null>(null);
  // the maximum number of clips to store
  const [maxClips, setMaxClips] = useState<number>(DEFAULT_MAX_CLIPS);

  // track locked clips by their index with boolean values
  const [lockedClips, setLockedClips] = useState<Record<number, boolean>>({});

  // Track if we're still loading initial data to prevent saves during load
  const [isInitiallyLoading, setIsInitiallyLoading] = useState(true);

  // state to track when hotkey operations are happening
  const [isHotkeyOperation, setIsHotkeyOperation] = useState<boolean>(false);
  const [lastCopiedContent, setLastCopiedContent] = useState<{
    content: string;
    type: string;
  } | null>(null);

  // Use refs to always have access to the current state in callbacks
  const clipsRef = useRef(clips);
  const isHotkeyOperationRef = useRef(isHotkeyOperation);
  const lastCopiedContentRef = useRef(lastCopiedContent);

  clipsRef.current = clips;
  isHotkeyOperationRef.current = isHotkeyOperation;
  lastCopiedContentRef.current = lastCopiedContent;

  // Use language detection settings from the context
  const { isCodeDetectionEnabled } = useLanguageDetection();

  /**
   * Create a text clip with language detection based on current settings
   */
  const createTextClipWithDetection = useCallback(
    (content: string): ClipItem => {
      return createTextClip(content, isCodeDetectionEnabled);
    },
    [isCodeDetectionEnabled]
  );

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
          storedClips.forEach((storedClip: any) => {
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
  }, []); // Empty dependency array - only run once on mount

  // Listen for settings updates from other windows (like settings window)
  useEffect(() => {
    if (!window.api?.onSettingsUpdated) return;

    const handleSettingsUpdate = (updatedSettings: any) => {
      console.log('Received settings update from other window:', updatedSettings);
      if (updatedSettings && typeof updatedSettings.maxClips === 'number') {
        setMaxClips(updatedSettings.maxClips);

        // Update clips array to match new max clips limit
        setClips((prevClips) => updateClipsLength(prevClips, updatedSettings.maxClips));
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
  }, []);

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
      const currentLastCopiedContent = lastCopiedContentRef.current;
      const currentIsHotkeyOperation = isHotkeyOperationRef.current;

      console.log(
        'clipboardUpdated called with:',
        newClip.content.substring(0, 50),
        'type:',
        newClip.type
      );
      console.log('Current lastCopiedContent:', currentLastCopiedContent);
      console.log('Current isHotkeyOperation:', currentIsHotkeyOperation);

      // Enhanced duplicate detection for hotkey operations using lastCopiedContent
      if (
        currentLastCopiedContent &&
        currentLastCopiedContent.content === newClip.content &&
        currentLastCopiedContent.type === newClip.type
      ) {
        console.log(
          '❌ Clipboard update matches last copied content, not adding:',
          newClip.content.substring(0, 50)
        );
        // Clear the lastCopiedContent after matching to avoid blocking future legitimate clips
        setLastCopiedContent(null);
        return; // Skip adding if it's the same as the last copied content
      }

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
      setLastCopiedContent,
      setClipCopyIndex,
    ]
  );

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
          newClip = createTextClipWithDetection(clipData.content);
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
            newClip = createTextClipWithDetection(clipData.content);
          }
          break;
        default:
          newClip = createTextClipWithDetection(clipData.content);
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
  const copyClipToClipboard = useCallback(
    async (index: number): Promise<void> => {
      if (!window.api) return;
      setClipCopyIndex(index);

      // Set flag to prevent clipboard monitoring from adding this as a new clip
      setIsHotkeyOperation(true);

      const clip = getClip(index);
      if (!clip?.content) {
        console.warn('No clip content to copy at index:', index);
        setIsHotkeyOperation(false);
        return;
      }

      // Store the content that we're about to copy to prevent re-adding it
      setLastCopiedContent({
        content: clip.content,
        type: clip.type,
      });
      console.log(
        'Set lastCopiedContent for manual copy operation:',
        clip.content.substring(0, 50)
      );

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

          case 'bookmark': {
            // For bookmarks, we'll write both text (URL) and HTML (formatted link)
            const bookmarkData = {
              text: clip.url || clip.content,
              html: `<a href="${clip.url || clip.content}">${clip.title || clip.url || clip.content}</a>`,
              title: clip.title,
              url: clip.url || clip.content,
            };
            await window.api.setClipboardBookmark(bookmarkData);
            console.log('Copied bookmark to clipboard:', clip.title, clip.url);
            break;
          }

          default:
            // Fallback to text for unknown types
            await window.api.setClipboardText(clip.content);
            console.log('Copied unknown type as text to clipboard');
        }

        // Clear the flag after a short delay
        setTimeout(() => {
          setIsHotkeyOperation(false);
        }, 1000);

        // Clear lastCopiedContent after 3 seconds to avoid blocking future legitimate clips
        setTimeout(() => {
          setLastCopiedContent(null);
          console.log('Cleared lastCopiedContent after timeout (manual copy)');
        }, 3000);
      } catch (error) {
        console.error('Failed to copy clip to clipboard:', error);
        setIsHotkeyOperation(false);

        // Fallback: try to copy as plain text if the specific format failed
        try {
          await window.api.setClipboardText(clip.content);
          console.log('Fallback: copied as text to clipboard');
        } catch (fallbackError) {
          console.error('Fallback copy also failed:', fallbackError);
        }
      }
    },
    [getClip, setClipCopyIndex, setLastCopiedContent]
  );

  // Start clipboard monitoring when component mounts
  useEffect(() => {
    const startMonitoring = async () => {
      if (window.api) {
        try {
          // Set up hotkey clip copied listener - this needs to happen before clipboard monitoring
          window.api.onHotkeyClipCopied((clipIndex: number) => {
            console.log('🔥 Hotkey copied clip at index:', clipIndex);
            console.log('🔥 Setting clipCopyIndex to:', clipIndex);
            setClipCopyIndex(clipIndex);

            // Use the ref to get the current clips state
            const currentClips = clipsRef.current;
            if (currentClips[clipIndex]) {
              setLastCopiedContent({
                content: currentClips[clipIndex].content,
                type: currentClips[clipIndex].type,
              });
              console.log(
                'Set lastCopiedContent for hotkey operation:',
                currentClips[clipIndex].content.substring(0, 50)
              );

              // Clear lastCopiedContent after 3 seconds to avoid blocking future legitimate clips
              setTimeout(() => {
                setLastCopiedContent(null);
                console.log('Cleared lastCopiedContent after timeout');
              }, 3000);
            } else {
              console.warn('No clip found at index', clipIndex, 'in current clips array');
            }

            // Set flag to ignore clipboard changes briefly (backup mechanism)
            setIsHotkeyOperation(true);
            setTimeout(() => {
              setIsHotkeyOperation(false);
            }, 1000); // Ignore clipboard changes for 1 second after hotkey operation
          });

          // Read current clipboard content first
          await readCurrentClipboard();

          // Then start monitoring for changes
          await window.api.startClipboardMonitoring();

          // Set up clipboard change listener
          window.api.onClipboardChanged((clipData: { type: string; content: string }) => {
            const currentIsHotkeyOperation = isHotkeyOperationRef.current;
            const currentLastCopiedContent = lastCopiedContentRef.current;

            console.log(
              '📋 Clipboard change detected:',
              clipData.content.substring(0, 50),
              'type:',
              clipData.type
            );
            console.log('📋 Current isHotkeyOperation:', currentIsHotkeyOperation);
            console.log('📋 Current lastCopiedContent:', currentLastCopiedContent);

            // Skip processing if this is likely from a hotkey operation
            if (currentIsHotkeyOperation) {
              console.log('⏭️ Skipping clipboard change during hotkey operation');
              return;
            }

            let newClip: ClipItem;
            console.log('Clipboard change detected:', clipData);
            switch (clipData.type) {
              case 'text':
                newClip = createTextClipWithDetection(clipData.content);
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
                  newClip = createTextClipWithDetection(clipData.content);
                }
                break;
              default:
                newClip = createTextClipWithDetection(clipData.content);
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
        window.api.removeHotkeyListeners();
      }
    };
  }, [clipboardUpdated, readCurrentClipboard, isDuplicateOfMostRecent]); // Include all dependencies

  // Settings listener
  useEffect(() => {
    if (window.api) {
      window.api.onSettingsUpdated((settings: any) => {
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

  const providerValue = useMemo(
    () => ({
      // clips management
      clips,
      setClips,
      getClip,
      emptyClip,
      updateClip,
      // clip locking
      toggleClipLock,
      isClipLocked,
      // clipboard management
      clipboardUpdated,
      readCurrentClipboard,
      copyClipToClipboard,
      clipCopyIndex,
      // max clips management
      setMaxClips,
      maxClips,
    }),
    [
      clips,
      setClips,
      getClip,
      emptyClip,
      updateClip,
      toggleClipLock,
      isClipLocked,
      clipboardUpdated,
      readCurrentClipboard,
      copyClipToClipboard,
      clipCopyIndex,
      setMaxClips,
      maxClips,
    ]
  );

  return <ClipsContext.Provider value={providerValue}>{children}</ClipsContext.Provider>;
}
