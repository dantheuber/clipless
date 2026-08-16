import { BrowserWindow, nativeTheme } from 'electron';
import type { UserSettings } from '../../shared/types';

// Electron's default window background is opaque white. On GNOME/Wayland the
// compositor's surface can end up a pixel wider than the laid-out page (edge
// rounding under fractional scaling), which leaves a 1px column of that white
// default showing along the window edge. Painting the window background in the
// app's own theme color makes any such sliver invisible, and also removes the
// white flash between window creation and first paint.
export const DARK_WINDOW_BACKGROUND = '#1a1a1a';
export const LIGHT_WINDOW_BACKGROUND = '#ffffff';

// Windows are created before settings finish loading from storage, so start
// from the OS preference (which is what theme: 'system' resolves to anyway)
// and correct it once the stored theme is known.
let currentTheme: UserSettings['theme'] = 'system';

export function resolveWindowBackground(): string {
  const dark =
    currentTheme === 'system' ? nativeTheme.shouldUseDarkColors : currentTheme === 'dark';
  return dark ? DARK_WINDOW_BACKGROUND : LIGHT_WINDOW_BACKGROUND;
}

// Records the active theme and repaints every open window's background to
// match. Safe to call before any window exists.
export function applyWindowBackgroundTheme(theme: UserSettings['theme']): void {
  currentTheme = theme ?? 'system';
  const color = resolveWindowBackground();
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.setBackgroundColor(color);
    }
  }
}

// Keeps theme: 'system' windows in step when the OS flips light/dark.
export function watchSystemThemeForWindowBackground(): void {
  nativeTheme.on('updated', () => {
    if (currentTheme === 'system') {
      applyWindowBackgroundTheme('system');
    }
  });
}
