import { useCallback, useMemo, useRef, useState } from 'react';
import type { ClipItem, ScanResult } from '../../../../shared/types';
import {
  EMPTY_PINS,
  type PinMap,
  clearPins as clearPinMap,
  nextPinnedAt,
  pinsByGroup as groupPins,
  setPins as setPinKeys,
  togglePins as togglePinKeys,
} from './pins';
import { usePinPruning } from './usePinPruning';

export function usePins(
  clips: ClipItem[],
  getScan: (clip: ClipItem) => ScanResult | null,
  scanVersion: number
) {
  const [pins, setPinMap] = useState<PinMap>(EMPTY_PINS);
  const [droppedNotice, setDroppedNotice] = useState<string | null>(null);
  const pinsRef = useRef(pins);
  pinsRef.current = pins;

  const togglePins = useCallback((keys: readonly string[]) => {
    setPinMap((current) => togglePinKeys(current, keys, nextPinnedAt(current)));
  }, []);
  const setPins = useCallback((keys: readonly string[], on: boolean) => {
    setPinMap((current) => setPinKeys(current, keys, on, nextPinnedAt(current)));
  }, []);
  const clearPins = useCallback(() => setPinMap(clearPinMap()), []);
  const isPinned = useCallback((key: string) => pins.has(key), [pins]);
  const pinsByGroup = useMemo(() => groupPins(pins), [pins]);
  const onPrune = useCallback((pruned: PinMap, notice: string) => {
    setPinMap(pruned);
    setDroppedNotice(notice);
  }, []);
  usePinPruning(clips, getScan, scanVersion, pinsRef, onPrune);
  const dismissDroppedNotice = useCallback(() => setDroppedNotice(null), []);

  return {
    pins,
    pinsByGroup,
    isPinned,
    togglePins,
    setPins,
    clearPins,
    droppedNotice,
    dismissDroppedNotice,
  };
}
