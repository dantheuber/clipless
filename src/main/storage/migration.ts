import { promises as fs } from 'fs';
import { join } from 'path';
import type {
  AppData,
  ClipItem,
  GroupColours,
  StoredClip,
  Template,
  SearchTerm,
  QuickTool,
  StorageMeta,
} from '../../shared/types';
import { randomUUID } from 'crypto';
import { DEFAULT_DATA, DEFAULT_SETTINGS } from './defaults';
import { saveEncryptedJson, loadEncryptedJson, saveJsonFile } from './file-operations';
import { isSlotIndex } from '../../shared/groupColours';
import { htmlToText } from '../clipboard/extract-html';
import { rtfToText } from '../clipboard/extract-rtf';

const CURRENT_STORAGE_VERSION = 2;

export function backfillClip(clip: ClipItem): ClipItem {
  let result = clip;
  if (typeof result.id !== 'string' || result.id.length === 0) {
    result = { ...result, id: randomUUID() };
  }
  if (typeof result.text !== 'string' && (result.type === 'html' || result.type === 'rtf')) {
    const text = result.type === 'html' ? htmlToText(result.content) : rtfToText(result.content);
    result = { ...result, text };
  }
  return result;
}

export function migrateData(data: unknown): AppData {
  const migratedData: AppData = { ...DEFAULT_DATA };

  if (!data || typeof data !== 'object') {
    return migratedData;
  }

  const dataObj = data as Record<string, unknown>;

  if (dataObj.clips && Array.isArray(dataObj.clips)) {
    migratedData.clips = dataObj.clips
      .filter(
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
      )
      .map((item) => {
        const clip = backfillClip(item.clip);
        return clip === item.clip ? item : { ...item, clip };
      });
  }

  if (dataObj.settings && typeof dataObj.settings === 'object') {
    migratedData.settings = {
      ...DEFAULT_SETTINGS,
      ...dataObj.settings,
    };
  }

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

  if (dataObj.groupColours && typeof dataObj.groupColours === 'object') {
    const groupColours: GroupColours = {};
    for (const [group, slot] of Object.entries(dataObj.groupColours as Record<string, unknown>)) {
      if (isSlotIndex(slot)) groupColours[group] = slot;
    }
    migratedData.groupColours = groupColours;
  }

  if (dataObj.version && typeof dataObj.version === 'string') {
    migratedData.version = dataObj.version;
  }

  return migratedData;
}

export async function migrateLegacyStorage(dataPath: string): Promise<boolean> {
  const legacyPath = join(dataPath, 'data.enc');
  const clipsPath = join(dataPath, 'clips.enc');
  const settingsPath = join(dataPath, 'settings.enc');
  const templatesPath = join(dataPath, 'templates.enc');
  const metaPath = join(dataPath, 'meta.json');

  try {
    await fs.access(legacyPath);
  } catch {
    return false; // No legacy file
  }

  const clipsAlreadyMigrated = await fs.access(clipsPath).then(
    () => true,
    () => false
  );
  if (clipsAlreadyMigrated) {
    return false; // Already migrated
  }

  console.log('Migrating legacy data.enc to domain-specific files...');

  const legacyRaw = await loadEncryptedJson<unknown>(legacyPath);
  const data = migrateData(legacyRaw);

  await saveEncryptedJson(data.settings, settingsPath);
  await saveEncryptedJson(data.clips, clipsPath);
  await saveEncryptedJson(
    {
      templates: data.templates,
      searchTerms: data.searchTerms,
      quickTools: data.quickTools,
      groupColours: data.groupColours,
    },
    templatesPath
  );

  const meta: StorageMeta = {
    version: data.version,
    storageVersion: CURRENT_STORAGE_VERSION,
  };
  await saveJsonFile(meta, metaPath);

  await fs.rename(legacyPath, legacyPath + '.migrated');

  console.log('Legacy migration complete');
  return true;
}
