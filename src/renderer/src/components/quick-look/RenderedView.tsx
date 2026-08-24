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

export function frameDocument(
  sanitisedHtml: string,
  textColour: string,
  thumbColour = '#4d4d4d'
): string {
  // The frame is its own document, so it needs the scrollbar rules from theme.css repeated
  // here with the colours resolved; without them it draws the default light scrollbar.
  const scrollbar = `::-webkit-scrollbar{width:11px;height:11px}::-webkit-scrollbar-track,::-webkit-scrollbar-corner{background:transparent}::-webkit-scrollbar-thumb{background:${thumbColour};background-clip:padding-box;border:3px solid transparent;border-radius:999px;min-height:28px}::-webkit-scrollbar-button{display:none}`;
  const style = `<style>body{margin:10px 16px;font:13.5px/1.5 Inter,-apple-system,"Segoe UI",Roboto,Ubuntu,sans-serif;color:${textColour};background:transparent}a{color:#3b82f6;pointer-events:none}a:not([href]){color:inherit;text-decoration:none}pre,code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px}table{border-collapse:collapse}td,th{border:1px solid #8884;padding:2px 6px}img{display:none}${scrollbar}</style>`;
  return `${FRAME_HEAD}${style}</head><body>${sanitisedHtml}</body></html>`;
}

/** A theme variable's current value, so the frame follows the theme */
function themeValue(name: string, fallback: string): string {
  const value = getComputedStyle(document.body).getPropertyValue(name).trim();
  return value || fallback;
}

export function frameTextColour(): string {
  return themeValue('--text', '#eeeeee');
}

/** The scrollbar thumb colour the frame's own scrollbar uses */
export function frameThumbColour(): string {
  return themeValue('--sb-thumb', '#4d4d4d');
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
