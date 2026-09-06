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

import type {
  StoredClip,
  Template,
  SearchTerm,
  QuickTool,
  QuickClipsConfig,
} from '../../shared/types';
import { DEFAULT_SETTINGS } from './defaults';

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
    expect(state.error).toEqual({
      message: expect.stringMatching(/decrypting/),
      recoverable: false,
    });
  });

  it('reports a failed load when the clips file does not hold a list', async () => {
    serveFiles(() => Promise.resolve({ clips: history }));
    await initialiseAndWaitForLoad();

    const state = storage.getLoadState();
    expect(state.complete).toBe(true);
    expect(state.error).toEqual({
      message: expect.stringMatching(/not a list/),
      recoverable: false,
    });
    expect(await storage.getClips()).toEqual([]);
  });

  it('reports a failed load when encryption is unavailable', async () => {
    vi.mocked(fileOperations.isEncryptionAvailable).mockReturnValue(false);
    await initialiseAndWaitForLoad();

    expect(storage.getLoadState()).toEqual({
      complete: true,
      error: { message: expect.stringMatching(/Encryption is not available/), recoverable: true },
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

// ===== The rest of the class: every domain the load feeds and every write that follows =====

const term = (id: string, pattern = '(?<ip>\\d+)'): SearchTerm => ({
  id,
  name: id,
  pattern,
  enabled: true,
  createdAt: 1,
  updatedAt: 1,
  order: 0,
});
const tool = (id: string): QuickTool => ({
  id,
  name: id,
  url: 'https://example.test/?q={ip}',
  captureGroups: ['ip'],
  createdAt: 1,
  updatedAt: 1,
  order: 0,
});
const template = (id: string): Template => ({
  id,
  name: id,
  content: `${id} body`,
  createdAt: 1,
  updatedAt: 1,
  order: 0,
});
const quickClips = (overrides: Partial<QuickClipsConfig> = {}): QuickClipsConfig => ({
  searchTerms: [],
  tools: [],
  version: '2.0.0',
  ...overrides,
});

type Domain = 'settings' | 'clips' | 'templates';

// Serve the named domain files; anything else is missing
const serveDomains = (files: Partial<Record<Domain, () => Promise<unknown>>>) => {
  vi.mocked(fileOperations.loadEncryptedJson).mockImplementation((filePath: string) => {
    const domain = (Object.keys(files) as Domain[]).find((d) => filePath.endsWith(`${d}.enc`));
    return (domain ? files[domain]!() : notFound()) as Promise<never>;
  });
};

let fs: typeof import('fs').promises;
let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  ({ promises: fs } = await import('fs'));
  // The fs mock keeps its instance across the module reset, so restore the empty-disk default
  vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT'));
  serveDomains({});
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('SecureStorage initialisation', () => {
  it('initialises once', async () => {
    await initialiseAndWaitForLoad();
    await storage.initialize();

    expect(fileOperations.ensureDataDirectory).toHaveBeenCalledTimes(1);
  });

  it('keeps the defaults and reports a recoverable failure when the load itself throws', async () => {
    vi.mocked(fileOperations.ensureDataDirectory).mockRejectedValueOnce(new Error('EACCES'));
    await initialiseAndWaitForLoad();

    expect(storage.getLoadState()).toEqual({
      complete: true,
      error: { message: 'EACCES', recoverable: true },
    });
    await expect(storage.saveClips([], {})).rejects.toThrow(/EACCES/);
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to load data in background:',
      expect.any(Error)
    );
  });

  it('describes a failure that is not an Error object', async () => {
    serveFiles(() => Promise.reject('keystore locked'));
    await initialiseAndWaitForLoad();

    expect(storage.getLoadState().error).toEqual({
      message: 'keystore locked',
      recoverable: false,
    });
  });

  it('calls a completion callback at once when the load has already finished', async () => {
    await initialiseAndWaitForLoad();
    const callback = vi.fn();

    storage.setOnBackgroundLoadComplete(callback);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  const firstUse: [string, () => Promise<unknown>][] = [
    ['getClips', () => storage.getClips()],
    ['getClipsSnapshot', () => storage.getClipsSnapshot()],
    ['saveClips', () => storage.saveClips([], {})],
    ['getSettings', () => storage.getSettings()],
    ['saveSettings', () => storage.saveSettings({ maxClips: 4 })],
    ['updateSetting', () => storage.updateSetting('startMinimized', true)],
    ['getTemplates', () => storage.getTemplates()],
    ['createTemplate', () => storage.createTemplate('t', 'body')],
    ['updateTemplate', () => storage.updateTemplate('missing', { name: 'x' })],
    ['deleteTemplate', () => storage.deleteTemplate('missing')],
    ['reorderTemplates', () => storage.reorderTemplates([])],
    ['generateTextFromTemplate', () => storage.generateTextFromTemplate('missing', [])],
    ['getSearchTerms', () => storage.getSearchTerms()],
    ['createSearchTerm', () => storage.createSearchTerm('s', '(?<ip>\\d+)')],
    ['updateSearchTerm', () => storage.updateSearchTerm('missing', { name: 'x' })],
    ['deleteSearchTerm', () => storage.deleteSearchTerm('missing')],
    ['getQuickTools', () => storage.getQuickTools()],
    ['createQuickTool', () => storage.createQuickTool('q', 'https://example.test/{ip}', ['ip'])],
    ['updateQuickTool', () => storage.updateQuickTool('missing', { name: 'x' })],
    ['deleteQuickTool', () => storage.deleteQuickTool('missing')],
    ['getGroupColours', () => storage.getGroupColours()],
    ['setGroupColours', () => storage.setGroupColours({})],
    ['importQuickClipsConfig', () => storage.importQuickClipsConfig(quickClips())],
    ['clearAllData', () => storage.clearAllData()],
    ['exportData', () => storage.exportData()],
    ['importData', () => storage.importData('{}')],
    ['getStorageStats', () => storage.getStorageStats()],
  ];

  it.each(firstUse)('%s initialises storage on first use', async (_name, call) => {
    await call().catch(() => undefined);

    expect(fileOperations.ensureDataDirectory).toHaveBeenCalledTimes(1);
  });
});

describe('SecureStorage domain loading', () => {
  it('merges stored settings over the defaults', async () => {
    serveDomains({ settings: () => Promise.resolve({ maxClips: 5 }) });
    await initialiseAndWaitForLoad();

    const settings = await storage.getSettings();
    expect(settings.maxClips).toBe(5);
    expect(settings.theme).toBe(DEFAULT_SETTINGS.theme);
    expect(settings.hotkeys).toEqual(DEFAULT_SETTINGS.hotkeys);
  });

  it('keeps the default settings when the file does not hold an object', async () => {
    serveDomains({ settings: () => Promise.resolve(null) });
    await initialiseAndWaitForLoad();

    expect((await storage.getSettings()).maxClips).toBe(DEFAULT_SETTINGS.maxClips);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('logs a settings file that cannot be read and still completes the load', async () => {
    serveDomains({ settings: () => Promise.reject(new Error('corrupt')) });
    await initialiseAndWaitForLoad();

    expect(consoleError).toHaveBeenCalledWith('Failed to load settings:', expect.any(Error));
    expect(storage.getLoadState()).toEqual({ complete: true, error: null });
  });

  it('loads templates, search terms, tools and colours from the templates file', async () => {
    serveDomains({
      templates: () =>
        Promise.resolve({
          templates: [template('t1')],
          searchTerms: [term('s1')],
          quickTools: [tool('q1')],
          groupColours: { ip: 3 },
        }),
    });
    await initialiseAndWaitForLoad();

    expect((await storage.getTemplates()).map((t) => t.id)).toEqual(['t1']);
    expect((await storage.getSearchTerms()).map((t) => t.id)).toEqual(['s1']);
    expect((await storage.getQuickTools()).map((t) => t.id)).toEqual(['q1']);
    expect(await storage.getGroupColours()).toEqual({ ip: 3 });
  });

  it('loads a templates file that carries no colours', async () => {
    serveDomains({
      templates: () =>
        Promise.resolve({ templates: [], searchTerms: [term('s1')], quickTools: [] }),
    });
    await initialiseAndWaitForLoad();

    expect((await storage.getSearchTerms()).map((t) => t.id)).toEqual(['s1']);
    expect(await storage.getGroupColours()).toEqual({});
  });

  it('keeps empty lists when the templates file does not hold an object', async () => {
    serveDomains({ templates: () => Promise.resolve(null) });
    await initialiseAndWaitForLoad();

    expect(await storage.getTemplates()).toEqual([]);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('logs a templates file that cannot be read', async () => {
    serveDomains({ templates: () => Promise.reject(new Error('corrupt')) });
    await initialiseAndWaitForLoad();

    expect(consoleError).toHaveBeenCalledWith('Failed to load templates data:', expect.any(Error));
    expect(storage.getLoadState()).toEqual({ complete: true, error: null });
  });

  it('reads the stored meta', async () => {
    vi.mocked(fileOperations.loadJsonFile).mockResolvedValueOnce({
      version: '1.2.3',
      storageVersion: 1,
    });
    await initialiseAndWaitForLoad();

    expect(JSON.parse(await storage.exportData()).version).toBe('1.2.3');
  });

  it('fills in meta fields the file lacks', async () => {
    vi.mocked(fileOperations.loadJsonFile).mockResolvedValueOnce({});
    await initialiseAndWaitForLoad();

    expect(JSON.parse(await storage.exportData()).version).toBe('0.0.0-test');
  });

  it('keeps the default meta when the file does not hold an object', async () => {
    vi.mocked(fileOperations.loadJsonFile).mockResolvedValueOnce(null);
    await initialiseAndWaitForLoad();

    expect(JSON.parse(await storage.exportData()).version).toBe('0.0.0-test');
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('logs a meta file that cannot be read', async () => {
    vi.mocked(fileOperations.loadJsonFile).mockRejectedValueOnce(new Error('corrupt'));
    await initialiseAndWaitForLoad();

    expect(consoleError).toHaveBeenCalledWith('Failed to load meta:', expect.any(Error));
    expect(storage.getLoadState()).toEqual({ complete: true, error: null });
  });

  it('moves inline base64 images into image files and saves the clips once', async () => {
    vi.mocked(imageStore.saveImage).mockResolvedValue('thumb');
    serveFiles(() =>
      Promise.resolve([
        {
          clip: { id: 'inline', type: 'image', content: 'data:image/png;base64,AAAA' },
          isLocked: false,
          timestamp: 1,
        },
        {
          clip: { id: 'filed', type: 'image', content: 'img-1', imageId: 'img-1' },
          isLocked: false,
          timestamp: 2,
        },
        {
          clip: { id: 'odd', type: 'image', content: 'not-a-data-url' },
          isLocked: false,
          timestamp: 3,
        },
        { clip: { id: 'text', type: 'text', content: 'words' }, isLocked: false, timestamp: 4 },
      ])
    );
    await initialiseAndWaitForLoad();

    const clips = await storage.getClips();
    const moved = clips.find((c) => c.clip.id === 'inline')!.clip;
    expect(imageStore.saveImage).toHaveBeenCalledTimes(1);
    expect(imageStore.saveImage).toHaveBeenCalledWith(
      moved.imageId,
      'data:image/png;base64,AAAA',
      expect.any(String)
    );
    expect(moved.content).toBe(moved.imageId);
    expect(moved.thumbnailDataUrl).toBe('thumb');
    expect(clips.find((c) => c.clip.id === 'odd')!.clip.content).toBe('not-a-data-url');
    const mockedSave = vi.mocked(fileOperations.saveEncryptedJson);
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave.mock.calls[0][1]).toMatch(/clips\.enc$/);
  });

  it('keeps an inline image in place when it cannot be moved, and writes nothing', async () => {
    vi.mocked(imageStore.saveImage).mockRejectedValue(new Error('disk full'));
    serveFiles(() =>
      Promise.resolve([
        {
          clip: { id: 'inline', type: 'image', content: 'data:image/png;base64,AAAA' },
          isLocked: false,
          timestamp: 1,
        },
      ])
    );
    await initialiseAndWaitForLoad();

    expect((await storage.getClips())[0].clip.content).toBe('data:image/png;base64,AAAA');
    expect(consoleError).toHaveBeenCalledWith('Failed to migrate inline image:', expect.any(Error));
    expect(fileOperations.saveEncryptedJson).not.toHaveBeenCalled();
    expect(storage.getLoadState()).toEqual({ complete: true, error: null });
  });
});

describe('SecureStorage.flush', () => {
  it('resolves once every pending write has finished', async () => {
    await initialiseAndWaitForLoad();
    let finishWrite!: () => void;
    vi.mocked(fileOperations.saveEncryptedJson).mockReturnValueOnce(
      new Promise<void>((resolve) => (finishWrite = resolve))
    );

    const save = storage.saveSettings({ maxClips: 9 });
    let flushed = false;
    const flush = storage.flush().then(() => {
      flushed = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(flushed).toBe(false);

    finishWrite();
    await Promise.all([save, flush]);
    expect(flushed).toBe(true);
  });
});

describe('SecureStorage settings', () => {
  it('persists a settings migration the first time it applies', async () => {
    serveDomains({
      settings: () =>
        Promise.resolve({
          maxClips: 5,
          hotkeys: { openToolsLauncher: { enabled: true, key: 'CommandOrControl+Shift+X' } },
        }),
    });
    await initialiseAndWaitForLoad();

    const settings = await storage.getSettings();
    expect(settings.hotkeys?.quickLook.key).toBe('CommandOrControl+Shift+X');
    const mockedSave = vi.mocked(fileOperations.saveEncryptedJson);
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave.mock.calls[0][1]).toMatch(/settings\.enc$/);

    await storage.getSettings();
    expect(mockedSave).toHaveBeenCalledTimes(1);
  });

  it('merges saved settings into the stored ones', async () => {
    await initialiseAndWaitForLoad();

    await storage.saveSettings({ maxClips: 9 });
    await storage.updateSetting('startMinimized', true);

    const settings = await storage.getSettings();
    expect(settings.maxClips).toBe(9);
    expect(settings.startMinimized).toBe(true);
    expect(settings.theme).toBe(DEFAULT_SETTINGS.theme);
    expect(fileOperations.saveEncryptedJson).toHaveBeenCalledTimes(2);
  });
});

describe('SecureStorage templates', () => {
  it('creates, updates, reorders, renders and deletes templates', async () => {
    await initialiseAndWaitForLoad();

    const a = await storage.createTemplate('A', 'plain text');
    const b = await storage.createTemplate('B', 'other text');
    expect((await storage.getTemplates()).map((t) => t.id)).toEqual([a.id, b.id]);

    expect((await storage.updateTemplate(b.id, { name: 'B2' })).name).toBe('B2');

    await storage.reorderTemplates([b, a, { ...a, id: 'ghost' }]);
    expect((await storage.getTemplates()).map((t) => t.id)).toEqual([b.id, a.id]);

    expect(await storage.generateTextFromTemplate(a.id, ['clip'])).toBe('plain text');

    await storage.deleteTemplate(a.id);
    const remaining = await storage.getTemplates();
    expect(remaining.map((t) => [t.id, t.order])).toEqual([[b.id, 0]]);
  });

  it('rejects unknown template ids', async () => {
    await initialiseAndWaitForLoad();

    await expect(storage.updateTemplate('missing', { name: 'x' })).rejects.toThrow(
      'Template not found'
    );
    await expect(storage.deleteTemplate('missing')).rejects.toThrow('Template not found');
    await expect(storage.generateTextFromTemplate('missing', [])).rejects.toThrow(
      'Template not found'
    );
  });
});

describe('SecureStorage search terms', () => {
  it('creates, updates and deletes search terms', async () => {
    await initialiseAndWaitForLoad();

    const a = await storage.createSearchTerm('A', '(?<ip>\\d+)');
    const b = await storage.createSearchTerm('B', '(?<host>\\w+)');
    expect((await storage.getSearchTerms()).map((t) => t.id)).toEqual([a.id, b.id]);

    expect((await storage.updateSearchTerm(a.id, { enabled: false })).enabled).toBe(false);

    await storage.deleteSearchTerm(a.id);
    expect((await storage.getSearchTerms()).map((t) => [t.id, t.order])).toEqual([[b.id, 0]]);
  });

  it('rejects unknown search term ids', async () => {
    await initialiseAndWaitForLoad();

    await expect(storage.updateSearchTerm('missing', { name: 'x' })).rejects.toThrow(
      'Search term not found'
    );
    await expect(storage.deleteSearchTerm('missing')).rejects.toThrow('Search term not found');
  });
});

describe('SecureStorage quick tools', () => {
  it('creates, updates and deletes quick tools', async () => {
    await initialiseAndWaitForLoad();

    const a = await storage.createQuickTool('A', 'https://a.test/{ip}', ['ip']);
    const b = await storage.createQuickTool('B', 'https://b.test/{ip}', ['ip']);
    expect((await storage.getQuickTools()).map((t) => t.id)).toEqual([a.id, b.id]);

    expect((await storage.updateQuickTool(a.id, { name: 'A2' })).name).toBe('A2');

    await storage.deleteQuickTool(a.id);
    expect((await storage.getQuickTools()).map((t) => [t.id, t.order])).toEqual([[b.id, 0]]);
  });

  it('rejects unknown quick tool ids', async () => {
    await initialiseAndWaitForLoad();

    await expect(storage.updateQuickTool('missing', { name: 'x' })).rejects.toThrow(
      'Quick tool not found'
    );
    await expect(storage.deleteQuickTool('missing')).rejects.toThrow('Quick tool not found');
  });
});

describe('SecureStorage group colours', () => {
  it('starts empty, keeps colours for groups in use and drops the rest on save', async () => {
    await initialiseAndWaitForLoad();
    expect(await storage.getGroupColours()).toEqual({});

    await storage.createSearchTerm('ips', '(?<ip>\\d+)');
    expect(await storage.setGroupColours({ ip: 2, stale: 5 })).toEqual({ ip: 2 });
    expect(await storage.getGroupColours()).toEqual({ ip: 2 });

    expect(await storage.setGroupColours({ ip: 3 })).toEqual({ ip: 3 });
  });
});

describe('SecureStorage.importQuickClipsConfig', () => {
  it('appends terms, tools and templates after the existing ones when merging', async () => {
    await initialiseAndWaitForLoad();

    await storage.importQuickClipsConfig(
      quickClips({ searchTerms: [term('s1')], tools: [tool('q1')], templates: [template('t1')] })
    );
    await storage.importQuickClipsConfig(
      quickClips({ searchTerms: [term('s2')], tools: [tool('q2')], templates: [template('t2')] }),
      'merge'
    );

    expect((await storage.getSearchTerms()).map((t) => [t.name, t.order])).toEqual([
      ['s1', 0],
      ['s2', 1],
    ]);
    expect((await storage.getQuickTools()).map((t) => [t.name, t.order])).toEqual([
      ['q1', 0],
      ['q2', 1],
    ]);
    expect((await storage.getTemplates()).map((t) => [t.id, t.order])).toEqual([
      ['t1', 0],
      ['t2', 1],
    ]);
    expect(fileOperations.saveEncryptedJson).toHaveBeenCalledTimes(2);
  });

  it('skips templates missing an id, name or content, and a templates field that is not a list', async () => {
    await initialiseAndWaitForLoad();

    await storage.importQuickClipsConfig(
      quickClips({
        templates: [
          template('ok'),
          { ...template('no-id'), id: '' },
          { ...template('no-name'), name: '' },
          { ...template('no-content'), content: '' },
        ],
      })
    );
    await storage.importQuickClipsConfig(
      quickClips({ templates: 'nope' as unknown as Template[] })
    );
    await storage.importQuickClipsConfig(quickClips({ templates: [] }));

    expect((await storage.getTemplates()).map((t) => t.id)).toEqual(['ok']);
  });

  it('writes nothing when a merge brings nothing new', async () => {
    await initialiseAndWaitForLoad();

    await storage.importQuickClipsConfig(quickClips());

    expect(fileOperations.saveEncryptedJson).not.toHaveBeenCalled();
  });

  it('replaces the lists and the colour map when replacing', async () => {
    await initialiseAndWaitForLoad();
    await storage.createSearchTerm('old', '(?<old>\\d+)');
    await storage.setGroupColours({ old: 1 });

    await storage.importQuickClipsConfig(
      quickClips({ searchTerms: [term('s1')], groupColours: { ip: 4 } }),
      'replace'
    );

    expect((await storage.getSearchTerms()).map((t) => t.name)).toEqual(['s1']);
    expect(await storage.getGroupColours()).toEqual({ ip: 4 });
  });

  it('adds missing colours when merging and keeps the existing ones', async () => {
    await initialiseAndWaitForLoad();
    await storage.createSearchTerm('a', '(?<ip>\\d+):(?<port>\\d+)');
    await storage.setGroupColours({ ip: 1 });

    await storage.importQuickClipsConfig(quickClips({ groupColours: { ip: 9, port: 2 } }));

    expect(await storage.getGroupColours()).toEqual({ ip: 1, port: 2 });
  });
});

describe('SecureStorage window bounds', () => {
  it('writes and reads the bounds file', async () => {
    const bounds = { x: 1, y: 2, width: 300, height: 400 };

    await storage.saveWindowBounds(bounds);
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringMatching(/window-bounds\.json$/),
      JSON.stringify(bounds, null, 2)
    );

    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(bounds) as never);
    expect(await storage.getWindowBounds()).toEqual(bounds);
  });
});

describe('SecureStorage.clearAllData', () => {
  it('drops every domain file and image and resets to the defaults', async () => {
    serveFiles(() => Promise.resolve(history));
    await initialiseAndWaitForLoad();
    vi.mocked(fs.unlink).mockRejectedValueOnce(new Error('ENOENT'));

    await storage.clearAllData();

    expect(fs.unlink).toHaveBeenCalledTimes(4);
    expect(imageStore.deleteAllImages).toHaveBeenCalledWith(expect.any(String));
    expect(await storage.getClips()).toEqual([]);
  });
});

describe('SecureStorage.exportData', () => {
  it('exports every domain, with colours when some are set', async () => {
    serveDomains({
      clips: () => Promise.resolve(history),
      templates: () =>
        Promise.resolve({
          templates: [],
          searchTerms: [term('s1')],
          quickTools: [],
          groupColours: { ip: 2 },
        }),
    });
    vi.mocked(fileOperations.loadJsonFile).mockResolvedValueOnce({
      version: '1.2.3',
      storageVersion: 1,
    });
    await initialiseAndWaitForLoad();

    const data = JSON.parse(await storage.exportData());
    expect(data.clips.map((c: StoredClip) => c.clip.id)).toEqual(['a', 'b']);
    expect(data.searchTerms.map((t: SearchTerm) => t.id)).toEqual(['s1']);
    expect(data.groupColours).toEqual({ ip: 2 });
    expect(data.version).toBe('1.2.3');
  });

  it('leaves colours out of the export when none are set', async () => {
    await initialiseAndWaitForLoad();

    const data = JSON.parse(await storage.exportData());
    expect(data).not.toHaveProperty('groupColours');
    expect(data.version).toBe('0.0.0-test');
  });
});

describe('SecureStorage.importData', () => {
  it('replaces every domain from a backup and writes them all', async () => {
    await initialiseAndWaitForLoad();
    const backup = {
      clips: history,
      settings: { maxClips: 3 },
      templates: [template('t1')],
      searchTerms: [term('s1')],
      quickTools: [],
      groupColours: { ip: 1 },
      version: '9.9.9',
    };

    await storage.importData(JSON.stringify(backup));

    expect(fileOperations.saveEncryptedJson).toHaveBeenCalledTimes(3);
    expect(fileOperations.saveJsonFile).toHaveBeenCalledWith(
      { version: '9.9.9', storageVersion: 1 },
      expect.stringMatching(/meta\.json$/)
    );
    expect((await storage.getClips()).map((c) => c.clip.id)).toEqual(['a', 'b']);
    expect((await storage.getSettings()).maxClips).toBe(3);
    expect((await storage.getTemplates()).map((t) => t.id)).toEqual(['t1']);
    expect(await storage.getGroupColours()).toEqual({ ip: 1 });
  });

  it('imports a backup that carries no colours', async () => {
    await initialiseAndWaitForLoad();

    await storage.importData(JSON.stringify({ clips: history, version: '1.0.0' }));

    expect(await storage.getGroupColours()).toEqual({});
    expect(JSON.parse(await storage.exportData())).not.toHaveProperty('groupColours');
  });

  it('rejects a backup that is not JSON', async () => {
    await initialiseAndWaitForLoad();

    await expect(storage.importData('not json')).rejects.toThrow('Invalid data format');
    expect(consoleError).toHaveBeenCalledWith('Failed to import data:', expect.any(Error));
    expect(fileOperations.saveEncryptedJson).not.toHaveBeenCalled();
  });
});

describe('SecureStorage.getStorageStats', () => {
  it('sums the domain files and the images that can be measured', async () => {
    serveFiles(() => Promise.resolve(history));
    await initialiseAndWaitForLoad();
    vi.mocked(fs.stat).mockImplementation(async (filePath) => {
      const path = String(filePath);
      if (path.endsWith('clips.enc')) return { size: 10 } as never;
      if (path.endsWith('one.enc')) return { size: 5 } as never;
      throw new Error('ENOENT');
    });
    vi.mocked(fs.readdir).mockResolvedValueOnce(['one.enc', 'two.enc'] as never);

    expect(await storage.getStorageStats()).toEqual({ clipCount: 2, lockedCount: 1, dataSize: 15 });
  });

  it('reports the clip counts alone when nothing on disk can be measured', async () => {
    serveFiles(() => Promise.resolve(history));
    await initialiseAndWaitForLoad();
    vi.mocked(fs.readdir).mockRejectedValueOnce(new Error('ENOENT'));

    expect(await storage.getStorageStats()).toEqual({ clipCount: 2, lockedCount: 1, dataSize: 0 });
  });
});

describe('SecureStorage.saveClips image cleanup', () => {
  it('keeps the images the new list still references', async () => {
    serveFiles(() => Promise.resolve(history));
    await initialiseAndWaitForLoad();

    await storage.saveClips(
      [
        { id: 'b', type: 'image', content: 'img-1', imageId: 'img-1' },
        { id: 'c', type: 'image', content: 'img-2', imageId: 'img-2' },
      ],
      { 1: true }
    );

    expect(imageStore.deleteImage).not.toHaveBeenCalled();
    const [saved] = vi.mocked(fileOperations.saveEncryptedJson).mock.calls[0];
    expect((saved as StoredClip[]).map((c) => [c.clip.id, c.isLocked])).toEqual([
      ['b', false],
      ['c', true],
    ]);
  });
});

describe('SecureStorage.saveClips orphaned images', () => {
  it('logs an orphaned image that could not be deleted and still saves', async () => {
    serveFiles(() => Promise.resolve(history));
    await initialiseAndWaitForLoad();
    vi.mocked(imageStore.deleteImage).mockRejectedValueOnce(new Error('EPERM'));

    await storage.saveClips([{ id: 'c', type: 'text', content: 'new' }], {});
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(imageStore.deleteImage).toHaveBeenCalledWith('img-1', expect.any(String));
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to delete orphaned image:',
      expect.any(Error)
    );
    expect(fileOperations.saveEncryptedJson).toHaveBeenCalledTimes(1);
  });
});
