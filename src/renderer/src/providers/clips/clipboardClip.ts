import type { ClipboardState, ClipItem } from './types';
import {
  createBookmarkClip,
  createHtmlClip,
  createImageClip,
  createRtfClip,
  createTextClip,
} from './utils';

type ClipboardData = {
  type: string;
  content: string;
  text?: string;
  imageId?: string;
  thumbnailDataUrl?: string;
};

export function matchesClipboardState(
  clipData: ClipboardData,
  state: ClipboardState | null
): boolean {
  return state !== null && state.content === clipData.content && state.type === clipData.type;
}

export function createClipFromClipboardData(
  clipData: ClipboardData,
  isCodeDetectionEnabled: boolean
): ClipItem {
  switch (clipData.type) {
    case 'text':
      return createTextClip(clipData.content, isCodeDetectionEnabled);
    case 'rtf':
      return createRtfClip(clipData.content, clipData.text);
    case 'html':
      return createHtmlClip(clipData.content, clipData.text);
    case 'image':
      return createImageClip(clipData.content, clipData.imageId, clipData.thumbnailDataUrl);
    case 'bookmark':
      try {
        const bookmarkData = JSON.parse(clipData.content);
        return createBookmarkClip(bookmarkData.title || 'Bookmark', bookmarkData.url);
      } catch (error) {
        console.error('Failed to parse bookmark data:', error);
        return createTextClip(clipData.content, isCodeDetectionEnabled);
      }
    default:
      return createTextClip(clipData.content, isCodeDetectionEnabled);
  }
}

export async function readCurrentClipboardClip(
  isCodeDetectionEnabled: boolean
): Promise<ClipItem | null> {
  const clipData = await window.api.getCurrentClipboardData();
  if (!clipData) {
    console.log('No clipboard content available');
    return null;
  }
  return createClipFromClipboardData(clipData, isCodeDetectionEnabled);
}

export async function writeClipToSystemClipboard(clip: ClipItem): Promise<void> {
  switch (clip.type) {
    case 'text':
      await window.api.setClipboardText(clip.content);
      console.log('Copied text to clipboard');
      break;
    case 'html':
      await window.api.setClipboardHTML(clip.content);
      console.log('Copied HTML to clipboard');
      break;
    case 'rtf':
      await window.api.setClipboardRTF(clip.content);
      console.log('Copied RTF to clipboard');
      break;
    case 'image': {
      let imageData = clip.content;
      if (clip.imageId && window.api.getFullImage) {
        const fullImage = await window.api.getFullImage(clip.imageId);
        if (fullImage) imageData = fullImage;
      }
      await window.api.setClipboardImage(imageData);
      console.log('Copied image to clipboard');
      break;
    }
    case 'bookmark': {
      const url = clip.url || clip.content;
      await window.api.setClipboardBookmark({
        text: url,
        html: `<a href="${url}">${clip.title || url}</a>`,
        title: clip.title,
        url,
      });
      console.log('Copied bookmark to clipboard:', clip.title, clip.url);
      break;
    }
    default:
      await window.api.setClipboardText(clip.content);
      console.log('Copied unknown type as text to clipboard');
  }
}
