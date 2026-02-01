import { describe, it, expect } from 'vitest';
import {
  createTemplateObject,
  sortTemplatesByOrder,
  extractTemplateTokens,
  generateTextFromTemplate,
} from './templates';

describe('createTemplateObject', () => {
  it('creates a template with the correct fields', () => {
    const template = createTemplateObject('Test', 'Hello {c1}', 0);
    expect(template.name).toBe('Test');
    expect(template.content).toBe('Hello {c1}');
    expect(template.order).toBe(0);
    expect(template.id).toMatch(/^template-/);
    expect(typeof template.createdAt).toBe('number');
    expect(typeof template.updatedAt).toBe('number');
  });
});

describe('sortTemplatesByOrder', () => {
  it('sorts templates by order ascending', () => {
    const templates = [
      { id: '1', name: 'B', content: '', createdAt: 0, updatedAt: 0, order: 2 },
      { id: '2', name: 'A', content: '', createdAt: 0, updatedAt: 0, order: 0 },
      { id: '3', name: 'C', content: '', createdAt: 0, updatedAt: 0, order: 1 },
    ];
    const sorted = sortTemplatesByOrder(templates);
    expect(sorted.map((t) => t.name)).toEqual(['A', 'C', 'B']);
  });

  it('does not mutate the original array', () => {
    const templates = [
      { id: '1', name: 'B', content: '', createdAt: 0, updatedAt: 0, order: 2 },
      { id: '2', name: 'A', content: '', createdAt: 0, updatedAt: 0, order: 0 },
    ];
    sortTemplatesByOrder(templates);
    expect(templates[0].name).toBe('B');
  });
});

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

  it('returns empty arrays for no tokens', () => {
    const result = extractTemplateTokens('plain text');
    expect(result.positional).toEqual([]);
    expect(result.named).toEqual([]);
  });
});

describe('generateTextFromTemplate', () => {
  const makeTemplate = (content: string) => ({
    id: '1',
    name: 'Test',
    content,
    createdAt: 0,
    updatedAt: 0,
    order: 0,
  });

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
});
