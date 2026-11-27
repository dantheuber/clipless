import { BrowserWindow, app } from 'electron';
import { showNotification } from '../notifications';
import { checkClipboardNow } from '../clipboard/monitoring';
import type { ClipItem, QuickClipCopyRequest, QuickClipCopyResult } from '../../shared/types';
import { recordFeatureUsage } from '../analytics';

/**
 * How long a quick-clip request waits for the clips window to answer before the press is
 * reported as a failed copy. The renderer may be reloading, hung, or not yet listening at
 * startup; without a deadline the press would vanish and the user would paste stale content.
 */
export const QUICK_CLIP_REPLY_DEADLINE_MS = 1500;

const FAILED_COPY_TITLE = 'Could not copy clip';
const FAILED_COPY_BODY = 'The clip could not be copied to the clipboard.';

/** Requests sent to the renderer that have not been answered or timed out yet. */
const pendingQuickClipCopies = new Map<number, NodeJS.Timeout>();
let nextQuickClipRequestId = 1;

function reportFailedQuickClipCopy(): void {
  showNotification(FAILED_COPY_TITLE, FAILED_COPY_BODY);
}

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
   * Copy a quick clip to the clipboard by index. The renderer does the write and answers via
   * `quick-clip-copy-result` (see reportQuickClipCopy); a request it never answers is reported
   * as a failed copy when the deadline passes.
   */
  async copyQuickClip(index: number): Promise<void> {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    const request: QuickClipCopyRequest = { requestId: nextQuickClipRequestId++, index };
    const deadline = setTimeout(() => {
      pendingQuickClipCopies.delete(request.requestId);
      console.error(`Quick clip ${index}: no answer from the clips window`);
      reportFailedQuickClipCopy();
    }, QUICK_CLIP_REPLY_DEADLINE_MS);
    pendingQuickClipCopies.set(request.requestId, deadline);

    try {
      this.mainWindow.webContents.send('copy-quick-clip', request);
    } catch (error) {
      clearTimeout(deadline);
      pendingQuickClipCopies.delete(request.requestId);
      console.error(`Error copying quick clip ${index}:`, error);
      reportFailedQuickClipCopy();
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

/**
 * The renderer's answer to a copyQuickClip request. Usage is recorded only for `copied`, an
 * `empty` slot copies nothing and says nothing (#204), and anything else is a failed copy.
 * A reply to a request that already timed out, was already answered, or was never sent is
 * dropped so nothing is recorded or shown twice.
 */
export function reportQuickClipCopy(result: QuickClipCopyResult): void {
  const deadline = pendingQuickClipCopies.get(result.requestId);
  if (deadline === undefined) return;
  clearTimeout(deadline);
  pendingQuickClipCopies.delete(result.requestId);

  if (result.status === 'empty') return;
  if (result.status === 'copied' && result.clip) {
    recordFeatureUsage('quick_clip_hotkey');
    showNotification('Clip copied', clipSummary(result.clip));
    return;
  }
  reportFailedQuickClipCopy();
}
