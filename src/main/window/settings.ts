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

    // Apply transparency
    if (
      settings.transparencyEnabled &&
      settings.windowTransparency &&
      settings.windowTransparency > 0
    ) {
      const opacity = (100 - settings.windowTransparency) / 100;
      window.setOpacity(opacity);
    } else {
      // Reset to fully opaque if transparency is disabled
      window.setOpacity(1.0);
    }

    // Apply always on top
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

    // Make window opaque when focused if the option is enabled
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

    // Restore transparency when window loses focus
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

/**
 * Calculate optimal window position to ensure it stays within screen bounds
 * Uses minimal padding and allows overlap with main window when needed
 * @param mainWindow - The parent/main window to position relative to
 * @param windowWidth - Width of the window to position
 * @param windowHeight - Height of the window to position
 * @returns Object with x and y coordinates, or undefined if no main window
 */
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

  // Start with preferred position (to the right of main window)
  let proposedX = mainBounds.x + mainBounds.width + 20; // 20px gap from main window
  let proposedY = mainBounds.y;

  // Only adjust X position if the window would actually go off the screen
  if (proposedX + windowWidth > screenPosition.x + screenBounds.width) {
    // Try positioning to the left of main window first
    const leftPosition = mainBounds.x - windowWidth - 20;
    if (leftPosition >= screenPosition.x + padding) {
      // Left position works, use it
      proposedX = leftPosition;
    } else {
      // Neither left nor right fits with gap, position with minimal padding from right edge
      proposedX = screenPosition.x + screenBounds.width - windowWidth - padding;
    }
  }

  // Only adjust Y position if the window would go off screen
  if (proposedY + windowHeight > screenPosition.y + screenBounds.height) {
    proposedY = screenPosition.y + screenBounds.height - windowHeight - padding;
  }

  if (proposedY < screenPosition.y) {
    proposedY = screenPosition.y + padding;
  }

  return { x: proposedX, y: proposedY };
}
