import { BrowserWindow, clipboard, nativeImage } from 'electron';
import { storage } from '../storage';

/**
 * Handles all hotkey action implementations
 */
export class HotkeyActions {
  private mainWindow: BrowserWindow | null = null;

  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window;
  }

  /**
   * Focus the main application window
   */
  focusWindow(): void {
    if (!this.mainWindow) return;

    try {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }

      this.mainWindow.show();
      this.mainWindow.focus();

      // On macOS, we need to bring the app to front
      if (process.platform === 'darwin') {
        require('electron').app.focus();
      }
    } catch (error) {
      console.error('Error focusing window:', error);
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

      // Notify renderer BEFORE copying to clipboard so it can set up duplicate detection
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('hotkey-clip-copied', index);
      }

      // Copy the clip content with the appropriate format based on its type
      this.copyClipToClipboard(clipToCopy);

      console.log(`Hotkey: Copied clip ${index + 1} to clipboard`);
    } catch (error) {
      console.error(`Error copying quick clip ${index}:`, error);
    }
  }

  /**
   * Copy a clip to the system clipboard based on its type
   */
  private copyClipToClipboard(clipToCopy: any): void {
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
        this.copyImageClip(clipToCopy.clip.content);
        break;
      default:
        clipboard.writeText(clipToCopy.clip.content);
    }
  }

  /**
   * Handle copying image clips with fallback
   */
  private copyImageClip(content: string): void {
    try {
      const image = nativeImage.createFromDataURL(content);
      if (!image.isEmpty()) {
        clipboard.writeImage(image);
      } else {
        // Fallback to copying data URL as text
        clipboard.writeText(content);
      }
    } catch (error) {
      console.error('Failed to copy image, falling back to text:', error);
      clipboard.writeText(content);
    }
  }
}
