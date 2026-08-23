/**
 * Accelerator to platform key names (spec 15.6): Ctrl, Alt and Shift on Windows and
 * Linux; Cmd, Opt and Shift on macOS. Keys are stored as Electron accelerators and this is
 * the one function that turns them into something shown; the raw string never is.
 */

export type KeyPlatform = 'darwin' | 'win32' | 'linux';

export function keyPlatform(platform: string): KeyPlatform {
  return platform === 'darwin' || platform === 'win32' ? platform : 'linux';
}

const MODIFIERS: Record<string, Record<KeyPlatform, string>> = {
  commandorcontrol: { darwin: 'Cmd', win32: 'Ctrl', linux: 'Ctrl' },
  cmdorctrl: { darwin: 'Cmd', win32: 'Ctrl', linux: 'Ctrl' },
  command: { darwin: 'Cmd', win32: 'Cmd', linux: 'Cmd' },
  cmd: { darwin: 'Cmd', win32: 'Cmd', linux: 'Cmd' },
  control: { darwin: 'Ctrl', win32: 'Ctrl', linux: 'Ctrl' },
  ctrl: { darwin: 'Ctrl', win32: 'Ctrl', linux: 'Ctrl' },
  alt: { darwin: 'Opt', win32: 'Alt', linux: 'Alt' },
  option: { darwin: 'Opt', win32: 'Alt', linux: 'Alt' },
  altgr: { darwin: 'AltGr', win32: 'AltGr', linux: 'AltGr' },
  shift: { darwin: 'Shift', win32: 'Shift', linux: 'Shift' },
  super: { darwin: 'Cmd', win32: 'Win', linux: 'Super' },
  meta: { darwin: 'Cmd', win32: 'Win', linux: 'Super' },
};

const KEYS: Record<string, string> = {
  space: 'Space',
  escape: 'Esc',
  esc: 'Esc',
  return: 'Enter',
  enter: 'Enter',
  tab: 'Tab',
  backspace: 'Backspace',
  delete: 'Del',
  insert: 'Ins',
  up: 'Up',
  down: 'Down',
  left: 'Left',
  right: 'Right',
  home: 'Home',
  end: 'End',
  pageup: 'PgUp',
  pagedown: 'PgDn',
  plus: '+',
  printscreen: 'PrtSc',
  capslock: 'CapsLock',
  numlock: 'NumLock',
  scrolllock: 'ScrollLock',
};

export function isModifierName(part: string): boolean {
  return part.toLowerCase() in MODIFIERS;
}

/**
 * The parts of an accelerator as shown, in order: modifiers first as the platform names
 * them, then the key.
 */
export function displayKeys(accelerator: string, platform: string): string[] {
  const target = keyPlatform(platform);
  const parts = accelerator
    .split('+')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  return parts.map((part) => {
    const lower = part.toLowerCase();
    if (MODIFIERS[lower]) return MODIFIERS[lower][target];
    if (KEYS[lower]) return KEYS[lower];
    if (part.length === 1) return part.toUpperCase();
    if (/^f\d{1,2}$/i.test(part)) return part.toUpperCase();
    if (/^num/i.test(part)) return part;
    return part[0].toUpperCase() + part.slice(1);
  });
}

export function displayAccelerator(accelerator: string, platform: string): string {
  return displayKeys(accelerator, platform).join('+');
}
