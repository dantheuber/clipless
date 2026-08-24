import { BrowserWindow } from 'electron';
import { storage } from '../storage';
import { DEFAULT_HOTKEY_SETTINGS } from '../storage/defaults';
import { HotkeyRegistry } from './registry';
import { HotkeyActions } from './actions';
import type { UserSettings } from '../../shared/types';

export interface HotkeyRegistrationResult {
  ok: boolean;
  failed: string[];
}

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

  async registerHotkeys(): Promise<HotkeyRegistrationResult> {
    const failed: string[] = [];
    try {
      this.registry.unregisterAllHotkeys();

      const settings = await storage.getSettings();
      console.log('Hotkey Manager: Loaded settings:', JSON.stringify(settings.hotkeys, null, 2));

      if (!settings.hotkeys?.enabled) {
        console.log('Hotkey Manager: Hotkeys are disabled in settings');
        return { ok: true, failed };
      }

      const { hotkeys } = settings;
      console.log('Hotkey Manager: Registering hotkeys...');

      this.registerFocusWindowHotkey(hotkeys, failed);

      this.registerQuickClipHotkeys(hotkeys, failed);

      this.registerQuickLookHotkey(hotkeys, failed);

      this.registerSearchHotkey(hotkeys, failed);
    } catch (error) {
      console.error('Failed to register hotkeys:', error);
      return { ok: false, failed };
    }
    return { ok: failed.length === 0, failed };
  }

  private register(accelerator: string, failed: string[], callback: () => void): void {
    if (!this.registry.registerHotkey(accelerator, callback)) {
      failed.push(accelerator);
    }
  }

  private registerFocusWindowHotkey(hotkeys: UserSettings['hotkeys'], failed: string[]): void {
    if (hotkeys?.focusWindow.enabled) {
      console.log(
        `Hotkey Manager: Attempting to register focus window hotkey: ${hotkeys.focusWindow.key}`
      );
      this.register(hotkeys.focusWindow.key, failed, () => {
        this.actions.focusWindow();
      });
    }
  }

  private registerQuickClipHotkeys(hotkeys: UserSettings['hotkeys'], failed: string[]): void {
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
        this.register(config.key, failed, () => {
          this.actions.copyQuickClip(index);
        });
      }
    }
  }

  private registerQuickLookHotkey(hotkeys: UserSettings['hotkeys'], failed: string[]): void {
    const quickLookConfig = hotkeys?.quickLook || DEFAULT_HOTKEY_SETTINGS.quickLook;

    if (quickLookConfig.enabled) {
      console.log(
        `Hotkey Manager: Attempting to register quick look hotkey: ${quickLookConfig.key}`
      );
      this.register(quickLookConfig.key, failed, () => {
        this.actions.quickLook();
      });
    }
  }

  private registerSearchHotkey(hotkeys: UserSettings['hotkeys'], failed: string[]): void {
    const searchConfig = hotkeys?.searchClips || {
      enabled: true,
      key: 'CommandOrControl+Shift+F',
    };

    if (searchConfig.enabled) {
      console.log(
        `Hotkey Manager: Attempting to register search clips hotkey: ${searchConfig.key}`
      );
      this.register(searchConfig.key, failed, () => {
        this.actions.toggleSearchBar();
      });
    }
  }

  async onSettingsChanged(): Promise<HotkeyRegistrationResult> {
    console.log(
      'Hotkey Manager: onSettingsChanged called, isInitialized:',
      this.registry.isInitialized
    );
    if (!this.registry.isInitialized) {
      console.log('Hotkey Manager: Not initialized yet, initializing now...');
      const result = await this.registerHotkeys();
      this.registry.setInitialized(true);
      return result;
    }

    try {
      console.log('Hotkey Manager: Re-registering hotkeys after settings change...');
      return await this.registerHotkeys();
    } catch (error) {
      console.error('Failed to update hotkeys after settings change:', error);
      return { ok: false, failed: [] };
    }
  }

  cleanup(): void {
    this.registry.cleanup();
  }

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
