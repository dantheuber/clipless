import { describe, it, expect } from 'vitest';
import { migrateData } from './migration';

describe('migrateData', () => {
  it('returns default structure for empty object', () => {
    const result = migrateData({});
    expect(result.clips).toEqual([]);
    expect(result.settings).toBeDefined();
    expect(result.templates).toEqual([]);
    expect(result.searchTerms).toEqual([]);
    expect(result.quickTools).toEqual([]);
  });

  it('preserves valid clips', () => {
    const data = {
      clips: [{ clip: { type: 'text', content: 'hello' }, isLocked: false, timestamp: 123 }],
    };
    const result = migrateData(data);
    expect(result.clips).toHaveLength(1);
    expect(result.clips[0].clip.content).toBe('hello');
  });

  it('filters out invalid clips', () => {
    const data = {
      clips: [
        { clip: { type: 'text', content: 'valid' }, isLocked: false, timestamp: 123 },
        { clip: { type: 123, content: 'invalid type' } },
        { clip: null },
        null,
      ],
    };
    const result = migrateData(data);
    expect(result.clips).toHaveLength(1);
  });

  it('merges settings with defaults', () => {
    const data = {
      settings: { maxClips: 50 },
    };
    const result = migrateData(data);
    expect(result.settings.maxClips).toBe(50);
    expect(result.settings.startMinimized).toBe(false);
  });

  it('preserves valid templates', () => {
    const data = {
      templates: [{ id: '1', name: 'T', content: 'c', createdAt: 1, updatedAt: 1, order: 0 }],
    };
    const result = migrateData(data);
    expect(result.templates).toHaveLength(1);
  });

  it('filters invalid templates', () => {
    const data = {
      templates: [
        { id: '1', name: 'T', content: 'c', createdAt: 1, updatedAt: 1, order: 0 },
        { id: 123, name: 'Bad' },
      ],
    };
    const result = migrateData(data);
    expect(result.templates).toHaveLength(1);
  });

  it('preserves valid search terms', () => {
    const data = {
      searchTerms: [
        { id: '1', name: 'S', pattern: '.*', enabled: true, createdAt: 1, updatedAt: 1, order: 0 },
      ],
    };
    const result = migrateData(data);
    expect(result.searchTerms).toHaveLength(1);
  });

  it('preserves valid quick tools', () => {
    const data = {
      quickTools: [
        {
          id: '1',
          name: 'Tool',
          url: 'https://example.com',
          captureGroups: ['email'],
          createdAt: 1,
          updatedAt: 1,
          order: 0,
        },
      ],
    };
    const result = migrateData(data);
    expect(result.quickTools).toHaveLength(1);
  });

  it('preserves version string', () => {
    const result = migrateData({ version: '2.0.0' });
    expect(result.version).toBe('2.0.0');
  });

  it('handles non-array clips gracefully', () => {
    const result = migrateData({ clips: 'not-an-array' });
    expect(result.clips).toEqual([]);
  });

  it('handles null data properties gracefully', () => {
    const result = migrateData({ clips: null, settings: null, templates: null });
    expect(result.clips).toEqual([]);
    expect(result.templates).toEqual([]);
  });

  it('returns default structure for null or non-object data', () => {
    const nullResult = migrateData(null);
    expect(nullResult.clips).toEqual([]);
    expect(nullResult.settings).toBeDefined();

    const undefinedResult = migrateData(undefined);
    expect(undefinedResult.clips).toEqual([]);

    const stringResult = migrateData('not-an-object');
    expect(stringResult.clips).toEqual([]);

    const numberResult = migrateData(42);
    expect(numberResult.clips).toEqual([]);
  });
});
