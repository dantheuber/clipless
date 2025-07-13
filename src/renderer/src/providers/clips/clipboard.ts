import { useCallback, useEffect } from 'react';
import { ClipItem, ClipboardState } from './types';
import { 
  createTextClip, 
  createHtmlClip, 
  createImageClip, 
  createRtfClip, 
  createBookmarkClip 
} from './utils';

/**
 * Hook for managing clipboard operations and monitoring
 */
export const useClipboardOperations = (
  isCodeDetectionEnabled: boolean,
  isDuplicateOfMostRecent: (newClip: ClipItem) => boolean,
  clipboardUpdated: (newClip: ClipItem) => void,
  getClip: (index: number) => ClipItem,
  setClipCopyIndex: React.Dispatch<React.SetStateAction<number | null>>,
  setIsHotkeyOperation: React.Dispatch<React.SetStateAction<boolean>>,
  setLastCopiedContent: React.Dispatch<React.SetStateAction<ClipboardState | null>>,
  clipsRef: React.MutableRefObject<ClipItem[]>,
  isHotkeyOperationRef: React.MutableRefObject<boolean>,
  lastCopiedContentRef: React.MutableRefObject<ClipboardState | null>
) => {
  /**
   * Create a text clip with language detection based on current settings
   */
  const createTextClipWithDetection = useCallback(
    (content: string): ClipItem => {
      return createTextClip(content, isCodeDetectionEnabled);
    },
    [isCodeDetectionEnabled]
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
  }, [clipboardUpdated, isDuplicateOfMostRecent, createTextClipWithDetection]);

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
    [getClip, setClipCopyIndex, setLastCopiedContent, setIsHotkeyOperation]
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

            // Enhanced duplicate detection for hotkey operations using lastCopiedContent
            if (
              currentLastCopiedContent &&
              currentLastCopiedContent.content === clipData.content &&
              currentLastCopiedContent.type === clipData.type
            ) {
              console.log(
                '❌ Clipboard update matches last copied content, not adding:',
                clipData.content.substring(0, 50)
              );
              // Clear the lastCopiedContent after matching to avoid blocking future legitimate clips
              setLastCopiedContent(null);
              return; // Skip adding if it's the same as the last copied content
            }

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
  }, [
    clipboardUpdated,
    readCurrentClipboard,
    isDuplicateOfMostRecent,
    createTextClipWithDetection,
    setClipCopyIndex,
    setLastCopiedContent,
    setIsHotkeyOperation,
    clipsRef,
    isHotkeyOperationRef,
    lastCopiedContentRef
  ]);

  return {
    readCurrentClipboard,
    copyClipToClipboard,
  };
};
