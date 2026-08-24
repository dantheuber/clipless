import { globalShortcut } from 'electron';
import type { HotkeyRegistryState } from './types';

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

  registerHotkey(accelerator: string, callback: () => void): boolean {
    try {
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

  getCurrentHotkeys(): string[] {
    return Array.from(this.state.currentHotkeys);
  }

  isHotkeyRegistered(accelerator: string): boolean {
    return this.state.currentHotkeys.has(accelerator);
  }

  cleanup(): void {
    this.unregisterAllHotkeys();
    this.state.isInitialized = false;
  }
}
