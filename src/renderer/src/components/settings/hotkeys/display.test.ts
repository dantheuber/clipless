import { describe, it, expect } from 'vitest';
import { displayAccelerator, displayKeys, isModifierName, keyPlatform } from './display';

const RAW = ['CommandOrControl', 'CmdOrCtrl', 'Command', 'Control', 'Option', 'Meta'];

describe('displayKeys', () => {
  it('names every modifier per platform', () => {
    const cases: [string, Record<string, string[]>][] = [
      [
        'CommandOrControl+Shift+V',
        {
          linux: ['Ctrl', 'Shift', 'V'],
          win32: ['Ctrl', 'Shift', 'V'],
          darwin: ['Cmd', 'Shift', 'V'],
        },
      ],
      ['CmdOrCtrl+1', { linux: ['Ctrl', '1'], win32: ['Ctrl', '1'], darwin: ['Cmd', '1'] }],
      ['Alt+F4', { linux: ['Alt', 'F4'], win32: ['Alt', 'F4'], darwin: ['Opt', 'F4'] }],
      [
        'Option+Space',
        { linux: ['Alt', 'Space'], win32: ['Alt', 'Space'], darwin: ['Opt', 'Space'] },
      ],
      ['Control+Up', { linux: ['Ctrl', 'Up'], win32: ['Ctrl', 'Up'], darwin: ['Ctrl', 'Up'] }],
      ['Command+Q', { linux: ['Cmd', 'Q'], win32: ['Cmd', 'Q'], darwin: ['Cmd', 'Q'] }],
      ['Super+Tab', { linux: ['Super', 'Tab'], win32: ['Win', 'Tab'], darwin: ['Cmd', 'Tab'] }],
      [
        'Meta+AltGr+Escape',
        {
          linux: ['Super', 'AltGr', 'Esc'],
          win32: ['Win', 'AltGr', 'Esc'],
          darwin: ['Cmd', 'AltGr', 'Esc'],
        },
      ],
    ];
    for (const [accelerator, expected] of cases) {
      for (const [platform, keys] of Object.entries(expected)) {
        expect(displayKeys(accelerator, platform), `${accelerator} on ${platform}`).toEqual(keys);
      }
    }
  });

  it('never shows the raw modifier spellings', () => {
    for (const platform of ['linux', 'win32', 'darwin']) {
      for (const raw of RAW) {
        const shown = displayAccelerator(`${raw}+Shift+K`, platform);
        expect(shown).not.toContain(raw);
        expect(shown.toLowerCase()).not.toContain('commandorcontrol');
      }
    }
  });

  it('names the keys: letters upper case, named keys short, function keys as they are', () => {
    expect(displayKeys('ctrl+a', 'linux')).toEqual(['Ctrl', 'A']);
    expect(displayKeys('Shift+Return', 'linux')).toEqual(['Shift', 'Enter']);
    expect(displayKeys('Shift+Plus', 'linux')).toEqual(['Shift', '+']);
    expect(displayKeys('Ctrl+PageDown', 'linux')).toEqual(['Ctrl', 'PgDn']);
    expect(displayKeys('Ctrl+f12', 'linux')).toEqual(['Ctrl', 'F12']);
    expect(displayKeys('Ctrl+num5', 'linux')).toEqual(['Ctrl', 'num5']);
    expect(displayKeys('Ctrl+printscreen', 'win32')).toEqual(['Ctrl', 'PrtSc']);
    expect(displayKeys('Ctrl+mediaplaypause', 'win32')).toEqual(['Ctrl', 'Mediaplaypause']);
  });

  it('copes with empty and odd input', () => {
    expect(displayKeys('', 'linux')).toEqual([]);
    expect(displayKeys('Ctrl++V', 'linux')).toEqual(['Ctrl', 'V']);
    expect(displayAccelerator(' Shift + x ', 'darwin')).toBe('Shift+X');
  });
});

describe('keyPlatform', () => {
  it('folds every other platform into linux', () => {
    expect(keyPlatform('darwin')).toBe('darwin');
    expect(keyPlatform('win32')).toBe('win32');
    expect(keyPlatform('freebsd')).toBe('linux');
  });
});

describe('isModifierName', () => {
  it('knows the modifiers and nothing else', () => {
    expect(isModifierName('Shift')).toBe(true);
    expect(isModifierName('commandorcontrol')).toBe(true);
    expect(isModifierName('V')).toBe(false);
  });
});
