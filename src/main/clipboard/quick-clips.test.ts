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

import { scanTextForPatterns, exportQuickClipsConfig, importQuickClipsConfig } from './quick-clips';
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
