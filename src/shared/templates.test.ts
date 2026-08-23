import { describe, it, expect } from 'vitest';
import { extractTemplateTokens, generateTextFromTemplate } from './templates';

describe('extractTemplateTokens', () => {
  it('extracts positional tokens', () => {
    const result = extractTemplateTokens('Hello {c1}, meet {c2}');
    expect(result.positional).toEqual(['c1', 'c2']);
    expect(result.named).toEqual([]);
  });

  it('extracts named tokens', () => {
    const result = extractTemplateTokens('Dear {name}, your email is {email}');
    expect(result.positional).toEqual([]);
    expect(result.named).toEqual(['name', 'email']);
  });

  it('extracts both positional and named tokens', () => {
    const result = extractTemplateTokens('{c1} by {author}');
    expect(result.positional).toEqual(['c1']);
    expect(result.named).toEqual(['author']);
  });

  it('deduplicates tokens', () => {
    const result = extractTemplateTokens('{c1} and {c1} again');
    expect(result.positional).toEqual(['c1']);
  });

  it('deduplicates named tokens', () => {
    const result = extractTemplateTokens('{name} and {name} again');
    expect(result.named).toEqual(['name']);
  });

  it('returns empty arrays for no tokens', () => {
    const result = extractTemplateTokens('plain text');
    expect(result.positional).toEqual([]);
    expect(result.named).toEqual([]);
  });

  it('does not parse the pipe form', () => {
    expect(extractTemplateTokens('{a|b}').named).toEqual([]);
  });
});

describe('generateTextFromTemplate', () => {
  const makeTemplate = (content: string) => ({ content });

  it('replaces positional tokens with clip contents', () => {
    const result = generateTextFromTemplate(makeTemplate('{c1} and {c2}'), ['hello', 'world']);
    expect(result).toBe('hello and world');
  });

  it('replaces named tokens with captures', () => {
    const result = generateTextFromTemplate(makeTemplate('Hi {name}'), [], { name: 'Alice' });
    expect(result).toBe('Hi Alice');
  });

  it('replaces both positional and named tokens', () => {
    const result = generateTextFromTemplate(makeTemplate('{c1} by {author}'), ['Book'], {
      author: 'Bob',
    });
    expect(result).toBe('Book by Bob');
  });

  it('leaves unreplaced positional tokens intact', () => {
    const result = generateTextFromTemplate(makeTemplate('{c1} and {c3}'), ['hello']);
    expect(result).toBe('hello and {c3}');
  });

  it('leaves unreplaced named tokens intact', () => {
    const result = generateTextFromTemplate(makeTemplate('Hi {name}'), []);
    expect(result).toBe('Hi {name}');
  });

  it('uses 1-based indexing for clips', () => {
    const result = generateTextFromTemplate(makeTemplate('{c1}'), ['first', 'second']);
    expect(result).toBe('first');
  });

  it('handles no captures provided', () => {
    const result = generateTextFromTemplate(makeTemplate('{c1} {name}'), ['hello']);
    expect(result).toBe('hello {name}');
  });

  it('skips positional tokens during named capture replacement', () => {
    const result = generateTextFromTemplate(makeTemplate('{c1} {name}'), ['clip1'], {
      name: 'Alice',
    });
    expect(result).toBe('clip1 Alice');
  });

  it('leaves named token when capture key is missing', () => {
    const result = generateTextFromTemplate(makeTemplate('{missing}'), [], { other: 'val' });
    expect(result).toBe('{missing}');
  });
});
