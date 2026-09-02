import { describe, it, expect } from 'vitest';
import { toolTokens, toolReady, buildToolUrls, hasWebScheme } from './tools';

const tool = (url: string) => ({ url });

describe('toolTokens', () => {
  it('returns an empty list for a URL without tokens', () => {
    expect(toolTokens('https://example.com/page')).toEqual([]);
  });

  it('splits pipe tokens into alternatives and trims them', () => {
    expect(toolTokens('https://x/{email| domain }/{ip}')).toEqual([
      { token: '{email| domain }', groups: ['email', 'domain'] },
      { token: '{ip}', groups: ['ip'] },
    ]);
  });

  it('lists a repeated token once', () => {
    expect(toolTokens('https://x/{ip}/{ip}')).toHaveLength(1);
  });

  it('drops empty alternatives', () => {
    expect(toolTokens('{a||b}')[0].groups).toEqual(['a', 'b']);
  });
});

describe('toolReady', () => {
  it('is ready when every token has a pinned value', () => {
    expect(toolReady(tool('https://x/{ip}/{email}'), { ip: ['1.1.1.1'], email: ['a@b.co'] })).toBe(
      true
    );
  });

  it('is not ready when any token lacks a value', () => {
    expect(toolReady(tool('https://x/{ip}/{email}'), { ip: ['1.1.1.1'] })).toBe(false);
    expect(toolReady(tool('https://x/{ip}'), { ip: [] })).toBe(false);
    expect(toolReady(tool('https://x/{ip}'), {})).toBe(false);
  });

  it('treats an empty string as no value', () => {
    expect(toolReady(tool('https://x/{email}'), { email: [''] })).toBe(false);
  });

  it('is ready for a pipe token when any one alternative is pinned', () => {
    expect(toolReady(tool('https://x?q={email|phone}'), { phone: ['555'] })).toBe(true);
    expect(toolReady(tool('https://x?q={email|phone}'), { email: ['a@b.co'] })).toBe(true);
    expect(toolReady(tool('https://x?q={email|phone}'), { domain: ['b.co'] })).toBe(false);
  });

  it('is always ready without tokens', () => {
    expect(toolReady(tool('https://example.com'), {})).toBe(true);
  });
});

describe('buildToolUrls', () => {
  it('replaces a token with the encoded capture value', () => {
    expect(
      buildToolUrls(tool('https://google.com/search?q={email}'), { email: ['test@example.com'] })
    ).toEqual(['https://google.com/search?q=test%40example.com']);
  });

  it('opens nothing when no pinned group matches the token', () => {
    expect(buildToolUrls(tool('https://example.com/{phone}'), { email: ['a@b.co'] })).toEqual([]);
  });

  it('opens the URL as-is when it has no tokens', () => {
    expect(buildToolUrls(tool('https://example.com/page'), { email: ['a@b.co'] })).toEqual([
      'https://example.com/page',
    ]);
  });

  it('uses a url capture directly when the tool URL is just the {url} token', () => {
    expect(buildToolUrls(tool('{url}'), { url: ['https://detected.com'] })).toEqual([
      'https://detected.com',
    ]);
  });

  it('fills several tokens', () => {
    expect(
      buildToolUrls(tool('https://example.com/{name}/{email}'), {
        name: ['John'],
        email: ['john@test.com'],
      })
    ).toEqual(['https://example.com/John/john%40test.com']);
  });

  it('opens nothing when one token has no value', () => {
    expect(buildToolUrls(tool('https://example.com/{missing}'), { email: ['a@b.co'] })).toEqual([]);
  });

  it('opens one tab per pinned value across the alternatives of a pipe token', () => {
    expect(
      buildToolUrls(tool('https://example.com/search?q={email|phone}'), {
        email: ['test@example.com'],
        phone: ['555-1234'],
      })
    ).toEqual([
      'https://example.com/search?q=test%40example.com',
      'https://example.com/search?q=555-1234',
    ]);
  });

  it('generates every combination for multi-value multi-token URLs', () => {
    const urls = buildToolUrls(tool('https://example.com/{a|b}/{c|d}'), {
      a: ['v1'],
      b: ['v2'],
      c: ['v3'],
      d: ['v4'],
    });
    expect(urls).toHaveLength(4);
    expect(urls).toEqual([
      'https://example.com/v1/v3',
      'https://example.com/v1/v4',
      'https://example.com/v2/v3',
      'https://example.com/v2/v4',
    ]);
  });

  it('reports the exact tab count for several pins in one group', () => {
    const urls = buildToolUrls(tool('https://who.is/{ip}'), {
      ip: ['1.1.1.1', '2.2.2.2', '3.3.3.3'],
    });
    expect(urls).toHaveLength(3);
  });

  it('does not encode url-group values inside a compound URL', () => {
    expect(
      buildToolUrls(tool('https://redirect.com?target={url}'), {
        url: ['https://example.com/path?q=1'],
      })
    ).toEqual(['https://redirect.com?target=https://example.com/path?q=1']);
  });

  it('treats an empty capture value as missing', () => {
    expect(buildToolUrls(tool('https://example.com/{email}'), { email: [''] })).toEqual([]);
  });

  it('substitutes a url-group value alongside other tokens', () => {
    expect(
      buildToolUrls(tool('https://proxy.com/{url}/{name}'), {
        url: ['https://example.com'],
        name: ['test'],
      })
    ).toEqual(['https://proxy.com/https://example.com/test']);
  });

  it('encodes a value from a non-url alternative even in a pipe token with url', () => {
    expect(
      buildToolUrls(tool('https://x?t={url|domain}'), {
        url: ['https://a.com/?x=1'],
        domain: ['b.com/path'],
      })
    ).toEqual(['https://x?t=https://a.com/?x=1', 'https://x?t=b.com%2Fpath']);
  });

  it('fills every occurrence of a repeated token', () => {
    expect(buildToolUrls(tool('https://x/{ip}?again={ip}'), { ip: ['1.1.1.1'] })).toEqual([
      'https://x/1.1.1.1?again=1.1.1.1',
    ]);
  });

  it('de-duplicates URLs that come out the same', () => {
    expect(
      buildToolUrls(tool('https://x?q={email|phone}'), {
        email: ['same'],
        phone: ['same'],
      })
    ).toEqual(['https://x?q=same']);
  });

  it('keeps the tab count equal to the URL list length', () => {
    const pins = { ip: ['1.1.1.1', '2.2.2.2'], email: ['a@b.co'] };
    const urls = buildToolUrls(tool('https://x/{ip}/{email}'), pins);
    expect(urls).toHaveLength(2);
  });
});

describe('hasWebScheme', () => {
  it('accepts http and https in any case, ignoring surrounding whitespace', () => {
    expect(hasWebScheme('https://example.com/{email}')).toBe(true);
    expect(hasWebScheme('http://example.com')).toBe(true);
    expect(hasWebScheme('  HTTPS://example.com ')).toBe(true);
  });

  it('rejects a schemeless template and every other scheme', () => {
    expect(hasWebScheme('example.com/{email}')).toBe(false);
    expect(hasWebScheme('www.example.com')).toBe(false);
    expect(hasWebScheme('ftp://example.com')).toBe(false);
    expect(hasWebScheme('file:///etc/hosts')).toBe(false);
    expect(hasWebScheme('javascript:alert(1)')).toBe(false);
    expect(hasWebScheme('https:/example.com')).toBe(false);
    expect(hasWebScheme('')).toBe(false);
  });
});
