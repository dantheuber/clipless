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
    access: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn().mockResolvedValue(undefined),
    rename: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
  },
}));

import { migrateData, migrateLegacyStorage, backfillClip } from './migration';
import { promises as fs } from 'fs';
import { join } from 'path';
import { safeStorage } from 'electron';

describe('migrateData', () => {
  it('returns default structure for empty object', () => {
    const result = migrateData({});
    expect(result.clips).toEqual([]);
    expect(result.settings).toBeDefined();
    expect(result.templates).toEqual([]);
    expect(result.searchTerms).toEqual([]);
    expect(result.quickTools).toEqual([]);
  });

  it('preserves valid clips', () => {
    const data = {
      clips: [{ clip: { type: 'text', content: 'hello' }, isLocked: false, timestamp: 123 }],
    };
    const result = migrateData(data);
    expect(result.clips).toHaveLength(1);
    expect(result.clips[0].clip.content).toBe('hello');
  });

  it('backfills an id on clips stored without one', () => {
    const data = {
      clips: [
        { clip: { type: 'text', content: 'a' }, isLocked: false, timestamp: 1 },
        { clip: { type: 'text', content: 'b' }, isLocked: false, timestamp: 2 },
      ],
    };
    const result = migrateData(data);
    const ids = result.clips.map((c) => c.clip.id);
    expect(ids.every((id) => /^[0-9a-f-]{36}$/.test(id))).toBe(true);
    expect(new Set(ids).size).toBe(2);
    expect(result.clips[0].isLocked).toBe(false);
  });

  it('keeps an existing id and unknown keys', () => {
    const data = {
      clips: [
        {
          clip: { id: 'keep-me', type: 'text', content: 'a', extra: 'kept' },
          isLocked: true,
          timestamp: 1,
        },
      ],
    };
    const result = migrateData(data);
    expect(result.clips[0].clip.id).toBe('keep-me');
    expect((result.clips[0].clip as unknown as Record<string, unknown>).extra).toBe('kept');
    expect(result.clips[0]).toBe(data.clips[0]);
  });

  it('backfills extracted text on html and rtf clips and leaves other types alone', () => {
    const data = {
      clips: [
        {
          clip: { id: 'h', type: 'html', content: '<p>Hi &amp; bye</p>' },
          isLocked: false,
          timestamp: 1,
        },
        {
          clip: { id: 'r', type: 'rtf', content: "{\\rtf1 caf\\'e9}" },
          isLocked: false,
          timestamp: 1,
        },
        { clip: { id: 't', type: 'text', content: '<p>raw</p>' }, isLocked: false, timestamp: 1 },
      ],
    };
    const result = migrateData(data);
    expect(result.clips[0].clip.text).toBe('Hi & bye');
    expect(result.clips[1].clip.text).toBe('café');
    expect(result.clips[2].clip).not.toHaveProperty('text');
  });

  it('keeps existing extracted text', () => {
    const clip = { id: 'h', type: 'html' as const, content: '<p>x</p>', text: 'already' };
    expect(backfillClip(clip)).toBe(clip);
  });

  it('keeps a valid groupColours map and drops bad entries', () => {
    const result = migrateData({ groupColours: { ip: 3, email: 12, bad: 'x', neg: -1 } });
    expect(result.groupColours).toEqual({ ip: 3 });
    expect(migrateData({}).groupColours).toBeUndefined();
  });

  it('filters out invalid clips', () => {
    const data = {
      clips: [
        { clip: { type: 'text', content: 'valid' }, isLocked: false, timestamp: 123 },
        { clip: { type: 123, content: 'invalid type' } },
        { clip: null },
        null,
      ],
    };
    const result = migrateData(data);
    expect(result.clips).toHaveLength(1);
  });

  it('merges settings with defaults', () => {
    const data = {
      settings: { maxClips: 50 },
    };
    const result = migrateData(data);
    expect(result.settings.maxClips).toBe(50);
    expect(result.settings.startMinimized).toBe(false);
  });

  it('preserves valid templates', () => {
    const data = {
      templates: [{ id: '1', name: 'T', content: 'c', createdAt: 1, updatedAt: 1, order: 0 }],
    };
    const result = migrateData(data);
    expect(result.templates).toHaveLength(1);
  });

  it('filters invalid templates', () => {
    const data = {
      templates: [
        { id: '1', name: 'T', content: 'c', createdAt: 1, updatedAt: 1, order: 0 },
        { id: 123, name: 'Bad' },
      ],
    };
    const result = migrateData(data);
    expect(result.templates).toHaveLength(1);
  });

  it('preserves valid search terms', () => {
    const data = {
      searchTerms: [
        { id: '1', name: 'S', pattern: '.*', enabled: true, createdAt: 1, updatedAt: 1, order: 0 },
      ],
    };
    const result = migrateData(data);
    expect(result.searchTerms).toHaveLength(1);
  });

  it('preserves valid quick tools', () => {
    const data = {
      quickTools: [
        {
          id: '1',
          name: 'Tool',
          url: 'https://example.com',
          captureGroups: ['email'],
          createdAt: 1,
          updatedAt: 1,
          order: 0,
        },
      ],
    };
    const result = migrateData(data);
    expect(result.quickTools).toHaveLength(1);
  });

  it('preserves version string', () => {
    const result = migrateData({ version: '2.0.0' });
    expect(result.version).toBe('2.0.0');
  });

  it('handles non-array clips gracefully', () => {
    const result = migrateData({ clips: 'not-an-array' });
    expect(result.clips).toEqual([]);
  });

  it('handles null data properties gracefully', () => {
    const result = migrateData({ clips: null, settings: null, templates: null });
    expect(result.clips).toEqual([]);
    expect(result.templates).toEqual([]);
  });

  it('returns default structure for null or non-object data', () => {
    const nullResult = migrateData(null);
    expect(nullResult.clips).toEqual([]);
    expect(nullResult.settings).toBeDefined();

    const undefinedResult = migrateData(undefined);
    expect(undefinedResult.clips).toEqual([]);

    const stringResult = migrateData('not-an-object');
    expect(stringResult.clips).toEqual([]);

    const numberResult = migrateData(42);
    expect(numberResult.clips).toEqual([]);
  });
});

