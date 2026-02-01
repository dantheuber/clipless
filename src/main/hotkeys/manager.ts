import { BrowserWindow } from 'electron';
import { storage } from '../storage';
import { HotkeyRegistry } from './registry';
import { HotkeyActions } from './actions';
import type { UserSettings } from '../../shared/types';

/**
 * Main hotkey manager that coordinates registration and actions
 */
export class HotkeyManager {
  private registry = new HotkeyRegistry();
  private actions = new HotkeyActions();

  setMainWindow(window: BrowserWindow | null): void {
    this.actions.setMainWindow(window);
  }

  async initialize(): Promise<void> {
    console.log('Hotkey Manager: Initialize called');
    if (this.registry.isInitialized) {
      console.log('Hotkey Manager: Already initialized, skipping');
      return;
    }

    try {
      console.log('Hotkey Manager: Starting initialization...');
      await this.registerHotkeys();
      this.registry.setInitialized(true);
      console.log('Hotkey Manager: Initialization completed successfully');
    } catch (error) {
      console.error('Failed to initialize hotkey manager:', error);
    }
  }

  async registerHotkeys(): Promise<void> {
    try {
      // Clear existing hotkeys
      this.registry.unregisterAllHotkeys();

      const settings = await storage.getSettings();
      console.log('Hotkey Manager: Loaded settings:', JSON.stringify(settings.hotkeys, null, 2));

      if (!settings.hotkeys?.enabled) {
        console.log('Hotkey Manager: Hotkeys are disabled in settings');
        return;
      }

      const { hotkeys } = settings;
      console.log('Hotkey Manager: Registering hotkeys...');

      // Register focus window hotkey
      this.registerFocusWindowHotkey(hotkeys);

      // Register quick clip hotkeys
      this.registerQuickClipHotkeys(hotkeys);

      // Register tools launcher hotkey
      this.registerToolsLauncherHotkey(hotkeys);

      // Register search clips hotkey
      this.registerSearchHotkey(hotkeys);
    } catch (error) {
      console.error('Failed to register hotkeys:', error);
    }
  }

  private registerFocusWindowHotkey(hotkeys: UserSettings['hotkeys']): void {
    if (hotkeys?.focusWindow.enabled) {
      console.log(
        `Hotkey Manager: Attempting to register focus window hotkey: ${hotkeys.focusWindow.key}`
      );
      this.registry.registerHotkey(hotkeys.focusWindow.key, () => {
        this.actions.focusWindow();
      });
    }
  }

  private registerQuickClipHotkeys(hotkeys: UserSettings['hotkeys']): void {
    // Note: Quick clip hotkeys copy clips by their display number (1-5)
    if (!hotkeys) return;

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
        this.registry.registerHotkey(config.key, () => {
          this.actions.copyQuickClip(index);
        });
      }
    }
  }

  private registerToolsLauncherHotkey(hotkeys: UserSettings['hotkeys']): void {
    // Handle case where openToolsLauncher setting doesn't exist yet (new feature)
    const toolsLauncherConfig = hotkeys?.openToolsLauncher || {
      enabled: true,
      key: 'CommandOrControl+Shift+T',
    };

    if (toolsLauncherConfig.enabled) {
      console.log(
        `Hotkey Manager: Attempting to register tools launcher hotkey: ${toolsLauncherConfig.key}`
      );
      this.registry.registerHotkey(toolsLauncherConfig.key, () => {
        this.actions.openToolsLauncher();
      });
    }
  }

  private registerSearchHotkey(hotkeys: UserSettings['hotkeys']): void {
    const searchConfig = hotkeys?.searchClips || {
      enabled: true,
      key: 'CommandOrControl+Shift+F',
    };

    if (searchConfig.enabled) {
      console.log(
        `Hotkey Manager: Attempting to register search clips hotkey: ${searchConfig.key}`
      );
      this.registry.registerHotkey(searchConfig.key, () => {
        this.actions.toggleSearchBar();
      });
    }
  }

  async onSettingsChanged(): Promise<void> {
    console.log(
      'Hotkey Manager: onSettingsChanged called, isInitialized:',
      this.registry.isInitialized
    );
    if (!this.registry.isInitialized) {
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

  cleanup(): void {
    this.registry.cleanup();
  }

  // Expose registry methods for testing or advanced use cases
  getCurrentHotkeys(): string[] {
    return this.registry.getCurrentHotkeys();
  }

  isHotkeyRegistered(accelerator: string): boolean {
    return this.registry.isHotkeyRegistered(accelerator);
  }

  get isInitialized(): boolean {
    return this.registry.isInitialized;
  }
}
