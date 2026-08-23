import { describe, it, expect } from 'vitest';
import { scanText, valuesByGroup, isLargeText, LARGE_CLIP_THRESHOLD } from './scan';

const ip = { id: 'ip', pattern: '(?<ip>\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b)', enabled: true };
const email = { id: 'email', pattern: '(?<email>[\\w.]+@[\\w.]+\\.\\w+)', enabled: true };

describe('scanText', () => {
  it('returns positions from the d flag for every named group', () => {
    const text = 'host 10.0.0.1 mail ops@example.com';
    const { matches } = scanText(text, [ip, email]);
    expect(matches).toEqual([
      { group: 'ip', value: '10.0.0.1', start: 5, end: 13, termId: 'ip' },
      { group: 'email', value: 'ops@example.com', start: 19, end: 34, termId: 'email' },
    ]);
    for (const m of matches) expect(text.slice(m.start, m.end)).toBe(m.value);
  });

  it('sorts matches by start regardless of term order', () => {
    const text = 'ops@example.com then 10.0.0.1';
    const { matches } = scanText(text, [ip, email]);
    expect(matches.map((m) => m.group)).toEqual(['email', 'ip']);
  });

  it('lists groups in order of first appearance', () => {
    const text = 'a@b.co 1.1.1.1 c@d.co 2.2.2.2';
    expect(scanText(text, [ip, email]).groups).toEqual(['email', 'ip']);
    expect(scanText('1.1.1.1 a@b.co', [ip, email]).groups).toEqual(['ip', 'email']);
  });

  it('keeps overlapping matches from different terms', () => {
    const url = { id: 'url', pattern: '(?<url>https?://(?<domain>[\\w.-]+)\\S*)', enabled: true };
    const domain = { id: 'domain', pattern: '(?<host>[\\w-]+\\.example\\.org)', enabled: true };
    const { matches, groups } = scanText('see https://docs.example.org/x', [url, domain]);
    expect(matches.map((m) => [m.group, m.value])).toEqual([
      ['url', 'https://docs.example.org/x'],
      ['domain', 'docs.example.org'],
      ['host', 'docs.example.org'],
    ]);
    expect(groups).toEqual(['url', 'domain', 'host']);
  });

  it('finds every occurrence, not only the first', () => {
    const { matches } = scanText('1.1.1.1 and 1.1.1.1 and 2.2.2.2', [ip]);
    expect(matches.map((m) => m.start)).toEqual([0, 12, 24]);
  });

  it('skips disabled terms', () => {
    const { matches } = scanText('10.0.0.1 a@b.co', [{ ...ip, enabled: false }, email]);
    expect(matches.map((m) => m.group)).toEqual(['email']);
  });

  it('treats a term without the enabled flag as enabled', () => {
    const { matches } = scanText('10.0.0.1', [{ id: 'x', pattern: ip.pattern }]);
    expect(matches).toHaveLength(1);
  });

  it('reports a bad pattern and skips it, and keeps the other terms', () => {
    const bad = { id: 'bad', pattern: '(?<oops>[', enabled: true };
    const result = scanText('10.0.0.1', [bad, ip]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].termId).toBe('bad');
    expect(result.errors[0].message).toMatch(/Invalid regular expression/);
    expect(result.matches.map((m) => m.group)).toEqual(['ip']);
  });

  it('reports the same bad pattern again on a later scan (the error is cached, not lost)', () => {
    const bad = { id: 'bad', pattern: '(?<oops>[', enabled: true };
    scanText('x', [bad]);
    expect(scanText('y', [bad]).errors).toHaveLength(1);
  });

  it('cannot loop on a pattern that matches the empty string', () => {
    const empty = { id: 'e', pattern: '(?<z>a*)', enabled: true };
    const { matches } = scanText('bbb aa b', [empty]);
    expect(matches).toEqual([{ group: 'z', value: 'aa', start: 4, end: 6, termId: 'e' }]);
  });

  it('drops a match whose named group matched nothing', () => {
    const optional = { id: 'o', pattern: 'x(?<tail>y?)', enabled: true };
    expect(scanText('x xy', [optional]).matches).toEqual([
      { group: 'tail', value: 'y', start: 3, end: 4, termId: 'o' },
    ]);
  });

  it('ignores a term with no named groups', () => {
    expect(scanText('10.0.0.1', [{ id: 'n', pattern: '\\d+' }]).matches).toEqual([]);
  });

  it('ignores an unmatched optional named group', () => {
    const t = { id: 'o', pattern: '(?<a>a)|(?<b>b)', enabled: true };
    expect(scanText('b', [t]).matches).toEqual([
      { group: 'b', value: 'b', start: 0, end: 1, termId: 'o' },
    ]);
  });

  it('flags text above the 256 KB threshold', () => {
    const small = scanText('10.0.0.1', [ip]);
    expect(small.large).toBe(false);
    const big = 'x'.repeat(LARGE_CLIP_THRESHOLD + 1);
    expect(isLargeText(big)).toBe(true);
    expect(scanText(big, [ip]).large).toBe(true);
    expect(isLargeText('x'.repeat(LARGE_CLIP_THRESHOLD))).toBe(false);
  });

  it('returns an empty result for empty text', () => {
    expect(scanText('', [ip, email])).toEqual({
      matches: [],
      groups: [],
      errors: [],
      large: false,
    });
  });
});

describe('valuesByGroup', () => {
  it('lists distinct values per group in order of first appearance', () => {
    const scan = scanText('1.1.1.1 a@b.co 1.1.1.1 2.2.2.2', [ip, email]);
    expect(valuesByGroup(scan)).toEqual({
      ip: ['1.1.1.1', '2.2.2.2'],
      email: ['a@b.co'],
    });
  });
});
