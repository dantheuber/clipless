import { describe, it, expect } from 'vitest';
import {
  buildAccelerator,
  hasRequiredModifier,
  isModifierPress,
  keyNameOf,
  modifiersOf,
  type KeyPress,
} from './recording';

const press = (over: Partial<KeyPress>): KeyPress => ({
  key: 'a',
  code: 'KeyA',
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  ...over,
});

describe('modifiersOf', () => {
  it('stores Ctrl and Cmd as CommandOrControl per platform', () => {
    expect(modifiersOf(press({ ctrlKey: true, shiftKey: true }), 'linux')).toEqual([
      'CommandOrControl',
      'Shift',
    ]);
    expect(modifiersOf(press({ metaKey: true, shiftKey: true }), 'darwin')).toEqual([
      'CommandOrControl',
      'Shift',
    ]);
    expect(modifiersOf(press({ ctrlKey: true }), 'darwin')).toEqual(['Control']);
    expect(modifiersOf(press({ metaKey: true }), 'win32')).toEqual(['Super']);
    expect(modifiersOf(press({ altKey: true, ctrlKey: true }), 'win32')).toEqual([
      'CommandOrControl',
      'Alt',
    ]);
  });
});

describe('hasRequiredModifier', () => {
  it('wants Ctrl, Shift or Alt; Super alone is not enough', () => {
    expect(hasRequiredModifier(['Shift'])).toBe(true);
    expect(hasRequiredModifier(['Alt'])).toBe(true);
    expect(hasRequiredModifier(['CommandOrControl'])).toBe(true);
    expect(hasRequiredModifier(['Super'])).toBe(false);
    expect(hasRequiredModifier(['Control'])).toBe(false);
    expect(hasRequiredModifier([])).toBe(false);
  });
});

describe('keyNameOf', () => {
  it('is null for a modifier press', () => {
    expect(isModifierPress({ key: 'Shift' })).toBe(true);
    expect(keyNameOf(press({ key: 'Control', code: 'ControlLeft' }))).toBeNull();
    expect(keyNameOf(press({ key: 'Meta', code: 'MetaLeft' }))).toBeNull();
  });

  it('reads letters and digits from the physical key', () => {
    expect(keyNameOf(press({ key: '!', code: 'Digit1', shiftKey: true }))).toBe('1');
    expect(keyNameOf(press({ key: 'A', code: 'KeyA', shiftKey: true }))).toBe('A');
    expect(keyNameOf(press({ key: '5', code: 'Numpad5' }))).toBe('num5');
  });

  it('names the special keys as Electron spells them', () => {
    expect(keyNameOf(press({ key: ' ', code: 'Space' }))).toBe('Space');
    expect(keyNameOf(press({ key: 'ArrowLeft', code: 'ArrowLeft' }))).toBe('Left');
    expect(keyNameOf(press({ key: 'Enter', code: 'Enter' }))).toBe('Return');
    expect(keyNameOf(press({ key: 'F5', code: 'F5' }))).toBe('F5');
    expect(keyNameOf(press({ key: '+', code: 'Equal' }))).toBe('Plus');
    expect(keyNameOf(press({ key: 'ü', code: 'Unidentified' }))).toBe('Ü');
    expect(keyNameOf(press({ key: 'MediaPlayPause', code: '' }))).toBe('MediaPlayPause');
  });
});

describe('buildAccelerator', () => {
  it('joins the modifiers and the key with plus', () => {
    expect(buildAccelerator(['CommandOrControl', 'Shift'], 'V')).toBe('CommandOrControl+Shift+V');
  });
});
