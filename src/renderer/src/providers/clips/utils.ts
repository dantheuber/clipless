import { ClipItem } from './types';
import { detectLanguage, isCode } from '../../utils/languageDetection';

/**
 * Creates an empty clip item with default text type
 */
export const createEmptyClip = (): ClipItem => ({
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
    type: 'text',
    content,
    ...(language && { language }),
    ...(isCodeContent !== undefined && { isCode: isCodeContent }),
  };
};

export const createHtmlClip = (content: string): ClipItem => ({
  type: 'html',
  content,
});

export const createImageClip = (content: string): ClipItem => ({
  type: 'image',
  content, // This would be a data URL or file path for the image
});

export const createRtfClip = (content: string): ClipItem => ({
  type: 'rtf',
  content,
});

export const createBookmarkClip = (title: string, url: string): ClipItem => ({
  type: 'bookmark',
  content: url,
  title,
  url,
});

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
