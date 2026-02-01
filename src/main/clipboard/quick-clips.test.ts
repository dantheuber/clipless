import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockOpenExternal } = vi.hoisted(() => ({
  mockOpenExternal: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('electron', () => ({
  shell: { openExternal: mockOpenExternal },
}));

vi.mock('../storage', () => ({
  storage: {
    getSearchTerms: vi.fn(),
    getQuickTools: vi.fn(),
    getTemplates: vi.fn(),
    importQuickClipsConfig: vi.fn(),
  },
}));

import {
  scanTextForPatterns,
  openToolsForMatches,
  exportQuickClipsConfig,
  importQuickClipsConfig,
} from './quick-clips';
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

  it('skips capture group values that are undefined', async () => {
    mockedStorage.getSearchTerms.mockResolvedValue([
      {
        id: '1',
        name: 'Optional',
        pattern: '(?<required>\\w+)(?:-(?<optional>\\w+))?',
        enabled: true,
        createdAt: 0,
        updatedAt: 0,
        order: 0,
      },
    ]);
    // "hello" matches required but optional group is undefined
    const result = await scanTextForPatterns('hello');
    expect(result).toHaveLength(1);
    expect(result[0].captures.required).toBe('hello');
    expect(result[0].captures.optional).toBeUndefined();
  });

  it('throws when storage.getSearchTerms fails', async () => {
    mockedStorage.getSearchTerms.mockRejectedValue(new Error('storage fail'));
    await expect(scanTextForPatterns('test')).rejects.toThrow('storage fail');
  });
});

describe('openToolsForMatches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens URL with token replaced by capture value', async () => {
    mockedStorage.getQuickTools.mockResolvedValue([
      {
        id: 't1',
        name: 'Search',
        url: 'https://google.com/search?q={email}',
        captureGroups: ['email'],
        createdAt: 0,
        updatedAt: 0,
        order: 0,
      },
    ]);

    const matches = [{ searchTermId: '1', searchTermName: 'Email', captures: { email: 'test@example.com' } }];
    await openToolsForMatches(matches, ['t1']);

    expect(mockOpenExternal).toHaveBeenCalledWith(
      'https://google.com/search?q=test%40example.com'
    );
  });

  it('skips tool when no matching captures exist', async () => {
    mockedStorage.getQuickTools.mockResolvedValue([
      {
        id: 't1',
        name: 'Search',
        url: 'https://example.com/{phone}',
        captureGroups: ['phone'],
        createdAt: 0,
        updatedAt: 0,
        order: 0,
      },
    ]);

    const matches = [{ searchTermId: '1', searchTermName: 'Email', captures: { email: 'test@example.com' } }];
    await openToolsForMatches(matches, ['t1']);

    expect(mockOpenExternal).not.toHaveBeenCalled();
  });

  it('skips unknown tool ids', async () => {
    mockedStorage.getQuickTools.mockResolvedValue([]);

    const matches = [{ searchTermId: '1', searchTermName: 'Email', captures: { email: 'test@example.com' } }];
    await openToolsForMatches(matches, ['unknown']);

    expect(mockOpenExternal).not.toHaveBeenCalled();
  });

  it('opens URL as-is when no tokens in URL', async () => {
    mockedStorage.getQuickTools.mockResolvedValue([
      {
        id: 't1',
        name: 'Static',
        url: 'https://example.com/page',
        captureGroups: ['email'],
        createdAt: 0,
        updatedAt: 0,
        order: 0,
      },
    ]);

    const matches = [{ searchTermId: '1', searchTermName: 'Email', captures: { email: 'test@example.com' } }];
    await openToolsForMatches(matches, ['t1']);

    expect(mockOpenExternal).toHaveBeenCalledWith('https://example.com/page');
  });

  it('uses URL capture directly when tool URL is just a {url} token', async () => {
    mockedStorage.getQuickTools.mockResolvedValue([
      {
        id: 't1',
        name: 'Open URL',
        url: '{url}',
        captureGroups: ['url'],
        createdAt: 0,
        updatedAt: 0,
        order: 0,
      },
    ]);

    const matches = [{ searchTermId: '1', searchTermName: 'URL', captures: { url: 'https://detected.com' } }];
    await openToolsForMatches(matches, ['t1']);

    expect(mockOpenExternal).toHaveBeenCalledWith('https://detected.com');
  });

  it('generates combinations for multiple tokens', async () => {
    mockedStorage.getQuickTools.mockResolvedValue([
      {
        id: 't1',
        name: 'Multi',
        url: 'https://example.com/{name}/{email}',
        captureGroups: ['name', 'email'],
        createdAt: 0,
        updatedAt: 0,
        order: 0,
      },
    ]);

    const matches = [
      {
        searchTermId: '1',
        searchTermName: 'Contact',
        captures: { name: 'John', email: 'john@test.com' },
      },
    ];
    await openToolsForMatches(matches, ['t1']);

    expect(mockOpenExternal).toHaveBeenCalledWith('https://example.com/John/john%40test.com');
  });

  it('skips URL generation when token has no matching capture values', async () => {
    mockedStorage.getQuickTools.mockResolvedValue([
      {
        id: 't1',
        name: 'Search',
        url: 'https://example.com/{missing}',
        captureGroups: ['missing'],
        createdAt: 0,
        updatedAt: 0,
        order: 0,
      },
    ]);

    const matches = [{ searchTermId: '1', searchTermName: 'Email', captures: { email: 'test@example.com' } }];
    await openToolsForMatches(matches, ['t1']);

    expect(mockOpenExternal).not.toHaveBeenCalled();
  });

  it('handles pipe-separated capture groups in tokens', async () => {
    mockedStorage.getQuickTools.mockResolvedValue([
      {
        id: 't1',
        name: 'Search',
        url: 'https://example.com/search?q={email|phone}',
        captureGroups: ['email', 'phone'],
        createdAt: 0,
        updatedAt: 0,
        order: 0,
      },
    ]);

    const matches = [
      {
        searchTermId: '1',
        searchTermName: 'Contact',
        captures: { email: 'test@example.com', phone: '555-1234' },
      },
    ];
    await openToolsForMatches(matches, ['t1']);

    // Should open URLs for each matching capture value
    expect(mockOpenExternal).toHaveBeenCalled();
  });

  it('generates all combinations for multi-value multi-token URLs', async () => {
    mockedStorage.getQuickTools.mockResolvedValue([
      {
        id: 't1',
        name: 'Multi',
        url: 'https://example.com/{a|b}/{c|d}',
        captureGroups: ['a', 'b', 'c', 'd'],
        createdAt: 0,
        updatedAt: 0,
        order: 0,
      },
    ]);

    const matches = [
      {
        searchTermId: '1',
        searchTermName: 'Test',
        captures: { a: 'v1', b: 'v2', c: 'v3', d: 'v4' },
      },
    ];
    await openToolsForMatches(matches, ['t1']);

    // With {a|b} having values [v1,v2] and {c|d} having [v3,v4], should get 4 combinations
    expect(mockOpenExternal).toHaveBeenCalledTimes(4);
  });

  it('does not encode URL-type capture groups in non-direct URLs', async () => {
    mockedStorage.getQuickTools.mockResolvedValue([
      {
        id: 't1',
        name: 'URL redirect',
        url: 'https://redirect.com?target={url}',
        captureGroups: ['url'],
        createdAt: 0,
        updatedAt: 0,
        order: 0,
      },
    ]);

    const matches = [
      {
        searchTermId: '1',
        searchTermName: 'URL',
        captures: { url: 'https://example.com/path?q=1' },
      },
    ];
    await openToolsForMatches(matches, ['t1']);

    // URL captures should not be encoded when in a compound URL
    expect(mockOpenExternal).toHaveBeenCalledWith(
      'https://redirect.com?target=https://example.com/path?q=1'
    );
  });

  it('handles falsy capture value for a group', async () => {
    mockedStorage.getQuickTools.mockResolvedValue([
      {
        id: 't1',
        name: 'Search',
        url: 'https://example.com/{email}',
        captureGroups: ['email'],
        createdAt: 0,
        updatedAt: 0,
        order: 0,
      },
    ]);

    const matches = [{ searchTermId: '1', searchTermName: 'Email', captures: { email: '' } }];
    await openToolsForMatches(matches, ['t1']);

    expect(mockOpenExternal).not.toHaveBeenCalled();
  });

  it('handles URL capture group in multi-token URL', async () => {
    mockedStorage.getQuickTools.mockResolvedValue([
      {
        id: 't1',
        name: 'Multi',
        url: 'https://proxy.com/{url}/{name}',
        captureGroups: ['url', 'name'],
        createdAt: 0,
        updatedAt: 0,
        order: 0,
      },
    ]);

    const matches = [
      {
        searchTermId: '1',
        searchTermName: 'Test',
        captures: { url: 'https://example.com', name: 'test' },
      },
    ];
    await openToolsForMatches(matches, ['t1']);

    expect(mockOpenExternal).toHaveBeenCalledWith(
      'https://proxy.com/https://example.com/test'
    );
  });

  it('throws when storage fails', async () => {
    mockedStorage.getQuickTools.mockRejectedValue(new Error('storage error'));

    await expect(
      openToolsForMatches([{ captures: { email: 'a@b.com' } }], ['t1'])
    ).rejects.toThrow('storage error');
  });
});

