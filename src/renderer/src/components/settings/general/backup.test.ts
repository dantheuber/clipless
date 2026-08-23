import { describe, it, expect, vi, afterEach } from 'vitest';
import { backupFileName, downloadText, formatBytes, readFileText, summarizeBackup } from './backup';

describe('summarizeBackup', () => {
  it('counts what a backup holds', () => {
    const text = JSON.stringify({
      clips: [{ isLocked: true }, { isLocked: false }, {}],
      settings: { maxClips: 50, hotkeys: { enabled: true, focusWindow: {}, quickLook: {} } },
      searchTerms: [{}, {}],
      quickTools: [{}],
      templates: [],
    });
    expect(summarizeBackup(text)).toEqual({
      summary: {
        clips: 3,
        locked: 1,
        settings: true,
        shortcuts: 2,
        terms: 2,
        tools: 1,
        templates: 0,
      },
    });
  });

  it('copes with a backup that has only settings, or no hotkeys', () => {
    expect(summarizeBackup(JSON.stringify({ settings: { maxClips: 1 } }))).toEqual({
      summary: {
        clips: 0,
        locked: 0,
        settings: true,
        shortcuts: 0,
        terms: 0,
        tools: 0,
        templates: 0,
      },
    });
    expect(summarizeBackup(JSON.stringify({ clips: [] }))).toMatchObject({
      summary: { settings: false, shortcuts: 0 },
    });
  });

  it('says why a file cannot be read', () => {
    expect(summarizeBackup('nope')).toEqual({ error: 'Not a JSON file.' });
    expect(summarizeBackup('[]')).toMatchObject({
      error: expect.stringMatching(/expected an object/),
    });
    expect(summarizeBackup('null')).toMatchObject({
      error: expect.stringMatching(/expected an object/),
    });
    expect(summarizeBackup('{"x":1}')).toMatchObject({
      error: expect.stringMatching(/neither clips/),
    });
  });
});

describe('readFileText', () => {
  it('uses Blob.text when present and a FileReader otherwise', async () => {
    const withText = new File(['abc'], 'a.json');
    Object.defineProperty(withText, 'text', { value: async () => 'abc' });
    await expect(readFileText(withText)).resolves.toBe('abc');
    const plain = new File(['def'], 'b.json');
    Object.defineProperty(plain, 'text', { value: undefined });
    await expect(readFileText(plain)).resolves.toBe('def');
  });

  it('rejects when the reader fails, and reads an empty result as empty text', async () => {
    class FakeReader {
      result: string | null = null;
      error: Error | null = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsText(file: File) {
        if (file.name === 'bad') {
          this.error = file.size > 0 ? new Error('unreadable') : null;
          this.onerror?.();
        } else {
          this.onload?.();
        }
      }
    }
    vi.stubGlobal('FileReader', FakeReader);
    const plain = (name: string, body: string[]) => {
      const f = new File(body, name);
      Object.defineProperty(f, 'text', { value: undefined });
      return f;
    };
    await expect(readFileText(plain('bad', ['x']))).rejects.toThrow('unreadable');
    await expect(readFileText(plain('bad', []))).rejects.toThrow('could not read the file');
    await expect(readFileText(plain('empty', []))).resolves.toBe('');
    vi.unstubAllGlobals();
  });
});

describe('backupFileName', () => {
  it('carries the date', () => {
    expect(backupFileName(new Date('2026-08-22T10:00:00Z'))).toBe(
      'clipless-backup-2026-08-22.json'
    );
  });
});

describe('formatBytes', () => {
  it('reads as KB below a megabyte and MB above', () => {
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(217088)).toBe('212 KB');
    expect(formatBytes(3 * 1048576)).toBe('3.0 MB');
  });
});

describe('downloadText', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('clicks a download link and reports the size', () => {
    const createObjectURL = vi.fn(() => 'blob:x');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    expect(downloadText('a.json', '{"a":1}')).toBe(7);
    expect(click).toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:x');
    vi.unstubAllGlobals();
  });
});
