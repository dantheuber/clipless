import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('electron', () => import('../__mocks__/electron.js'));
import { clipboard } from 'electron';
import { getCurrentClipboardData, clearImageCache } from './data';

import { createMockImage } from './data-test-fixtures';

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

    getCurrentClipboardData();
    expect(toDataURL).toHaveBeenCalledTimes(1);

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
