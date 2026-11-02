import { useCallback, useEffect, useRef } from 'react';
import { ClipItem, ClipsLoadError } from './types';

const isInlineImage = (clip: ClipItem): boolean =>
  clip.type === 'image' && clip.content.startsWith('data:image/');

/**
 * Whether a clip from the startup read is the image already stored at row 1. That read gets
 * the image as a data URL while the stored clip holds an image-store id, so the content
 * comparison in clipboardUpdated can never match them, and an image left on the clipboard
 * would gain a row on every launch. The image store keeps the data URL it was given.
 */
const isCopyOfStoredImage = async (clip: ClipItem, newest?: ClipItem): Promise<boolean> => {
  if (newest?.type !== 'image' || !newest.imageId || !window.api?.getFullImage) return false;
  try {
    return (await window.api.getFullImage(newest.imageId)) === clip.content;
  } catch {
    return false; // Keeping a possible duplicate is safer than dropping the clip
  }
};

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
  clipboardUpdated: (clip: ClipItem) => void,
  clipsRef: React.MutableRefObject<ClipItem[]>
): ((clip: ClipItem) => void) => {
  const pending = useRef<ClipItem[]>([]);
  const holding = isInitiallyLoading && loadError === null;
  // The gate keeps one identity across mode changes, so the clipboard monitoring effect that
  // depends on it is not torn down and restarted when the history lands; the mode is read here
  const holdingRef = useRef(holding);
  holdingRef.current = holding;
  // Read after an await, so a replayed clip sees the locks and limit of that moment
  const clipboardUpdatedRef = useRef(clipboardUpdated);
  clipboardUpdatedRef.current = clipboardUpdated;
  // Comparing an image with the stored one takes a round trip. Clips captured meanwhile join
  // the queue, so they stay newer than the clips still being replayed
  const replaying = useRef(false);
  // Moves on a clear or an unmount, which abandons a replay waiting on that round trip
  const replayRun = useRef(0);
  // Row 1 only shows what is stored until a clip is inserted, and clipsRef catches up on the
  // next render. An image captured in between is not compared with it
  const insertedSinceRender = useRef(false);
  insertedSinceRender.current = false;

  const insert = useCallback((clip: ClipItem) => {
    insertedSinceRender.current = true;
    clipboardUpdatedRef.current(clip);
  }, []);

  const replay = useCallback(async (): Promise<void> => {
    if (replaying.current) return;
    const run = replayRun.current;
    replaying.current = true;
    try {
      while (pending.current.length > 0) {
        const clip = pending.current.shift() as ClipItem;
        const duplicate =
          !insertedSinceRender.current &&
          isInlineImage(clip) &&
          (await isCopyOfStoredImage(clip, clipsRef.current[0]));
        if (run !== replayRun.current) return;
        if (duplicate) continue;
        // clipboardUpdated reads the list inside its state update, so each replayed clip
        // builds on the one before it
        insert(clip);
      }
    } catch (error) {
      console.error('Failed to replay held clips:', error);
    } finally {
      if (run === replayRun.current) replaying.current = false;
    }
  }, [clipsRef, insert]);

  useEffect(() => {
    if (!holding) void replay();
  }, [holding, replay]);

  // A clear ends the load, which would replay clips that were copied before it onto the
  // emptied list and save them again. They are part of what was cleared.
  useEffect(() => {
    const cancelReplay = () => {
      replayRun.current++;
      replaying.current = false;
      pending.current = [];
    };
    const unsubscribe = window.api?.onStorageCleared?.(cancelReplay);
    return () => {
      unsubscribe?.();
      cancelReplay();
    };
  }, []);

  return useCallback(
    (clip: ClipItem) => {
      if (holdingRef.current || replaying.current) {
        console.log(
          'Holding clip until the stored history has loaded:',
          clip.content.substring(0, 50)
        );
        pending.current.push(clip);
        return;
      }
      // The startup read can answer after the history has landed, so its image still has to
      // go through the comparison
      if (isInlineImage(clip) || pending.current.length > 0) {
        pending.current.push(clip);
        void replay();
        return;
      }
      insert(clip);
    },
    [insert, replay]
  );
};
