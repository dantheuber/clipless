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

import { exportQuickClipsConfig, importQuickClipsConfig } from './quick-clips';
import { storage } from '../storage';
const mockedStorage = vi.mocked(storage);

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
