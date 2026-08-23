import { describe, it, expect } from 'vitest';
import { BUILTIN_PATTERNS } from './builtinPatterns';
import { scanText } from './scan';

const terms = BUILTIN_PATTERNS.map((p, i) => ({ id: `b${i}`, pattern: p.pattern, enabled: true }));

describe('BUILTIN_PATTERNS', () => {
  it('has eight entries that all compile', () => {
    expect(BUILTIN_PATTERNS).toHaveLength(8);
    for (const entry of BUILTIN_PATTERNS) {
      expect(() => new RegExp(entry.pattern, 'gd')).not.toThrow();
    }
  });

  it('uses the spec 3 group names', () => {
    const text = [
      'mail me at ops@example.com',
      'host 10.0.0.1 or fe80:0000:0000:0000:0000:0000:0000:0001',
      'see https://docs.example.org/guide and example.net',
      'call 555-123-4567',
      'mac 00:1a:2b:3c:4d:5e',
      'id 123e4567-e89b-12d3-a456-426614174000',
    ].join('\n');
    const { groups } = scanText(text, terms);
    expect(groups.sort()).toEqual(
      ['domain', 'email', 'guid', 'ip', 'ipv6', 'mac', 'phone', 'url'].sort()
    );
  });
});
