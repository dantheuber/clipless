import { promises as fs } from 'fs';
import { join } from 'path';
import type {
  AppData,
  StoredClip,
  Template,
  SearchTerm,
  QuickTool,
  StorageMeta,
} from '../../shared/types';
import { DEFAULT_DATA, DEFAULT_SETTINGS } from './defaults';
import { saveEncryptedJson, loadEncryptedJson, saveJsonFile } from './file-operations';

const CURRENT_STORAGE_VERSION = 1;

/**
 * Migrate data from older versions (validates and normalizes an AppData blob)
 */
export function migrateData(data: unknown): AppData {
  // Start with default data
  const migratedData: AppData = { ...DEFAULT_DATA };

  // Validate data structure
  if (!data || typeof data !== 'object') {
    return migratedData;
  }

  const dataObj = data as Record<string, unknown>;

  // Copy over valid clips
  if (dataObj.clips && Array.isArray(dataObj.clips)) {
    migratedData.clips = dataObj.clips.filter(
      (item: unknown): item is StoredClip =>
        item !== null &&
        typeof item === 'object' &&
        'clip' in item &&
        item.clip !== null &&
        typeof item.clip === 'object' &&
        'type' in item.clip &&
        typeof item.clip.type === 'string' &&
        'content' in item.clip &&
        typeof item.clip.content === 'string'
    );
  }

  // Copy over valid settings
  if (dataObj.settings && typeof dataObj.settings === 'object') {
    migratedData.settings = {
      ...DEFAULT_SETTINGS,
      ...dataObj.settings,
    };
  }

  // Copy over valid templates
  if (dataObj.templates && Array.isArray(dataObj.templates)) {
    migratedData.templates = dataObj.templates.filter(
      (template: unknown): template is Template =>
        template !== null &&
        typeof template === 'object' &&
        'id' in template &&
        typeof template.id === 'string' &&
        'name' in template &&
        typeof template.name === 'string' &&
        'content' in template &&
        typeof template.content === 'string' &&
        'createdAt' in template &&
        typeof template.createdAt === 'number' &&
        'updatedAt' in template &&
        typeof template.updatedAt === 'number' &&
        'order' in template &&
        typeof template.order === 'number'
    );
  }

  // Copy over valid search terms
  if (dataObj.searchTerms && Array.isArray(dataObj.searchTerms)) {
    migratedData.searchTerms = dataObj.searchTerms.filter(
      (searchTerm: unknown): searchTerm is SearchTerm =>
        searchTerm !== null &&
        typeof searchTerm === 'object' &&
        'id' in searchTerm &&
        typeof searchTerm.id === 'string' &&
        'name' in searchTerm &&
        typeof searchTerm.name === 'string' &&
        'pattern' in searchTerm &&
        typeof searchTerm.pattern === 'string' &&
        'enabled' in searchTerm &&
        typeof searchTerm.enabled === 'boolean' &&
        'createdAt' in searchTerm &&
        typeof searchTerm.createdAt === 'number' &&
        'updatedAt' in searchTerm &&
        typeof searchTerm.updatedAt === 'number' &&
        'order' in searchTerm &&
        typeof searchTerm.order === 'number'
    );
  }

  // Copy over valid quick tools
  if (dataObj.quickTools && Array.isArray(dataObj.quickTools)) {
    migratedData.quickTools = dataObj.quickTools.filter(
      (quickTool: unknown): quickTool is QuickTool =>
        quickTool !== null &&
        typeof quickTool === 'object' &&
        'id' in quickTool &&
        typeof quickTool.id === 'string' &&
        'name' in quickTool &&
        typeof quickTool.name === 'string' &&
        'url' in quickTool &&
        typeof quickTool.url === 'string' &&
        'captureGroups' in quickTool &&
        Array.isArray(quickTool.captureGroups) &&
        'createdAt' in quickTool &&
        typeof quickTool.createdAt === 'number' &&
        'updatedAt' in quickTool &&
        typeof quickTool.updatedAt === 'number' &&
        'order' in quickTool &&
        typeof quickTool.order === 'number'
    );
  }

  // Preserve version
  if (dataObj.version && typeof dataObj.version === 'string') {
    migratedData.version = dataObj.version;
  }

  return migratedData;
}

/**
 * Check if legacy data.enc exists and needs migration to domain-specific files.
 * If data.enc exists but clips.enc does not, splits legacy data into:
 *   - settings.enc, clips.enc, templates.enc, meta.json
 * Then renames data.enc to data.enc.migrated.
 *
 * Returns true if migration was performed.
 */
export async function migrateLegacyStorage(dataPath: string): Promise<boolean> {
  const legacyPath = join(dataPath, 'data.enc');
  const clipsPath = join(dataPath, 'clips.enc');
  const settingsPath = join(dataPath, 'settings.enc');
  const templatesPath = join(dataPath, 'templates.enc');
  const metaPath = join(dataPath, 'meta.json');

  // Check if legacy file exists
  try {
    await fs.access(legacyPath);
  } catch {
    return false; // No legacy file
  }

  // Check if already migrated (clips.enc exists)
  try {
    await fs.access(clipsPath);
    return false; // Already migrated
  } catch {
    // clips.enc doesn't exist, proceed with migration
  }

  console.log('Migrating legacy data.enc to domain-specific files...');

  // Load and validate legacy data
  const legacyRaw = await loadEncryptedJson<unknown>(legacyPath);
  const data = migrateData(legacyRaw);

  // Split into domain files
  await saveEncryptedJson(data.settings, settingsPath);
  await saveEncryptedJson(data.clips, clipsPath);
  await saveEncryptedJson(
    {
      templates: data.templates,
      searchTerms: data.searchTerms,
      quickTools: data.quickTools,
    },
    templatesPath
  );

  const meta: StorageMeta = {
    version: data.version,
    storageVersion: CURRENT_STORAGE_VERSION,
  };
  await saveJsonFile(meta, metaPath);

  // Rename legacy file
  await fs.rename(legacyPath, legacyPath + '.migrated');

  console.log('Legacy migration complete');
  return true;
}
