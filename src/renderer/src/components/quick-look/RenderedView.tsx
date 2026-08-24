import { useEffect, useState } from 'react';
import { frameDocument, frameTextColour, frameThumbColour } from './frame';
import styles from './QuickLook.module.css';

interface RenderedViewProps {
  html: string;
  onSanitized: (removed: Record<string, number>) => void;
}

export function RenderedView({ html, onSanitized }: RenderedViewProps) {
  const [doc, setDoc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDoc(null);
    window.api
      .htmlSanitize(html)
      .then((result) => {
        if (cancelled) return;
        setDoc(frameDocument(result.html, frameTextColour(), frameThumbColour()));
        onSanitized(result.removed);
      })
      .catch((error) => {
        console.error('Failed to sanitise html for the rendered view:', error);
        if (!cancelled)
          setDoc(
            frameDocument(
              '<p>Could not render this clip.</p>',
              frameTextColour(),
              frameThumbColour()
            )
          );
      });
    return () => {
      cancelled = true;
    };
  }, [html, onSanitized]);

  return (
    <div className={styles.renderedPane} data-testid="ql-rendered">
      {doc === null ? (
        <div className={styles.none}>Sanitising…</div>
      ) : (
        <iframe
          className={styles.frame}
          title="Rendered clip"
          sandbox=""
          referrerPolicy="no-referrer"
          srcDoc={doc}
          data-testid="ql-frame"
        />
      )}
    </div>
  );
}
