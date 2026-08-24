import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('electron', () => import('../__mocks__/electron.js'));
vi.mock('fs', () => import('./fs-test-mock.js'));

import { registerMigrationValidationCases } from './migration-validation-cases';
import { migrateLegacyStorage } from './migration';
import { promises as fs } from 'fs';
import { join } from 'path';
import { safeStorage } from 'electron';

function mockLegacyData(legacyData: object): void {
  vi.mocked(fs.access).mockResolvedValueOnce(undefined);
  vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));
  vi.mocked(fs.access).mockResolvedValueOnce(undefined);
  const json = JSON.stringify(legacyData);
  vi.mocked(fs.readFile).mockResolvedValueOnce(Buffer.from(json));
  vi.mocked(safeStorage.decryptString).mockReturnValueOnce(json);
}

registerMigrationValidationCases();

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
    vi.mocked(fs.access).mockResolvedValueOnce(undefined);
    vi.mocked(fs.access).mockResolvedValueOnce(undefined);

    const result = await migrateLegacyStorage('/data');
    expect(result).toBe(false);
  });

  it('performs migration when data.enc exists but clips.enc does not', async () => {
    const legacyData = {
      clips: [{ clip: { type: 'text', content: 'test' }, isLocked: false, timestamp: 1 }],
      settings: { maxClips: 100 },
      templates: [],
      searchTerms: [],
      quickTools: [],
      version: '1.0.0',
    };
    mockLegacyData(legacyData);

    const result = await migrateLegacyStorage('/data');

    expect(result).toBe(true);
    expect(fs.rename).toHaveBeenCalledWith(
      join('/data', 'data.enc'),
      join('/data', 'data.enc') + '.migrated'
    );
  });

  it('splits legacy data into correct domain files', async () => {
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
    mockLegacyData(legacyData);

    await migrateLegacyStorage('/data');

    const encryptCalls = vi.mocked(safeStorage.encryptString).mock.calls;
    const settingsCall = encryptCalls.find((call) => {
      const parsed = JSON.parse(call[0]);
      return parsed.maxClips === 500;
    });
    expect(settingsCall).toBeDefined();

    const clipsCall = encryptCalls.find((call) => {
      const parsed = JSON.parse(call[0]);
      return Array.isArray(parsed) && parsed.length === 1;
    });
    expect(clipsCall).toBeDefined();

    const templatesCall = encryptCalls.find((call) => {
      const parsed = JSON.parse(call[0]);
      return parsed.templates && parsed.searchTerms && parsed.quickTools;
    });
    expect(templatesCall).toBeDefined();

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
