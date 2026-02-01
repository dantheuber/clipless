import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('electron', () => ({
  clipboard: {
    readText: vi.fn().mockReturnValue(''),
    readHTML: vi.fn().mockReturnValue(''),
    readRTF: vi.fn().mockReturnValue(''),
    readImage: vi.fn().mockReturnValue({ isEmpty: () => true, toDataURL: () => '' }),
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
  setClipboardText,
  setClipboardImage,
  setClipboardBookmark,
} from './data';
import { clipboard, nativeImage } from 'electron';

describe('getCurrentClipboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(clipboard.readText).mockReturnValue('');
    vi.mocked(clipboard.readRTF).mockReturnValue('');
    vi.mocked(clipboard.readHTML).mockReturnValue('');
    vi.mocked(clipboard.readImage).mockReturnValue({
      isEmpty: () => true,
      toDataURL: () => '',
    } as any);
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
    vi.mocked(clipboard.readImage).mockReturnValue({
      isEmpty: () => false,
      toDataURL: () => 'data:image/png;base64,abc',
    } as any);
    const result = getCurrentClipboardData();
    expect(result).toEqual({ type: 'image', content: 'data:image/png;base64,abc' });
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
});
