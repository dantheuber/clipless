import { describe, it, expect } from 'vitest';
import { rtfToText } from './extract-rtf';

describe('rtfToText', () => {
  it('extracts plain text and drops formatting control words', () => {
    const rtf = '{\\rtf1\\ansi\\deff0 {\\b Invoice} \\i0 is\\i0  overdue.}';
    expect(rtfToText(rtf)).toBe('Invoice is overdue.');
  });

  it('maps par and line to newlines and tab to a tab', () => {
    const rtf = '{\\rtf1 first\\par second\\line third\\tab fourth}';
    expect(rtfToText(rtf)).toBe('first\nsecond\nthird\tfourth');
  });

  it("decodes \\'hh through the default code page", () => {
    expect(rtfToText("{\\rtf1 caf\\'e9 \\'a9 2026}")).toBe('café © 2026');
  });

  it("decodes \\'hh through the document code page", () => {
    // 0xE0 is à in cp1252 but а (Cyrillic a) in cp1251
    expect(rtfToText("{\\rtf1\\ansi\\ansicpg1251 \\'e0}")).toBe('а');
    expect(rtfToText("{\\rtf1\\ansi\\ansicpg1252 \\'e0}")).toBe('à');
  });

  it('decodes multibyte sequences through a double-byte code page', () => {
    // Shift_JIS bytes for 日本
    expect(rtfToText("{\\rtf1\\ansicpg932 \\'93\\'fa\\'96\\'7b}")).toBe('日本');
  });

  it('falls back to cp1252 for an unknown code page', () => {
    expect(rtfToText("{\\rtf1\\ansicpg99999 caf\\'e9}")).toBe('café');
  });

  it('falls back to cp1252 for a code page the runtime cannot decode', () => {
    // 437 is in the table but no WHATWG decoder exists for it
    expect(rtfToText("{\\rtf1\\ansicpg437 caf\\'e9}")).toBe('café');
  });

  it('maps the remaining symbol and break control words', () => {
    expect(rtfToText('{\\rtf1 a\\endash b\\ldblquote c\\rdblquote d\\sect e\\page f}')).toBe(
      'a–b“c”d\ne\nf'
    );
  });

  it('ignores control words whose parameter is missing', () => {
    expect(rtfToText('{\\rtf1\\ansicpg\\uc\\u\\bin\\bin0 x}')).toBe('x');
  });

  it('drops breaks emitted inside a skipped group', () => {
    expect(rtfToText('{\\rtf1 {\\info one\\par two} three}')).toBe('three');
  });

  it('decodes \\uN and skips the fallback characters that follow it', () => {
    expect(rtfToText('{\\rtf1\\uc1 \\u8212? dash}')).toBe('— dash');
    expect(rtfToText("{\\rtf1\\uc2 \\u26085\\'93\\'fa x}")).toBe('日 x');
    // The one space after a control word is its delimiter, not text
    expect(rtfToText('{\\rtf1\\uc0 \\u26085 x}')).toBe('日x');
    expect(rtfToText('{\\rtf1\\uc0 \\u26085  x}')).toBe('日 x');
  });

  it('treats a negative \\uN as a code point above 32767', () => {
    expect(rtfToText('{\\rtf1\\uc1 \\u-26591?}')).toBe('\u9821');
  });

  it('scopes \\uc to its group', () => {
    expect(rtfToText('{\\rtf1\\uc1 {\\uc2 \\u8212??}\\u8211? end}')).toBe('—– end');
  });

  it('skips the font, colour and style tables and the info group', () => {
    const rtf =
      '{\\rtf1\\ansi{\\fonttbl{\\f0\\fswiss Helvetica;}{\\f1 Courier;}}' +
      '{\\colortbl;\\red255\\green0\\blue0;}{\\stylesheet{\\s0 Normal;}}' +
      '{\\info{\\title Secret title}{\\author Nobody}}\\f0\\fs24 visible text}';
    expect(rtfToText(rtf)).toBe('visible text');
  });

  it('skips pictures and ignorable destinations', () => {
    const rtf =
      '{\\rtf1 before {\\pict\\pngblip 89504e470d0a1a0a} middle {\\*\\generator Riched20} after}';
    expect(rtfToText(rtf)).toBe('before middle after');
  });

  it('restores the skip state when a skipped group closes inside a kept group', () => {
    const rtf = '{\\rtf1 a {\\b b {\\*\\hidden gone} c} d}';
    expect(rtfToText(rtf)).toBe('a b c d');
  });

  it('keeps text from nested formatting groups', () => {
    expect(rtfToText('{\\rtf1 {\\b bold {\\i and italic} still bold} plain}')).toBe(
      'bold and italic still bold plain'
    );
  });

  it('unescapes braces and backslashes and maps the symbol control words (nbsp collapses to a space)', () => {
    expect(
      rtfToText('{\\rtf1 \\{x\\} \\\\ a\\~b c\\_d \\emdash \\lquote q\\rquote \\bullet}')
    ).toBe('{x} \\ a b c\u2011d \u2014\u2018q\u2019\u2022');
  });

  it('ignores raw line breaks in the source and treats an escaped one as a paragraph', () => {
    expect(rtfToText('{\\rtf1 one\r\ntwo\\\nthree}')).toBe('onetwo\nthree');
  });

  it('skips binary data after \\bin', () => {
    expect(rtfToText('{\\rtf1 a\\bin3 xyzb}')).toBe('ab');
  });

  it('handles table rows and cells', () => {
    expect(rtfToText('{\\rtf1 \\trowd a\\cell b\\cell \\row c\\cell d\\cell \\row}')).toBe(
      'a\tb\nc\td'
    );
  });

  it('survives malformed input: stray closers, a trailing backslash, unknown symbols', () => {
    expect(rtfToText('}}{\\rtf1 ok\\*\\')).toBe('ok');
    expect(rtfToText("{\\rtf1 \\'zz x}")).toBe('x');
    expect(rtfToText('')).toBe('');
  });

  it('collapses whitespace inside a line and drops empty lines', () => {
    expect(rtfToText('{\\rtf1   a   b \\par \\par c }')).toBe('a b\nc');
  });
});
