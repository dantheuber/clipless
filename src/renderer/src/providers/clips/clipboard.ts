import { useCallback, useEffect, useRef } from 'react';
import { ClipItem, ClipboardState } from './types';
import * as clipboardClip from './clipboardClip';
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
  const readCurrentClipboard = useCallback(async (): Promise<void> => {
    if (!window.api) return;

    try {
      const newClip = await clipboardClip.readCurrentClipboardClip(isCodeDetectionEnabled);

      if (newClip && !isDuplicateOfMostRecent(newClip)) {
        clipboardUpdated(newClip);
      } else if (newClip) {
        console.log('Current clipboard content is the same as most recent clip, not adding');
      }
    } catch (error) {
      console.error('Failed to read clipboard:', error);
    }
  }, [clipboardUpdated, isCodeDetectionEnabled, isDuplicateOfMostRecent]);

  const copyClipToClipboard = useCallback(
    async (index: number): Promise<boolean> => {
      if (!window.api) return false;

      setIsHotkeyOperation(true);

      const clip = getClip(index);
      setClipCopyId(clip?.id ?? null);
      if (!clip?.content) {
        console.warn('No clip content to copy at index:', index);
        setIsHotkeyOperation(false);
        return false;
      }

      setLastCopiedContent({
        content: clip.content,
        type: clip.type,
      });
      console.log(
        'Set lastCopiedContent for manual copy operation:',
        clip.content.substring(0, 50)
      );

      try {
        await clipboardClip.writeClipToSystemClipboard(clip);

        setTimeout(() => {
          setIsHotkeyOperation(false);
        }, 1000);

        setTimeout(() => {
          setLastCopiedContent(null);
          console.log('Cleared lastCopiedContent after timeout (manual copy)');
        }, 3000);
        return true;
      } catch (error) {
        console.error('Failed to copy clip to clipboard:', error);
        setIsHotkeyOperation(false);

        try {
          await window.api.setClipboardText(clip.content);
          console.log('Fallback: copied as text to clipboard');
          return true;
        } catch (fallbackError) {
          console.error('Fallback copy also failed:', fallbackError);
          return false;
        }
      }
    },
    [getClip, setClipCopyId, setLastCopiedContent, setIsHotkeyOperation]
  );

  const hasReadInitialClipboard = useRef(false);

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];
    const startMonitoring = async () => {
      if (window.api) {
        try {
          const offHotkey = window.api.onHotkeyClipCopied((clipIndex: number) => {
            console.log('🔥 Hotkey copied clip at index:', clipIndex);

            const currentClips = clipsRef.current;
            setClipCopyId(currentClips[clipIndex]?.id ?? null);
            if (currentClips[clipIndex]) {
              setLastCopiedContent({
                content: currentClips[clipIndex].content,
                type: currentClips[clipIndex].type,
              });
              console.log(
                'Set lastCopiedContent for hotkey operation:',
                currentClips[clipIndex].content.substring(0, 50)
              );

              setTimeout(() => {
                setLastCopiedContent(null);
                console.log('Cleared lastCopiedContent after timeout');
              }, 3000);
            } else {
              console.warn('No clip found at index', clipIndex, 'in current clips array');
            }

            setIsHotkeyOperation(true);
            setTimeout(() => {
              setIsHotkeyOperation(false);
            }, 1000);
          });
          unsubscribers.push(offHotkey);

          if (!hasReadInitialClipboard.current) {
            hasReadInitialClipboard.current = true;
            await readCurrentClipboard();
          }

          await window.api.startClipboardMonitoring();

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

            if (clipboardClip.matchesClipboardState(clipData, currentLastCopiedContent)) {
              console.log(
                '❌ Clipboard update matches last copied content, not adding:',
                clipData.content.substring(0, 50)
              );
              setLastCopiedContent(null);
              return;
            }

            if (currentIsHotkeyOperation) {
              console.log('⏭️ Skipping clipboard change during hotkey operation');
              return;
            }

            console.log('Clipboard change detected:', clipData);
            const newClip = clipboardClip.createClipFromClipboardData(
              clipData,
              isCodeDetectionEnabled
            );

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
    isCodeDetectionEnabled,
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
