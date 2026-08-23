import type { ClipItem } from '../../../../shared/types';
import { detectLanguage, isCode } from '../../utils/languageDetection';

/**
 * Identity for a clip. The reader, the copied marker and pin pruning follow a clip by id
 * while rows shift; index identity cannot do that. Clips loaded without one get an id in
 * the main process (migrateData).
 */
export const newClipId = (): string => {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `clip-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

/**
 * Creates an empty clip item with default text type. Every row has an id, even an empty one.
 */
export const createEmptyClip = (): ClipItem => ({
  id: newClipId(),
  type: 'text',
  content: '',
});

/**
 * Utility functions for creating different types of clips
 */
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

/**
 * HTML and RTF clips carry the text the main process extracted at capture; the row and the
 * scanner read it instead of the markup.
 */
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

/**
 * The text a clip is scanned and searched by: the extracted text for html and rtf, title
 * and URL for a bookmark, the content otherwise. Images have no text.
 */
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

/**
 * Updates the length of the clips array to ensure it has the set maximum number of clips.
 * If the clips array is shorter than the maximum, it fills the remaining slots with empty clips.
 * If the clips array is longer than the maximum, it truncates from the end (oldest clips).
 * @param clips the current array of clips.
 * @param maxClips the maximum number of clips allowed.
 * @returns a new array of clips with the specified maximum length, filling empty slots with empty clips.
 */
export const updateClipsLength = (clips: ClipItem[], maxClips: number): ClipItem[] => {
  // Create a copy of the clips array
  const result = [...clips];

  if (result.length > maxClips) {
    // Truncate the array if it's too long (remove oldest clips from the end)
    result.splice(maxClips);
  } else if (result.length < maxClips) {
    // Fill remaining slots with empty clips
    for (let index = result.length; index < maxClips; index++) {
      result[index] = createEmptyClip();
    }
  }

  return result;
};

/**
 * Shrink the list to a new limit keeping locked clips (spec 15.5): the oldest unlocked
 * clips go first, and locks are re-indexed to the clips they were on. Only when the locked
 * clips alone exceed the limit are the oldest of those dropped too. Padding is as
 * updateClipsLength.
 */
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
