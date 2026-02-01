import { describe, it, expect, vi } from 'vitest';

vi.mock('../storage', () => ({
  storage: {},
}));

import { validateToolUrl } from './quick-tools';

describe('validateToolUrl', () => {
  it('returns valid for a proper URL with matching capture groups', async () => {
    const result = await validateToolUrl('https://example.com/search?q={query}', ['query']);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns error for invalid URL format', async () => {
    const result = await validateToolUrl('not-a-url', []);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Invalid URL format');
  });

  it('returns error when URL token is not in capture groups list', async () => {
    const result = await validateToolUrl('https://example.com/{email}', ['phone']);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("'{email}'"))).toBe(true);
  });

  it('accepts URL with no tokens', async () => {
    const result = await validateToolUrl('https://example.com/page', []);
    expect(result.isValid).toBe(true);
  });

  it('validates multiple tokens', async () => {
    const result = await validateToolUrl('https://example.com/{name}/{email}', ['name', 'email']);
    expect(result.isValid).toBe(true);
  });

  it('reports all missing capture groups', async () => {
    const result = await validateToolUrl('https://example.com/{a}/{b}', []);
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(2);
  });
});
