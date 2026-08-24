import { describe, it, expect, vi } from 'vitest';
import { clipSummary, type HotkeyActions } from './actions';
import { checkClipboardNow } from '../clipboard/monitoring';
import { storage } from '../storage';
import { showNotification } from '../notifications';
import type { MockWindow } from './actions-test-types';
import type { BrowserWindow } from 'electron';

export function registerQuickLookCases(
  getActions: () => HotkeyActions,
  getWindow: () => MockWindow
): void {
  describe('quickLook', () => {
    it('checks the clipboard, shows the window and sends open-quick-look with pending', async () => {
      vi.mocked(checkClipboardNow).mockResolvedValue(true);

      await getActions().quickLook();

      expect(checkClipboardNow).toHaveBeenCalledTimes(1);
      expect(getWindow().show).toHaveBeenCalled();
      expect(getWindow().focus).toHaveBeenCalled();
      expect(getWindow().webContents.send).toHaveBeenCalledWith('open-quick-look', {
        pending: true,
      });
    });

    it('reports pending false when the poll found no change', async () => {
      vi.mocked(checkClipboardNow).mockResolvedValue(false);
      getWindow().isMinimized.mockReturnValue(true);

      await getActions().quickLook();

      expect(getWindow().restore).toHaveBeenCalled();
      expect(getWindow().webContents.send).toHaveBeenCalledWith('open-quick-look', {
        pending: false,
      });
    });

    it('does nothing without a window or with a destroyed one', async () => {
      getActions().setMainWindow(null);
      await expect(getActions().quickLook()).resolves.toBeUndefined();
      expect(checkClipboardNow).not.toHaveBeenCalled();

      getWindow().isDestroyed.mockReturnValue(true);
      getActions().setMainWindow(getWindow() as unknown as BrowserWindow);
      await getActions().quickLook();
      expect(checkClipboardNow).not.toHaveBeenCalled();
    });

    it('logs and keeps going when the clipboard check throws', async () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(checkClipboardNow).mockRejectedValue(new Error('poll failed'));
      await expect(getActions().quickLook()).resolves.toBeUndefined();
      expect(errSpy).toHaveBeenCalledWith('Error opening quick look:', expect.any(Error));
      expect(getWindow().webContents.send).not.toHaveBeenCalled();
      errSpy.mockRestore();
    });
  });
}

export function registerClipSummaryCases(getActions: () => HotkeyActions): void {
  describe('clipSummary', () => {
    it('names the first non-empty line, trimmed to 80 characters', () => {
      expect(clipSummary({ id: 'a', type: 'text', content: '\n  first line \nsecond' })).toBe(
        'first line'
      );
      const long = 'x'.repeat(100);
      expect(clipSummary({ id: 'a', type: 'text', content: long })).toHaveLength(80);
      expect(clipSummary({ id: 'a', type: 'text', content: '   ' })).toBe('');
    });

    it('uses the extracted text for html, the title for a bookmark, and Image for images', () => {
      expect(clipSummary({ id: 'a', type: 'html', content: '<p>x</p>', text: 'plain' })).toBe(
        'plain'
      );
      expect(clipSummary({ id: 'a', type: 'rtf', content: '{\\rtf1 x}' })).toBe('{\\rtf1 x}');
      expect(
        clipSummary({
          id: 'a',
          type: 'bookmark',
          content: 'https://x',
          title: 'T',
          url: 'https://x',
        })
      ).toBe('T');
      expect(
        clipSummary({ id: 'a', type: 'bookmark', content: 'https://x', url: 'https://x' })
      ).toBe('https://x');
      expect(clipSummary({ id: 'a', type: 'bookmark', content: 'https://c' })).toBe('https://c');
      expect(clipSummary({ id: 'a', type: 'image', content: 'img' })).toBe('Image');
    });

    it('is what the hotkey copy notification says', async () => {
      vi.mocked(storage.getClips).mockResolvedValue([
        {
          clip: { id: 'c1', type: 'text', content: 'hello there\nmore' },
          isLocked: false,
          timestamp: 1,
        },
      ]);
      await getActions().copyQuickClip(0);
      expect(showNotification).toHaveBeenCalledWith('Clip copied', 'hello there');
    });
  });
}
