import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('electron', () => ({
  app: { getPath: vi.fn().mockReturnValue('/mock/userData') },
  nativeImage: { createFromDataURL: vi.fn() },
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
    access: vi.fn().mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' })),
    mkdir: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn().mockResolvedValue([]),
    stat: vi.fn().mockRejectedValue(new Error('ENOENT')),
  },
}));

vi.mock('./file-operations', () => ({
  saveEncryptedJson: vi.fn().mockResolvedValue(undefined),
  loadEncryptedJson: vi.fn(),
  saveJsonFile: vi.fn().mockResolvedValue(undefined),
  loadJsonFile: vi.fn().mockRejectedValue(new Error('FILE_NOT_FOUND')),
  ensureDataDirectory: vi.fn().mockResolvedValue(undefined),
  isEncryptionAvailable: vi.fn().mockReturnValue(true),
}));

vi.mock('./image-store', () => ({
  saveImage: vi.fn(),
  deleteImage: vi.fn().mockResolvedValue(undefined),
  deleteAllImages: vi.fn().mockResolvedValue(undefined),
}));

import type { StoredClip } from '../../shared/types';

const history: StoredClip[] = [
  { clip: { id: 'a', type: 'text', content: 'kept' }, isLocked: false, timestamp: 1 },
  {
    clip: { id: 'b', type: 'image', content: 'img-1', imageId: 'img-1' },
    isLocked: true,
    timestamp: 2,
  },
];

const notFound = () => Promise.reject(new Error('FILE_NOT_FOUND'));
const decryptFailure = () =>
  Promise.reject(new Error('Error while decrypting the ciphertext provided to safeStorage.'));

// The module exports one instance, so each test imports a fresh copy of it along with the
// mocked collaborators that copy is wired to
let storage: typeof import('./index.js').storage;
let fileOperations: typeof import('./file-operations.js');
let imageStore: typeof import('./image-store.js');

beforeEach(async () => {
  vi.resetModules();
  fileOperations = await import('./file-operations.js');
  imageStore = await import('./image-store.js');
  ({ storage } = await import('./index.js'));
  // The mocked modules keep their spies across the reset, so clear what earlier tests set
  vi.clearAllMocks();
  vi.mocked(fileOperations.isEncryptionAvailable).mockReturnValue(true);
});

// Resolves once the background load has run to completion
const initialiseAndWaitForLoad = async () => {
  const done = new Promise<void>((resolve) => storage.setOnBackgroundLoadComplete(resolve));
  await storage.initialize();
  await done;
};

// Every domain file is missing except clips, which is served by `clips`
const serveFiles = (clips: () => Promise<unknown>) => {
  vi.mocked(fileOperations.loadEncryptedJson).mockImplementation((filePath: string) =>
    filePath.endsWith('clips.enc') ? (clips() as Promise<never>) : (notFound() as Promise<never>)
  );
};

describe('SecureStorage load state', () => {
  it('reports the load as incomplete until the background load finishes', async () => {
    let finishClips!: (value: StoredClip[]) => void;
    const pending = new Promise<StoredClip[]>((resolve) => (finishClips = resolve));
    serveFiles(() => pending);

    const done = new Promise<void>((resolve) => storage.setOnBackgroundLoadComplete(resolve));
    await storage.initialize();

    expect(storage.getLoadState()).toEqual({ complete: false, error: null });
    expect(await storage.getClips()).toEqual([]);

    finishClips(history);
    await done;

    expect(storage.getLoadState()).toEqual({ complete: true, error: null });
    expect((await storage.getClips()).map((c) => c.clip.id)).toEqual(['a', 'b']);
  });

  it('hands out the clips with the load state they were read under', async () => {
    let finishClips!: (value: StoredClip[]) => void;
    const pending = new Promise<StoredClip[]>((resolve) => (finishClips = resolve));
    serveFiles(() => pending);

    const done = new Promise<void>((resolve) => storage.setOnBackgroundLoadComplete(resolve));
    await storage.initialize();

    expect(await storage.getClipsSnapshot()).toEqual({
      loadState: { complete: false, error: null },
      clips: [],
    });

    finishClips(history);
    await done;

    const loaded = await storage.getClipsSnapshot();
    expect(loaded.loadState).toEqual({ complete: true, error: null });
    expect(loaded.clips.map((c) => c.clip.id)).toEqual(['a', 'b']);
  });

  it('treats a missing clips file as a successful, empty load', async () => {
    serveFiles(notFound);
    await initialiseAndWaitForLoad();

    expect(storage.getLoadState()).toEqual({ complete: true, error: null });
  });

  it('reports a failed load when the clips file cannot be decrypted', async () => {
    serveFiles(decryptFailure);
    await initialiseAndWaitForLoad();

    const state = storage.getLoadState();
    expect(state.complete).toBe(true);
    expect(state.error).toMatch(/decrypting/);
  });

  it('reports a failed load when encryption is unavailable', async () => {
    vi.mocked(fileOperations.isEncryptionAvailable).mockReturnValue(false);
    await initialiseAndWaitForLoad();

    expect(storage.getLoadState()).toEqual({
      complete: true,
      error: expect.stringMatching(/Encryption is not available/),
    });
  });
});

describe('SecureStorage.saveClips guard', () => {
  it('refuses to save while the background load is still running', async () => {
    serveFiles(() => new Promise<StoredClip[]>(() => {}));
    await storage.initialize();

    await expect(storage.saveClips([], {})).rejects.toThrow(/not finished loading/);
    expect(fileOperations.saveEncryptedJson).not.toHaveBeenCalled();
    expect(imageStore.deleteImage).not.toHaveBeenCalled();
  });

  it('refuses to save over a history that could not be read', async () => {
    serveFiles(decryptFailure);
    await initialiseAndWaitForLoad();

    await expect(storage.saveClips([], {})).rejects.toThrow(/could not be loaded/);
    expect(fileOperations.saveEncryptedJson).not.toHaveBeenCalled();
    expect(imageStore.deleteImage).not.toHaveBeenCalled();
  });

  it('saves normally once the history has loaded', async () => {
    serveFiles(() => Promise.resolve(history));
    await initialiseAndWaitForLoad();

    await storage.saveClips([{ id: 'c', type: 'text', content: 'new' }], {});

    const mockedSave = vi.mocked(fileOperations.saveEncryptedJson);
    expect(mockedSave).toHaveBeenCalledTimes(1);
    const [saved, filePath] = mockedSave.mock.calls[0];
    expect(filePath).toMatch(/clips\.enc$/);
    expect((saved as StoredClip[]).map((c) => c.clip.id)).toEqual(['c']);
    // The image the replaced history referenced is cleaned up as before
    expect(imageStore.deleteImage).toHaveBeenCalledWith('img-1', expect.any(String));
  });
});
