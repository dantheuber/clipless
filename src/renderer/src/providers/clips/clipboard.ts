import { useCallback, useEffect, useRef } from 'react';
import { ClipItem, ClipboardState } from './types';
import {
  createTextClip,
  createHtmlClip,
  createImageClip,
  createRtfClip,
  createBookmarkClip,
} from './utils';

/**
 * Hook for managing clipboard operations and monitoring
 */
export const useClipboardOperations = (
  isCodeDetectionEnabled: boolean,
  isDuplicateOfMostRecent: (newClip: ClipItem) => boolean,
  clipboardUpdated: (newClip: ClipItem) => void,
  getClip: (index: number) => ClipItem,
  setClipCopyId: React.Dispatch<React.SetStateAction<string | null>>,
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
          newClip = createRtfClip(clipData.content, (clipData as ClipItem).text);
          break;
        case 'html':
          newClip = createHtmlClip(clipData.content, (clipData as ClipItem).text);
          break;
        case 'image':
          newClip = createImageClip(
            clipData.content,
            (clipData as ClipItem).imageId,
            (clipData as ClipItem).thumbnailDataUrl
          );
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
   * Write one clip to the system clipboard. Takes the clip object rather than an index so a
   * caller that already resolved the row (the hotkey listener reads the live ref) writes
   * exactly that clip, not whatever a stale list held at the same index.
   */
  const writeClip = useCallback(
    async (clip: ClipItem | undefined): Promise<boolean> => {
      if (!window.api) return false;

      if (!clip?.content) {
        console.warn('No clip content to copy');
        return false;
      }

      // Load a stored image before suppressing clipboard changes, so a screenshot taken
      // while the full image loads is not swallowed by the suppression window below.
      let imageData = clip.content;
      if (clip.type === 'image' && clip.imageId && window.api.getFullImage) {
        try {
          const fullImage = await window.api.getFullImage(clip.imageId);
          if (fullImage) {
            imageData = fullImage;
          }
        } catch (error) {
          console.error('Failed to load full image:', error);
        }
      }

      // Set flag to prevent clipboard monitoring from adding this as a new clip
      setIsHotkeyOperation(true);

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

          case 'image': {
            if (!imageData.startsWith('data:image/')) {
              throw new Error('Full image is unavailable');
            }
            await window.api.setClipboardImage(imageData);
            console.log('Copied image to clipboard');
            break;
          }

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

        setClipCopyId(clip.id);

        // Clear the flag after a short delay
        setTimeout(() => {
          setIsHotkeyOperation(false);
        }, 1000);

        // Clear lastCopiedContent after 3 seconds to avoid blocking future legitimate clips
        setTimeout(() => {
          setLastCopiedContent(null);
          console.log('Cleared lastCopiedContent after timeout (manual copy)');
        }, 3000);
        return true;
      } catch (error) {
        console.error('Failed to copy clip to clipboard:', error);
        setIsHotkeyOperation(false);

        if (clip.type === 'image' && !clip.content.startsWith('data:image/')) {
          setLastCopiedContent(null);
          setClipCopyId(null);
          return false;
        }

        // Fallback: try to copy as plain text if the specific format failed
        try {
          await window.api.setClipboardText(clip.content);
          console.log('Fallback: copied as text to clipboard');
          setClipCopyId(clip.id);
          return true;
        } catch (fallbackError) {
          console.error('Fallback copy also failed:', fallbackError);
          return false;
        }
      }
    },
    [setClipCopyId, setLastCopiedContent, setIsHotkeyOperation]
  );

  /**
   * Copy a clip's content to the system clipboard. Returns true when something was written,
   * so the caller can toast; the OS notification is for hotkey copies only (spec 17.7).
   * @param index the index of the clip to copy
   */
  const copyClipToClipboard = useCallback(
    async (index: number): Promise<boolean> => writeClip(getClip(index)),
    [writeClip, getClip]
  );

  // Register before monitoring so requests always use the live row and the normal copy path.
  // The row is resolved once from the ref and that same object is written and reported, so a
  // request that lands after the list changed but before this effect re-ran cannot write one
  // clip and report another. Every request is answered, echoing its id, so main can tell an
  // empty slot or a failed write from a window that never heard the request.
  useEffect(() => {
    if (!window.api) return;
    return window.api.onCopyQuickClip(async ({ requestId, index }) => {
      const clip = clipsRef.current[index];
      if (!clip?.content) {
        await window.api.quickClipCopyResult({ requestId, status: 'empty' });
        return;
      }
      let copied = false;
      try {
        copied = await writeClip(clip);
      } catch (error) {
        console.error(`Quick clip ${index} copy threw:`, error);
      }
      await window.api.quickClipCopyResult(
        copied ? { requestId, status: 'copied', clip } : { requestId, status: 'failed' }
      );
    });
  }, [writeClip, clipsRef]);

  // Guard to ensure readCurrentClipboard only runs on initial mount
  const hasReadInitialClipboard = useRef(false);

  // Start clipboard monitoring when component mounts
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];
    const startMonitoring = async () => {
      if (window.api) {
        try {
          // Read current clipboard content only on initial mount (not on effect re-runs)
          if (!hasReadInitialClipboard.current) {
            hasReadInitialClipboard.current = true;
            await readCurrentClipboard();
          }

          // Then start monitoring for changes
          await window.api.startClipboardMonitoring();

          // Set up clipboard change listener
          const offClipboard = window.api.onClipboardChanged((clipData) => {
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
                newClip = createRtfClip(clipData.content, (clipData as ClipItem).text);
                break;
              case 'html':
                newClip = createHtmlClip(clipData.content, (clipData as ClipItem).text);
                break;
              case 'image':
                newClip = createImageClip(
                  clipData.content,
                  (clipData as ClipItem).imageId,
                  (clipData as ClipItem).thumbnailDataUrl
                );
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
          unsubscribers.push(offClipboard);
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
      }
      for (const unsubscribe of unsubscribers) unsubscribe();
    };
  }, [
    clipboardUpdated,
    readCurrentClipboard,
    isDuplicateOfMostRecent,
    createTextClipWithDetection,
    setClipCopyId,
    setLastCopiedContent,
    setIsHotkeyOperation,
    clipsRef,
    isHotkeyOperationRef,
    lastCopiedContentRef,
  ]);

  return {
    readCurrentClipboard,
    copyClipToClipboard,
  };
};
