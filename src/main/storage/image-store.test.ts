import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('electron', () => ({
  nativeImage: {
    createFromDataURL: vi.fn().mockReturnValue({
      getSize: () => ({ width: 400, height: 300 }),
      resize: vi.fn().mockReturnValue({
        toDataURL: () => 'data:image/png;base64,thumb',
      }),
    }),
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn().mockReturnValue(true),
    encryptString: vi.fn((str: string) => Buffer.from(str)),
    decryptString: vi.fn((buf: Buffer) => buf.toString()),
  },
}));

vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn(),
    rename: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
    access: vi.fn().mockResolvedValue(undefined),
    rm: vi.fn().mockResolvedValue(undefined),
  },
}));

import { saveImage, loadImage, loadThumbnail, deleteImage, deleteAllImages } from './image-store';
import { nativeImage } from 'electron';
import { promises as fs } from 'fs';

describe('saveImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves full image and thumbnail, returns thumbnail data URL', async () => {
    const result = await saveImage('img-123', 'data:image/png;base64,full', '/data');

    expect(result).toBe('data:image/png;base64,thumb');
    expect(fs.mkdir).toHaveBeenCalled();
    // Full image + thumbnail = 2 encrypted saves
    expect(fs.writeFile).toHaveBeenCalledTimes(2);
    expect(fs.rename).toHaveBeenCalledTimes(2);
  });

  it('resizes image to 200px wide thumbnail', async () => {
    await saveImage('img-456', 'data:image/png;base64,full', '/data');

    expect(nativeImage.createFromDataURL).toHaveBeenCalledWith('data:image/png;base64,full');
    const mockImage = vi.mocked(nativeImage.createFromDataURL).mock.results[0].value;
    expect(mockImage.resize).toHaveBeenCalledWith({ width: 200, height: 150 });
  });

  it('caps thumbnail width to original width for small images', async () => {
    vi.mocked(nativeImage.createFromDataURL).mockReturnValueOnce({
      getSize: () => ({ width: 100, height: 50 }),
      resize: vi.fn().mockReturnValue({
        toDataURL: () => 'data:image/png;base64,smallthumb',
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await saveImage('img-small', 'data:image/png;base64,small', '/data');
    expect(result).toBe('data:image/png;base64,smallthumb');
    const mockImage = vi.mocked(nativeImage.createFromDataURL).mock.results[0].value;
    expect(mockImage.resize).toHaveBeenCalledWith({ width: 100, height: 50 });
  });
});

describe('loadImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and returns the full image data URL', async () => {
    const dataUrl = 'data:image/png;base64,full';
    vi.mocked(fs.readFile).mockResolvedValueOnce(Buffer.from(JSON.stringify(dataUrl)));

    const result = await loadImage('img-123', '/data');
    expect(result).toBe(dataUrl);
  });

  it('throws FILE_NOT_FOUND for missing file', async () => {
    vi.mocked(fs.access).mockRejectedValueOnce(Object.assign(new Error(), { code: 'ENOENT' }));
    await expect(loadImage('missing', '/data')).rejects.toThrow('FILE_NOT_FOUND');
  });
});

describe('loadThumbnail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and returns the thumbnail data URL', async () => {
    const thumbUrl = 'data:image/png;base64,thumb';
    vi.mocked(fs.readFile).mockResolvedValueOnce(Buffer.from(JSON.stringify(thumbUrl)));

    const result = await loadThumbnail('img-123', '/data');
    expect(result).toBe(thumbUrl);
  });
});

describe('deleteImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes both full and thumbnail files', async () => {
    await deleteImage('img-123', '/data');
    expect(fs.unlink).toHaveBeenCalledTimes(2);
  });

  it('ignores errors when files do not exist', async () => {
    vi.mocked(fs.unlink).mockRejectedValue(new Error('ENOENT'));
    await expect(deleteImage('missing', '/data')).resolves.not.toThrow();
  });
});

describe('deleteAllImages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('removes the entire images directory', async () => {
    await deleteAllImages('/data');
    expect(fs.rm).toHaveBeenCalledWith(expect.stringContaining('images'), {
      recursive: true,
      force: true,
    });
  });

  it('ignores errors when directory does not exist', async () => {
    vi.mocked(fs.rm).mockRejectedValue(new Error('ENOENT'));
    await expect(deleteAllImages('/data')).resolves.not.toThrow();
  });
});
