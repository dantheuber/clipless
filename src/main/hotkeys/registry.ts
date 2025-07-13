import { globalShortcut } from 'electron';
import type { HotkeyRegistryState } from './types';

/**
 * Handles low-level hotkey registration and unregistration
 */
export class HotkeyRegistry {
  private state: HotkeyRegistryState = {
    isInitialized: false,
    currentHotkeys: new Set(),
  };

  get isInitialized(): boolean {
    return this.state.isInitialized;
  }

  setInitialized(value: boolean): void {
    this.state.isInitialized = value;
  }

  /**
   * Register a single hotkey with the system
   */
  registerHotkey(accelerator: string, callback: () => void): boolean {
    try {
      // Check if hotkey is already registered
      if (this.state.currentHotkeys.has(accelerator)) {
        console.warn(`Hotkey ${accelerator} is already registered`);
        return false;
      }

      const success = globalShortcut.register(accelerator, callback);
      if (success) {
        this.state.currentHotkeys.add(accelerator);
        console.log(`Registered hotkey: ${accelerator}`);
        return true;
      } else {
        console.warn(`Failed to register hotkey: ${accelerator}`);
        return false;
      }
    } catch (error) {
      console.error(`Error registering hotkey ${accelerator}:`, error);
      return false;
    }
  }

  /**
   * Unregister all currently registered hotkeys
   */
  unregisterAllHotkeys(): void {
    this.state.currentHotkeys.forEach((accelerator) => {
      try {
        globalShortcut.unregister(accelerator);
      } catch (error) {
        console.error(`Error unregistering hotkey ${accelerator}:`, error);
      }
    });
    this.state.currentHotkeys.clear();
  }

  /**
   * Get the list of currently registered hotkey accelerators
   */
  getCurrentHotkeys(): string[] {
    return Array.from(this.state.currentHotkeys);
  }

  /**
   * Check if a specific hotkey is currently registered
   */
  isHotkeyRegistered(accelerator: string): boolean {
    return this.state.currentHotkeys.has(accelerator);
  }

  /**
   * Clean up all hotkeys on shutdown
   */
  cleanup(): void {
    this.unregisterAllHotkeys();
    this.state.isInitialized = false;
  }
}
