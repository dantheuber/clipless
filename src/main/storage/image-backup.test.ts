import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

vi.mock('electron', () => ({
  app: { getPath: vi.fn() },
  nativeImage: {
    createFromDataURL: vi.fn().mockReturnValue({
      getSize: () => ({ width: 800, height: 600 }),
      resize: () => ({ toDataURL: () => 'data:image/png;base64,thumbnail' }),
    }),
  },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (value: string) => Buffer.from(value),
    decryptString: (value: Buffer) => value.toString(),
  },
}));

// Lets a test hold every image read open, so an export can be caught mid-flight
let imageGate: Promise<void> = Promise.resolve();
vi.mock('./image-store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./image-store')>();
  return {
    ...actual,
    loadImage: async (...args: Parameters<typeof actual.loadImage>) => {
      await imageGate;
      return actual.loadImage(...args);
    },
  };
});
import { app } from 'electron';
import type { AppData, StoredClip } from '../../shared/types';
import { loadImage, saveImage } from './image-store';

const fullImage = 'data:image/png;base64,original-full-size-image';
const imageClip: StoredClip = {
  clip: {
    id: 'clip-1',
    type: 'image',
    content: 'image-1',
    imageId: 'image-1',
    thumbnailDataUrl: 'data:image/png;base64,thumbnail',
  },
  isLocked: true,
  timestamp: 123,
};

let userDataPath: string;
let dataPath: string;
let storage: typeof import('./index.js').storage;

async function loadStorage() {
  vi.resetModules();
  const { storage } = await import('./index.js');
  const loaded = new Promise<void>((resolve) => storage.setOnBackgroundLoadComplete(resolve));
  await storage.initialize();
  await loaded;
  return storage;
}

beforeEach(async () => {
  userDataPath = await fs.mkdtemp(join(tmpdir(), 'clipless-backup-'));
  dataPath = join(userDataPath, 'clipless-data');
  vi.mocked(app.getPath).mockReturnValue(userDataPath);
  imageGate = Promise.resolve();
  storage = await loadStorage();
});

afterEach(async () => {
  await storage.flush();
  await fs.rm(userDataPath, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe('image backups', () => {
  it('exports full images inline without changing the stored clips', async () => {
    await saveImage('image-1', fullImage, dataPath);
    const textClip: StoredClip = {
      clip: { id: 'clip-2', type: 'text', content: 'kept' },
      isLocked: false,
      timestamp: 456,
    };
    await storage.importData(JSON.stringify({ clips: [imageClip, textClip] }));

    const backup: AppData = JSON.parse(await storage.exportData());

    expect(backup.clips).toEqual([
      { ...imageClip, clip: { id: 'clip-1', type: 'image', content: fullImage } },
      textClip,
    ]);
    expect(await storage.getClips()).toEqual([imageClip, textClip]);
    expect(await loadImage('image-1', dataPath)).toBe(fullImage);
  });

  it('restores the original image after export, clear, import and a fresh load', async () => {
    await saveImage('image-1', fullImage, dataPath);
    await storage.importData(JSON.stringify({ clips: [imageClip] }));
    const backup = await storage.exportData();

    await storage.clearAllData();
    await expect(loadImage('image-1', dataPath)).rejects.toThrow('FILE_NOT_FOUND');
    expect(await storage.getClips()).toEqual([]);

    await storage.importData(backup);
    storage = await loadStorage();
    const [restored] = await storage.getClips();

    expect(storage.getLoadState()).toEqual({ complete: true, error: null });
    expect(restored).toEqual({
      ...imageClip,
      clip: { ...imageClip.clip, content: expect.any(String), imageId: expect.any(String) },
    });
    expect(restored.clip.imageId).not.toBe('image-1');
    expect(restored.clip.content).toBe(restored.clip.imageId);
    expect(await loadImage(restored.clip.imageId!, dataPath)).toBe(fullImage);
    expect(JSON.parse(await storage.exportData()).clips).toEqual(JSON.parse(backup).clips);
  });

  it.each(['missing', 'corrupt', 'invalid'])(
    'rejects the export when an image is %s so no ID-only backup is saved',
    async (state) => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      await saveImage('image-2', fullImage, dataPath);
      if (state === 'corrupt') {
        await fs.writeFile(join(dataPath, 'images', 'image-1.enc'), 'not json');
      } else if (state === 'invalid') {
        await saveImage('image-1', 'image-1', dataPath);
      }
      const availableClip: StoredClip = {
        ...imageClip,
        clip: { ...imageClip.clip, id: 'clip-2', content: 'image-2', imageId: 'image-2' },
      };
      await storage.importData(JSON.stringify({ clips: [imageClip, availableClip] }));

      await expect(storage.exportData()).rejects.toThrow(/Image for clip clip-1/);
      expect(await storage.getClips()).toEqual([imageClip, availableClip]);
    }
  );

  it('exports an inline image clip that has no image ID as-is', async () => {
    const inlineClip: StoredClip = {
      ...imageClip,
      clip: { id: 'clip-3', type: 'image', content: fullImage },
    };
    await storage.importData(JSON.stringify({ clips: [inlineClip] }));

    expect(JSON.parse(await storage.exportData()).clips).toEqual([inlineClip]);
  });

  it('clear all waits for an export that is still reading images, so the backup is whole', async () => {
    await saveImage('image-1', fullImage, dataPath);
    await storage.importData(JSON.stringify({ clips: [imageClip] }));
    let release: () => void = () => {};
    imageGate = new Promise<void>((resolve) => (release = resolve));

    const exporting = storage.exportData();
    let cleared = false;
    const clearing = storage.clearAllData().then(() => (cleared = true));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(cleared).toBe(false);
    await expect(fs.access(join(dataPath, 'images', 'image-1.enc'))).resolves.toBeUndefined();

    release();
    const backup: AppData = JSON.parse(await exporting);
    await clearing;

    expect(backup.clips).toEqual([
      { ...imageClip, clip: { id: 'clip-1', type: 'image', content: fullImage } },
    ]);
    expect(cleared).toBe(true);
    expect(await storage.getClips()).toEqual([]);
    await expect(loadImage('image-1', dataPath)).rejects.toThrow('FILE_NOT_FOUND');
  });

  it('clear all goes ahead once a pending export has failed', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await storage.importData(JSON.stringify({ clips: [imageClip] }));
    let release: () => void = () => {};
    imageGate = new Promise<void>((resolve) => (release = resolve));

    const exporting = storage.exportData();
    const clearing = storage.clearAllData();
    release();

    await expect(exporting).rejects.toThrow(/could not be read/);
    await clearing;
    expect(await storage.getClips()).toEqual([]);
  });
});
