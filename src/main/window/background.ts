import { BrowserWindow, nativeTheme } from 'electron';
import type { UserSettings } from '../../shared/types';

const DARK_WINDOW_BACKGROUND = '#1a1a1a'; // theme-colored background hides the 1px white edge sliver GNOME/Wayland fractional scaling can expose, and avoids the white flash before first paint
const LIGHT_WINDOW_BACKGROUND = '#ffffff';

let currentTheme: UserSettings['theme'] = 'system'; // windows are created before settings finish loading; corrected once the stored theme is known

export function resolveWindowBackground(): string {
  const dark =
    currentTheme === 'system' ? nativeTheme.shouldUseDarkColors : currentTheme === 'dark';
  return dark ? DARK_WINDOW_BACKGROUND : LIGHT_WINDOW_BACKGROUND;
}

export function applyWindowBackgroundTheme(theme: UserSettings['theme']): void {
  currentTheme = theme ?? 'system';
  const color = resolveWindowBackground();
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.setBackgroundColor(color);
    }
  }
}

export function watchSystemThemeForWindowBackground(): void {
  nativeTheme.on('updated', () => {
    if (currentTheme === 'system') {
      applyWindowBackgroundTheme('system');
    }
  });
}
