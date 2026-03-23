import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('electron', () => ({
  clipboard: {
    readText: vi.fn().mockReturnValue(''),
    readHTML: vi.fn().mockReturnValue(''),
    readRTF: vi.fn().mockReturnValue(''),
    readImage: vi.fn().mockReturnValue({
      isEmpty: () => true,
      toDataURL: () => '',
      getSize: () => ({ width: 0, height: 0 }),
      toBitmap: () => Buffer.from(''),
    }),
    readBookmark: vi.fn().mockReturnValue({ title: '', url: '' }),
    writeText: vi.fn(),
    writeHTML: vi.fn(),
    writeRTF: vi.fn(),
    writeImage: vi.fn(),
    write: vi.fn(),
  },
  nativeImage: {
    createFromDataURL: vi.fn().mockReturnValue({
      isEmpty: () => false,
      toDataURL: () => 'data:image/png;base64,test',
    }),
  },
}));

import {
  getCurrentClipboardData,
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
  clearImageCache,
} from './data';

function createMockImage(
  empty: boolean,
  dataUrl = '',
  width = 0,
  height = 0
): Electron.NativeImage {
  return {
    isEmpty: () => empty,
    toDataURL: () => dataUrl,
    getSize: () => ({ width, height }),
    toBitmap: () => Buffer.from('mock-bitmap-data-for-testing'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}
import { clipboard, nativeImage } from 'electron';

describe('getCurrentClipboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearImageCache();
    vi.mocked(clipboard.readText).mockReturnValue('');
    vi.mocked(clipboard.readRTF).mockReturnValue('');
    vi.mocked(clipboard.readHTML).mockReturnValue('');
    vi.mocked(clipboard.readImage).mockReturnValue(createMockImage(true));
    vi.mocked(clipboard.readBookmark).mockReturnValue({ title: '', url: '' });
  });

  it('returns text type when text is available', () => {
    vi.mocked(clipboard.readText).mockReturnValue('hello');
    const result = getCurrentClipboardData();
    expect(result).toEqual({ type: 'text', content: 'hello' });
  });

  it('returns rtf type when only RTF is available', () => {
    vi.mocked(clipboard.readRTF).mockReturnValue('{\\rtf1 hello}');
    const result = getCurrentClipboardData();
    expect(result).toEqual({ type: 'rtf', content: '{\\rtf1 hello}' });
  });

  it('returns html type when only HTML is available', () => {
    vi.mocked(clipboard.readHTML).mockReturnValue('<p>hello</p>');
    const result = getCurrentClipboardData();
    expect(result).toEqual({ type: 'html', content: '<p>hello</p>' });
  });

  it('returns image type when only image is available', () => {
    vi.mocked(clipboard.readImage).mockReturnValue(
      createMockImage(false, 'data:image/png;base64,abc', 100, 100)
    );
    const result = getCurrentClipboardData();
    expect(result).toEqual({ type: 'image', content: 'data:image/png;base64,abc' });
  });

  it('caches image data URL and skips toDataURL on unchanged image', () => {
    const toDataURL = vi.fn().mockReturnValue('data:image/png;base64,abc');
    const mockImage = {
      isEmpty: () => false,
      toDataURL,
      getSize: () => ({ width: 100, height: 100 }),
      toBitmap: () => Buffer.from('same-bitmap-data'),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(clipboard.readImage).mockReturnValue(mockImage as any);

    // First call — should call toDataURL
    getCurrentClipboardData();
    expect(toDataURL).toHaveBeenCalledTimes(1);

    // Second call with same image — should NOT call toDataURL again
    getCurrentClipboardData();
    expect(toDataURL).toHaveBeenCalledTimes(1);
  });

  it('calls toDataURL when image fingerprint changes', () => {
    const toDataURL1 = vi.fn().mockReturnValue('data:image/png;base64,first');
    const mockImage1 = {
      isEmpty: () => false,
      toDataURL: toDataURL1,
      getSize: () => ({ width: 100, height: 100 }),
      toBitmap: () => Buffer.from('bitmap-data-1'),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(clipboard.readImage).mockReturnValue(mockImage1 as any);
    const result1 = getCurrentClipboardData();
    expect(result1?.content).toBe('data:image/png;base64,first');

    // Different image
    const toDataURL2 = vi.fn().mockReturnValue('data:image/png;base64,second');
    const mockImage2 = {
      isEmpty: () => false,
      toDataURL: toDataURL2,
      getSize: () => ({ width: 200, height: 200 }),
      toBitmap: () => Buffer.from('bitmap-data-2'),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(clipboard.readImage).mockReturnValue(mockImage2 as any);
    const result2 = getCurrentClipboardData();
    expect(result2?.content).toBe('data:image/png;base64,second');
    expect(toDataURL2).toHaveBeenCalledTimes(1);
  });

  it('returns bookmark type when only bookmark is available', () => {
    vi.mocked(clipboard.readBookmark).mockReturnValue({
      title: 'Example',
      url: 'https://example.com',
    });
    const result = getCurrentClipboardData();
    expect(result).toEqual({
      type: 'bookmark',
      content: JSON.stringify({ title: 'Example', url: 'https://example.com' }),
    });
  });

  it('returns null when readBookmark throws', () => {
    vi.mocked(clipboard.readBookmark).mockImplementation(() => {
      throw new Error('not supported');
    });
    const result = getCurrentClipboardData();
    expect(result).toBeNull();
  });

  it('returns null when clipboard is empty', () => {
    const result = getCurrentClipboardData();
    expect(result).toBeNull();
  });

  it('prioritizes text over other types', () => {
    vi.mocked(clipboard.readText).mockReturnValue('text');
    vi.mocked(clipboard.readHTML).mockReturnValue('<p>html</p>');
    const result = getCurrentClipboardData();
    expect(result?.type).toBe('text');
  });
});

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
