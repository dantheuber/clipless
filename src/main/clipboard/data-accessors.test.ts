import { describe, it, expect, vi } from 'vitest';
vi.mock('electron', () => import('../__mocks__/electron.js'));
import { clipboard, nativeImage } from 'electron';
import {
  getClipboardText,
  getClipboardHTML,
  getClipboardRTF,
  getClipboardImage,
  getClipboardBookmark,
  setClipboardText,
  setClipboardHTML,
  setClipboardRTF,
  setClipboardImage,
  setClipboardBookmark,
} from './data';
import { createMockImage } from './data-test-fixtures';

describe('getClipboardText', () => {
  it('returns clipboard text', () => {
    vi.mocked(clipboard.readText).mockReturnValue('test');
    expect(getClipboardText()).toBe('test');
  });
});

describe('setClipboardText', () => {
  it('writes text to clipboard', () => {
    setClipboardText('hello');
    expect(clipboard.writeText).toHaveBeenCalledWith('hello');
  });
});

describe('setClipboardImage', () => {
  it('converts data URL and writes image', () => {
    setClipboardImage('data:image/png;base64,test');
    expect(nativeImage.createFromDataURL).toHaveBeenCalledWith('data:image/png;base64,test');
    expect(clipboard.writeImage).toHaveBeenCalled();
  });
});

describe('getClipboardHTML', () => {
  it('returns clipboard HTML', () => {
    vi.mocked(clipboard.readHTML).mockReturnValue('<p>test</p>');
    expect(getClipboardHTML()).toBe('<p>test</p>');
  });
});

describe('getClipboardRTF', () => {
  it('returns clipboard RTF', () => {
    vi.mocked(clipboard.readRTF).mockReturnValue('{\\rtf1 test}');
    expect(getClipboardRTF()).toBe('{\\rtf1 test}');
  });
});

describe('getClipboardImage', () => {
  it('returns data URL when image exists', () => {
    vi.mocked(clipboard.readImage).mockReturnValue(
      createMockImage(false, 'data:image/png;base64,abc', 100, 100)
    );
    expect(getClipboardImage()).toBe('data:image/png;base64,abc');
  });

  it('returns null when no image', () => {
    vi.mocked(clipboard.readImage).mockReturnValue(createMockImage(true));
    expect(getClipboardImage()).toBeNull();
  });
});

describe('getClipboardBookmark', () => {
  it('returns bookmark when available', () => {
    vi.mocked(clipboard.readBookmark).mockReturnValue({ title: 'Test', url: 'https://test.com' });
    expect(getClipboardBookmark()).toEqual({ title: 'Test', url: 'https://test.com' });
  });

  it('returns null when readBookmark throws', () => {
    vi.mocked(clipboard.readBookmark).mockImplementation(() => {
      throw new Error('not supported');
    });
    expect(getClipboardBookmark()).toBeNull();
  });
});

describe('setClipboardHTML', () => {
  it('writes HTML to clipboard', () => {
    setClipboardHTML('<p>hello</p>');
    expect(clipboard.writeHTML).toHaveBeenCalledWith('<p>hello</p>');
  });
});

describe('setClipboardRTF', () => {
  it('writes RTF to clipboard', () => {
    setClipboardRTF('{\\rtf1 hello}');
    expect(clipboard.writeRTF).toHaveBeenCalledWith('{\\rtf1 hello}');
  });
});

describe('setClipboardImage', () => {
  it('throws when createFromDataURL fails', () => {
    vi.mocked(nativeImage.createFromDataURL).mockImplementation(() => {
      throw new Error('invalid image');
    });
    expect(() => setClipboardImage('bad-data')).toThrow('invalid image');
  });
});

describe('setClipboardBookmark', () => {
  it('writes bookmark data', () => {
    setClipboardBookmark({
      text: 'Example',
      html: '<a>Example</a>',
      title: 'Ex',
      url: 'https://example.com',
    });
    expect(clipboard.write).toHaveBeenCalledWith({ text: 'Example', html: '<a>Example</a>' });
  });

  it('throws when clipboard.write fails', () => {
    vi.mocked(clipboard.write).mockImplementation(() => {
      throw new Error('write failed');
    });
    expect(() => setClipboardBookmark({ text: 'a', html: '<a>a</a>' })).toThrow('write failed');
  });
});
