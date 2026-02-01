import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: vi.fn().mockReturnValue(true),
    encryptString: vi.fn((str: string) => Buffer.from(str)),
    decryptString: vi.fn((buf: Buffer) => buf.toString()),
  },
}));

vi.mock('fs', () => ({
  promises: {
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn(),
    rename: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
    access: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
  },
}));

import {
  saveToFile,
  loadFromFile,
  ensureDataDirectory,
  isEncryptionAvailable,
} from './file-operations';
import { safeStorage } from 'electron';
import { promises as fs } from 'fs';

describe('saveToFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('encrypts and writes data to file', async () => {
    await saveToFile({ test: true }, '/path/data.enc');

    expect(safeStorage.encryptString).toHaveBeenCalledWith(JSON.stringify({ test: true }, null, 2));
    expect(fs.writeFile).toHaveBeenCalledWith('/path/data.enc.tmp', expect.any(Buffer));
    expect(fs.rename).toHaveBeenCalledWith('/path/data.enc.tmp', '/path/data.enc');
  });

  it('cleans up temp file on error', async () => {
    vi.mocked(fs.writeFile).mockRejectedValueOnce(new Error('write failed'));

    await expect(saveToFile({ test: true }, '/path/data.enc')).rejects.toThrow('write failed');
    expect(fs.unlink).toHaveBeenCalledWith('/path/data.enc.tmp');
  });
});

describe('loadFromFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads and decrypts data from file', async () => {
    const testData = { test: true };
    const jsonStr = JSON.stringify(testData);
    const buf = Buffer.from(jsonStr);
    vi.mocked(fs.readFile).mockResolvedValue(buf);
    vi.mocked(safeStorage.decryptString).mockReturnValue(jsonStr);

    const result = await loadFromFile('/path/data.enc');
    expect(result).toEqual(testData);
  });

  it('throws FILE_NOT_FOUND for missing file', async () => {
    vi.mocked(fs.access).mockRejectedValueOnce(Object.assign(new Error(), { code: 'ENOENT' }));

    await expect(loadFromFile('/path/data.enc')).rejects.toThrow('FILE_NOT_FOUND');
  });
});

describe('ensureDataDirectory', () => {
  it('creates directory recursively', async () => {
    await ensureDataDirectory('/path/to/data');
    expect(fs.mkdir).toHaveBeenCalledWith('/path/to/data', { recursive: true });
  });
});

describe('isEncryptionAvailable', () => {
  it('returns the result from safeStorage', () => {
    expect(isEncryptionAvailable()).toBe(true);
  });

  it('returns false when encryption is not available', () => {
    vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValueOnce(false);
    expect(isEncryptionAvailable()).toBe(false);
  });
});

describe('loadFromFile - non-ENOENT error', () => {
  it('throws original error for non-ENOENT errors', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('decrypt failed'));

    await expect(loadFromFile('/path/data.enc')).rejects.toThrow('decrypt failed');
  });
});

describe('saveToFile - temp file cleanup ignores missing', () => {
  it('ignores temp file unlink error before write', async () => {
    vi.mocked(fs.unlink).mockRejectedValueOnce(new Error('no temp file'));
    await saveToFile({ test: true }, '/path/data.enc');
    expect(fs.writeFile).toHaveBeenCalled();
  });
});
