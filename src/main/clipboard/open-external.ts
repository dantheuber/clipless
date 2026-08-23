import { shell } from 'electron';

/**
 * Tabs from the tray and the reader (spec 17.3). Only http and https open; anything else
 * the renderer hands over is dropped, so a tool URL template cannot reach a file: or
 * javascript: target through shell.openExternal. Opened in order; returns how many opened.
 */
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

export function allowedExternalUrls(urls: unknown): string[] {
  if (!Array.isArray(urls)) return [];
  const allowed: string[] = [];
  for (const url of urls) {
    if (typeof url !== 'string') continue;
    try {
      if (ALLOWED_PROTOCOLS.has(new URL(url).protocol)) allowed.push(url);
    } catch {
      // not a URL at all
    }
  }
  return allowed;
}

export async function openExternalUrls(urls: unknown): Promise<number> {
  const allowed = allowedExternalUrls(urls);
  for (const url of allowed) {
    await shell.openExternal(url);
  }
  return allowed.length;
}
