import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../storage', () => ({
  storage: {
    getQuickTools: vi.fn(),
    createQuickTool: vi.fn(),
    updateQuickTool: vi.fn(),
    deleteQuickTool: vi.fn(),
    reorderQuickTools: vi.fn(),
  },
}));

import {
  getAllQuickTools,
  createQuickTool,
  updateQuickTool,
  deleteQuickTool,
  reorderQuickTools,
  validateToolUrl,
} from './quick-tools';
import { storage } from '../storage';

const mockedStorage = vi.mocked(storage);

describe('validateToolUrl', () => {
  it('returns valid for a proper URL with matching capture groups', async () => {
    const result = await validateToolUrl('https://example.com/search?q={query}', ['query']);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns error for invalid URL format', async () => {
    const result = await validateToolUrl('not-a-url', []);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Invalid URL format');
  });

  it('returns error when URL token is not in capture groups list', async () => {
    const result = await validateToolUrl('https://example.com/{email}', ['phone']);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("'{email}'"))).toBe(true);
  });

  it('accepts URL with no tokens', async () => {
    const result = await validateToolUrl('https://example.com/page', []);
    expect(result.isValid).toBe(true);
  });

  it('validates multiple tokens', async () => {
    const result = await validateToolUrl('https://example.com/{name}/{email}', ['name', 'email']);
    expect(result.isValid).toBe(true);
  });

  it('reports all missing capture groups', async () => {
    const result = await validateToolUrl('https://example.com/{a}/{b}', []);
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(2);
  });

  it('throws when an unexpected error occurs', async () => {
    // Force an error by passing null as url
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(validateToolUrl(null as any, [])).rejects.toThrow();
  });
});

describe('getAllQuickTools', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns tools from storage', async () => {
    const tools = [{ id: '1', name: 'Tool' }];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedStorage.getQuickTools.mockResolvedValue(tools as any);
    const result = await getAllQuickTools();
    expect(result).toEqual(tools);
  });

  it('throws when storage fails', async () => {
    mockedStorage.getQuickTools.mockRejectedValue(new Error('fail'));
    await expect(getAllQuickTools()).rejects.toThrow('fail');
  });
});

describe('createQuickTool', () => {
  beforeEach(() => vi.clearAllMocks());

  it('delegates to storage.createQuickTool', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedStorage.createQuickTool.mockResolvedValue({ id: '1' } as any);
    const result = await createQuickTool('Test', 'https://example.com/{q}', ['q']);
    expect(mockedStorage.createQuickTool).toHaveBeenCalledWith('Test', 'https://example.com/{q}', [
      'q',
    ]);
    expect(result).toEqual({ id: '1' });
  });

  it('throws when storage fails', async () => {
    mockedStorage.createQuickTool.mockRejectedValue(new Error('fail'));
    await expect(createQuickTool('Test', 'url', [])).rejects.toThrow('fail');
  });
});

describe('updateQuickTool', () => {
  beforeEach(() => vi.clearAllMocks());

  it('delegates to storage.updateQuickTool', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedStorage.updateQuickTool.mockResolvedValue({ id: '1' } as any);
    await updateQuickTool('1', { name: 'Updated' });
    expect(mockedStorage.updateQuickTool).toHaveBeenCalledWith('1', { name: 'Updated' });
  });

  it('throws when storage fails', async () => {
    mockedStorage.updateQuickTool.mockRejectedValue(new Error('fail'));
    await expect(updateQuickTool('1', {})).rejects.toThrow('fail');
  });
});

describe('deleteQuickTool', () => {
  beforeEach(() => vi.clearAllMocks());

  it('delegates to storage.deleteQuickTool', async () => {
    mockedStorage.deleteQuickTool.mockResolvedValue(undefined);
    await deleteQuickTool('1');
    expect(mockedStorage.deleteQuickTool).toHaveBeenCalledWith('1');
  });

  it('throws when storage fails', async () => {
    mockedStorage.deleteQuickTool.mockRejectedValue(new Error('fail'));
    await expect(deleteQuickTool('1')).rejects.toThrow('fail');
  });
});

describe('reorderQuickTools', () => {
  beforeEach(() => vi.clearAllMocks());

  it('delegates to storage.reorderQuickTools', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools = [{ id: '1' }, { id: '2' }] as any;
    mockedStorage.reorderQuickTools.mockResolvedValue(undefined);
    await reorderQuickTools(tools);
    expect(mockedStorage.reorderQuickTools).toHaveBeenCalledWith(tools);
  });

  it('throws when storage fails', async () => {
    mockedStorage.reorderQuickTools.mockRejectedValue(new Error('fail'));
    await expect(reorderQuickTools([])).rejects.toThrow('fail');
  });
});
