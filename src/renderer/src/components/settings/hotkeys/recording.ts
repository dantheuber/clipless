import { keyPlatform } from './display';

/**
 * Turning key events into an accelerator (spec 15.6). Held modifiers echo as they are
 * pressed; the first non-modifier key completes the combination; a press without Ctrl
 * (Cmd), Shift or Alt is refused. Pure, so the Recorder's rules are testable without a
 * DOM.
 */

export interface KeyPress {
  key: string;
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta', 'OS', 'AltGraph', 'Super']);

export function isModifierPress(press: Pick<KeyPress, 'key'>): boolean {
  return MODIFIER_KEYS.has(press.key);
}

/**
 * The modifiers held, as Electron names them. Ctrl on Windows and Linux and Cmd on macOS
 * both store as CommandOrControl, so a recorded shortcut reads the same on every platform.
 */
export function modifiersOf(press: KeyPress, platform: string): string[] {
  const mac = keyPlatform(platform) === 'darwin';
  const mods: string[] = [];
  if (mac ? press.metaKey : press.ctrlKey) mods.push('CommandOrControl');
  if (mac && press.ctrlKey) mods.push('Control');
  if (!mac && press.metaKey) mods.push('Super');
  if (press.altKey) mods.push('Alt');
  if (press.shiftKey) mods.push('Shift');
  return mods;
}

/**
 * Global shortcuts need Ctrl (Cmd), Shift or Alt; Super alone does not count.
 */
export function hasRequiredModifier(mods: readonly string[]): boolean {
  return mods.some((m) => m === 'CommandOrControl' || m === 'Shift' || m === 'Alt');
}

const NAMED_KEYS: Record<string, string> = {
  ' ': 'Space',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Enter: 'Return',
  Escape: 'Escape',
  Backspace: 'Backspace',
  Delete: 'Delete',
  Insert: 'Insert',
  Tab: 'Tab',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  '+': 'Plus',
};

/**
 * The key part of the accelerator, or null for a modifier. Letters and digits come from
 * the physical key (code), so Shift+1 records as 1 and not as !.
 */
export function keyNameOf(press: KeyPress): string | null {
  if (isModifierPress(press)) return null;
  const letter = /^Key([A-Z])$/.exec(press.code);
  if (letter) return letter[1];
  const digit = /^Digit(\d)$/.exec(press.code);
  if (digit) return digit[1];
  const numpad = /^Numpad(\d)$/.exec(press.code);
  if (numpad) return `num${numpad[1]}`;
  if (NAMED_KEYS[press.key]) return NAMED_KEYS[press.key];
  if (/^F\d{1,2}$/.test(press.key)) return press.key;
  if (press.key.length === 1) return press.key.toUpperCase();
  return press.key;
}

export function buildAccelerator(mods: readonly string[], key: string): string {
  return [...mods, key].join('+');
}
