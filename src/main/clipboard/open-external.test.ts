import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockOpenExternal = vi.fn().mockResolvedValue(undefined);
vi.mock('electron', () => ({
  shell: { openExternal: (url: string) => mockOpenExternal(url) },
}));

import { allowedExternalUrls, openExternalUrls } from './open-external';

describe('allowedExternalUrls', () => {
  it('keeps http and https and drops every other scheme and non-URL', () => {
    expect(
      allowedExternalUrls([
        'https://example.com/a?q=1',
        'http://example.com/b',
        'file:///etc/passwd',
        'javascript:alert(1)',
        'mailto:a@b.co',
        'not a url',
        42,
        null,
      ])
    ).toEqual(['https://example.com/a?q=1', 'http://example.com/b']);
  });

  it('returns nothing for a non-array', () => {
    expect(allowedExternalUrls('https://example.com')).toEqual([]);
    expect(allowedExternalUrls(undefined)).toEqual([]);
  });
});

describe('openExternalUrls', () => {
  beforeEach(() => {
    mockOpenExternal.mockClear();
  });

  it('opens the allowed URLs in order and returns the count', async () => {
    const count = await openExternalUrls([
      'https://one.example',
      'ftp://skip.example',
      'https://two.example',
    ]);
    expect(count).toBe(2);
    expect(mockOpenExternal.mock.calls.map((c) => c[0])).toEqual([
      'https://one.example',
      'https://two.example',
    ]);
  });

  it('opens nothing for an empty list', async () => {
    expect(await openExternalUrls([])).toBe(0);
    expect(mockOpenExternal).not.toHaveBeenCalled();
  });
});
