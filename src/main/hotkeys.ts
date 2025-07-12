import { globalShortcut, BrowserWindow, clipboard, nativeImage } from 'electron';
import { storage } from './storage';

class HotkeyManager {
  private isInitialized = false;
  private currentHotkeys: Set<string> = new Set();
  private mainWindow: BrowserWindow | null = null;

  setMainWindow(window: BrowserWindow | null) {
    this.mainWindow = window;
  }

  async initialize() {
    console.log('Hotkey Manager: Initialize called');
    if (this.isInitialized) {
      console.log('Hotkey Manager: Already initialized, skipping');
      return;
    }

    try {
      console.log('Hotkey Manager: Starting initialization...');
      await this.registerHotkeys();
      this.isInitialized = true;
      console.log('Hotkey Manager: Initialization completed successfully');
    } catch (error) {
      console.error('Failed to initialize hotkey manager:', error);
    }
  }

  async registerHotkeys() {
    try {
      // Clear existing hotkeys
      this.unregisterAllHotkeys();

      const settings = await storage.getSettings();
      console.log('Hotkey Manager: Loaded settings:', JSON.stringify(settings.hotkeys, null, 2));

      if (!settings.hotkeys?.enabled) {
        console.log('Hotkey Manager: Hotkeys are disabled in settings');
        return;
      }

      const { hotkeys } = settings;
      console.log('Hotkey Manager: Registering hotkeys...');

      // Register focus window hotkey
      if (hotkeys.focusWindow.enabled) {
        console.log(
          `Hotkey Manager: Attempting to register focus window hotkey: ${hotkeys.focusWindow.key}`
        );
        this.registerHotkey(hotkeys.focusWindow.key, () => {
          this.focusWindow();
        });
      }

      // Register quick clip hotkeys
      // Note: Quick clip hotkeys copy clips by their display number (1-5)
      const quickClipHotkeys = [
        { config: hotkeys.quickClip1, index: 0 }, // Copy 1st clip (position 1)
        { config: hotkeys.quickClip2, index: 1 }, // Copy 2nd clip (position 2)
        { config: hotkeys.quickClip3, index: 2 }, // Copy 3rd clip (position 3)
        { config: hotkeys.quickClip4, index: 3 }, // Copy 4th clip (position 4)
        { config: hotkeys.quickClip5, index: 4 }, // Copy 5th clip (position 5)
      ];

      for (const { config, index } of quickClipHotkeys) {
        if (config.enabled) {
          console.log(
            `Hotkey Manager: Attempting to register quick clip ${index} hotkey: ${config.key}`
          );
          this.registerHotkey(config.key, () => {
            this.copyQuickClip(index);
          });
        }
      }
    } catch (error) {
      console.error('Failed to register hotkeys:', error);
    }
  }

  private registerHotkey(accelerator: string, callback: () => void) {
    try {
      // Check if hotkey is already registered
      if (this.currentHotkeys.has(accelerator)) {
        console.warn(`Hotkey ${accelerator} is already registered`);
        return;
      }

      const success = globalShortcut.register(accelerator, callback);
      if (success) {
        this.currentHotkeys.add(accelerator);
        console.log(`Registered hotkey: ${accelerator}`);
      } else {
        console.warn(`Failed to register hotkey: ${accelerator}`);
      }
    } catch (error) {
      console.error(`Error registering hotkey ${accelerator}:`, error);
    }
  }

  private unregisterAllHotkeys() {
    this.currentHotkeys.forEach((accelerator) => {
      try {
        globalShortcut.unregister(accelerator);
      } catch (error) {
        console.error(`Error unregistering hotkey ${accelerator}:`, error);
      }
    });
    this.currentHotkeys.clear();
  }

  private focusWindow() {
    if (!this.mainWindow) return;

    try {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }

      this.mainWindow.show();
      this.mainWindow.focus();

      // On macOS, we need to bring the app to front
      if (process.platform === 'darwin') {
        require('electron').app.focus();
      }
    } catch (error) {
      console.error('Error focusing window:', error);
    }
  }

  private async copyQuickClip(index: number) {
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
          // For images, convert data URL back to image and copy to clipboard
          try {
            const image = nativeImage.createFromDataURL(clipToCopy.clip.content);
            if (!image.isEmpty()) {
              clipboard.writeImage(image);
            } else {
              // Fallback to copying data URL as text
              clipboard.writeText(clipToCopy.clip.content);
            }
          } catch (error) {
            console.error('Failed to copy image, falling back to text:', error);
            clipboard.writeText(clipToCopy.clip.content);
          }
          break;
        default:
          clipboard.writeText(clipToCopy.clip.content);
      }

      console.log(`Hotkey: Copied clip ${index + 1} to clipboard`);
    } catch (error) {
      console.error(`Error copying quick clip ${index}:`, error);
    }
  }

  async onSettingsChanged() {
    console.log('Hotkey Manager: onSettingsChanged called, isInitialized:', this.isInitialized);
    if (!this.isInitialized) {
      console.log('Hotkey Manager: Not initialized yet, initializing now...');
      await this.initialize();
      return;
    }

    try {
      console.log('Hotkey Manager: Re-registering hotkeys after settings change...');
      await this.registerHotkeys();
    } catch (error) {
      console.error('Failed to update hotkeys after settings change:', error);
    }
  }

  cleanup() {
    if (this.isInitialized) {
      this.unregisterAllHotkeys();
      this.isInitialized = false;
    }
  }
}

export const hotkeyManager = new HotkeyManager();
