import type { ClipItem } from '../../../../shared/types';
import { imageFormat, imageMeta } from '../clips/clip/imageMeta';
import { textMeta } from './textMeta';

export function clipTag(clip: ClipItem): string | null {
  if (clip.type === 'text') return clip.isCode && clip.language ? clip.language : null;
  if (clip.type === 'image') {
    return imageFormat(clip.thumbnailDataUrl || clip.content)?.toLowerCase() ?? 'image';
  }
  return clip.type === 'bookmark' ? 'link' : clip.type;
}

export function clipMeta(
  clip: ClipItem,
  imageInfo: { width: number; height: number } | null,
  text: string
): string {
  if (clip.type !== 'image') return textMeta(text);
  return imageMeta({
    ...clip,
    ...(imageInfo && { imageWidth: imageInfo.width, imageHeight: imageInfo.height }),
  });
}
