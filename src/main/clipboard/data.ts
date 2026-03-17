import { clipboard, nativeImage } from 'electron';

// Cached image fingerprint to avoid expensive toDataURL on every poll
let lastImageFingerprint = '';
let lastImageDataUrl = '';

function getImageFingerprint(image: Electron.NativeImage): string {
  const size = image.getSize();
  const bitmap = image.toBitmap();
  // Use dimensions + bitmap byte length + first 64 bytes as a fast fingerprint
  const sample = bitmap.subarray(0, 64).toString('base64');
  return `${size.width}x${size.height}:${bitmap.length}:${sample}`;
}

// Helper function to determine the current clipboard type and content
export const getCurrentClipboardData = (): { type: string; content: string } | null => {
  // Priority: text > rtf > html > image > bookmark
  const text = clipboard.readText();
  if (text?.trim()) {
    return { type: 'text', content: text };
  }

  const rtf = clipboard.readRTF();
  if (rtf?.trim()) {
    return { type: 'rtf', content: rtf };
  }

  const html = clipboard.readHTML();
  if (html?.trim()) {
    return { type: 'html', content: html };
  }

  const image = clipboard.readImage();
  if (!image.isEmpty()) {
    const fingerprint = getImageFingerprint(image);
    if (fingerprint !== lastImageFingerprint) {
      // Image changed — do the expensive toDataURL conversion
      lastImageFingerprint = fingerprint;
      lastImageDataUrl = image.toDataURL();
    }
    return { type: 'image', content: lastImageDataUrl };
  }

  try {
    const bookmark = clipboard.readBookmark();
    if (bookmark?.url) {
      return { type: 'bookmark', content: JSON.stringify(bookmark) };
    }
  } catch {
    // Bookmark not available on all platforms
  }

  return null;
};

export function clearImageCache(): void {
  lastImageFingerprint = '';
  lastImageDataUrl = '';
}

// Clipboard read operations
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

// Clipboard write operations
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
    // Convert base64 data URL to NativeImage
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
    // Write both text and HTML formats for maximum compatibility
    clipboard.write({
      text: bookmarkData.text,
      html: bookmarkData.html,
    });
  } catch (error) {
    console.error('Failed to write bookmark to clipboard:', error);
    throw error;
  }
};
