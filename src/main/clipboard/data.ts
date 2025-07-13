import { clipboard, nativeImage } from 'electron';

// Helper function to determine the current clipboard type and content
export const getCurrentClipboardData = (): { type: string; content: string } | null => {
  // Priority: text > rtf > html > image > bookmark
  const text = clipboard.readText();
  if (text && text.trim()) {
    return { type: 'text', content: text };
  }

  const rtf = clipboard.readRTF();
  if (rtf && rtf.trim()) {
    return { type: 'rtf', content: rtf };
  }

  const html = clipboard.readHTML();
  if (html && html.trim()) {
    return { type: 'html', content: html };
  }

  const image = clipboard.readImage();
  if (!image.isEmpty()) {
    return { type: 'image', content: image.toDataURL() };
  }

  try {
    const bookmark = clipboard.readBookmark();
    if (bookmark && bookmark.url) {
      return { type: 'bookmark', content: JSON.stringify(bookmark) };
    }
  } catch {
    // Bookmark not available on all platforms
  }

  return null;
};

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