describe('migrateLegacyStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false if legacy data.enc does not exist', async () => {
    vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));

    const result = await migrateLegacyStorage('/data');
    expect(result).toBe(false);
  });

  it('returns false if clips.enc already exists (already migrated)', async () => {
    // First access (data.enc) succeeds
    vi.mocked(fs.access).mockResolvedValueOnce(undefined);
    // Second access (clips.enc) succeeds
    vi.mocked(fs.access).mockResolvedValueOnce(undefined);

    const result = await migrateLegacyStorage('/data');
    expect(result).toBe(false);
  });

  it('performs migration when data.enc exists but clips.enc does not', async () => {
    // data.enc exists
    vi.mocked(fs.access).mockResolvedValueOnce(undefined);
    // clips.enc does not exist
    vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));
    // loadEncryptedJson reads data.enc
    vi.mocked(fs.access).mockResolvedValueOnce(undefined);

    const legacyData = {
      clips: [{ clip: { type: 'text', content: 'test' }, isLocked: false, timestamp: 1 }],
      settings: { maxClips: 100 },
      templates: [],
      searchTerms: [],
      quickTools: [],
      version: '1.0.0',
    };
    vi.mocked(fs.readFile).mockResolvedValueOnce(Buffer.from(JSON.stringify(legacyData)));
    vi.mocked(safeStorage.decryptString).mockReturnValueOnce(JSON.stringify(legacyData));

    const result = await migrateLegacyStorage('/data');

    expect(result).toBe(true);
    // Should have written settings.enc, clips.enc, templates.enc (3 encrypted saves with temp+rename each)
    // Plus meta.json (1 plain write)
    // Each encrypted save: unlink temp, writeFile temp, rename temp → final = 3 calls per file
    // 3 encrypted files × 3 calls = 9, plus 1 for meta.json write, plus 1 for rename data.enc
    expect(fs.rename).toHaveBeenCalledWith(
      join('/data', 'data.enc'),
      join('/data', 'data.enc') + '.migrated'
    );
  });

  it('splits legacy data into correct domain files', async () => {
    // data.enc exists
    vi.mocked(fs.access).mockResolvedValueOnce(undefined);
    // clips.enc does not exist
    vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));
    // loadEncryptedJson accesses data.enc
    vi.mocked(fs.access).mockResolvedValueOnce(undefined);

    const legacyData = {
      clips: [{ clip: { type: 'text', content: 'hello' }, isLocked: true, timestamp: 1 }],
      settings: { maxClips: 500, theme: 'dark' },
      templates: [{ id: 't1', name: 'T1', content: 'c', createdAt: 1, updatedAt: 1, order: 0 }],
      searchTerms: [
        {
          id: 's1',
          name: 'S1',
          pattern: '.*',
          enabled: true,
          createdAt: 1,
          updatedAt: 1,
          order: 0,
        },
      ],
      quickTools: [
        {
          id: 'q1',
          name: 'Q1',
          url: 'https://example.com',
          captureGroups: [],
          createdAt: 1,
          updatedAt: 1,
          order: 0,
        },
      ],
      version: '1.5.0',
    };
    vi.mocked(fs.readFile).mockResolvedValueOnce(Buffer.from(JSON.stringify(legacyData)));
    vi.mocked(safeStorage.decryptString).mockReturnValueOnce(JSON.stringify(legacyData));

    await migrateLegacyStorage('/data');

    // Verify settings.enc was written (encryptString called with settings data)
    const encryptCalls = vi.mocked(safeStorage.encryptString).mock.calls;
    const settingsCall = encryptCalls.find((call) => {
      const parsed = JSON.parse(call[0]);
      return parsed.maxClips === 500;
    });
    expect(settingsCall).toBeDefined();

    // Verify clips.enc was written
    const clipsCall = encryptCalls.find((call) => {
      const parsed = JSON.parse(call[0]);
      return Array.isArray(parsed) && parsed.length === 1;
    });
    expect(clipsCall).toBeDefined();

    // Verify templates.enc was written with templates, searchTerms, quickTools
    const templatesCall = encryptCalls.find((call) => {
      const parsed = JSON.parse(call[0]);
      return parsed.templates && parsed.searchTerms && parsed.quickTools;
    });
    expect(templatesCall).toBeDefined();

    // Verify meta.json was written
    const writeFileCalls = vi.mocked(fs.writeFile).mock.calls;
    const metaCall = writeFileCalls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('meta.json')
    );
    expect(metaCall).toBeDefined();
    if (metaCall) {
      const metaData = JSON.parse(metaCall[1] as string);
      expect(metaData.version).toBe('1.5.0');
      expect(metaData.storageVersion).toBe(2);
    }
  });
});
