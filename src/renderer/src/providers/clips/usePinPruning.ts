import { useEffect, useRef } from 'react';
import type { ClipItem, ScanResult } from '../../../../shared/types';
import { pinKey } from '../../../../shared/readiness';
import { type PinMap, droppedNotice, prunePins } from './pins';

/**
 * Drop pins whose value no longer appears in any clip's scan, naming the reason from the
 * diff against the previous clips array (spec 17.1). Runs on every clips change and when
 * a deferred scan lands; while any scan is pending nothing is pruned. onPrune fires once
 * per change that dropped something, with the new map and the tray's notice.
 */
export function usePinPruning(
  clips: readonly ClipItem[],
  getScan: (clip: ClipItem) => ScanResult | null,
  scanVersion: number,
  pinsRef: React.MutableRefObject<PinMap>,
  onPrune: (pins: PinMap, notice: string) => void
): void {
  const prevClipsRef = useRef<readonly ClipItem[]>(clips);
  const keysByClipRef = useRef<Map<string, Set<string>>>(new Map());
  const onPruneRef = useRef(onPrune);
  onPruneRef.current = onPrune;

  useEffect(() => {
    const present = new Set<string>();
    const byClip = new Map<string, Set<string>>();
    for (const clip of clips) {
      const scan = getScan(clip);
      if (scan === null) return; // a large clip is still scanning; try again when it lands
      const keys = new Set(scan.matches.map((m) => pinKey(m.group, m.value)));
      byClip.set(clip.id, keys);
      for (const key of keys) present.add(key);
    }
    const result = prunePins(
      pinsRef.current,
      present,
      prevClipsRef.current,
      clips,
      keysByClipRef.current
    );
    prevClipsRef.current = clips;
    keysByClipRef.current = byClip;
    if (result.dropped.length > 0) {
      onPruneRef.current(result.pins, droppedNotice(result.dropped) as string);
    }
  }, [clips, getScan, scanVersion, pinsRef]);
}
