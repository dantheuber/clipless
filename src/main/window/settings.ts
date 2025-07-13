import { BrowserWindow } from 'electron';
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
