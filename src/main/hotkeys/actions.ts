import { BrowserWindow, clipboard, nativeImage, app } from 'electron';
import { join } from 'path';
import { storage } from '../storage';
import { showNotification } from '../notifications';
import { loadImage } from '../storage/image-store';
import { checkClipboardNow, setSkipNextImageChange } from '../clipboard/monitoring';
import type { ClipItem, StoredClip } from '../../shared/types';
import { recordFeatureUsage } from '../analytics';

/**
 * What the OS notification for a hotkey copy says: the clip's first line, since the window
 * may be hidden and "Clip 2" means nothing there (spec 17.7).
 */
export function clipSummary(clip: ClipItem): string {
  if (clip.type === 'image') return 'Image';
  const text =
    clip.type === 'bookmark' ? clip.title || clip.url || clip.content : (clip.text ?? clip.content);
  const line =
    text
      .split(/\r?\n/)
      .find((l) => l.trim().length > 0)
      ?.trim() ?? '';
  return line.length > 80 ? `${line.slice(0, 79)}…` : line;
}

/**
 * Handles all hotkey action implementations
 */
export class HotkeyActions {
  private mainWindow: BrowserWindow | null = null;

  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window;
  }

  /**
   * Toggle window visibility - focus if hidden/minimized, hide if currently focused
   */
  focusWindow(): void {
    if (!this.mainWindow) return;

    try {
      // If window is visible and focused, hide it
      if (this.mainWindow.isVisible() && this.mainWindow.isFocused()) {
        this.mainWindow.hide();
        return;
      }

      this.showWindow(this.mainWindow);
    } catch (error) {
      console.error('Error toggling window visibility:', error);
    }
  }

  /**
   * Show and focus the main window, restoring it if minimised
   */
  private showWindow(window: BrowserWindow): void {
    if (window.isMinimized()) {
      window.restore();
    }

    window.show();
    window.focus();

    // On macOS, we need to bring the app to front
    if (process.platform === 'darwin') {
      app.focus();
    }
  }

  /**
   * Copy a quick clip to the clipboard by index
   */
  async copyQuickClip(index: number): Promise<void> {
    try {
      const clips = await storage.getClips();
      if (!clips || clips.length <= index) {
        console.warn(`No clip at index ${index}`);
        return;
      }

      const clipToCopy = clips[index];
      if (!clipToCopy) {
        console.warn(`No clip found at index ${index}`);
        return;
      }

      // Resolve an image before telling the renderer anything: a missing or invalid stored
      // image fails here, so the renderer never marks the row as copied for a copy that
      // did not happen.
      const imageDataUrl =
        clipToCopy.clip.type === 'image' ? await this.loadImageDataUrl(clipToCopy.clip) : null;

      // Notify renderer BEFORE copying to clipboard so it can set up duplicate detection
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('hotkey-clip-copied', index);
      }

      // Copy the clip content with the appropriate format based on its type
      await this.copyClipToClipboard(clipToCopy, imageDataUrl);
      recordFeatureUsage('quick_clip_hotkey');

      console.log(`Hotkey: Copied clip ${index + 1} to clipboard`);
      showNotification('Clip copied', clipSummary(clipToCopy.clip));
    } catch (error) {
      console.error(`Error copying quick clip ${index}:`, error);
      showNotification('Could not copy clip', 'The clip could not be copied to the clipboard.');
    }
  }

  /**
   * Copy a clip to the system clipboard based on its type
   */
  private async copyClipToClipboard(
    clipToCopy: StoredClip,
    imageDataUrl: string | null
  ): Promise<void> {
    switch (clipToCopy.clip.type) {
      case 'text':
        clipboard.writeText(clipToCopy.clip.content);
        break;
      case 'html':
        clipboard.writeHTML(clipToCopy.clip.content);
        break;
      case 'rtf':
        clipboard.writeRTF(clipToCopy.clip.content);
        break;
      case 'bookmark':
        if (clipToCopy.clip.url && clipToCopy.clip.title) {
          clipboard.writeBookmark(clipToCopy.clip.title, clipToCopy.clip.url);
        } else {
          clipboard.writeText(clipToCopy.clip.content);
        }
        break;
      case 'image':
        this.copyImageClip(imageDataUrl ?? clipToCopy.clip.content, clipToCopy.clip.content);
        break;
      default:
        clipboard.writeText(clipToCopy.clip.content);
    }
  }

  /**
   * Resolve the full image data URL for an image clip. If imageId is present, loads the
   * full image from the image store; otherwise the clip content is the image itself.
   * Throws when the image is missing or is not an image data URL, so the caller can
   * report the failure without copying an installation-local image ID.
   */
  private async loadImageDataUrl(clip: StoredClip['clip']): Promise<string> {
    let dataUrl = clip.content;

    if (clip.imageId) {
      const dataPath = join(app.getPath('userData'), 'clipless-data');
      dataUrl = await loadImage(clip.imageId, dataPath);
    }

    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      throw new Error('Full image is unavailable');
    }
    return dataUrl;
  }

  /**
   * Write an already-loaded image to the clipboard, falling back to the inline data URL
   * as text when the native image can't be built.
   */
  private copyImageClip(dataUrl: string, content: string): void {
    try {
      setSkipNextImageChange();
      const image = nativeImage.createFromDataURL(dataUrl);
      if (!image.isEmpty()) {
        clipboard.writeImage(image);
      } else {
        // Fallback to copying data URL as text
        clipboard.writeText(dataUrl);
      }
    } catch (error) {
      if (!content.startsWith('data:image/')) {
        throw error;
      }
      console.error('Failed to copy image, falling back to text:', error);
      clipboard.writeText(content);
    }
  }

  /**
   * Toggle search bar in the main window
   */
  toggleSearchBar(): void {
    if (!this.mainWindow) return;

    try {
      if (!this.mainWindow.isVisible() || this.mainWindow.isMinimized()) {
        if (this.mainWindow.isMinimized()) {
          this.mainWindow.restore();
        }
        this.mainWindow.show();
        this.mainWindow.focus();
        if (process.platform === 'darwin') {
          app.focus();
        }
      }

      this.mainWindow.webContents.send('toggle-search');
    } catch (error) {
      console.error('Error toggling search bar:', error);
    }
  }

  /**
   * The quick look hotkey (spec 9, 17.3): run the clipboard poll once so a copy made just
   * before the hotkey reaches the renderer as clipboard-changed, bring the window forward,
   * then tell the renderer to open the reader on row 1. pending says whether a change was
   * sent, so the renderer waits for it only when there is one.
   */
  async quickLook(): Promise<void> {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    try {
      const pending = await checkClipboardNow();
      this.showWindow(this.mainWindow);
      this.mainWindow.webContents.send('open-quick-look', { pending });
    } catch (error) {
      console.error('Error opening quick look:', error);
    }
  }
}
