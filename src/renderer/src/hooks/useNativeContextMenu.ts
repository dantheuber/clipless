import { useEffect } from 'react';
import { useClips } from '../providers/clips';

interface NativeContextMenuProps {
  index: number;
}

export function useNativeContextMenu({ index }: NativeContextMenuProps) {
  const { isClipLocked, toggleClipLock, emptyClip, getClip, copyClipToClipboard } = useClips();

  const clip = getClip(index);
  const isFirstClip = index === 0;

  useEffect(() => {
    const handleContextMenuAction = (data: { action: string; index: number }) => {
      if (data.index !== index) return;

      switch (data.action) {
        case 'copy':
          copyClipToClipboard(index);
          break;
        case 'lock':
          if (!isFirstClip) {
            toggleClipLock(index);
          }
          break;
        case 'delete':
          if (!isFirstClip) {
            emptyClip(index);
          }
          break;
        case 'scan':
          window.api.openToolsLauncher(clip.content).catch(console.error);
          break;
      }
    };

    window.api.onContextMenuAction(handleContextMenuAction);

    return () => {
      window.api.removeContextMenuListeners();
    };
  }, [index, isFirstClip, clip.content, copyClipToClipboard, toggleClipLock, emptyClip]);

  const showContextMenu = async (event: React.MouseEvent) => {
    event.preventDefault();

    // Check for patterns
    let hasPatterns = false;
    try {
      const matches = await window.api.quickClipsScanText(clip.content);
      hasPatterns = matches.length > 0;
    } catch {
      hasPatterns = false;
    }

    await window.api.showClipContextMenu({
      index,
      isFirstClip,
      isLocked: isClipLocked(index),
      hasPatterns,
    });
  };

  return { showContextMenu };
}
