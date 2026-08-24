import { describe, expect, it } from 'vitest';
import { templateReadiness } from './readiness';
import { scanText } from './scan';
import { ipTerm, ticketTerm } from './readiness-test-fixtures';

export function registerTemplateReadinessCases(): void {
  describe('templateReadiness', () => {
    it('is ready when every named token has a pinned value, using the first pinned', () => {
      const result = templateReadiness(
        { content: 'ip {ip} ticket {ticket}' },
        { ip: ['203.0.113.42', '203.0.113.7'], ticket: ['OPS-1'] }
      );
      expect(result).toEqual({
        kind: 'ready',
        values: { ip: '203.0.113.42', ticket: 'OPS-1' },
        counts: { ip: 2, ticket: 1 },
      });
    });

    it('names the missing tokens when not ready', () => {
      const result = templateReadiness({ content: '{ip} {ticket} {user}' }, { ip: ['1.1.1.1'] });
      expect(result.kind).toBe('needs');
      if (result.kind !== 'needs') return;
      expect(result.missing).toEqual(['ticket', 'user']);
      expect(result.pins).toBeNull();
      expect(result.lacking).toEqual(['ticket', 'user']);
    });

    it('offers pins from the open clip when it has every missing token', () => {
      const scan = scanText('OPS-12 then OPS-99 from 1.1.1.1', [ipTerm, ticketTerm]);
      const result = templateReadiness({ content: '{ip} {ticket}' }, {}, scan);
      expect(result).toEqual({
        kind: 'needs',
        missing: ['ip', 'ticket'],
        pins: ['ip|1.1.1.1', 'ticket|OPS-12'],
        lacking: [],
      });
    });

    it('names only the tokens the open clip lacks when it cannot fill them all', () => {
      const scan = scanText('OPS-12 only', [ipTerm, ticketTerm]);
      const result = templateReadiness({ content: '{ip} {ticket}' }, {}, scan);
      expect(result).toEqual({
        kind: 'needs',
        missing: ['ip', 'ticket'],
        pins: null,
        lacking: ['ip'],
      });
    });

    it('counts pinned tokens as present even when the clip lacks them', () => {
      const scan = scanText('OPS-12', [ipTerm, ticketTerm]);
      const result = templateReadiness({ content: '{ip} {ticket}' }, { ip: ['1.1.1.1'] }, scan);
      expect(result).toEqual({
        kind: 'needs',
        missing: ['ticket'],
        pins: ['ticket|OPS-12'],
        lacking: [],
      });
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
      const result = templateReadiness({ content: '{c1} for {ip}' }, { ip: ['1.1.1.1'] });
      expect(result.kind).toBe('ready');
    });

    it('ignores empty pinned values', () => {
      expect(templateReadiness({ content: '{ip}' }, { ip: [''] }).kind).toBe('needs');
    });

    it('reports first of N counts for the toast', () => {
      const result = templateReadiness({ content: '{ip}' }, { ip: ['a', 'b', 'c'] });
      expect(result).toMatchObject({ kind: 'ready', counts: { ip: 3 } });
    });
  });
}
