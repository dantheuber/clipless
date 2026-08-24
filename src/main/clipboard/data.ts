import { clipboard, nativeImage } from 'electron';

let lastImageFingerprint = ''; // toDataURL is expensive; cache its result keyed by a cheap fingerprint
let lastImageDataUrl = '';

function getImageFingerprint(image: Electron.NativeImage): string {
  const size = image.getSize();
  const bitmap = image.toBitmap();
  const sample = bitmap.subarray(0, 64).toString('base64');
  return `${size.width}x${size.height}:${bitmap.length}:${sample}`;
}

export const getCurrentClipboardData = (): { type: string; content: string } | null => {
  const text = clipboard.readText();
  if (text?.trim()) {
    return { type: 'text', content: text };
  }

  const rtf = clipboard.readRTF();
  if (rtf?.trim()) {
    return { type: 'rtf', content: rtf };
  }

  const image = clipboard.readImage(); // checked before HTML: some apps (e.g. Discord) put both an <img> tag and the image binary on the clipboard
  if (!image.isEmpty()) {
    const fingerprint = getImageFingerprint(image);
    if (fingerprint !== lastImageFingerprint) {
      lastImageFingerprint = fingerprint;
      lastImageDataUrl = image.toDataURL();
    }
    return { type: 'image', content: lastImageDataUrl };
  }

  const html = clipboard.readHTML();
  if (html?.trim()) {
    return { type: 'html', content: html };
  }

  try {
    const bookmark = clipboard.readBookmark();
    if (bookmark?.url) {
      return { type: 'bookmark', content: JSON.stringify(bookmark) };
    }
  } catch {
    // ignore
  }

  return null;
};

export function clearImageCache(): void {
  lastImageFingerprint = '';
  lastImageDataUrl = '';
}

export const getClipboardText = (): string => clipboard.readText();
export const getClipboardHTML = (): string => clipboard.readHTML();
export const getClipboardRTF = (): string => clipboard.readRTF();

export const getClipboardImage = (): string | null => {
  const image = clipboard.readImage();
  if (!image.isEmpty()) {
    return image.toDataURL();
  }
  return null;
};

export const getClipboardBookmark = (): { title: string; url: string } | null => {
  try {
    return clipboard.readBookmark();
  } catch {
    return null; // Not available on all platforms
  }
};

export const setClipboardText = (text: string): void => {
  clipboard.writeText(text);
};

export const setClipboardHTML = (html: string): void => {
  clipboard.writeHTML(html);
};

export const setClipboardRTF = (rtf: string): void => {
  clipboard.writeRTF(rtf);
};

export const setClipboardImage = (imageData: string): void => {
  try {
    const image = nativeImage.createFromDataURL(imageData);
    clipboard.writeImage(image);
  } catch (error) {
    console.error('Failed to write image to clipboard:', error);
    throw error;
  }
};

export const setClipboardBookmark = (bookmarkData: {
  text: string;
  html: string;
  title?: string;
  url?: string;
}): void => {
  try {
    clipboard.write({
      text: bookmarkData.text,
      html: bookmarkData.html,
    });
  } catch (error) {
    console.error('Failed to write bookmark to clipboard:', error);
    throw error;
  }
};
