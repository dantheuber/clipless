import type { ClipItem, StoredClip } from '../../shared/types';

export function convertToStoredClips(
  clips: ClipItem[],
  lockedIndices: Record<number, boolean>
): StoredClip[] {
  return clips
    .map((clip, index) => ({
      clip,
      isLocked: lockedIndices[index] === true,
      timestamp: Date.now(),
    }))
    .filter((storedClip) => storedClip.clip.content && storedClip.clip.content.trim() !== '');
}

export function getClipStats(clips: StoredClip[]): { clipCount: number; lockedCount: number } {
  const clipCount = clips.length;
  const lockedCount = clips.filter((clip) => clip.isLocked).length;
  return { clipCount, lockedCount };
}
