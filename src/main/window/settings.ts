import { BrowserWindow, screen } from 'electron';
import { storage } from '../storage';

export async function applyWindowSettings(window: BrowserWindow): Promise<void> {
  try {
    const settings = await storage.getSettings();
    console.log('Applying window settings:', {
      alwaysOnTop: settings.alwaysOnTop,
      transparencyEnabled: settings.transparencyEnabled,
      windowTransparency: settings.windowTransparency,
    });

    if (
      settings.transparencyEnabled &&
      settings.windowTransparency &&
      settings.windowTransparency > 0
    ) {
      const opacity = (100 - settings.windowTransparency) / 100;
      window.setOpacity(opacity);
    } else {
      window.setOpacity(1.0);
    }

    if (settings.alwaysOnTop) {
      console.log('Setting window always on top');
      window.setAlwaysOnTop(true);
    } else {
      console.log('Removing window always on top');
      window.setAlwaysOnTop(false);
    }
  } catch (error) {
    console.error('Failed to apply window settings:', error);
  }
}

export async function handleWindowFocus(window: BrowserWindow): Promise<void> {
  try {
    const settings = await storage.getSettings();

    if (settings.transparencyEnabled && settings.opaqueWhenFocused) {
      window.setOpacity(1.0);
    }
  } catch (error) {
    console.error('Failed to handle window focus:', error);
  }
}

export async function handleWindowBlur(window: BrowserWindow): Promise<void> {
  try {
    const settings = await storage.getSettings();

    if (
      settings.transparencyEnabled &&
      settings.opaqueWhenFocused &&
      settings.windowTransparency &&
      settings.windowTransparency > 0
    ) {
      const opacity = (100 - settings.windowTransparency) / 100;
      window.setOpacity(opacity);
    }
  } catch (error) {
    console.error('Failed to handle window blur:', error);
  }
}

export function calculateWindowPosition(
  mainWindow: BrowserWindow | null,
  windowWidth: number,
  windowHeight: number
): { x: number; y: number } | undefined {
  if (!mainWindow) return undefined;

  const mainBounds = mainWindow.getBounds();
  const primaryDisplay = screen.getPrimaryDisplay();
  const screenBounds = primaryDisplay.workAreaSize;
  const screenPosition = primaryDisplay.workArea;
  const padding = 10; // Minimal padding from screen edges

  let proposedX = mainBounds.x + mainBounds.width + 20; // 20px gap from main window
  let proposedY = mainBounds.y;

  if (proposedX + windowWidth > screenPosition.x + screenBounds.width) {
    const leftPosition = mainBounds.x - windowWidth - 20;
    if (leftPosition >= screenPosition.x + padding) {
      proposedX = leftPosition;
    } else {
      proposedX = screenPosition.x + screenBounds.width - windowWidth - padding;
    }
  }

  if (proposedY + windowHeight > screenPosition.y + screenBounds.height) {
    proposedY = screenPosition.y + screenBounds.height - windowHeight - padding;
  }

  if (proposedY < screenPosition.y) {
    proposedY = screenPosition.y + padding;
  }

  return { x: proposedX, y: proposedY };
}
