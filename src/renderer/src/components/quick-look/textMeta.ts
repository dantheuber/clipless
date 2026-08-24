import { formatBytes } from '../clips/clip/imageMeta';

export function textMeta(text: string): string {
  const lines = text.length === 0 ? 0 : text.split('\n').length;
  const bytes = new TextEncoder().encode(text).length;
  return `${lines} ${lines === 1 ? 'line' : 'lines'} · ${formatBytes(bytes)}`;
}
