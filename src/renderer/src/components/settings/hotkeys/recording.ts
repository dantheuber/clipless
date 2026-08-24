import { keyPlatform } from './display';

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
