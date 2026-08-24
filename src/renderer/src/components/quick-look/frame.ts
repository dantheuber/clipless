export const FRAME_CSP = "default-src 'none'; style-src 'unsafe-inline'";

export const FRAME_HEAD = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${FRAME_CSP}">`;

export function frameDocument(
  sanitisedHtml: string,
  textColour: string,
  thumbColour = '#4d4d4d'
): string {
  const scrollbar = `::-webkit-scrollbar{width:11px;height:11px}::-webkit-scrollbar-track,::-webkit-scrollbar-corner{background:transparent}::-webkit-scrollbar-thumb{background:${thumbColour};background-clip:padding-box;border:3px solid transparent;border-radius:999px;min-height:28px}::-webkit-scrollbar-button{display:none}`;
  const style = `<style>body{margin:10px 16px;font:13.5px/1.5 Inter,-apple-system,"Segoe UI",Roboto,Ubuntu,sans-serif;color:${textColour};background:transparent}a{color:#3b82f6;pointer-events:none}a:not([href]){color:inherit;text-decoration:none}pre,code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px}table{border-collapse:collapse}td,th{border:1px solid #8884;padding:2px 6px}img{display:none}${scrollbar}</style>`;
  return `${FRAME_HEAD}${style}</head><body>${sanitisedHtml}</body></html>`;
}

function themeValue(name: string, fallback: string): string {
  const value = getComputedStyle(document.body).getPropertyValue(name).trim();
  return value || fallback;
}

export function frameTextColour(): string {
  return themeValue('--text', '#eeeeee');
}

export function frameThumbColour(): string {
  return themeValue('--sb-thumb', '#4d4d4d');
}
