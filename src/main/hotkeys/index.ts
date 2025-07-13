/**
 * Hotkeys module - Provides modular hotkey management
 *
 * This module replaces the monolithic hotkeys.ts file with a more focused,
 * maintainable structure:
 *
 * - registry.ts: Low-level hotkey registration/unregistration
 * - actions.ts: Action handlers (window focus, clip copying)
 * - manager.ts: Main coordinator class
 * - types.ts: Type definitions
 */

export { HotkeyManager } from './manager';
export { HotkeyRegistry } from './registry';
export { HotkeyActions } from './actions';
export type { HotkeyCallbackMap, RegisteredHotkey, HotkeyRegistryState } from './types';

// Create and export the singleton instance
import { HotkeyManager } from './manager';
export const hotkeyManager = new HotkeyManager();
