import { describe, it, expect } from 'vitest';
import {
  createSearchTermObject,
  sortSearchTermsByOrder,
  updateSearchTermObject,
  reorderSearchTermsArray,
  generateId,
} from './search-terms';

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

describe('generateId', () => {
  it('returns a string', () => {
    expect(typeof generateId()).toBe('string');
  });
});

describe('updateSearchTermObject', () => {
  it('updates fields and sets updatedAt', () => {
    const original = {
      id: '1',
      name: 'Old',
      pattern: '.*',
      enabled: true,
      createdAt: 1000,
      updatedAt: 1000,
      order: 0,
    };
    const updated = updateSearchTermObject(original, { name: 'New' });
    expect(updated.name).toBe('New');
    expect(updated.id).toBe('1');
    expect(updated.updatedAt).toBeGreaterThan(1000);
  });
});

describe('reorderSearchTermsArray', () => {
  it('assigns sequential order values', () => {
    const terms = [
      { id: '1', name: 'A', pattern: '', enabled: true, createdAt: 0, updatedAt: 0, order: 5 },
      { id: '2', name: 'B', pattern: '', enabled: true, createdAt: 0, updatedAt: 0, order: 10 },
    ];
    const result = reorderSearchTermsArray(terms);
    expect(result[0].order).toBe(0);
    expect(result[1].order).toBe(1);
  });

  it('handles empty array', () => {
    expect(reorderSearchTermsArray([])).toEqual([]);
  });
});
