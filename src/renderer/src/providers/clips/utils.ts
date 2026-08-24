import type { ClipItem } from '../../../../shared/types';
import { detectLanguage, isCode } from '../../utils/languageDetection';

export const newClipId = (): string => {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `clip-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

export const createEmptyClip = (): ClipItem => ({
  id: newClipId(),
  type: 'text',
  content: '',
});

export const createTextClip = (content: string, enableDetection: boolean = true): ClipItem => {
  let language: string | undefined;
  let isCodeContent: boolean | undefined;

  if (enableDetection) {
    language = detectLanguage(content) || undefined;
    isCodeContent = isCode(content);
  }

  return {
    id: newClipId(),
    type: 'text',
    content,
    ...(language && { language }),
    ...(isCodeContent !== undefined && { isCode: isCodeContent }),
  };
};

export const createHtmlClip = (content: string, text?: string): ClipItem => ({
  id: newClipId(),
  type: 'html',
  content,
  ...(text !== undefined && { text }),
});

export const createImageClip = (
  content: string,
  imageId?: string,
  thumbnailDataUrl?: string
): ClipItem => ({
  id: newClipId(),
  type: 'image',
  content,
  ...(imageId && { imageId }),
  ...(thumbnailDataUrl && { thumbnailDataUrl }),
});

export const createRtfClip = (content: string, text?: string): ClipItem => ({
  id: newClipId(),
  type: 'rtf',
  content,
  ...(text !== undefined && { text }),
});

export const createBookmarkClip = (title: string, url: string): ClipItem => ({
  id: newClipId(),
  type: 'bookmark',
  content: url,
  title,
  url,
});

export const clipText = (clip: ClipItem): string => {
  switch (clip.type) {
    case 'html':
    case 'rtf':
      return clip.text ?? clip.content;
    case 'bookmark':
      return `${clip.title ?? ''}\n${clip.url ?? clip.content}`;
    case 'image':
      return '';
    default:
      return clip.content;
  }
};

export const updateClipsLength = (clips: ClipItem[], maxClips: number): ClipItem[] => {
  const result = [...clips];

  if (result.length > maxClips) {
    result.splice(maxClips);
  } else if (result.length < maxClips) {
    for (let index = result.length; index < maxClips; index++) {
      result[index] = createEmptyClip();
    }
  }

  return result;
};

export const shrinkClips = (
  clips: ClipItem[],
  locked: Record<number, boolean>,
  maxClips: number
): { clips: ClipItem[]; locked: Record<number, boolean> } => {
  const kept: { clip: ClipItem; locked: boolean }[] = clips.map((clip, index) => ({
    clip,
    locked: locked[index] === true,
  }));
  let excess = kept.length - maxClips;
  for (let index = kept.length - 1; index >= 0 && excess > 0; index--) {
    if (!kept[index].locked) {
      kept.splice(index, 1);
      excess--;
    }
  }
  if (excess > 0) kept.splice(maxClips);

  const nextLocked: Record<number, boolean> = {};
  kept.forEach((entry, index) => {
    if (entry.locked && index > 0) nextLocked[index] = true;
  });
  return {
    clips: updateClipsLength(
      kept.map((entry) => entry.clip),
      maxClips
    ),
    locked: nextLocked,
  };
};
