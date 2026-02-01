import { describe, it, expect } from 'vitest';
import { createSearchTermObject, sortSearchTermsByOrder } from './search-terms';

describe('createSearchTermObject', () => {
  it('creates a search term with correct fields', () => {
    const term = createSearchTermObject('Email', '(?<email>[\\w.]+@[\\w.]+)', 0);
    expect(term.name).toBe('Email');
    expect(term.pattern).toBe('(?<email>[\\w.]+@[\\w.]+)');
    expect(term.order).toBe(0);
    expect(term.enabled).toBe(true);
    expect(typeof term.id).toBe('string');
    expect(typeof term.createdAt).toBe('number');
    expect(typeof term.updatedAt).toBe('number');
  });
});

describe('sortSearchTermsByOrder', () => {
  it('sorts search terms by order ascending', () => {
    const terms = [
      { id: '1', name: 'B', pattern: '', enabled: true, createdAt: 0, updatedAt: 0, order: 2 },
      { id: '2', name: 'A', pattern: '', enabled: true, createdAt: 0, updatedAt: 0, order: 0 },
      { id: '3', name: 'C', pattern: '', enabled: true, createdAt: 0, updatedAt: 0, order: 1 },
    ];
    const sorted = sortSearchTermsByOrder(terms);
    expect(sorted.map((t) => t.name)).toEqual(['A', 'C', 'B']);
  });

  it('does not mutate the original array', () => {
    const terms = [
      { id: '1', name: 'B', pattern: '', enabled: true, createdAt: 0, updatedAt: 0, order: 1 },
      { id: '2', name: 'A', pattern: '', enabled: true, createdAt: 0, updatedAt: 0, order: 0 },
    ];
    sortSearchTermsByOrder(terms);
    expect(terms[0].name).toBe('B');
  });
});
