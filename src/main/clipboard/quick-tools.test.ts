import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../storage', () => ({
  storage: {
    getQuickTools: vi.fn(),
    createQuickTool: vi.fn(),
    updateQuickTool: vi.fn(),
    deleteQuickTool: vi.fn(),
  },
}));

import { getAllQuickTools, createQuickTool, updateQuickTool, deleteQuickTool } from './quick-tools';
import { storage } from '../storage';

const mockedStorage = vi.mocked(storage);

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
