import { describe, it, expect } from 'vitest';
import {
  createTemplateObject,
  sortTemplatesByOrder,
  updateTemplateObject,
  reorderTemplatesArray,
  generateTemplateId,
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

describe('generateTemplateId', () => {
  it('returns a string starting with template-', () => {
    const id = generateTemplateId();
    expect(id).toMatch(/^template-/);
  });
});

describe('updateTemplateObject', () => {
  it('updates fields and refreshes updatedAt', () => {
    const original = {
      id: '1',
      name: 'Old',
      content: 'test',
      createdAt: 1000,
      updatedAt: 1000,
      order: 0,
    };
    const updated = updateTemplateObject(original, { name: 'New' });
    expect(updated.name).toBe('New');
    expect(updated.updatedAt).toBeGreaterThan(1000);
    expect(updated.createdAt).toBe(1000);
  });
});

describe('reorderTemplatesArray', () => {
  it('assigns sequential order values', () => {
    const templates = [
      { id: '1', name: 'A', content: '', createdAt: 0, updatedAt: 0, order: 5 },
      { id: '2', name: 'B', content: '', createdAt: 0, updatedAt: 0, order: 10 },
    ];
    const result = reorderTemplatesArray(templates);
    expect(result[0].order).toBe(0);
    expect(result[1].order).toBe(1);
  });

  it('handles empty array', () => {
    expect(reorderTemplatesArray([])).toEqual([]);
  });
});
