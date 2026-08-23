import { useEffect, useState } from 'react';
import styles from './QuickLook.module.css';

/**
 * Rendered HTML never runs code (spec 16 rule 6). The clip's markup goes to the main
 * process sanitiser; the string that comes back goes into this iframe's srcdoc and nowhere
 * else. The frame is sandboxed with no flags (opaque origin, no scripts, no forms, no
 * popups), sends no referrer, and its own CSP allows inline styles and nothing else, so
 * nothing inside it can load or run.
 */
export const FRAME_CSP = "default-src 'none'; style-src 'unsafe-inline'";

export const FRAME_HEAD = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${FRAME_CSP}">`;

export function frameDocument(sanitisedHtml: string, textColour: string): string {
  const style = `<style>body{margin:10px 16px;font:13.5px/1.5 Inter,-apple-system,"Segoe UI",Roboto,Ubuntu,sans-serif;color:${textColour};background:transparent}a{color:#3b82f6;pointer-events:none}a:not([href]){color:inherit;text-decoration:none}pre,code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px}table{border-collapse:collapse}td,th{border:1px solid #8884;padding:2px 6px}img{display:none}</style>`;
  return `${FRAME_HEAD}${style}</head><body>${sanitisedHtml}</body></html>`;
}

/** The window's text colour from the theme variables, so the frame follows the theme */
export function frameTextColour(): string {
  const value = getComputedStyle(document.body).getPropertyValue('--text').trim();
  return value || '#eeeeee';
}

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
        setDoc(frameDocument(result.html, frameTextColour()));
        onSanitized(result.removed);
      })
      .catch((error) => {
        console.error('Failed to sanitise html for the rendered view:', error);
        if (!cancelled)
          setDoc(frameDocument('<p>Could not render this clip.</p>', frameTextColour()));
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
