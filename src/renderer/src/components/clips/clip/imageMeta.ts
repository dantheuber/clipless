import type { ClipItem } from '../../../providers/clips';

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function imageFormat(dataUrl: string): string | null {
  return dataUrl.startsWith('data:image/')
    ? dataUrl.split(';')[0].split('/')[1].toUpperCase()
    : null;
}

export function imageBytes(clip: ClipItem): number {
  if (clip.imageBytes !== undefined) return clip.imageBytes;
  const source = clip.thumbnailDataUrl || clip.content;
  const payload = source.indexOf(',') >= 0 ? source.slice(source.indexOf(',') + 1) : source;
  return Math.round(payload.length * 0.75);
}

export function imageMeta(clip: ClipItem): string {
  const size = formatBytes(imageBytes(clip));
  return clip.imageWidth && clip.imageHeight
    ? `${clip.imageWidth} x ${clip.imageHeight}, ${size}`
    : size;
}
