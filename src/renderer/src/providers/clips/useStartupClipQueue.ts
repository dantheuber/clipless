import { useCallback, useEffect, useRef } from 'react';
import { ClipItem, ClipsLoadError } from './types';

/**
 * Holds clips captured before the stored history has been applied, and replays them once
 * it has.
 *
 * The clipboard is read once at mount and monitored from then on, while the history needs
 * two round trips and may wait on the main process's background load. loadStoredData then
 * replaces the whole list, so a clip that landed first would be shown briefly and lost, and
 * the main process has already marked it as seen. Until the load has been applied, clips go
 * into a queue instead of the list. When it lands they are replayed in arrival order through
 * clipboardUpdated, so the duplicate check runs against the real row 1 and locks and the
 * limit apply as usual.
 *
 * A failed load applies no history, so the queue is shown then too, as it was before the
 * queue existed; saving stays off until a load succeeds regardless.
 *
 * @returns the gate to pass clips through in place of clipboardUpdated
 */
export const useStartupClipQueue = (
  isInitiallyLoading: boolean,
  loadError: ClipsLoadError | null,
  clipboardUpdated: (clip: ClipItem) => void
): ((clip: ClipItem) => void) => {
  const pending = useRef<ClipItem[]>([]);
  const holding = isInitiallyLoading && loadError === null;
  // The gate keeps one identity across mode changes, so the clipboard monitoring effect that
  // depends on it is not torn down and restarted when the history lands; the mode is read here
  const holdingRef = useRef(holding);
  holdingRef.current = holding;

  useEffect(() => {
    if (holding || pending.current.length === 0) return;
    const queued = pending.current;
    pending.current = [];
    // clipboardUpdated reads the list inside its state update, so each replayed clip
    // builds on the one before it
    for (const clip of queued) clipboardUpdated(clip);
  }, [holding, clipboardUpdated]);

  return useCallback(
    (clip: ClipItem) => {
      if (holdingRef.current) {
        console.log(
          'Holding clip until the stored history has loaded:',
          clip.content.substring(0, 50)
        );
        pending.current.push(clip);
        return;
      }
      clipboardUpdated(clip);
    },
    [clipboardUpdated]
  );
};
