import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../storage', () => ({
  storage: {
    getSearchTerms: vi.fn(),
  },
}));

import { scanTextForPatterns } from './quick-clips';
import { storage } from '../storage';

const mockedStorage = vi.mocked(storage);

describe('scanTextForPatterns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when no search terms exist', async () => {
    mockedStorage.getSearchTerms.mockResolvedValue([]);
    const result = await scanTextForPatterns('hello world');
    expect(result).toEqual([]);
  });

  it('returns empty array when no patterns match', async () => {
    mockedStorage.getSearchTerms.mockResolvedValue([
      {
        id: '1',
        name: 'Email',
        pattern: '(?<email>[\\w.]+@[\\w.]+)',
        enabled: true,
        createdAt: 0,
        updatedAt: 0,
        order: 0,
      },
    ]);
    const result = await scanTextForPatterns('no emails here');
    expect(result).toEqual([]);
  });

  it('matches named capture groups', async () => {
    mockedStorage.getSearchTerms.mockResolvedValue([
      {
        id: '1',
        name: 'Email',
        pattern: '(?<email>[\\w.]+@[\\w.]+)',
        enabled: true,
        createdAt: 0,
        updatedAt: 0,
        order: 0,
      },
    ]);
    const result = await scanTextForPatterns('contact user@example.com for info');
    expect(result).toHaveLength(1);
    expect(result[0].searchTermId).toBe('1');
    expect(result[0].searchTermName).toBe('Email');
    expect(result[0].captures.email).toBe('user@example.com');
  });

  it('finds multiple matches in text', async () => {
    mockedStorage.getSearchTerms.mockResolvedValue([
      {
        id: '1',
        name: 'Email',
        pattern: '(?<email>[\\w.]+@[\\w.]+)',
        enabled: true,
        createdAt: 0,
        updatedAt: 0,
        order: 0,
      },
    ]);
    const result = await scanTextForPatterns('a@b.com and c@d.com');
    expect(result).toHaveLength(2);
    expect(result[0].captures.email).toBe('a@b.com');
    expect(result[1].captures.email).toBe('c@d.com');
  });

  it('skips disabled search terms', async () => {
    mockedStorage.getSearchTerms.mockResolvedValue([
      {
        id: '1',
        name: 'Email',
        pattern: '(?<email>[\\w.]+@[\\w.]+)',
        enabled: false,
        createdAt: 0,
        updatedAt: 0,
        order: 0,
      },
    ]);
    const result = await scanTextForPatterns('user@example.com');
    expect(result).toEqual([]);
  });

  it('skips patterns without named capture groups', async () => {
    mockedStorage.getSearchTerms.mockResolvedValue([
      {
        id: '1',
        name: 'NoGroups',
        pattern: '\\d+',
        enabled: true,
        createdAt: 0,
        updatedAt: 0,
        order: 0,
      },
    ]);
    const result = await scanTextForPatterns('123 456');
    expect(result).toEqual([]);
  });

  it('handles invalid regex gracefully', async () => {
    mockedStorage.getSearchTerms.mockResolvedValue([
      {
        id: '1',
        name: 'Bad',
        pattern: '(?<email>[',
        enabled: true,
        createdAt: 0,
        updatedAt: 0,
        order: 0,
      },
      {
        id: '2',
        name: 'Good',
        pattern: '(?<num>\\d+)',
        enabled: true,
        createdAt: 0,
        updatedAt: 0,
        order: 0,
      },
    ]);
    const result = await scanTextForPatterns('test 123');
    expect(result).toHaveLength(1);
    expect(result[0].captures.num).toBe('123');
  });

  it('matches multiple capture groups in one pattern', async () => {
    mockedStorage.getSearchTerms.mockResolvedValue([
      {
        id: '1',
        name: 'NameEmail',
        pattern: '(?<name>\\w+)\\s+(?<email>[\\w.]+@[\\w.]+)',
        enabled: true,
        createdAt: 0,
        updatedAt: 0,
        order: 0,
      },
    ]);
    const result = await scanTextForPatterns('John user@example.com');
    expect(result).toHaveLength(1);
    expect(result[0].captures.name).toBe('John');
    expect(result[0].captures.email).toBe('user@example.com');
  });
});
