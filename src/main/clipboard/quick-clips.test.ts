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
    getGroupColours: vi.fn(),
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

  const tool = (url: string, captureGroups: string[]) => ({
    id: 't1',
    name: 'Tool',
    url,
    captureGroups,
    createdAt: 0,
    updatedAt: 0,
    order: 0,
  });

  it('opens every URL buildToolUrls produces for the first applicable match', async () => {
    mockedStorage.getQuickTools.mockResolvedValue([
      tool('https://example.com/search?q={email|phone}', ['email', 'phone']),
    ]);

    await openToolsForMatches(
      [
        { searchTermId: '1', searchTermName: 'Other', captures: { ip: '1.1.1.1' } },
        {
          searchTermId: '2',
          searchTermName: 'Contact',
          captures: { email: 'test@example.com', phone: '555-1234' },
        },
        { searchTermId: '3', searchTermName: 'Later', captures: { email: 'later@example.com' } },
      ],
      ['t1']
    );

    expect(mockOpenExternal.mock.calls.map((c) => c[0])).toEqual([
      'https://example.com/search?q=test%40example.com',
      'https://example.com/search?q=555-1234',
    ]);
  });

  it('skips a tool when no match holds any of its groups', async () => {
    mockedStorage.getQuickTools.mockResolvedValue([tool('https://example.com/{phone}', ['phone'])]);
    await openToolsForMatches(
      [{ searchTermId: '1', searchTermName: 'Email', captures: { email: 'a@b.co' } }],
      ['t1']
    );
    expect(mockOpenExternal).not.toHaveBeenCalled();
  });

  it('skips a tool whose tokens the match cannot all fill', async () => {
    mockedStorage.getQuickTools.mockResolvedValue([
      tool('https://example.com/{email}/{missing}', ['email', 'missing']),
    ]);
    await openToolsForMatches(
      [{ searchTermId: '1', searchTermName: 'Email', captures: { email: 'a@b.co', other: '' } }],
      ['t1']
    );
    expect(mockOpenExternal).not.toHaveBeenCalled();
  });

  it('skips unknown tool ids', async () => {
    mockedStorage.getQuickTools.mockResolvedValue([]);
    await openToolsForMatches(
      [{ searchTermId: '1', searchTermName: 'Email', captures: { email: 'a@b.co' } }],
      ['unknown']
    );
    expect(mockOpenExternal).not.toHaveBeenCalled();
  });

  it('throws when storage fails', async () => {
    mockedStorage.getQuickTools.mockRejectedValue(new Error('storage error'));

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      openToolsForMatches([{ captures: { email: 'a@b.com' } }] as any, ['t1'])
    ).rejects.toThrow('storage error');
  });
});

describe('exportQuickClipsConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns config with searchTerms, tools, templates, and version', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedStorage.getSearchTerms.mockResolvedValue([{ id: '1' }] as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedStorage.getQuickTools.mockResolvedValue([{ id: '2' }] as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedStorage.getTemplates.mockResolvedValue([{ id: '3' }] as any);
    mockedStorage.getGroupColours.mockResolvedValue({ ip: 4 });

    const result = await exportQuickClipsConfig();

    expect(result).toEqual({
      searchTerms: [{ id: '1' }],
      tools: [{ id: '2' }],
      templates: [{ id: '3' }],
      groupColours: { ip: 4 },
      version: '2.0.0',
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config = { searchTerms: [], tools: [], templates: [] } as any;
    await importQuickClipsConfig(config);
    expect(mockedStorage.importQuickClipsConfig).toHaveBeenCalledWith(config, 'merge');
    await importQuickClipsConfig(config, 'replace');
    expect(mockedStorage.importQuickClipsConfig).toHaveBeenCalledWith(config, 'replace');
  });

  it('throws when storage fails', async () => {
    mockedStorage.importQuickClipsConfig.mockRejectedValue(new Error('import fail'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(importQuickClipsConfig({} as any)).rejects.toThrow('import fail');
  });
});
