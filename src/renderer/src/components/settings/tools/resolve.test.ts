import { describe, it, expect } from 'vitest';
import { buildToolUrls } from '../../../../../shared/tools';
import { resolveTemplate, resolveToolUrls, segmentsText, tokenise } from './resolve';

const values = {
  ip: ['203.0.113.42', '198.51.100.7'],
  email: ['m@example.com'],
  url: ['https://a.example/x?y=1'],
  ticket: [],
};

describe('tokenise', () => {
  it('splits text and tokens, flagging positional ones', () => {
    expect(tokenise('a {ip} b {c1}{x|y}')).toEqual([
      { kind: 'text', text: 'a ' },
      { kind: 'token', token: '{ip}', groups: ['ip'], positional: false },
      { kind: 'text', text: ' b ' },
      { kind: 'token', token: '{c1}', groups: ['c1'], positional: true },
      { kind: 'token', token: '{x|y}', groups: ['x', 'y'], positional: false },
    ]);
    expect(tokenise('')).toEqual([]);
    expect(tokenise('{}')).toEqual([{ kind: 'text', text: '{}' }]);
  });
});

describe('resolveToolUrls', () => {
  const urls = [
    'https://vt.example/ip/{ip}',
    'https://x.example/{ip}/{email}',
    'https://x.example/{ip}/{ip}',
    'https://x.example/{ip|email}',
    'https://x.example/{email|ip}?again={ip}',
    'https://open.example/{url}',
    'https://none.example/{ticket}',
    'https://plain.example/',
    'https://x.example/{user}',
  ];

  it('yields the same URLs, in the same order, as buildToolUrls', () => {
    for (const url of urls) {
      const expected = buildToolUrls({ url }, values);
      const got = resolveToolUrls(url, values).map(segmentsText);
      expect(got, url).toEqual(expected);
    }
  });

  it('keeps the group on every substituted value', () => {
    const [first] = resolveToolUrls('https://x.example/{ip}/{email}', values);
    expect(first).toEqual([
      { kind: 'text', text: 'https://x.example/' },
      { kind: 'value', group: 'ip', value: '203.0.113.42' },
      { kind: 'text', text: '/' },
      { kind: 'value', group: 'email', value: 'm%40example.com' },
    ]);
  });

  it('names the group that supplied a pipe token', () => {
    const rows = resolveToolUrls('https://x.example/{email|ip}', values);
    expect(rows.map((r) => (r[1] as { group: string }).group)).toEqual(['email', 'ip', 'ip']);
  });
});

describe('resolveToolUrls edge cases', () => {
  it('skips empty values and de-duplicates URLs that resolve the same', () => {
    expect(resolveToolUrls('https://x/{ip}', { ip: ['', '1.1.1.1'] }).map(segmentsText)).toEqual([
      'https://x/1.1.1.1',
    ]);
    const same = resolveToolUrls('https://x/{url|ip}', { url: ['a%20b'], ip: ['a b'] });
    expect(same.map(segmentsText)).toEqual(['https://x/a%20b']);
    expect(buildToolUrls({ url: 'https://x/{url|ip}' }, { url: ['a%20b'], ip: ['a b'] })).toEqual([
      'https://x/a%20b',
    ]);
  });

  it('segmentsText keeps unresolved tokens as written', () => {
    expect(segmentsText(tokenise('a {ip} b'))).toBe('a {ip} b');
  });
});

describe('resolveTemplate', () => {
  it('fills the first value per token and leaves the rest as tokens', () => {
    expect(resolveTemplate('IP {ip} for {email} ref {c1} needs {ticket}', values)).toEqual([
      { kind: 'text', text: 'IP ' },
      { kind: 'value', group: 'ip', value: '203.0.113.42' },
      { kind: 'text', text: ' for ' },
      { kind: 'value', group: 'email', value: 'm@example.com' },
      { kind: 'text', text: ' ref ' },
      { kind: 'token', token: '{c1}', groups: ['c1'], positional: true },
      { kind: 'text', text: ' needs ' },
      { kind: 'token', token: '{ticket}', groups: ['ticket'], positional: false },
    ]);
    expect(segmentsText(resolveTemplate('x {ip}', values))).toBe('x 203.0.113.42');
  });
});