describe('exportQuickClipsConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns config with searchTerms, tools, templates, and version', async () => {
    mockedStorage.getSearchTerms.mockResolvedValue([{ id: '1' }] as any);
    mockedStorage.getQuickTools.mockResolvedValue([{ id: '2' }] as any);
    mockedStorage.getTemplates.mockResolvedValue([{ id: '3' }] as any);

    const result = await exportQuickClipsConfig();

    expect(result).toEqual({
      searchTerms: [{ id: '1' }],
      tools: [{ id: '2' }],
      templates: [{ id: '3' }],
      version: '1.0.0',
    });
  });

  it('throws when storage fails', async () => {
    mockedStorage.getSearchTerms.mockRejectedValue(new Error('fail'));
    await expect(exportQuickClipsConfig()).rejects.toThrow('fail');
  });
});

describe('importQuickClipsConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates to storage.importQuickClipsConfig', async () => {
    const config = { searchTerms: [], tools: [], templates: [] };
    await importQuickClipsConfig(config);
    expect(mockedStorage.importQuickClipsConfig).toHaveBeenCalledWith(config);
  });

  it('throws when storage fails', async () => {
    mockedStorage.importQuickClipsConfig.mockRejectedValue(new Error('import fail'));
    await expect(importQuickClipsConfig({})).rejects.toThrow('import fail');
  });
});
