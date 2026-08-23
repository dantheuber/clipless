import { describe, it, expect } from 'vitest';
import {
  templateReadiness,
  configReadiness,
  sampleReadiness,
  readinessText,
  listTokens,
  patternGroups,
  producers,
  pinKey,
} from './readiness';
import { scanText } from './scan';

const term = (id: string, pattern: string, enabled = true) => ({
  id,
  name: id,
  pattern,
  enabled,
  createdAt: 0,
  updatedAt: 0,
  order: 0,
});
const ipTerm = term('ip', '(?<ip>\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b)');
const ticketTerm = term('ticket', '(?<ticket>[A-Z]{2,}-\\d+)');
const userTerm = term('user', '(?<user>@\\w+)', false);

describe('templateReadiness', () => {
  it('is ready when every named token has a pinned value, using the first pinned', () => {
    const r = templateReadiness(
      { content: 'ip {ip} ticket {ticket}' },
      {
        ip: ['203.0.113.42', '203.0.113.7'],
        ticket: ['OPS-1'],
      }
    );
    expect(r).toEqual({
      kind: 'ready',
      values: { ip: '203.0.113.42', ticket: 'OPS-1' },
      counts: { ip: 2, ticket: 1 },
    });
  });

  it('names the missing tokens when not ready', () => {
    const r = templateReadiness({ content: '{ip} {ticket} {user}' }, { ip: ['1.1.1.1'] });
    expect(r.kind).toBe('needs');
    if (r.kind !== 'needs') return;
    expect(r.missing).toEqual(['ticket', 'user']);
    expect(r.pins).toBeNull();
    expect(r.lacking).toEqual(['ticket', 'user']);
  });

  it('offers pins from the open clip when it has every missing token', () => {
    const scan = scanText('OPS-12 then OPS-99 from 1.1.1.1', [ipTerm, ticketTerm]);
    const r = templateReadiness({ content: '{ip} {ticket}' }, {}, scan);
    expect(r).toEqual({
      kind: 'needs',
      missing: ['ip', 'ticket'],
      pins: ['ip|1.1.1.1', 'ticket|OPS-12'],
      lacking: [],
    });
  });

  it('names only the tokens the open clip lacks when it cannot fill them all', () => {
    const scan = scanText('OPS-12 only', [ipTerm, ticketTerm]);
    const r = templateReadiness({ content: '{ip} {ticket}' }, {}, scan);
    expect(r).toEqual({ kind: 'needs', missing: ['ip', 'ticket'], pins: null, lacking: ['ip'] });
  });

  it('counts pinned tokens as present even when the clip lacks them', () => {
    const scan = scanText('OPS-12', [ipTerm, ticketTerm]);
    const r = templateReadiness({ content: '{ip} {ticket}' }, { ip: ['1.1.1.1'] }, scan);
    expect(r).toEqual({ kind: 'needs', missing: ['ticket'], pins: ['ticket|OPS-12'], lacking: [] });
  });

  it('calls a template with only positional tokens a clip template', () => {
    expect(templateReadiness({ content: 'Row one: {c1}, two: {c2}' }, {})).toEqual({
      kind: 'clip-template',
    });
    expect(templateReadiness({ content: 'no tokens at all' }, {})).toEqual({
      kind: 'clip-template',
    });
  });

  it('treats a template with named and positional tokens as match-driven', () => {
    const r = templateReadiness({ content: '{c1} for {ip}' }, { ip: ['1.1.1.1'] });
    expect(r.kind).toBe('ready');
  });

  it('ignores empty pinned values', () => {
    expect(templateReadiness({ content: '{ip}' }, { ip: [''] }).kind).toBe('needs');
  });

  it('reports first of N counts for the toast', () => {
    const r = templateReadiness({ content: '{ip}' }, { ip: ['a', 'b', 'c'] });
    expect(r).toMatchObject({ kind: 'ready', counts: { ip: 3 } });
  });
});

describe('pinKey', () => {
  it('joins group and value with a pipe', () => {
    expect(pinKey('ip', '1.1.1.1')).toBe('ip|1.1.1.1');
  });
});

