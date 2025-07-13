import type { ClipItem, StoredClip } from '../../shared/types';

/**
 * Convert clips and lock states to stored format
 */
export function convertToStoredClips(
  clips: ClipItem[],
  lockedIndices: Record<number, boolean>
): StoredClip[] {
  // Only save clips that have actual content to reduce storage size
  return clips
    .map((clip, index) => ({
      clip,
      isLocked: lockedIndices[index] === true,
      timestamp: Date.now(),
    }))
    .filter((storedClip) => storedClip.clip.content && storedClip.clip.content.trim() !== '');
}

/**
 * Get storage statistics for clips
 */
export function getClipStats(clips: StoredClip[]): { clipCount: number; lockedCount: number } {
  const clipCount = clips.length;
  const lockedCount = clips.filter((clip) => clip.isLocked).length;
  return { clipCount, lockedCount };
}
