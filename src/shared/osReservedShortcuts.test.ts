import { describe, it, expect } from 'vitest';
import {
  normalizeAccelerator,
  osReservedReason,
  OS_RESERVED_SHORTCUTS,
} from './osReservedShortcuts';

describe('normalizeAccelerator', () => {
  it('resolves CommandOrControl per platform', () => {
    expect(normalizeAccelerator('CommandOrControl+Shift+T', 'darwin')).toBe('Command+Shift+T');
    expect(normalizeAccelerator('CmdOrCtrl+Shift+T', 'win32')).toBe('Control+Shift+T');
    expect(normalizeAccelerator('CommandOrControl+Shift+T', 'linux')).toBe('Control+Shift+T');
  });

  it('sorts modifiers, maps aliases and upper-cases single keys', () => {
    expect(normalizeAccelerator('shift+ctrl+t', 'win32')).toBe('Control+Shift+T');
    expect(normalizeAccelerator('Option+Cmd+Escape', 'darwin')).toBe('Command+Alt+Escape');
    expect(normalizeAccelerator('Meta+L', 'linux')).toBe('Super+L');
    expect(normalizeAccelerator('Control + Control + A', 'linux')).toBe('Control+A');
  });

  it('keeps multi-character keys as written', () => {
    expect(normalizeAccelerator('Control+Space', 'linux')).toBe('Control+Space');
  });

  it('returns an empty string for an empty accelerator', () => {
    expect(normalizeAccelerator('', 'linux')).toBe('');
    expect(normalizeAccelerator('+', 'linux')).toBe('');
  });
});

describe('osReservedReason', () => {
  it('flags the macOS screenshot keys on darwin only', () => {
    expect(osReservedReason('CommandOrControl+Shift+3', 'darwin')).toMatch(/screenshot/);
    expect(osReservedReason('CommandOrControl+Shift+4', 'darwin')).toMatch(/screenshot/);
    expect(osReservedReason('CommandOrControl+Shift+3', 'win32')).toBeNull();
    expect(osReservedReason('CommandOrControl+Shift+3', 'linux')).toBeNull();
  });

  it('matches case-insensitively and in any modifier order', () => {
    expect(osReservedReason('shift+control+escape', 'win32')).toMatch(/Task Manager/);
    expect(osReservedReason('alt+control+t', 'linux')).toMatch(/terminal/);
  });

  it('returns null for a combination the OS does not keep', () => {
    expect(osReservedReason('CommandOrControl+Shift+V', 'darwin')).toBeNull();
    expect(osReservedReason('CommandOrControl+Shift+V', 'win32')).toBeNull();
    expect(osReservedReason('CommandOrControl+Shift+V', 'linux')).toBeNull();
    expect(osReservedReason('', 'linux')).toBeNull();
  });

  it('treats every Super combination as reserved on Windows and Linux', () => {
    expect(osReservedReason('Super+L', 'win32')).toMatch(/Windows key/);
    expect(osReservedReason('Super+Shift+S', 'linux')).toMatch(/Super key/);
    expect(osReservedReason('Super+L', 'darwin')).toBeNull();
  });

  it('keeps every listed accelerator in normalised form', () => {
    for (const platform of ['darwin', 'win32', 'linux'] as const) {
      for (const entry of OS_RESERVED_SHORTCUTS[platform]) {
        expect(normalizeAccelerator(entry.accelerator, platform)).toBe(entry.accelerator);
        expect(osReservedReason(entry.accelerator, platform)).toBe(entry.why);
      }
    }
  });
});
