/**
 * Types and interfaces for the hotkey system
 */

export interface HotkeyCallbackMap {
  focusWindow: () => void;
  quickClip: (index: number) => void;
  openToolsLauncher: () => void;
  searchClips: () => void;
}

export interface RegisteredHotkey {
  accelerator: string;
  callback: () => void;
  type: 'focusWindow' | 'quickClip' | 'openToolsLauncher' | 'searchClips';
  index?: number; // For quick clip hotkeys
}

export interface HotkeyRegistryState {
  isInitialized: boolean;
  currentHotkeys: Set<string>;
}
