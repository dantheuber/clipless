import type { ClipItem, StoredClip } from '../../shared/types';

/**
 * Whether a stored slot holds a clip. Delete leaves a blank row in the window, and that row
 * is stored as a blank slot so later rows keep their positions.
 */
export function isStoredSlotEmpty(storedClip: StoredClip | null | undefined): boolean {
  return isBlankContent(storedClip?.clip?.content);
}

function isBlankContent(content: unknown): boolean {
  return typeof content !== 'string' || content.trim() === '';
}

/**
 * Convert clips and lock states to stored format.
 *
 * Stored positions match on-screen positions: a blank row above a later clip is kept as an
 * empty slot, so the quick-clip hotkeys (which read this list by index), the copied marker
 * in the window and the locks all point at the same row. Only the trailing run of empty
 * rows is dropped, to keep the file small. An empty slot is never locked.
 */
export function convertToStoredClips(
  clips: ClipItem[],
  lockedIndices: Record<number, boolean>
): StoredClip[] {
  const timestamp = Date.now();
  const stored: StoredClip[] = clips.map((clip, index) => ({
    clip,
    isLocked: !isBlankContent(clip.content) && lockedIndices[index] === true,
    timestamp,
  }));

  let end = stored.length;
  while (end > 0 && isStoredSlotEmpty(stored[end - 1])) {
    end--;
  }
  return stored.slice(0, end);
}

/**
 * Get storage statistics for clips. Empty slots are positions, not clips, so they are not
 * counted.
 */
export function getClipStats(clips: StoredClip[]): { clipCount: number; lockedCount: number } {
  const held = clips.filter((clip) => !isStoredSlotEmpty(clip));
  const clipCount = held.length;
  const lockedCount = held.filter((clip) => clip.isLocked).length;
  return { clipCount, lockedCount };
}
