import { useEffect, useRef, useState } from 'react';

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

  useEffect(() => {
    if (seq === 0) return;
    onOpenRef.current();
  }, [seq]);
}
