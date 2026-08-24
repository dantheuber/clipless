import { describe, it, expect } from 'vitest';
import type { HotkeySettings } from '../../../../../shared/types';
import {
  HOTKEY_ROWS,
  duplicateOf,
  findConflict,
  reservedReason,
  rowName,
  sameAccelerator,
  swapKeys,
} from './conflicts';
import { hotkeySettings } from './hotkeyFixtures';

const base: HotkeySettings = hotkeySettings(true);

describe('HOTKEY_ROWS', () => {
  it('lists the eight rows in spec order with the quick look row second', () => {
    expect(HOTKEY_ROWS.map((r) => r.id)).toEqual([
      'focusWindow',
      'quickLook',
      'searchClips',
      'quickClip1',
      'quickClip2',
      'quickClip3',
      'quickClip4',
      'quickClip5',
    ]);
    expect(rowName('quickLook')).toBe('Quick look on newest clip');
    expect(rowName('nope' as never)).toBe('nope');
  });
});

describe('findConflict', () => {
  it('finds the other row holding the combination, whatever its spelling', () => {
    expect(findConflict(base, 'focusWindow', 'CommandOrControl+Shift+1', 'linux')).toBe(
      'quickClip1'
    );
    expect(findConflict(base, 'focusWindow', 'Shift+Ctrl+1', 'linux')).toBe('quickClip1');
    expect(findConflict(base, 'focusWindow', 'Shift+Cmd+1', 'darwin')).toBe('quickClip1');
  });

  it('ignores the row itself and combinations nobody holds', () => {
    expect(findConflict(base, 'quickClip1', 'CommandOrControl+Shift+1', 'linux')).toBeNull();
    expect(findConflict(base, 'quickClip1', 'CommandOrControl+Shift+9', 'linux')).toBeNull();
  });

  it('does not confuse Cmd with Ctrl on macOS', () => {
    expect(sameAccelerator('Control+Shift+1', 'CommandOrControl+Shift+1', 'darwin')).toBe(false);
    expect(sameAccelerator('Control+Shift+1', 'CommandOrControl+Shift+1', 'win32')).toBe(true);
  });
});

describe('swapKeys', () => {
  it('writes both rows: this one takes the new key, the other takes the old one', () => {
    const next = swapKeys(base, 'focusWindow', 'quickClip1', 'CommandOrControl+Shift+1');
    expect(next.focusWindow.key).toBe('CommandOrControl+Shift+1');
    expect(next.quickClip1.key).toBe('CommandOrControl+Shift+V');
    expect(next.quickClip1.enabled).toBe(true);
    expect(next.quickClip2).toBe(base.quickClip2);
    expect(base.focusWindow.key).toBe('CommandOrControl+Shift+V');
  });
});

describe('duplicateOf', () => {
  it('flags both rows of a duplicate after an import', () => {
    const imported = { ...base, quickClip2: { enabled: true, key: 'Ctrl+Shift+1' } };
    expect(duplicateOf(imported, 'quickClip1', 'linux')).toBe('quickClip2');
    expect(duplicateOf(imported, 'quickClip2', 'linux')).toBe('quickClip1');
    expect(duplicateOf(imported, 'quickClip3', 'linux')).toBeNull();
  });
});

describe('reservedReason', () => {
  it('is advisory per platform', () => {
    expect(reservedReason('CommandOrControl+Shift+3', 'darwin')).toMatch(/screenshot/);
    expect(reservedReason('CommandOrControl+Shift+3', 'linux')).toBeNull();
    expect(reservedReason('Alt+F4', 'win32')).toMatch(/closes/);
    expect(reservedReason('Alt+F4', 'darwin')).toBeNull();
    expect(reservedReason('CommandOrControl+Shift+Escape', 'win32')).toMatch(/Task Manager/);
    expect(reservedReason('CommandOrControl+Shift+V', 'sunos')).toBeNull();
  });
});
