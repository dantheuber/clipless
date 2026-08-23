import { useEffect, useRef, useState } from 'react';

/**
 * open-quick-look from the main process (spec 17.3). The hotkey runs the clipboard poll
 * once before sending; when that poll sent a clipboard-changed, the payload says pending
 * and the reader opens only once that change has arrived, so it lands on the fresh clip.
 * There is no timeout: the change is already on its way. Without pending it opens at once.
 */
export function useOpenQuickLookSignal(onOpen: () => void): void {
  const [seq, setSeq] = useState(0);
  const awaiting = useRef(false);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  useEffect(() => {
    if (!window.api?.onOpenQuickLook) return;
    return window.api.onOpenQuickLook(({ pending }) => {
      if (pending) {
        awaiting.current = true;
      } else {
        setSeq((s) => s + 1);
      }
    });
  }, []);

  useEffect(() => {
    if (!window.api?.onClipboardChanged) return;
    return window.api.onClipboardChanged(() => {
      if (!awaiting.current) return;
      awaiting.current = false;
      setSeq((s) => s + 1);
    });
  }, []);

  // Runs after the batch that inserted the clip has committed, so onOpen sees row 1 updated
  useEffect(() => {
    if (seq === 0) return;
    onOpenRef.current();
  }, [seq]);
}
