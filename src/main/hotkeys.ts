import { globalShortcut, BrowserWindow } from 'electron';
import { storage } from './storage';

class HotkeyManager {
  private isInitialized = false;
  private currentHotkeys: Set<string> = new Set();
  private mainWindow: BrowserWindow | null = null;

  setMainWindow(window: BrowserWindow | null) {
    this.mainWindow = window;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.registerHotkeys();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize hotkey manager:', error);
    }
  }

  async registerHotkeys() {
    try {
      // Clear existing hotkeys
      this.unregisterAllHotkeys();

      const settings = await storage.getSettings();
      if (!settings.hotkeys?.enabled) {
        return;
      }

      const { hotkeys } = settings;

      // Register focus window hotkey
      if (hotkeys.focusWindow.enabled) {
        this.registerHotkey(hotkeys.focusWindow.key, () => {
          this.focusWindow();
        });
      }

      // Register quick clip hotkeys
      const quickClipHotkeys = [
        { config: hotkeys.quickClip1, index: 0 },
        { config: hotkeys.quickClip2, index: 1 },
        { config: hotkeys.quickClip3, index: 2 },
        { config: hotkeys.quickClip4, index: 3 },
        { config: hotkeys.quickClip5, index: 4 },
      ];

      for (const { config, index } of quickClipHotkeys) {
        if (config.enabled) {
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

      // Import clipboard at runtime to avoid circular dependencies
      const { clipboard } = require('electron');

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
          // For images, we need to handle them differently
          // For now, just copy the text representation
          clipboard.writeText(clipToCopy.clip.content);
          break;
        default:
          clipboard.writeText(clipToCopy.clip.content);
      }

      console.log(`Copied clip ${index + 1} to clipboard`);

      // Optional: Show a brief notification or update tray
      this.showQuickClipNotification(index + 1);
    } catch (error) {
      console.error(`Error copying quick clip ${index}:`, error);
    }
  }

  private showQuickClipNotification(clipNumber: number) {
    // You could show a native notification here if desired
    // For now, we'll just log it
    console.log(`Quick clip ${clipNumber} copied to clipboard`);
  }

  async onSettingsChanged() {
    if (!this.isInitialized) return;

    try {
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