describe('listTokens', () => {
  it('reads naturally for one, two and more tokens', () => {
    expect(listTokens([])).toBe('');
    expect(listTokens(['a'])).toBe('a');
    expect(listTokens(['a', 'b'])).toBe('a and b');
    expect(listTokens(['a', 'b', 'c'])).toBe('a, b and c');
  });
});

describe('patternGroups and producers', () => {
  it('lists the named groups of a pattern once each, in order', () => {
    expect(patternGroups('(?<url>https?://(?<domain>[^/]+))(?<url>x)?')).toEqual(['url', 'domain']);
    expect(patternGroups('no groups')).toEqual([]);
  });

  it('marks a group enabled when any producer is enabled', () => {
    const p = producers([userTerm, term('user2', '(?<user>x)', true), ipTerm]);
    expect(p.get('user')).toBe(true);
    expect(p.get('ip')).toBe(true);
    expect(p.has('ticket')).toBe(false);
  });
});

describe('configReadiness', () => {
  const terms = [ipTerm, ticketTerm, userTerm];

  it('is ok when every token has an enabled producer', () => {
    expect(configReadiness({ url: 'https://x/{ip}/{ticket}' }, terms)).toEqual({ level: 'ok' });
    expect(configReadiness({ content: 'hi {ip}' }, terms)).toEqual({ level: 'ok' });
  });

  it('is never ready for an orphan token', () => {
    expect(configReadiness({ url: 'https://x/{ip}/{account}' }, terms)).toEqual({
      level: 'never',
      tokens: ['account'],
    });
  });

  it('is disabled when every producer of a token is off', () => {
    expect(configReadiness({ content: '{user} on {ip}' }, terms)).toEqual({
      level: 'disabled',
      tokens: ['user'],
    });
  });

  it('reports never before disabled when both apply', () => {
    expect(configReadiness({ content: '{user} {nobody}' }, terms)).toEqual({
      level: 'never',
      tokens: ['nobody'],
    });
  });

  it('is fine with a pipe token when one alternative has an enabled producer', () => {
    expect(configReadiness({ url: 'https://x/{user|ip}' }, terms)).toEqual({ level: 'ok' });
    expect(configReadiness({ url: 'https://x/{user|nobody}' }, terms)).toEqual({
      level: 'disabled',
      tokens: ['user|nobody'],
    });
    expect(configReadiness({ url: 'https://x/{ghost|nobody}' }, terms)).toEqual({
      level: 'never',
      tokens: ['ghost|nobody'],
    });
  });

  it('is ok for a clip template and a tool without tokens', () => {
    expect(configReadiness({ content: '{c1}' }, terms)).toEqual({ level: 'ok' });
    expect(configReadiness({ url: 'https://x' }, [])).toEqual({ level: 'ok' });
  });
});

describe('sampleReadiness and readinessText', () => {
  const terms = [ipTerm, ticketTerm, userTerm];
  const sample = scanText('host 10.0.0.1 is fine', terms);

  it('gives the four wordings and never merges them', () => {
    expect(readinessText(sampleReadiness({ url: 'https://x/{nobody}' }, terms, sample))).toBe(
      'never ready'
    );
    expect(readinessText(sampleReadiness({ content: '{user}' }, terms, sample))).toBe(
      'needs user, producer disabled'
    );
    expect(readinessText(sampleReadiness({ content: '{ip} {ticket}' }, terms, sample))).toBe(
      'sample lacks ticket'
    );
    expect(readinessText(sampleReadiness({ content: '{ip}' }, terms, sample))).toBe(
      'ready on the sample'
    );
  });

  it('lists every token the sample lacks', () => {
    expect(sampleReadiness({ url: 'https://x/{ticket}/{ip}' }, terms, scanText('', terms))).toEqual(
      { level: 'sample', tokens: ['ticket', 'ip'] }
    );
  });

  it('accepts a pipe token when the sample has any alternative', () => {
    expect(sampleReadiness({ url: 'https://x/{ticket|ip}' }, terms, sample)).toEqual({
      level: 'ready',
    });
  });

  it('words config readiness on its own', () => {
    expect(readinessText({ level: 'ok' })).toBe('ready');
    expect(readinessText({ level: 'disabled', tokens: ['a', 'b'] })).toBe(
      'needs a and b, producer disabled'
    );
  });
});
