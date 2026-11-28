import { clipboard, nativeImage } from 'electron';
import { crc32 } from 'zlib';

// Cached image fingerprint to avoid expensive toDataURL on every poll
let lastImageFingerprint = '';
let lastImageDataUrl = '';

/**
 * Dimensions, bitmap byte length and a crc32 of the whole bitmap. Hashing every byte is what
 * tells apart two screenshots of the same display, which share size and usually their
 * top-left corner. The crc runs at memcpy speed (about 7 ms for a 5K BGRA bitmap, less than
 * the `toBitmap` copy itself), so it stays cheap for the 250 ms poll. This is the single
 * definition behind both the poll's data URL cache and the copy-back skip in monitoring.
 */
function getImageFingerprint(image: Electron.NativeImage): string {
  const size = image.getSize();
  const bitmap = image.toBitmap();
  return `${size.width}x${size.height}:${bitmap.length}:${crc32(bitmap).toString(16)}`;
}

// Helper function to determine the current clipboard type and content
export const getCurrentClipboardData = (): { type: string; content: string } | null => {
  // Priority: text > rtf > image > html > bookmark
  // Image is checked before HTML because some apps (e.g. Discord) put both
  // an <img> HTML tag and the actual image binary on the clipboard.
  const text = clipboard.readText();
  if (text?.trim()) {
    return { type: 'text', content: text };
  }

  const rtf = clipboard.readRTF();
  if (rtf?.trim()) {
    return { type: 'rtf', content: rtf };
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
    // Bookmark not available on all platforms
  }

  return null;
};

/**
 * Fingerprint of the pixels an image data URL decodes to, computed the same way as the
 * poll's clipboard fingerprint. Two data URLs that differ only in encoding (the stored PNG
 * and the PNG Electron re-encodes after a clipboard round trip) share a fingerprint.
 * An undecodable data URL yields the fingerprint of an empty image.
 */
export function imageDataUrlFingerprint(dataUrl: string): string {
  return getImageFingerprint(nativeImage.createFromDataURL(dataUrl));
}

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
    // A malformed data URL decodes to an empty image without throwing; writing it would
    // report a copy that put nothing usable on the clipboard
    if (image.isEmpty()) {
      throw new Error('Image data could not be decoded');
    }
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
