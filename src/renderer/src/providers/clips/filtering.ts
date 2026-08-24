import { useMemo } from 'react';
import type { ClipItem, ScanResult } from '../../../../shared/types';
import { pinKey } from '../../../../shared/readiness';
import type { PinMap } from './pins';
import type { VisibleClip } from './quickLook';
import { clipText } from './utils';

export function useClipFiltering(
  clips: ClipItem[],
  searchTerm: string,
  pinnedOnly: boolean,
  pins: PinMap,
  getScan: (clip: ClipItem) => ScanResult | null,
  scanVersion: number
): { filteredClips: VisibleClip[]; imagesNotSearched: number; isFiltering: boolean } {
  const result = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term && !pinnedOnly) {
      return {
        filteredClips: clips.map((clip, originalIndex) => ({ clip, originalIndex })),
        imagesNotSearched: 0,
      };
    }

    let imagesNotSearched = 0;
    const filteredClips = clips.reduce<VisibleClip[]>((visible, clip, originalIndex) => {
      if (term) {
        if (clip.type === 'image') {
          if (clip.content) imagesNotSearched++;
          return visible;
        }
        if (!clipText(clip).toLowerCase().includes(term)) return visible;
      }
      if (pinnedOnly) {
        const scan = getScan(clip);
        if (!scan?.matches.some((match) => pins.has(pinKey(match.group, match.value)))) {
          return visible;
        }
      }
      visible.push({ clip, originalIndex });
      return visible;
    }, []);
    return { filteredClips, imagesNotSearched };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clips, searchTerm, pinnedOnly, pins, getScan, scanVersion]);

  return {
    ...result,
    isFiltering: searchTerm.trim().length > 0 || pinnedOnly,
  };
}
