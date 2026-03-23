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
  saveEncryptedJson,
  loadEncryptedJson,
  saveEncryptedBuffer,
  loadEncryptedBuffer,
  saveJsonFile,
  loadJsonFile,
  ensureDataDirectory,
  isEncryptionAvailable,
} from './file-operations';
import { safeStorage } from 'electron';
import { promises as fs } from 'fs';

describe('saveEncryptedJson', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('encrypts and writes data to file without pretty-printing', async () => {
    await saveEncryptedJson({ test: true }, '/path/data.enc');

    expect(safeStorage.encryptString).toHaveBeenCalledWith(JSON.stringify({ test: true }));
    expect(fs.writeFile).toHaveBeenCalledWith('/path/data.enc.tmp', expect.any(Buffer));
    expect(fs.rename).toHaveBeenCalledWith('/path/data.enc.tmp', '/path/data.enc');
  });

  it('cleans up temp file on error', async () => {
    vi.mocked(fs.writeFile).mockRejectedValueOnce(new Error('write failed'));

    await expect(saveEncryptedJson({ test: true }, '/path/data.enc')).rejects.toThrow(
      'write failed'
    );
    expect(fs.unlink).toHaveBeenCalledWith('/path/data.enc.tmp');
  });

  it('ignores temp file unlink error before write', async () => {
    vi.mocked(fs.unlink).mockRejectedValueOnce(new Error('no temp file'));
    await saveEncryptedJson({ test: true }, '/path/data.enc');
    expect(fs.writeFile).toHaveBeenCalled();
  });
});

describe('loadEncryptedJson', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads and decrypts data from file', async () => {
    const testData = { test: true };
    const jsonStr = JSON.stringify(testData);
    const buf = Buffer.from(jsonStr);
    vi.mocked(fs.readFile).mockResolvedValue(buf);
    vi.mocked(safeStorage.decryptString).mockReturnValue(jsonStr);

    const result = await loadEncryptedJson('/path/data.enc');
    expect(result).toEqual(testData);
  });

  it('throws FILE_NOT_FOUND for missing file', async () => {
    vi.mocked(fs.access).mockRejectedValueOnce(Object.assign(new Error(), { code: 'ENOENT' }));

    await expect(loadEncryptedJson('/path/data.enc')).rejects.toThrow('FILE_NOT_FOUND');
  });

  it('throws original error for non-ENOENT errors', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('decrypt failed'));

    await expect(loadEncryptedJson('/path/data.enc')).rejects.toThrow('decrypt failed');
  });
});

describe('saveJsonFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes plain JSON to file without pretty-printing', async () => {
    await saveJsonFile({ version: '1.0', storageVersion: 1 }, '/path/meta.json');

    expect(fs.writeFile).toHaveBeenCalledWith(
      '/path/meta.json',
      JSON.stringify({ version: '1.0', storageVersion: 1 })
    );
  });
});

describe('loadJsonFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads and parses plain JSON from file', async () => {
    const testData = { version: '1.0', storageVersion: 1 };
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(testData));

    const result = await loadJsonFile('/path/meta.json');
    expect(result).toEqual(testData);
  });

  it('throws FILE_NOT_FOUND for missing file', async () => {
    vi.mocked(fs.readFile).mockRejectedValueOnce(Object.assign(new Error(), { code: 'ENOENT' }));

    await expect(loadJsonFile('/path/meta.json')).rejects.toThrow('FILE_NOT_FOUND');
  });

  it('throws original error for non-ENOENT errors', async () => {
    vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('parse failed'));

    await expect(loadJsonFile('/path/meta.json')).rejects.toThrow('parse failed');
  });
});

describe('saveEncryptedBuffer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('converts buffer to base64, encrypts, and writes to file', async () => {
    const buf = Buffer.from('hello');
    await saveEncryptedBuffer(buf, '/path/image.enc');

    expect(safeStorage.encryptString).toHaveBeenCalledWith(buf.toString('base64'));
    expect(fs.writeFile).toHaveBeenCalledWith('/path/image.enc.tmp', expect.any(Buffer));
    expect(fs.rename).toHaveBeenCalledWith('/path/image.enc.tmp', '/path/image.enc');
  });

  it('cleans up temp file on error', async () => {
    vi.mocked(fs.writeFile).mockRejectedValueOnce(new Error('write failed'));
    const buf = Buffer.from('hello');

    await expect(saveEncryptedBuffer(buf, '/path/image.enc')).rejects.toThrow('write failed');
    expect(fs.unlink).toHaveBeenCalledWith('/path/image.enc.tmp');
  });
});

describe('loadEncryptedBuffer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('decrypts and returns buffer from file', async () => {
    const originalBuf = Buffer.from('test-data');
    const base64 = originalBuf.toString('base64');
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from(base64));
    vi.mocked(safeStorage.decryptString).mockReturnValue(base64);

    const result = await loadEncryptedBuffer('/path/image.enc');
    expect(result).toEqual(originalBuf);
  });

  it('throws FILE_NOT_FOUND for missing file', async () => {
    vi.mocked(fs.access).mockRejectedValueOnce(Object.assign(new Error(), { code: 'ENOENT' }));
    await expect(loadEncryptedBuffer('/path/image.enc')).rejects.toThrow('FILE_NOT_FOUND');
  });

  it('throws original error for non-ENOENT errors', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('read failed'));
    await expect(loadEncryptedBuffer('/path/image.enc')).rejects.toThrow('read failed');
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
