import { BrowserWindow, clipboard, nativeImage, app } from 'electron';
import { join } from 'path';
import { storage } from '../storage';
import { showNotification } from '../notifications';
import { loadImage } from '../storage/image-store';
import { setSkipNextImageChange } from '../clipboard/monitoring';
import type { StoredClip } from '../../shared/types';

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

      // Otherwise, show and focus the window
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }

      this.mainWindow.show();
      this.mainWindow.focus();

      // On macOS, we need to bring the app to front
      if (process.platform === 'darwin') {
        app.focus();
      }
    } catch (error) {
      console.error('Error toggling window visibility:', error);
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
      await this.copyClipToClipboard(clipToCopy);

      console.log(`Hotkey: Copied clip ${index + 1} to clipboard`);
      showNotification('Clip Copied', `Clip ${index + 1} copied to clipboard`);
    } catch (error) {
      console.error(`Error copying quick clip ${index}:`, error);
    }
  }

  /**
   * Copy a clip to the system clipboard based on its type
   */
  private async copyClipToClipboard(clipToCopy: StoredClip): Promise<void> {
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
        await this.copyImageClip(clipToCopy.clip.content, clipToCopy.clip.imageId);
        break;
      default:
        clipboard.writeText(clipToCopy.clip.content);
    }
  }

  /**
   * Handle copying image clips with fallback.
   * If imageId is present, loads full image from image store.
   */
  private async copyImageClip(content: string, imageId?: string): Promise<void> {
    try {
      let dataUrl = content;

      // Load full image from image store if imageId is present
      if (imageId) {
        const dataPath = join(app.getPath('userData'), 'clipless-data');
        dataUrl = await loadImage(imageId, dataPath);
      }

      setSkipNextImageChange();
      const image = nativeImage.createFromDataURL(dataUrl);
      if (!image.isEmpty()) {
        clipboard.writeImage(image);
      } else {
        // Fallback to copying data URL as text
        clipboard.writeText(dataUrl);
      }
    } catch (error) {
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
   * Open tools launcher for the first (most recent) clip
   */
  async openToolsLauncher(): Promise<void> {
    try {
      const clips = await storage.getClips();
      if (!clips || clips.length === 0) {
        console.warn('No clips available for tools launcher');
        return;
      }

      const firstClip = clips[0];
      if (!firstClip) {
        console.warn('No first clip found');
        return;
      }

      // Import the createToolsLauncherWindow function
      const { createToolsLauncherWindow } = await import('../window/creation.js');

      // Open the tools launcher with the first clip's content
      createToolsLauncherWindow(firstClip.clip.content);

      console.log('Hotkey: Opened tools launcher for first clip');
    } catch (error) {
      console.error('Error opening tools launcher:', error);
    }
  }
}
