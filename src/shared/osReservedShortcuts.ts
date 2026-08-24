export type ReservedPlatform = 'darwin' | 'win32' | 'linux';

export interface ReservedShortcut {
  accelerator: string;
  why: string;
}

const MODIFIER_ORDER = ['Command', 'Control', 'Alt', 'Shift', 'Super'];

const MODIFIER_ALIASES: Record<string, string> = {
  cmd: 'Command',
  command: 'Command',
  ctrl: 'Control',
  control: 'Control',
  alt: 'Alt',
  option: 'Alt',
  shift: 'Shift',
  super: 'Super',
  meta: 'Super',
};

export function normalizeAccelerator(accelerator: string, platform: ReservedPlatform): string {
  const parts = accelerator
    .split('+')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  const modifiers: string[] = [];
  let key = '';
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === 'commandorcontrol' || lower === 'cmdorctrl') {
      modifiers.push(platform === 'darwin' ? 'Command' : 'Control');
    } else if (MODIFIER_ALIASES[lower]) {
      modifiers.push(MODIFIER_ALIASES[lower]);
    } else {
      key =
        part.length === 1
          ? part.toUpperCase()
          : part[0].toUpperCase() + part.slice(1).toLowerCase();
    }
  }
  const unique = MODIFIER_ORDER.filter((m) => modifiers.includes(m));
  return [...unique, key].filter((p) => p.length > 0).join('+');
}

export const OS_RESERVED_SHORTCUTS: Record<ReservedPlatform, ReservedShortcut[]> = {
  darwin: [
    { accelerator: 'Command+Shift+3', why: 'macOS takes a screenshot of the screen' },
    { accelerator: 'Command+Shift+4', why: 'macOS takes a screenshot of a selection' },
    { accelerator: 'Command+Shift+5', why: 'macOS opens the screenshot controls' },
    { accelerator: 'Command+Space', why: 'macOS opens Spotlight' },
    { accelerator: 'Command+Tab', why: 'macOS switches apps' },
    { accelerator: 'Command+Q', why: 'macOS quits the active app' },
    { accelerator: 'Command+H', why: 'macOS hides the active app' },
    { accelerator: 'Command+Alt+Escape', why: 'macOS opens Force Quit' },
    { accelerator: 'Command+Shift+Q', why: 'macOS logs out' },
    { accelerator: 'Command+Control+Q', why: 'macOS locks the screen' },
    { accelerator: 'Control+Up', why: 'macOS opens Mission Control' },
    { accelerator: 'Control+Down', why: 'macOS shows the app windows' },
    { accelerator: 'Control+Left', why: 'macOS moves to the previous space' },
    { accelerator: 'Control+Right', why: 'macOS moves to the next space' },
  ],
  win32: [
    { accelerator: 'Control+Alt+Delete', why: 'Windows opens the security screen' },
    { accelerator: 'Control+Shift+Escape', why: 'Windows opens Task Manager' },
    { accelerator: 'Control+Escape', why: 'Windows opens the Start menu' },
    { accelerator: 'Alt+Tab', why: 'Windows switches windows' },
    { accelerator: 'Alt+F4', why: 'Windows closes the active window' },
    { accelerator: 'Alt+Escape', why: 'Windows cycles windows' },
  ],
  linux: [
    { accelerator: 'Control+Alt+Delete', why: 'most desktops log out or reboot' },
    { accelerator: 'Control+Alt+T', why: 'GNOME and Ubuntu open a terminal' },
    { accelerator: 'Alt+Tab', why: 'the desktop switches windows' },
    { accelerator: 'Alt+F2', why: 'GNOME and KDE open the run dialog' },
    { accelerator: 'Alt+F4', why: 'the desktop closes the active window' },
    { accelerator: 'Control+Alt+Left', why: 'the desktop switches workspace' },
    { accelerator: 'Control+Alt+Right', why: 'the desktop switches workspace' },
    { accelerator: 'Control+Alt+Up', why: 'the desktop switches workspace' },
    { accelerator: 'Control+Alt+Down', why: 'the desktop switches workspace' },
  ],
};

export function osReservedReason(accelerator: string, platform: ReservedPlatform): string | null {
  const normalized = normalizeAccelerator(accelerator, platform);
  if (normalized.length === 0) return null;
  if (platform !== 'darwin' && normalized.split('+').includes('Super')) {
    return platform === 'win32'
      ? 'the Windows key belongs to the system'
      : 'the Super key belongs to the desktop';
  }
  const hit = OS_RESERVED_SHORTCUTS[platform].find(
    (entry) => normalizeAccelerator(entry.accelerator, platform) === normalized
  );
  return hit ? hit.why : null;
}
