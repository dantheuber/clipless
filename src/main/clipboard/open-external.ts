import { shell } from 'electron';

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']); // spec 17.3: anything but http(s) is dropped so a tool URL template cannot reach a file: or javascript: target through shell.openExternal

export function allowedExternalUrls(urls: unknown): string[] {
  if (!Array.isArray(urls)) return [];
  const allowed: string[] = [];
  for (const url of urls) {
    if (typeof url !== 'string') continue;
    try {
      if (ALLOWED_PROTOCOLS.has(new URL(url).protocol)) allowed.push(url);
    } catch {
      // ignore
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
