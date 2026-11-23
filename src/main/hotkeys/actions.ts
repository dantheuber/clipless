import { BrowserWindow, app } from 'electron';
import { showNotification } from '../notifications';
import { checkClipboardNow } from '../clipboard/monitoring';
import type { ClipItem } from '../../shared/types';
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
      if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
      this.mainWindow.webContents.send('copy-quick-clip', index);
    } catch (error) {
      console.error(`Error copying quick clip ${index}:`, error);
      showNotification('Could not copy clip', 'The clip could not be copied to the clipboard.');
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

/** Record only completed hotkey copies, using the clip selected by the renderer. */
export function reportQuickClipCopy(clip: ClipItem | null): void {
  if (!clip) {
    showNotification('Could not copy clip', 'The clip could not be copied to the clipboard.');
    return;
  }
  recordFeatureUsage('quick_clip_hotkey');
  showNotification('Clip copied', clipSummary(clip));
}
