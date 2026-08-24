import { BrowserWindow, clipboard, nativeImage, app } from 'electron';
import { join } from 'path';
import { storage } from '../storage';
import { showNotification } from '../notifications';
import { loadImage } from '../storage/image-store';
import { checkClipboardNow, setSkipNextImageChange } from '../clipboard/monitoring';
import type { ClipItem, StoredClip } from '../../shared/types';

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

export class HotkeyActions {
  private mainWindow: BrowserWindow | null = null;

  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window;
  }

  focusWindow(): void {
    if (!this.mainWindow) return;

    try {
      if (this.mainWindow.isVisible() && this.mainWindow.isFocused()) {
        this.mainWindow.hide();
        return;
      }

      this.showWindow(this.mainWindow);
    } catch (error) {
      console.error('Error toggling window visibility:', error);
    }
  }

  private showWindow(window: BrowserWindow): void {
    if (window.isMinimized()) {
      window.restore();
    }

    window.show();
    window.focus();

    if (process.platform === 'darwin') {
      app.focus();
    }
  }

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

      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('hotkey-clip-copied', index);
      }

      await this.copyClipToClipboard(clipToCopy);

      console.log(`Hotkey: Copied clip ${index + 1} to clipboard`);
      showNotification('Clip copied', clipSummary(clipToCopy.clip));
    } catch (error) {
      console.error(`Error copying quick clip ${index}:`, error);
    }
  }

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

  private async copyImageClip(content: string, imageId?: string): Promise<void> {
    try {
      let dataUrl = content;

      if (imageId) {
        const dataPath = join(app.getPath('userData'), 'clipless-data');
        dataUrl = await loadImage(imageId, dataPath);
      }

      setSkipNextImageChange();
      const image = nativeImage.createFromDataURL(dataUrl);
      if (!image.isEmpty()) {
        clipboard.writeImage(image);
      } else {
        clipboard.writeText(dataUrl);
      }
    } catch (error) {
      console.error('Failed to copy image, falling back to text:', error);
      clipboard.writeText(content);
    }
  }

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
